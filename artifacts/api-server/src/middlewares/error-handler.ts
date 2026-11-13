import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error";

// Ruta /api desconocida: JSON en vez de la página HTML de Express.
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: "not_found", message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

interface BodyParserError extends Error {
  type?: string;
  status?: number;
  expose?: boolean;
}

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

function isZodError(err: unknown): err is ZodError {
  // instanceof puede fallar si hay dos copias de zod; el nombre no.
  return err instanceof ZodError || (err instanceof Error && err.name === "ZodError" && "issues" in err);
}

// Express 5 pasa aquí tanto los errores lanzados como las promesas
// rechazadas de las rutas, así que no hace falta envolver cada handler.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (isZodError(err)) {
    res.status(400).json({
      error: "validation_error",
      message: "Datos no válidos",
      issues: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  // Errores de body-parser (JSON mal formado, cuerpo demasiado grande, ...).
  const bodyError = err as BodyParserError;
  if (typeof bodyError.type === "string" && bodyError.type.startsWith("entity.")) {
    const status = bodyError.status ?? 400;
    res.status(status).json({
      error: status === 413 ? "payload_too_large" : "invalid_body",
      message: status === 413 ? "El cuerpo de la petición es demasiado grande" : "El cuerpo de la petición no es válido",
    });
    return;
  }

  // Violaciones de restricciones de PostgreSQL. Drizzle envuelve el error del
  // driver en DrizzleQueryError y deja el original en `cause`.
  const pgError = ((err as Error & { cause?: unknown }).cause ?? err) as PgError;
  if (pgError.code === "23503") {
    res.status(409).json({ error: "conflict", message: "No se puede borrar: otros registros dependen de este" });
    return;
  }
  if (pgError.code === "23505") {
    res.status(409).json({ error: "duplicate", message: "Ya existe un registro con esos datos" });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error", message: "Error interno del servidor" });
};
