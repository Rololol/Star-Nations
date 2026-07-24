import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const factions = await prisma.faction.findMany({
    select: { id: true, name: true, lore: true, bonuses: true },
  });
  return NextResponse.json(factions);
}
