import { ApiError } from "@workspace/api-client-react";

/** Mensaje de error del API (`{ message }`) o, si no lo hay, el texto por defecto. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const message = (error.data as { message?: unknown } | null)?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}
