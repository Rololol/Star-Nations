import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const history = await prisma.tradeHistory.findMany({
    where: { OR: [{ sellerId: session.userId }, { buyerId: session.userId }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(history);
}
