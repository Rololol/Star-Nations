import { prisma } from "./prisma";

export async function logActivity(userId: number, action: string, detail: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, detail, metadata: metadata ? JSON.stringify(metadata) : null },
    });
  } catch { /* non-critical */ }
}
