import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-Mail und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { faction: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten." },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.userId = user.id;
    session.displayName = user.displayName;
    session.factionId = user.factionId;
    session.factionName = user.faction.name;
    await session.save();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      factionId: user.factionId,
      factionName: user.faction.name,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Anmeldefehler. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
