// Calendar dates as YYYY-MM-DD, without going through UTC: toISOString()
// returned the previous day between midnight and 1 or 2 a.m. in Spain, so the
// "today" summary didn't match the front end's diary.

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

/** Today's date in the server's time zone. */
export function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Adds days to a YYYY-MM-DD date. Uses UTC arithmetic so the time zone has no effect. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/**
 * The client sends its local date in `date`, so "today" is the user's and not
 * the server's. Without it, the server's date is used.
 */
export function resolveDate(input: string | undefined | null): string {
  return input && isIsoDate(input) ? input : todayLocal();
}
