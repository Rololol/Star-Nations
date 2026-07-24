import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RESOURCE_LABELS } from "@/lib/factories";

const TAX_RATE = 0.05;

// GET /api/market?filter=sell|buy|my — list offers
export async function GET(req: NextRequest) {
  const session = await getSession();
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";

  const where: Record<string, unknown> = { status: "active" };
  if (filter === "sell") where.isBuyOrder = false;
  else if (filter === "buy") where.isBuyOrder = true;
  else if (filter === "my" && session.userId) where.sellerId = session.userId;

  const offers = await prisma.tradeOffer.findMany({
    where,
    include: {
      seller: { select: { id: true, displayName: true, factionId: true } },
      buyer: { select: { id: true, displayName: true, factionId: true } },
    },
    orderBy: { pricePerUnit: "asc" },
  });

  return NextResponse.json(offers);
}

// POST /api/market — create offer
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const { resourceType, amount, pricePerUnit, isBuyOrder, buyerId } = await req.json();
  if (!resourceType || !amount || !pricePerUnit || amount < 1 || pricePerUnit < 1) {
    return NextResponse.json({ error: "Ungültige Parameter." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });

  const resources = JSON.parse(user.resources);
  const totalCost = pricePerUnit * amount;

  if (isBuyOrder) {
    // Buying: need credits to lock up
    if ((resources.credits || 0) < totalCost) {
      return NextResponse.json({ error: "Nicht genug Credits." }, { status: 400 });
    }
    resources.credits -= totalCost;
  } else {
    // Selling: need the resource
    if ((resources[resourceType] || 0) < amount) {
      return NextResponse.json({ error: `Nicht genug ${resourceType}.` }, { status: 400 });
    }
    resources[resourceType] -= amount;
  }

  await prisma.user.update({ where: { id: user.id }, data: { resources: JSON.stringify(resources) } });

  const offer = await prisma.tradeOffer.create({
    data: { sellerId: user.id, buyerId: buyerId || null, resourceType, amount, remaining: amount, pricePerUnit, isBuyOrder },
  });

  return NextResponse.json({ success: true, offer, resources }, { status: 201 });
}

// PATCH /api/market — cancel own offer
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const { offerId } = await req.json();
  const offer = await prisma.tradeOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.sellerId !== session.userId) return NextResponse.json({ error: "Nicht dein Angebot." }, { status: 403 });
  if (offer.status !== "active") return NextResponse.json({ error: "Bereits abgeschlossen." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });

  const resources = JSON.parse(user.resources);
  if (offer.isBuyOrder) {
    resources.credits = (resources.credits || 0) + offer.pricePerUnit * offer.remaining;
  } else {
    resources[offer.resourceType] = (resources[offer.resourceType] || 0) + offer.remaining;
  }

  await prisma.tradeOffer.update({ where: { id: offerId }, data: { status: "cancelled", remaining: 0 } });
  await prisma.user.update({ where: { id: user.id }, data: { resources: JSON.stringify(resources) } });

  return NextResponse.json({ success: true, resources });
}
