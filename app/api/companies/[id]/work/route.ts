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
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!company || !user) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nur der Besitzer kann in der eigenen Firma arbeiten." }, { status: 403 });
  }

  const maxPP = STORAGE_CAPACITY[company.storageLevel] || 200;
  if (company.currentPP >= maxPP) {
    return NextResponse.json({ error: "Speicher voll! Produziere zuerst Items, um Platz zu schaffen." }, { status: 400 });
  }

  const stats = JSON.parse(user.stats);
  const entreCost = 10;
  if ((stats.entrepreneurship || 0) < entreCost) {
    return NextResponse.json({ error: `Nicht genug Entrepreneurship. Benötigt: ${entreCost}, verfügbar: ${stats.entrepreneurship || 0}.` }, { status: 400 });
  }

  stats.entrepreneurship -= entreCost;

  const productionSkill = stats.production || 0;
  const ppProduced = 12 + productionSkill;

  const newPP = Math.min(company.currentPP + ppProduced, maxPP);

  const [updated] = await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { currentPP: newPP },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { stats: JSON.stringify(stats) },
    }),
  ]);

  await logActivity(user.id, "company_work", `Hat in eigener Firma "${company.name}" gearbeitet und ${ppProduced} PP produziert.`);

  return NextResponse.json({ success: true, ppProduced, currentPP: newPP, maxPP, stats });
}
