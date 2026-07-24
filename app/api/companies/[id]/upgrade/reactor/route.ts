import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const REACTOR_COSTS: Record<number, number> = {
  2: 20, 3: 40, 4: 80, 5: 160, 6: 320, 7: 640,
};
const REACTOR_PP: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
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
  if (company.reactorLevel >= 7) {
    return NextResponse.json({ error: "Reaktor bereits auf Maximum (Level 7)." }, { status: 400 });
  }

  const nextLevel = company.reactorLevel + 1;
  const cost = REACTOR_COSTS[nextLevel];
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
      data: { reactorLevel: nextLevel },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  return NextResponse.json({ success: true, reactorLevel: nextLevel, ppPerHour: REACTOR_PP[nextLevel], resources });
}
