import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET /api/jobs — list all available job offers
export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const offers = await prisma.systemBuilding.findMany({
    where: { isConstructing: false, isPaused: false },
    include: {
      buildingType: { select: { name: true } },
      star: { select: { id: true, name: true } },
      jobs: { select: { userId: true } },
      owner: { select: { displayName: true } },
    },
  });

  const myJobs = await prisma.jobOffer.findMany({
    where: { userId: session.userId },
    include: { building: { include: { buildingType: { select: { name: true } }, star: { select: { name: true } } } } },
  });

  const offersOut = offers.map(b => {
    const filled = b.jobs.length;
    const needed = b.requiredWorkers - (b.currentWorkers || 0);
    const vacancies = Math.max(0, needed);
    return {
      buildingId: b.id, buildingName: b.buildingType.name, level: b.level,
      systemName: b.star.name, ownerName: b.owner.displayName,
      requiredWorkers: b.requiredWorkers, currentWorkers: filled,
      vacancies, wage: b.offeredWage,
    };
  }).filter(o => o.vacancies > 0);

  return NextResponse.json({ offers: offersOut, myJobs: myJobs.map(j => ({
    id: j.id, buildingId: j.buildingId, buildingName: j.building.buildingType.name,
    systemName: j.building.star.name, hourlyWage: j.hourlyWage,
    requiredWorkers: j.building.requiredWorkers, currentWorkers: j.building.currentWorkers,
  })) });
}

// POST /api/jobs — apply for a job
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const { buildingId } = await req.json();
  if (!buildingId) return NextResponse.json({ error: "buildingId erforderlich." }, { status: 400 });

  const building = await prisma.systemBuilding.findUnique({
    where: { id: buildingId },
    include: { jobs: true },
  });
  if (!building) return NextResponse.json({ error: "Gebäude nicht gefunden." }, { status: 404 });
  if (building.ownerId === session.userId) return NextResponse.json({ error: "Eigene Fabrik — keine Selbstanstellung." }, { status: 400 });

  const filled = building.jobs.length;
  if (filled >= building.requiredWorkers) {
    return NextResponse.json({ error: "Keine freien Stellen." }, { status: 400 });
  }

  const existing = await prisma.jobOffer.findUnique({
    where: { userId_buildingId: { userId: session.userId, buildingId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits angestellt." }, { status: 400 });

  const job = await prisma.jobOffer.create({
    data: { userId: session.userId, buildingId, hourlyWage: building.offeredWage },
  });

  return NextResponse.json({ success: true, job });
}
