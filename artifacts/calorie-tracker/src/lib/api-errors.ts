import { ApiError } from "@workspace/api-client-react";

/** The API's error message (`{ message }`), or the fallback text if there isn't one. */
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
