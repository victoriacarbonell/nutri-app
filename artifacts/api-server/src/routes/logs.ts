import { Router } from "express";
import { db, logEntriesTable, exercisesTable, foodsTable, recipesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { scaleMacros, recipeMacrosForGrams, sumMacros, type Macros } from "@workspace/shared";
import {
  GetDayLogParams,
  CreateLogEntryParams,
  CreateLogEntryBody,
  UpdateLogEntryParams,
  UpdateLogEntryBody,
  DeleteLogEntryParams,
} from "@workspace/api-zod";
import { HttpError, notFound } from "../lib/http-error";

const router = Router();

const MEAL_TYPES = ["desayuno", "almuerzo", "comida", "merienda", "cena", "snacks"] as const;

type LogEntryRow = typeof logEntriesTable.$inferSelect;

// Adjunta el alimento o la receta a cada entrada con dos consultas en total,
// en vez de dos por entrada.
async function enrichEntries(entries: LogEntryRow[]) {
  const foodIds = [...new Set(entries.flatMap((e) => (e.foodId ? [e.foodId] : [])))];
  const recipeIds = [...new Set(entries.flatMap((e) => (e.recipeId ? [e.recipeId] : [])))];
  const [foods, recipes] = await Promise.all([
    foodIds.length ? db.select().from(foodsTable).where(inArray(foodsTable.id, foodIds)) : [],
    recipeIds.length ? db.select().from(recipesTable).where(inArray(recipesTable.id, recipeIds)) : [],
  ]);
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  return entries.map((entry) => ({
    ...entry,
    food: entry.foodId ? foodById.get(entry.foodId) ?? null : null,
    recipe: entry.recipeId ? recipeById.get(entry.recipeId) ?? null : null,
  }));
}

async function buildDayLog(userId: number, date: string) {
  const [entries, exercises] = await Promise.all([
    db.select().from(logEntriesTable).where(and(eq(logEntriesTable.userId, userId), eq(logEntriesTable.date, date))),
    db.select().from(exercisesTable).where(and(eq(exercisesTable.userId, userId), eq(exercisesTable.date, date))),
  ]);
  const enriched = await enrichEntries(entries);

  const meals = MEAL_TYPES.map((mealType) => {
    const mealEntries = enriched.filter((e) => e.mealType === mealType);
    const totals = sumMacros(mealEntries);
    return {
      mealType,
      entries: mealEntries,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
    };
  });

  const totals = sumMacros(enriched);
  const caloriesBurned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);

  return {
    date,
    meals,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    exercises,
    caloriesBurned,
  };
}

// Macros de una entrada a partir de su alimento o receta y los gramos.
async function macrosForEntry(
  userId: number,
  ref: { foodId?: number | null; recipeId?: number | null },
  grams: number,
): Promise<Macros> {
  if (ref.foodId) {
    const [food] = await db.select().from(foodsTable).where(and(eq(foodsTable.id, ref.foodId), eq(foodsTable.userId, userId)));
    if (!food) throw notFound("Alimento");
    return scaleMacros(food, grams);
  }
  if (ref.recipeId) {
    const [recipe] = await db.select().from(recipesTable).where(and(eq(recipesTable.id, ref.recipeId), eq(recipesTable.userId, userId)));
    if (!recipe) throw notFound("Receta");
    return recipeMacrosForGrams(recipe, grams);
  }
  throw new HttpError(400, "validation_error", "Indica un alimento (foodId) o una receta (recipeId)");
}

router.get("/:date", async (req, res) => {
  const { date } = GetDayLogParams.parse({ date: req.params.date });
  res.json(await buildDayLog(req.userId, date));
});

router.post("/:date/entries", async (req, res) => {
  const { date } = CreateLogEntryParams.parse({ date: req.params.date });
  const body = CreateLogEntryBody.parse(req.body);
  const macros = await macrosForEntry(req.userId, body, body.amountGrams);

  const [entry] = await db.insert(logEntriesTable).values({
    userId: req.userId,
    date,
    mealType: body.mealType,
    foodId: body.foodId ?? null,
    recipeId: body.recipeId ?? null,
    amountGrams: body.amountGrams,
    ...macros,
  }).returning();

  const [enriched] = await enrichEntries([entry]);
  res.status(201).json(enriched);
});

router.put("/:date/entries/:entryId", async (req, res) => {
  const { entryId } = UpdateLogEntryParams.parse({ date: req.params.date, entryId: req.params.entryId });
  const body = UpdateLogEntryBody.parse(req.body);

  const [existing] = await db.select().from(logEntriesTable)
    .where(and(eq(logEntriesTable.id, entryId), eq(logEntriesTable.userId, req.userId)));
  if (!existing) throw notFound("Registro");

  const macros = await macrosForEntry(req.userId, existing, body.amountGrams);
  const [updated] = await db.update(logEntriesTable)
    .set({ amountGrams: body.amountGrams, ...macros })
    .where(eq(logEntriesTable.id, entryId))
    .returning();

  const [enriched] = await enrichEntries([updated]);
  res.json(enriched);
});

router.delete("/:date/entries/:entryId", async (req, res) => {
  const { entryId } = DeleteLogEntryParams.parse({ date: req.params.date, entryId: req.params.entryId });
  const deleted = await db.delete(logEntriesTable)
    .where(and(eq(logEntriesTable.id, entryId), eq(logEntriesTable.userId, req.userId)))
    .returning({ id: logEntriesTable.id });
  if (!deleted.length) throw notFound("Registro");
  res.status(204).end();
});

export { buildDayLog };
export default router;
