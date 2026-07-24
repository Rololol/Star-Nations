import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const REACTOR_COSTS: Record<number, number> = {
  2: 20, 3: 40, 4: 80, 5: 160, 6: 320, 7: 640,
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
  if (company.reactorLevel <= 1) {
    return NextResponse.json({ error: "Reaktor ist bereits auf Minimum (Level 1)." }, { status: 400 });
  }

  const currentLevel = company.reactorLevel;
  const invested = REACTOR_COSTS[currentLevel];
  const refund = Math.floor(invested * REFUND_RATE);

  const resources = JSON.parse(user.resources);
  resources.titan_legierung = (resources.titan_legierung || 0) + refund;

  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { reactorLevel: currentLevel - 1 },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  return NextResponse.json({ success: true, reactorLevel: currentLevel - 1, refund, resources });
}
