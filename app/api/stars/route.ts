import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stars = await prisma.star.findMany({
    select: {
      id: true,
      name: true,
      sector: true,
      ring: true,
      angleOffset: true,
      ownerFactionId: true,
      controllerId: true,
      resources: true,
      ownerFaction: {
        select: { id: true, name: true },
      },
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(stars);
}
