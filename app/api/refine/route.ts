import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

// Refine minerals + energy → alloys
const REFINE_COST = { minerals: 50, energy: 25 };
const ALLOYS_PRODUCED = 1;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Math.max(1, Math.min(100, Number(body.amount) || 1));

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });

  const resources = JSON.parse(user.resources);
  const neededMinerals = REFINE_COST.minerals * amount;
  const neededEnergy = REFINE_COST.energy * amount;

  if (resources.minerals < neededMinerals || resources.energy < neededEnergy) {
    return NextResponse.json({
      error: `Nicht genug Ressourcen. Benötigt: ${neededMinerals} Mineralien, ${neededEnergy} Energie.`,
    }, { status: 400 });
  }

  resources.minerals -= neededMinerals;
  resources.energy -= neededEnergy;
  resources.alloys = (resources.alloys || 0) + ALLOYS_PRODUCED * amount;

  await prisma.user.update({
    where: { id: user.id },
    data: { resources: JSON.stringify(resources) },
  });

  await logActivity(user.id, "refine", `${ALLOYS_PRODUCED * amount} Legierung(en) produziert.`, { amount });
  return NextResponse.json({
    success: true,
    produced: ALLOYS_PRODUCED * amount,
    resources,
  });
}
