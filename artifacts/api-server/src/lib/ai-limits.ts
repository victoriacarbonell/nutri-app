import type { RequestHandler } from "express";
import { db, aiRequestsTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { HttpError } from "./http-error";

// Usos de la IA por usuario y día natural (zona horaria del servidor).
// Cada llamada a OpenAI cuesta dinero; esto acota el gasto por usuario.
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

// Se registra la llamada aunque luego la respuesta no se pueda interpretar:
// el coste ya se ha producido.
export async function recordAiRequest(userId: number, kind: string): Promise<void> {
  await db.insert(aiRequestsTable).values({ userId, kind });
}
