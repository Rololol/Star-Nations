import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: number;
  displayName: string;
  factionId: number;
  factionName: string;
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || "a-very-long-and-secure-secret-key-at-least-32-chars!!",
  cookieName: "star-nations-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    userId: session.userId,
    displayName: session.displayName,
    factionId: session.factionId,
    factionName: session.factionName,
  };
}
