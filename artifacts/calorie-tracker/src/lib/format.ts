// On-screen formatting of nutrition values. The API stores exact values
// (with decimals); here they're only rounded for display.

/** Calories: no decimals. */
export function formatKcal(value: number | null | undefined): string {
  return String(Math.round(value ?? 0));
}

/** Grams: at most one decimal, and none from 10 g up. */
export function formatGrams(value: number | null | undefined): string {
  const n = value ?? 0;
  return String(Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
}
