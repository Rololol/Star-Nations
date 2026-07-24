import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { travelTimeSeconds } from "@/lib/game";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const fleetId = parseInt(params.id, 10);
  const { destinationStarId } = await req.json();

  if (!destinationStarId) {
    return NextResponse.json({ error: "destinationStarId erforderlich." }, { status: 400 });
  }

  const fleet = await prisma.fleet.findUnique({
    where: { id: fleetId },
    include: {
      currentStar: { select: { id: true, ring: true, angleOffset: true, sector: true } },
      owner: { select: { id: true, faction: { select: { bonuses: true } } } },
    },
  });

  if (!fleet) {
    return NextResponse.json({ error: "Flotte nicht gefunden." }, { status: 404 });
  }
  if (fleet.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nicht deine Flotte." }, { status: 403 });
  }
  if (fleet.status === "moving") {
    return NextResponse.json({ error: "Flotte ist bereits unterwegs." }, { status: 400 });
  }

  const dest = await prisma.star.findUnique({
    where: { id: destinationStarId },
    select: { id: true, ring: true, angleOffset: true, sector: true },
  });

  if (!dest) {
    return NextResponse.json({ error: "Zielstern nicht gefunden." }, { status: 404 });
  }

  if (dest.id === fleet.currentStar.id) {
    return NextResponse.json({ error: "Flotte ist bereits an diesem Stern." }, { status: 400 });
  }

  // Calculate faction speed bonus
  const bonuses = JSON.parse(fleet.owner.faction.bonuses);
  let speedBonus = 0;
  if (bonuses.fleetSpeed) {
    speedBonus = parseInt(bonuses.fleetSpeed) / 100 || 0;
  }

  const travelSec = travelTimeSeconds(fleet.currentStar, dest, speedBonus);
  const arrivesAt = new Date(Date.now() + travelSec * 1000);

  const updated = await prisma.fleet.update({
    where: { id: fleetId },
    data: {
      destinationStarId,
      status: "moving",
      arrivesAt,
    },
    include: {
      currentStar: { select: { id: true, name: true } },
      destinationStar: { select: { id: true, name: true, ring: true, angleOffset: true, sector: true } },
    },
  });

  return NextResponse.json(updated);
}
