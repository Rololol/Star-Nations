import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { ownerId: { not: session.userId } },
    include: {
      owner: { select: { id: true, displayName: true } },
      star: { select: { id: true, name: true } },
      employees: { select: { workerId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { stats: true },
  });

  return NextResponse.json({
    companies: companies.map(c => ({
      id: c.id,
      name: c.name,
      ownerName: c.owner.displayName,
      starName: c.star.name,
      reactorLevel: c.reactorLevel,
      storageLevel: c.storageLevel,
      employeeCount: c.employees.length,
      wagePerPP: c.wagePerPP || 1,
      isEmployed: c.employees.some(e => e.workerId === session.userId),
    })),
    stats: stats ? JSON.parse(stats.stats) : null,
  });
}
