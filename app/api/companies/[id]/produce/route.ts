import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const RECIPES: Record<string, { ppCost: number; input: Record<string, number>; outputKey: string; outputAmount: number }> = {
  titan_erz:       { ppCost: 1,  input: {},                                outputKey: "titan_erz",       outputAmount: 1 },
  energy:          { ppCost: 1,  input: {},                                outputKey: "energy",          outputAmount: 1 },
  titan_legierung: { ppCost: 10, input: { titan_erz: 10 },                 outputKey: "titan_legierung", outputAmount: 1 },
  schiffshuellen:  { ppCost: 20, input: { titan_legierung: 1 },            outputKey: "schiffshuellen",  outputAmount: 1 },
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const companyId = parseInt(params.id, 10);
  const { recipe, amount: rawAmount } = await req.json();
  const amount = rawAmount || 1;

  const recipeDef = RECIPES[recipe];
  if (!recipeDef) {
    return NextResponse.json({ error: `Unbekanntes Rezept: ${recipe}. Verfügbar: ${Object.keys(RECIPES).join(", ")}.` }, { status: 400 });
  }

  const [company, user] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      include: { star: { select: { resources: true } } },
    }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);

  if (!company || !user) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (company.ownerId !== session.userId) {
    return NextResponse.json({ error: "Nur der Besitzer kann produzieren." }, { status: 403 });
  }

  const totalPP = recipeDef.ppCost * amount;
  if (company.currentPP < totalPP) {
    return NextResponse.json({ error: `Nicht genug PP. Benötigt: ${totalPP}, verfügbar: ${company.currentPP}.` }, { status: 400 });
  }

  const resources = JSON.parse(user.resources);
  for (const [res, cost] of Object.entries(recipeDef.input)) {
    const totalCost = cost * amount;
    if ((resources[res] || 0) < totalCost) {
      return NextResponse.json({ error: `Nicht genug ${res}. Benötigt: ${totalCost}, verfügbar: ${resources[res] || 0}.` }, { status: 400 });
    }
    resources[res] -= totalCost;
  }

  const starRes = JSON.parse(company.star.resources || "{}");
  const depositBonus = Math.min((starRes.minerals || 0) / 500, 1);
  const bonusMult = 1 + depositBonus;

  const outputAmount = Math.round(recipeDef.outputAmount * amount * bonusMult);
  resources[recipeDef.outputKey] = (resources[recipeDef.outputKey] || 0) + outputAmount;

  const [updated] = await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { currentPP: company.currentPP - totalPP },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { resources: JSON.stringify(resources) },
    }),
  ]);

  await logActivity(user.id, "company_produce", `Hat in Firma "${company.name}" ${amount}x ${recipe} produziert (${outputAmount} erhalten, Bonus: ${Math.round(depositBonus * 100)}%).`);

  return NextResponse.json({
    success: true,
    recipe,
    amount,
    outputAmount,
    ppUsed: totalPP,
    currentPP: updated.currentPP,
    bonusPercent: Math.round(depositBonus * 100),
    resources,
  });
}
