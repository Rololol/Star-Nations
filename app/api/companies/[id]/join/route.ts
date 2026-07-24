import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const STORAGE_CAPACITY: Record<number, number> = {
  1: 200, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1200, 7: 1400,
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
    prisma.company.findUnique({
      where: { id: companyId },
      include: { employees: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!company || !user) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId === session.userId) {
    return NextResponse.json({ error: "Du kannst nicht in deiner eigenen Firma als Angestellter arbeiten." }, { status: 400 });
  }

  const existing = company.employees.find((e) => e.workerId === session.userId);
  if (existing) {
    return NextResponse.json({ error: "Du bist bereits in dieser Firma angestellt." }, { status: 400 });
  }

  const stats = JSON.parse(user.stats);
  const energyCost = 10;
  if ((stats.statEnergy || 0) < energyCost) {
    return NextResponse.json({ error: `Nicht genug Energie-Stat. Benötigt: ${energyCost}, verfügbar: ${stats.statEnergy || 0}.` }, { status: 400 });
  }

  const maxPP = STORAGE_CAPACITY[company.storageLevel] || 200;
  if (company.currentPP >= maxPP) {
    return NextResponse.json({ error: "Speicher der Firma ist voll." }, { status: 400 });
  }

  // Check if owner can pay
  const owner = await prisma.user.findUnique({ where: { id: company.ownerId } });
  if (!owner) {
    return NextResponse.json({ error: "Firmenbesitzer nicht gefunden." }, { status: 404 });
  }

  stats.statEnergy -= energyCost;

  const productionSkill = stats.production || 0;
  const ppProduced = 12 + productionSkill;
  const wage = company.wagePerPP || 1;
  const totalWage = Math.floor(ppProduced * wage);

  const ownerResources = JSON.parse(owner.resources);
  if ((ownerResources.credits || 0) < totalWage) {
    return NextResponse.json({ error: `Der Firmenbesitzer hat nicht genug Credits für den Lohn (${totalWage} Cr benötigt).` }, { status: 400 });
  }

  ownerResources.credits -= totalWage;

  const workerResources = JSON.parse(user.resources);
  workerResources.credits = (workerResources.credits || 0) + totalWage;

  const newPP = Math.min(company.currentPP + ppProduced, maxPP);

  await prisma.companyEmployee.upsert({
    where: {
      workerId_companyId: { workerId: session.userId, companyId },
    },
    create: {
      companyId,
      workerId: session.userId,
      wagePerPP: wage,
      totalProduced: ppProduced,
    },
    update: {
      totalProduced: { increment: ppProduced },
    },
  });

  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { currentPP: newPP },
    }),
    prisma.user.update({ where: { id: user.id }, data: { resources: JSON.stringify(workerResources), stats: JSON.stringify(stats) } }),
    prisma.user.update({ where: { id: owner.id }, data: { resources: JSON.stringify(ownerResources) } }),
  ]);

  await logActivity(user.id, "company_join_work", `Hat als Angestellter in Firma "${company.name}" gearbeitet (+${ppProduced} PP, +${totalWage} Cr Lohn).`);

  return NextResponse.json({
    success: true,
    ppProduced,
    currentPP: newPP,
    maxPP,
    wageEarned: totalWage,
    stats,
  });
}
