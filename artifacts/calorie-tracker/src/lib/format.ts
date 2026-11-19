// Formato de los valores nutricionales en pantalla. El API guarda los valores
// exactos (con decimales); aquí solo se redondean para mostrarlos.

/** Calorías: sin decimales. */
export function formatKcal(value: number | null | undefined): string {
  return String(Math.round(value ?? 0));
}

/** Gramos: un decimal como mucho, y ninguno a partir de 10 g. */
export function formatGrams(value: number | null | undefined): string {
  const n = value ?? 0;
  return String(Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
}
