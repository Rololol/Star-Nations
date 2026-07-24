import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = parseInt(params.id);
  if (isNaN(userId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      faction: true,
      homeStar: true,
      controlledStars: { select: { id: true, name: true, resources: true } },
      fleets: {
        where: { status: "idle" },
        include: { currentStar: { select: { id: true, name: true } } },
      },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      companies: {
        include: {
          star: { select: { id: true, name: true } },
          employees: { include: { worker: { select: { id: true, displayName: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const resources = JSON.parse(user.resources);
  const starsOut = user.controlledStars.map(s => {
    const r = JSON.parse(s.resources);
    return { id: s.id, name: s.name, minerals: r.minerals, energy: r.energy };
  });

  return NextResponse.json({
    id: user.id,
    displayName: user.displayName,
    title: user.title || "Commander",
    bio: user.bio || "",
    factionId: user.factionId,
    factionName: user.faction.name,
    factionLore: user.faction.lore,
    homeStar: user.homeStar ? { id: user.homeStar.id, name: user.homeStar.name } : null,
    joinedAt: user.createdAt,
    resources: {
      credits: Math.round(resources.credits || 0),
      energy: Math.round(resources.energy || 0),
      titan_erz: Math.round(resources.titan_erz || 0),
      deuterium: Math.round(resources.deuterium || 0),
      seltene_erden: Math.round(resources.seltene_erden || 0),
      titan_legierung: Math.round(resources.titan_legierung || 0),
      deuterium_zellen: Math.round(resources.deuterium_zellen || 0),
      mikro_prozessoren: Math.round(resources.mikro_prozessoren || 0),
      quanten_kerne: Math.round(resources.quanten_kerne || 0),
      schiffshuellen: Math.round(resources.schiffshuellen || 0),
      plasma_waffen: Math.round(resources.plasma_waffen || 0),
    },
    controlledStars: starsOut,
    fleetCount: user.fleets.length,
    totalShips: user.fleets.reduce((s, f) => s + f.shipCount, 0),
    fleets: user.fleets.map(f => ({
      id: f.id, name: f.name, shipCount: f.shipCount, location: f.currentStar.name,
    })),
    activity: user.activityLogs.map(l => ({
      action: l.action, detail: l.detail, createdAt: l.createdAt,
    })),
    companies: user.companies.map(c => ({
      id: c.id, name: c.name, companyType: c.companyType,
      reactorLevel: c.reactorLevel, storageLevel: c.storageLevel,
      currentPP: c.currentPP, starName: c.star?.name || "Unbekannt",
      employeeCount: c.employees.length,
    })),
  });
}
