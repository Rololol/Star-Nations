import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calcLevelCost, calcBuildTime } from "@/lib/factories";

export async function POST(req: NextRequest, { params }: { params: { id: string; bid: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const buildingId = parseInt(params.bid);

  const [building, user, bt] = await Promise.all([
    prisma.systemBuilding.findUnique({ where: { id: buildingId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.buildingType.findFirst({ where: { buildings: { some: { id: buildingId } } } }),
  ]);
  if (!building || !user || !bt) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  if (building.ownerId !== user.id) return NextResponse.json({ error: "Nicht dein Gebäude." }, { status: 403 });
  if (building.isConstructing) return NextResponse.json({ error: "Noch im Bau." }, { status: 400 });

  const nextLevel = building.level + 1;
  const cost = calcLevelCost(JSON.parse(bt.baseBuildCost), nextLevel);
  const resources = JSON.parse(user.resources);
  for (const [res, c] of Object.entries(cost)) {
    if ((resources[res] || 0) < c) return NextResponse.json({ error: `Nicht genug ${res}. Brauche: ${c}.` }, { status: 400 });
  }
  for (const [res, c] of Object.entries(cost)) resources[res] -= c;

  const buildSecs = calcBuildTime(bt.baseBuildTime, nextLevel);
  const constructionEnd = new Date(Date.now() + buildSecs * 1000);

  await prisma.systemBuilding.update({
    where: { id: buildingId }, data: { isConstructing: true, constructionEnd, level: nextLevel },
  });
  await prisma.user.update({ where: { id: user.id }, data: { resources: JSON.stringify(resources) } });
  return NextResponse.json({ success: true, newLevel: nextLevel, resources });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; bid: string } }) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const buildingId = parseInt(params.bid);
  const { offeredWage, isPaused, requiredWorkers } = await req.json();

  const building = await prisma.systemBuilding.findUnique({ where: { id: buildingId } });
  if (!building) return NextResponse.json({ error: "Gebäude nicht gefunden." }, { status: 404 });
  if (building.ownerId !== session.userId) return NextResponse.json({ error: "Nicht dein Gebäude." }, { status: 403 });

  const data: Record<string, number | boolean> = {};
  if (offeredWage !== undefined) data.offeredWage = offeredWage;
  if (isPaused !== undefined) data.isPaused = isPaused;
  if (requiredWorkers !== undefined) data.requiredWorkers = requiredWorkers;

  const updated = await prisma.systemBuilding.update({ where: { id: buildingId }, data });
  return NextResponse.json({ success: true, building: updated });
}
