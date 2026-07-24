import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const STORAGE_COSTS: Record<number, number> = {
  2: 10, 3: 20, 4: 40, 5: 80, 6: 160, 7: 320,
};
const REFUND_RATE = 0.8;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const [company, user] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!company || !user) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Firma." }, { status: 403 });
  }
  if (company.storageLevel <= 1) {
    return NextResponse.json({ error: "Speicher ist bereits auf Minimum (Level 1)." }, { status: 400 });
  }

  const currentLevel = company.storageLevel;
  const invested = STORAGE_COSTS[currentLevel];
  const refund = Math.floor(invested * REFUND_RATE);

  const resources = JSON.parse(user.resources);
  resources.titan_legierung = (resources.titan_legierung || 0) + refund;

  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { storageLevel: currentLevel - 1 },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  return NextResponse.json({ success: true, storageLevel: currentLevel - 1, refund, resources });
}
