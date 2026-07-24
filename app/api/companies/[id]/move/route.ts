import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const MOVE_COST = { titan_legierung: 5 };

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const { targetStarId } = await req.json();

  if (!targetStarId) {
    return NextResponse.json({ error: "targetStarId erforderlich." }, { status: 400 });
  }

  const [company, user, targetStar] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.star.findUnique({ where: { id: targetStarId } }),
  ]);

  if (!company || !user || !targetStar) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Firma." }, { status: 403 });
  }
  if (targetStar.controllerId !== session.userId) {
    return NextResponse.json({ error: "Du kontrollierst dieses System nicht." }, { status: 403 });
  }
  if (company.starId === targetStarId) {
    return NextResponse.json({ error: "Firma ist bereits auf diesem Planeten." }, { status: 400 });
  }

  const resources = JSON.parse(user.resources);
  for (const [res, cost] of Object.entries(MOVE_COST)) {
    if ((resources[res] || 0) < cost) {
      return NextResponse.json({ error: `Nicht genug ${res}. Benötigt: ${cost}.` }, { status: 400 });
    }
    resources[res] -= cost;
  }

  const [updated] = await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { starId: targetStarId },
      include: { star: { select: { id: true, name: true } } },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  await logActivity(user.id, "company_move", `Hat Firma "${company.name}" nach ${targetStar.name} verschoben.`);

  return NextResponse.json({ success: true, company: updated, resources });
}
