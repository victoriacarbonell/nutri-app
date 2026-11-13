// Error con código HTTP. El gestor de errores (middlewares/error-handler.ts)
// lo convierte en una respuesta JSON con ese estado.
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function notFound(what: string): HttpError {
  return new HttpError(404, "not_found", `${what} no encontrado`);
}
