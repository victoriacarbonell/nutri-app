import { useSearch } from "wouter";
import { format, isFuture, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { QueryClient } from "@tanstack/react-query";
import { getGetDayLogQueryKey } from "@workspace/api-client-react";

export const MEAL_TYPES = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "comida", label: "Comida" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
  { value: "snacks", label: "Snacks" },
] as const;

export type MealType = (typeof MEAL_TYPES)[number]["value"];

export const DEFAULT_MEAL: MealType = "almuerzo";

export function isMealType(value: unknown): value is MealType {
  return MEAL_TYPES.some((m) => m.value === value);
}

export function mealLabel(value: string): string {
  return MEAL_TYPES.find((m) => m.value === value)?.label ?? value;
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export interface LogTarget {
  /** Day to log to, YYYY-MM-DD. */
  date: string;
  /** Meal preselected by whoever opened the page, if any. */
  meal: MealType | null;
  isToday: boolean;
  /** "hoy" or e.g. "12 de noviembre", for UI text. */
  dateLabel: string;
  /** Query string to pass the same target on to another page ("" when it's today with no meal). */
  query: string;
}

/**
 * Where a food or recipe gets logged, read from the URL: `?date=YYYY-MM-DD&meal=cena`.
 * Home's "+" buttons and the calendar link here with those params. Invalid or
 * future dates fall back to today.
 */
export function useLogTarget(): LogTarget {
  const params = new URLSearchParams(useSearch());
  const today = todayString();
  const rawDate = params.get("date");
  const parsed = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? parseISO(rawDate) : null;
  const date = parsed && isValid(parsed) && !isFuture(parsed) ? rawDate! : today;
  const rawMeal = params.get("meal");
  const meal = isMealType(rawMeal) ? rawMeal : null;
  const isToday = date === today;

  const query = new URLSearchParams();
  if (!isToday) query.set("date", date);
  if (meal) query.set("meal", meal);
  const qs = query.toString();

  return {
    date,
    meal,
    isToday,
    dateLabel: isToday ? "hoy" : format(parseISO(date), "d 'de' MMMM", { locale: es }),
    query: qs ? `?${qs}` : "",
  };
}

/** Refreshes everything that depends on a day's log after adding or removing an entry. */
export function invalidateDayData(queryClient: QueryClient, date: string): void {
  queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(date) });
  // Today's summary, calendar and stats all live under /api/dashboard.
  queryClient.invalidateQueries({
    predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/dashboard"),
  });
}
