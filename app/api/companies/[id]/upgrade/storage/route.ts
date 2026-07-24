import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const STORAGE_COSTS: Record<number, number> = {
  2: 10, 3: 20, 4: 40, 5: 80, 6: 160, 7: 320,
};
const STORAGE_CAPACITY: Record<number, number> = {
  1: 200, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400,
};

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
  if (company.storageLevel >= 7) {
    return NextResponse.json({ error: "Speicher bereits auf Maximum (Level 7)." }, { status: 400 });
  }

  const nextLevel = company.storageLevel + 1;
  const cost = STORAGE_COSTS[nextLevel];
  if (!cost) {
    return NextResponse.json({ error: "Ungültiges Level." }, { status: 400 });
  }

  const resources = JSON.parse(user.resources);
  if ((resources.titan_legierung || 0) < cost) {
    return NextResponse.json({ error: `Nicht genug Legierungen. Benötigt: ${cost}.` }, { status: 400 });
  }
  resources.titan_legierung -= cost;

  const [updated] = await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { storageLevel: nextLevel },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  return NextResponse.json({ success: true, storageLevel: nextLevel, maxPP: STORAGE_CAPACITY[nextLevel], resources });
}
