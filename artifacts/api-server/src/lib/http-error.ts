// Error with an HTTP status. The error handler (middlewares/error-handler.ts)
// turns it into a JSON response with that status.
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
