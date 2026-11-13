import type { RequestHandler } from "express";
import { DEFAULT_USER_ID } from "../lib/users";

// Pone en req.userId el dueño de los datos de la petición. Hasta que haya
// autenticación (punto 4) es siempre el usuario por defecto; después saldrá
// de la sesión o del token.
export const attachCurrentUser: RequestHandler = (req, _res, next) => {
  req.userId = DEFAULT_USER_ID;
  next();
};
