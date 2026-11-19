import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { CookieOptions } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq, and, gt, lt } from "drizzle-orm";

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

// scrypt viene con Node, así que no hace falta bcrypt ni argon2, que son
// módulos nativos y complican el empaquetado con esbuild.
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const key = await scrypt(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const SESSION_COOKIE = "nutriapp_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ id: hashToken(token), userId, expiresAt });
  // Limpieza barata de sesiones caducadas, aprovechando que alguien entra.
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
  return { token, expiresAt };
}

export async function findSessionUserId(token: string): Promise<number | null> {
  const [session] = await db.select({ userId: sessionsTable.userId })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, hashToken(token)), gt(sessionsTable.expiresAt, new Date())));
  return session?.userId ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, hashToken(token)));
}

export function sessionCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    // En producción la cookie solo viaja por HTTPS.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}
