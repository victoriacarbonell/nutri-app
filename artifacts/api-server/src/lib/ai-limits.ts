import type { RequestHandler } from "express";
import { db, aiRequestsTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { HttpError } from "./http-error";

// AI usage per user per calendar day (server time zone).
// Every OpenAI call costs money; this caps the spend per user.
export const AI_DAILY_LIMIT = Math.max(0, Number(process.env.AI_DAILY_LIMIT ?? 20) || 0);

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function aiUsage(userId: number): Promise<{ used: number; limit: number; remaining: number }> {
  const [row] = await db.select({ count: sql<number>`count(*)` })
    .from(aiRequestsTable)
    .where(and(eq(aiRequestsTable.userId, userId), gte(aiRequestsTable.createdAt, startOfToday())));
  const used = Number(row?.count ?? 0);
  return { used, limit: AI_DAILY_LIMIT, remaining: Math.max(0, AI_DAILY_LIMIT - used) };
}

export const enforceAiLimit: RequestHandler = async (req, _res, next) => {
  const { used, limit } = await aiUsage(req.userId);
  if (used >= limit) {
    throw new HttpError(
      429,
      "ai_limit_reached",
      `Has alcanzado el límite diario de ${limit} usos de la IA. Vuelve a intentarlo mañana.`,
    );
  }
  next();
};

// The call is recorded even if the reply can't be used afterwards:
// the cost has already been incurred.
export async function recordAiRequest(userId: number, kind: string): Promise<void> {
  await db.insert(aiRequestsTable).values({ userId, kind });
}
