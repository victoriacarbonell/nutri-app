// Fechas de calendario en formato YYYY-MM-DD, sin pasar por la zona horaria
// UTC: toISOString() devolvía el día anterior entre medianoche y la 1 o las 2
// en España, y el resumen de "hoy" no coincidía con el diario del front.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Fecha de hoy según la zona horaria del servidor. */
export function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Suma días a una fecha YYYY-MM-DD. Usa aritmética UTC para que no influya la zona horaria. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/**
 * El cliente manda su fecha local en `date` para que "hoy" sea el suyo y no
 * el del servidor. Si no la manda, se usa la del servidor.
 */
export function resolveDate(input: string | undefined | null): string {
  return input && isIsoDate(input) ? input : todayLocal();
}
