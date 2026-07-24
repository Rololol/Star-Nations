import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COSTS } from "@/lib/game";
import { logActivity } from "@/lib/activity";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const starId = parseInt(params.id, 10);
  if (isNaN(starId) || starId < 1 || starId > 9999) {
    return NextResponse.json({ error: "Ungültige Stern-ID." }, { status: 400 });
  }

  const [star, user] = await Promise.all([
    prisma.star.findUnique({ where: { id: starId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!star) {
    return NextResponse.json({ error: "Stern nicht gefunden." }, { status: 404 });
  }
  if (!user) {
    return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });
  }

  if (star.ownerFactionId) {
    return NextResponse.json(
      { error: "Dieses System ist bereits besetzt." },
      { status: 409 }
    );
  }

  const resources = JSON.parse(user.resources);
  if (resources.credits < COSTS.CLAIM_STAR.credits) {
    return NextResponse.json(
      { error: `Nicht genug Credits. Benötigt: ${COSTS.CLAIM_STAR.credits}.` },
      { status: 400 }
    );
  }

  resources.credits -= COSTS.CLAIM_STAR.credits;

  const [updatedStar] = await Promise.all([
    prisma.star.update({
      where: { id: starId },
      data: {
        ownerFactionId: user.factionId,
        controllerId: user.id,
      },
      include: { ownerFaction: { select: { id: true, name: true } } },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  await logActivity(user.id, "claim_star", `Hat ${updatedStar.name} (System #${starId}) beansprucht.`, { starId });
  return NextResponse.json(updatedStar);
}
