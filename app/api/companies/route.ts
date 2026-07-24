import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const COMPANY_COST = { titan_legierung: 100 };

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      companies: {
        include: {
          star: { select: { id: true, name: true, resources: true } },
          employees: { include: { worker: { select: { id: true, displayName: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });

  if (user.companies.length === 0) {
    const ownedStars = await prisma.star.findFirst({
      where: { controllerId: user.id },
      orderBy: { id: "asc" },
    });
    if (ownedStars) {
      await prisma.company.create({
        data: {
          name: `${user.displayName}'s Mine`,
          ownerId: user.id,
          starId: ownedStars.id,
          reactorLevel: 1,
          storageLevel: 1,
          currentPP: 0,
          companyType: "titan_erz",
        },
      });
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          companies: {
            include: {
              star: { select: { id: true, name: true, resources: true } },
              employees: { include: { worker: { select: { id: true, displayName: true } } } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })!;
    }
  }

  const stats = JSON.parse(user!.stats);
  const maxCompanies = (stats.companiesLimit || 0) + 1;

  return NextResponse.json({ companies: user!.companies, maxCompanies, stats });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { starId, name, companyType } = await req.json();
  if (!starId) {
    return NextResponse.json({ error: "starId erforderlich." }, { status: 400 });
  }

  const [user, star] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: { companies: true },
    }),
    prisma.star.findUnique({ where: { id: starId } }),
  ]);

  if (!user || !star) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (star.controllerId !== user.id) {
    return NextResponse.json({ error: "Du kontrollierst dieses System nicht." }, { status: 403 });
  }

  const stats = JSON.parse(user.stats);
  const maxCompanies = (stats.companiesLimit || 0) + 1;
  if (user.companies.length >= maxCompanies) {
    return NextResponse.json({ error: `Maximale Anzahl Firmen erreicht (${maxCompanies}).` }, { status: 400 });
  }

  if (user.companies.length > 0) {
    const resources = JSON.parse(user.resources);
    for (const [res, cost] of Object.entries(COMPANY_COST)) {
      if ((resources[res] || 0) < cost) {
        return NextResponse.json({ error: `Nicht genug ${res}. Benötigt: ${cost}.` }, { status: 400 });
      }
      resources[res] -= cost;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    });
  }

  const company = await prisma.company.create({
    data: {
      name: name || "Meine Firma",
      ownerId: user.id,
      starId,
      reactorLevel: 1,
      storageLevel: 1,
      currentPP: 0,
      companyType: companyType || "titan_erz",
    },
    include: {
      star: { select: { id: true, name: true } },
      employees: true,
    },
  });

  await logActivity(user.id, "create_company", `Hat Firma "${company.name}" auf ${star.name} gegründet.`, { companyId: company.id, starId });
  return NextResponse.json(company, { status: 201 });
}
