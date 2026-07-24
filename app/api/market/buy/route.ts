import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const TAX_RATE = 0.05;

// POST /api/market/buy
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const { offerId, quantity } = await req.json();
  if (!offerId || !quantity || quantity < 1) {
    return NextResponse.json({ error: "offerId und quantity erforderlich." }, { status: 400 });
  }

  const offer = await prisma.tradeOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "active" || offer.remaining < quantity) {
    return NextResponse.json({ error: "Angebot nicht verfügbar." }, { status: 400 });
  }
  if (offer.sellerId === session.userId) {
    return NextResponse.json({ error: "Eigenes Angebot nicht kaufbar." }, { status: 400 });
  }

  const totalCost = offer.pricePerUnit * quantity;
  const tax = Math.ceil(totalCost * TAX_RATE);
  const sellerGets = totalCost - tax;

  const buyer = await prisma.user.findUnique({ where: { id: session.userId } });
  const seller = await prisma.user.findUnique({ where: { id: offer.sellerId } });
  if (!buyer || !seller) return NextResponse.json({ error: "Spieler nicht gefunden." }, { status: 404 });

  const buyerRes = JSON.parse(buyer.resources);
  const sellerRes = JSON.parse(seller.resources);

  if (offer.isBuyOrder) {
    // Seller is BUYING this resource → buyer pays with resource, gets credits
    if ((buyerRes[offer.resourceType] || 0) < quantity) {
      return NextResponse.json({ error: `Nicht genug ${offer.resourceType}.` }, { status: 400 });
    }
    buyerRes[offer.resourceType] -= quantity;
    buyerRes.credits = (buyerRes.credits || 0) + (totalCost - tax);
    sellerRes[offer.resourceType] = (sellerRes[offer.resourceType] || 0) + quantity;
    sellerRes.credits = (sellerRes.credits || 0) - totalCost;
  } else {
    // Normal sell order: buyer pays credits, gets resource
    if ((buyerRes.credits || 0) < totalCost) {
      return NextResponse.json({ error: `Nicht genug Credits. Brauche: ${totalCost}.` }, { status: 400 });
    }
    buyerRes.credits -= totalCost;
    buyerRes[offer.resourceType] = (buyerRes[offer.resourceType] || 0) + quantity;
    sellerRes.credits = (sellerRes.credits || 0) + sellerGets;
  }

  await prisma.user.update({ where: { id: buyer.id }, data: { resources: JSON.stringify(buyerRes) } });
  await prisma.user.update({ where: { id: seller.id }, data: { resources: JSON.stringify(sellerRes) } });

  const newRemaining = offer.remaining - quantity;
  await prisma.tradeOffer.update({
    where: { id: offer.id },
    data: { remaining: newRemaining, status: newRemaining === 0 ? "completed" : "active" },
  });

  await prisma.tradeHistory.create({
    data: {
      offerId: offer.id, resourceType: offer.resourceType, amount: quantity,
      pricePerUnit: offer.pricePerUnit, totalPrice: totalCost,
      sellerId: seller.id, buyerId: buyer.id, taxPaid: tax,
    },
  });

  return NextResponse.json({ success: true, bought: quantity, cost: totalCost, tax, resources: buyerRes });
}
