import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COSTS } from "@/lib/game";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const fleets = await prisma.fleet.findMany({
    where: { ownerId: session.userId },
    include: {
      currentStar: {
        select: { id: true, name: true, ring: true, angleOffset: true, sector: true },
      },
      destinationStar: {
        select: { id: true, name: true, ring: true, angleOffset: true, sector: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fleets);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { starId, shipCount = 1, name } = await req.json();

  if (!starId || shipCount < 1 || shipCount > 10) {
    return NextResponse.json(
      { error: "Ungültige Parameter. starId erforderlich, max 10 Schiffe." },
      { status: 400 }
    );
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

  if (star.controllerId !== user.id) {
    return NextResponse.json(
      { error: "Du kontrollierst dieses System nicht." },
      { status: 403 }
    );
  }

  const resources = JSON.parse(user.resources);
  const totalCost = {
    credits: COSTS.BUILD_SHIP.credits * shipCount,
    minerals: COSTS.BUILD_SHIP.minerals * shipCount,
    energy: COSTS.BUILD_SHIP.energy * shipCount,
  };

  if (
    resources.credits < totalCost.credits ||
    resources.minerals < totalCost.minerals ||
    resources.energy < totalCost.energy
  ) {
    return NextResponse.json(
      {
        error: `Nicht genug Ressourcen. Benötigt: ${totalCost.credits} Credits, ${totalCost.minerals} Mineralien, ${totalCost.energy} Energie.`,
      },
      { status: 400 }
    );
  }

  resources.credits -= totalCost.credits;
  resources.minerals -= totalCost.minerals;
  resources.energy -= totalCost.energy;

  const fleet = await prisma.fleet.create({
    data: {
      name: name || `Flotte ${Date.now().toString(36).toUpperCase()}`,
      ownerId: user.id,
      factionId: user.factionId,
      currentStarId: starId,
      shipCount,
      status: "idle",
    },
    include: {
      currentStar: {
        select: { id: true, name: true, ring: true, angleOffset: true, sector: true },
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { resources: JSON.stringify(resources) },
  });

  await logActivity(user.id, "build_fleet", `Flotte "${fleet.name}" mit ${shipCount} Schiff(en) am System ${star.name} gebaut.`, { starId, fleetId: fleet.id });
  return NextResponse.json(fleet, { status: 201 });
}
