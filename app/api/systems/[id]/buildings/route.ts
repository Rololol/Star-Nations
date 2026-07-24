import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calcLevelCost, calcBuildTime } from "@/lib/factories";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const starId = parseInt(params.id);

  const star = await prisma.star.findUnique({
    where: { id: starId },
    include: { buildings: { include: { buildingType: true } } },
  });
  if (!star) return NextResponse.json({ error: "System nicht gefunden." }, { status: 404 });

  const buildingTypes = await prisma.buildingType.findMany();

  const allBt = buildingTypes as unknown as { id: string; name: string; description: string; category: string; baseBuildCost: string; baseBuildTime: number; baseMaintenance: string; baseInput: string; baseOutput: string; icon: string }[];
  const types: Record<string, typeof allBt[0]> = {};
  for (const bt of allBt) types[bt.id] = bt;

  const usedSlots = star.buildings.length;
  const buildings = star.buildings.map(b => ({
    id: b.id, buildingTypeId: b.buildingTypeId, level: b.level,
    isPaused: b.isPaused, isConstructing: b.isConstructing,
    constructionEnd: b.constructionEnd?.toISOString() || null,
    name: types[b.buildingTypeId]?.name || b.buildingTypeId,
    category: types[b.buildingTypeId]?.category || "",
    baseInput: JSON.parse(types[b.buildingTypeId]?.baseInput || "{}"),
    baseOutput: JSON.parse(types[b.buildingTypeId]?.baseOutput || "{}"),
    baseMaintenance: JSON.parse(types[b.buildingTypeId]?.baseMaintenance || "{}"),
    requiredWorkers: b.requiredWorkers, currentWorkers: b.currentWorkers, offeredWage: b.offeredWage,
  }));

  return NextResponse.json({ starName: star.name, maxSlots: star.maxBuildingSlots, usedSlots, buildings, buildingTypes });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const starId = parseInt(params.id);
  const { buildingTypeId } = await req.json();
  if (!buildingTypeId) return NextResponse.json({ error: "buildingTypeId erforderlich." }, { status: 400 });

  const [star, user, bt] = await Promise.all([
    prisma.star.findUnique({ where: { id: starId }, include: { buildings: true } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.buildingType.findUnique({ where: { id: buildingTypeId } }),
  ]);
  if (!star || !user || !bt) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  if (star.controllerId !== user.id) return NextResponse.json({ error: "System nicht unter Kontrolle." }, { status: 403 });
  if (star.buildings.length >= star.maxBuildingSlots) return NextResponse.json({ error: "Maximale Bauplätze erreicht." }, { status: 400 });

  const cost = calcLevelCost(JSON.parse(bt.baseBuildCost), 1);
  const resources = JSON.parse(user.resources);
  for (const [res, c] of Object.entries(cost)) {
    if ((resources[res] || 0) < c) return NextResponse.json({ error: `Nicht genug ${res}. Brauche: ${c}.` }, { status: 400 });
  }
  for (const [res, c] of Object.entries(cost)) resources[res] -= c;

  const buildSecs = calcBuildTime(bt.baseBuildTime, 1);
  const constructionEnd = new Date(Date.now() + buildSecs * 1000);

  const building = await prisma.systemBuilding.create({
    data: { starId, ownerId: user.id, buildingTypeId, level: 1, isConstructing: true, constructionEnd },
  });

  await prisma.user.update({ where: { id: user.id }, data: { resources: JSON.stringify(resources) } });
  return NextResponse.json({ success: true, building, resources }, { status: 201 });
}
