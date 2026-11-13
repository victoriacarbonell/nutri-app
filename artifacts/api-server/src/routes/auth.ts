import { Router, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  SESSION_COOKIE,
  createSession,
  deleteSession,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
} from "../lib/auth";
import { HttpError, notFound } from "../lib/http-error";
import { requireUser } from "../middlewares/current-user";

const router = Router();

type User = typeof usersTable.$inferSelect;

function toAuthUser(user: User) {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

async function startSession(res: Response, userId: number) {
  const { token, expiresAt } = await createSession(userId);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

router.post("/register", async (req, res) => {
  const body = RegisterBody.parse(req.body);

  // Con SIGNUP_CODE definido, solo puede registrarse quien lo conozca.
  const signupCode = process.env.SIGNUP_CODE;
  if (signupCode && body.inviteCode !== signupCode) {
    throw new HttpError(403, "invalid_invite_code", "Código de invitación incorrecto");
  }

  const email = body.email.trim().toLowerCase();
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) throw new HttpError(409, "email_taken", "Ya existe una cuenta con ese email");

  const [user] = await db.insert(usersTable)
    .values({ email, passwordHash: await hashPassword(body.password) })
    .returning();

  await startSession(res, user.id);
  res.status(201).json(toAuthUser(user));
});

router.post("/login", async (req, res) => {
  const body = LoginBody.parse(req.body);
  const email = body.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  // Mismo mensaje si el email no existe o la contraseña falla, para no
  // revelar qué emails tienen cuenta.
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new HttpError(401, "invalid_credentials", "Email o contraseña incorrectos");
  }

  await startSession(res, user.id);
  res.json(toAuthUser(user));
});

router.post("/logout", async (req, res) => {
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[SESSION_COOKIE];
  if (token) await deleteSession(token);
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).end();
});

router.get("/me", requireUser, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) throw notFound("Usuario");
  res.json(toAuthUser(user));
});

export default router;
