import type { RequestHandler } from "express";
import { SESSION_COOKIE, findSessionUserId, sessionCookieOptions } from "../lib/auth";
import { HttpError } from "../lib/http-error";

// Pone en req.userId el dueño de los datos de la petición a partir de la
// cookie de sesión. Sin sesión válida responde 401.
export const requireUser: RequestHandler = async (req, res, next) => {
  const token = (req.cookies as Record<string, string | undefined> | undefined)?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, "unauthorized", "Inicia sesión para continuar");

  const userId = await findSessionUserId(token);
  if (!userId) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    throw new HttpError(401, "unauthorized", "La sesión ha caducado. Vuelve a iniciar sesión");
  }

  req.userId = userId;
  next();
};
