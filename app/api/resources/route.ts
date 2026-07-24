import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resourceIncomePerMinute, RESOURCE_INTERVAL_MS } from "@/lib/game";
import { calcLevelRate } from "@/lib/factories";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      faction: { select: { bonuses: true } },
      controlledStars: {
        select: { id: true, name: true, resources: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });
  }

  const now = new Date();

  // ── Process arrived fleets ──────────────────────────
  const arrivedFleets = await prisma.fleet.findMany({
    where: {
      ownerId: user.id,
      status: "moving",
      arrivesAt: { lte: now },
    },
    include: {
      destinationStar: true,
    },
  });

  for (const fleet of arrivedFleets) {
    if (!fleet.destinationStar) continue;

    await prisma.fleet.update({
      where: { id: fleet.id },
      data: {
        currentStarId: fleet.destinationStarId!,
        destinationStarId: null,
        status: "idle",
        arrivesAt: null,
      },
    });

    // Claim the destination star for player's faction
    await prisma.star.update({
      where: { id: fleet.destinationStar.id },
      data: {
        ownerFactionId: user.factionId,
        controllerId: user.id,
      },
    });
  }

  const arrivedCount = arrivedFleets.length;

  // ── Calculate resource income ───────────────────────
  const lastUpdate = new Date(user.lastResourceUpdate).getTime();
  const elapsedMs = now.getTime() - lastUpdate;
  const minutesElapsed = elapsedMs / RESOURCE_INTERVAL_MS;

  const bonuses = JSON.parse(user.faction.bonuses);
  let miningBonus = 0;
  if (bonuses.miningRate) {
    miningBonus = parseInt(bonuses.miningRate) / 100 || 0;
  }
  let energyBonus = 0;
  if (bonuses.energyProduction) {
    energyBonus = parseInt(bonuses.energyProduction) / 100 || 0;
  }

  let totalMinerals = 0;
  let totalEnergy = 0;

  for (const star of user.controlledStars) {
    const starRes = JSON.parse(star.resources);
    const incomeMin = resourceIncomePerMinute(starRes, miningBonus);
    totalMinerals += incomeMin.minerals * minutesElapsed;
    totalEnergy += incomeMin.energy * minutesElapsed * (1 + energyBonus);
  }

  const resources = JSON.parse(user.resources);

  // ── Complete construction ──────────────────
  await prisma.systemBuilding.updateMany({
    where: { ownerId: user.id, isConstructing: true, constructionEnd: { lte: now } },
    data: { isConstructing: false },
  });

  // ── Process factory production ──────────────
  const buildings = await prisma.systemBuilding.findMany({
    where: { ownerId: user.id, isConstructing: false, isPaused: false },
    include: { buildingType: true, jobs: true },
  });

  // Update currentWorkers from actual job count
  for (const b of buildings) {
    const filled = b.jobs.length;
    await prisma.systemBuilding.update({ where: { id: b.id }, data: { currentWorkers: filled } });
  }

  const factoryGains: Record<string, number> = {};
  const factoryCosts: Record<string, number> = {};

  for (const b of buildings) {
    const bt = b.buildingType;
    if (!bt) continue;
    const maintenance = calcLevelRate(JSON.parse(bt.baseMaintenance), b.level);
    const input = calcLevelRate(JSON.parse(bt.baseInput), b.level);
    const output = calcLevelRate(JSON.parse(bt.baseOutput), b.level);
    const workers = b.jobs.length;
    const efficiency = b.requiredWorkers > 0 ? workers / b.requiredWorkers : 0;
    if (efficiency <= 0) continue;

    let canRun = true;
    for (const [res, rate] of Object.entries({ ...maintenance, ...input })) {
      const available = (resources[res] || 0) + (factoryGains[res] || 0) - (factoryCosts[res] || 0);
      if (available < rate * minutesElapsed * efficiency) { canRun = false; break; }
    }
    if (!canRun) continue;

    for (const [res, rate] of Object.entries({ ...maintenance, ...input })) {
      factoryCosts[res] = (factoryCosts[res] || 0) + rate * minutesElapsed * efficiency;
    }
    for (const [res, rate] of Object.entries(output)) {
      factoryGains[res] = (factoryGains[res] || 0) + rate * minutesElapsed * efficiency;
    }

    // Deduct wages: hourlyWage * workers * hours elapsed
    const wageCost = b.offeredWage * workers * minutesElapsed / 60;
    factoryCosts["credits"] = (factoryCosts["credits"] || 0) + wageCost;
  }

  for (const [res, cost] of Object.entries(factoryCosts)) {
    resources[res] = Math.max(0, (resources[res] || 0) - Math.round(cost * 10) / 10);
  }
  for (const [res, gain] of Object.entries(factoryGains)) {
    resources[res] = (resources[res] || 0) + Math.round(gain * 10) / 10;
  }

  resources.energy = Math.round(((resources.energy || 0) + totalEnergy) * 10) / 10;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resources: JSON.stringify(resources),
      lastResourceUpdate: now,
    },
  });

  // ── Stat regeneration ─────────────────
  const stats = JSON.parse(user.stats || "{}");
  const lastStatRegen = stats.lastStatRegen ? new Date(stats.lastStatRegen) : new Date(user.lastResourceUpdate);
  const statElapsedMs = now.getTime() - lastStatRegen.getTime();
  const statElapsedSec = statElapsedMs / 1000;

  const ENERGY_REGEN_PER_SEC = 1 / 60;     // 1 point per 60s
  const ENTRE_REGEN_PER_SEC = 1 / 180;      // 1 point per 180s

  let energyRegen = Math.floor(statElapsedSec * ENERGY_REGEN_PER_SEC);
  let entreRegen = Math.floor(statElapsedSec * ENTRE_REGEN_PER_SEC);

  const newStatEnergy = Math.min((stats.maxStatEnergy || 100), (stats.statEnergy || 0) + energyRegen);
  const newEntre = Math.min((stats.maxEntrepreneurship || 100), (stats.entrepreneurship || 0) + entreRegen);

  if (energyRegen > 0 || entreRegen > 0) {
    stats.statEnergy = newStatEnergy;
    stats.entrepreneurship = newEntre;
    stats.lastStatRegen = now.toISOString();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resources: JSON.stringify(resources),
      stats: JSON.stringify(stats),
      lastResourceUpdate: now,
    },
  });

  const energyRegenInterval = 60;   // seconds per point
  const entreRegenInterval = 180;   // seconds per point
  const secSinceLastRegen = statElapsedSec % energyRegenInterval;
  const energyNextIn = energyRegenInterval - secSinceLastRegen;

  return NextResponse.json({
    credits: resources.credits,
    minerals: resources.titan_erz || 0,
    energy: resources.energy,
    alloys: resources.titan_legierung || 0,
    titan_erz: resources.titan_erz || 0,
    deuterium: resources.deuterium || 0,
    seltene_erden: resources.seltene_erden || 0,
    titan_legierung: resources.titan_legierung || 0,
    deuterium_zellen: resources.deuterium_zellen || 0,
    mikro_prozessoren: resources.mikro_prozessoren || 0,
    quanten_kerne: resources.quanten_kerne || 0,
    schiffshuellen: resources.schiffshuellen || 0,
    plasma_waffen: resources.plasma_waffen || 0,
    controlledStars: user.controlledStars.length,
    arrivedFleets: arrivedCount,
    earnedThisTick: {
      minerals: Math.round(totalMinerals * 10) / 10,
      energy: Math.round(totalEnergy * 10) / 10,
    },
    miningPerMinute: user.controlledStars.length > 0
      ? Math.round((totalMinerals / Math.max(minutesElapsed, 0.01)) * 10) / 10
      : 0,
    energyPerMinute: user.controlledStars.length > 0
      ? Math.round((totalEnergy / Math.max(minutesElapsed, 0.01)) * 10) / 10
      : 0,
    stats: {
      statEnergy: newStatEnergy,
      maxStatEnergy: stats.maxStatEnergy || 100,
      entrepreneurship: newEntre,
      maxEntrepreneurship: stats.maxEntrepreneurship || 100,
      production: stats.production || 0,
      companiesLimit: stats.companiesLimit || 0,
    },
    statRegen: {
      energyIntervalSec: energyRegenInterval,
      energyNextInSec: Math.round(energyNextIn),
      entreIntervalSec: entreRegenInterval,
      entreNextInSec: Math.round(statElapsedSec % entreRegenInterval > 0 ? entreRegenInterval - (statElapsedSec % entreRegenInterval) : 0),
    },
  });
}
