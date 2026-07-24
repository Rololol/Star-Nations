import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, displayName, password, factionId } = await req.json();

    if (!email || !displayName || !password || !factionId) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 6 Zeichen lang sein." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Diese E-Mail wird bereits verwendet." },
        { status: 409 }
      );
    }

    const existingName = await prisma.user.findUnique({
      where: { displayName },
    });
    if (existingName) {
      return NextResponse.json(
        { error: "Dieser Spielename ist bereits vergeben." },
        { status: 409 }
      );
    }

    const faction = await prisma.faction.findUnique({
      where: { id: factionId },
    });
    if (!faction) {
      return NextResponse.json(
        { error: "Ungültige Fraktion." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        factionId,
      },
    });

    // Assign faction home system to new player (first unclaimed star of their faction)
    const homeStar = await prisma.star.findFirst({
      where: { ownerFactionId: factionId, controllerId: null },
      orderBy: { id: "asc" },
    });
    if (homeStar) {
      await prisma.star.update({
        where: { id: homeStar.id },
        data: { controllerId: user.id },
      });
      await prisma.company.create({
        data: {
          name: `${displayName}'s Mine`,
          ownerId: user.id,
          starId: homeStar.id,
          reactorLevel: 1,
          storageLevel: 1,
          currentPP: 0,
          companyType: "mineral",
        },
      });
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        factionId: user.factionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registrierungsfehler. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
