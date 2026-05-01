import { Router } from "express";
import { db } from "@workspace/db";
import {
  logEntriesTable, exercisesTable, foodsTable, recipesTable, userProfileTable
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  GetDayLogParams,
  CreateLogEntryParams,
  CreateLogEntryBody,
  UpdateLogEntryParams,
  UpdateLogEntryBody,
  DeleteLogEntryParams,
  GetExercisesQueryParams,
  CreateExerciseBody,
  DeleteExerciseParams,
} from "@workspace/api-zod";

const router = Router();

const MEAL_TYPES = ["desayuno", "almuerzo", "comida", "merienda", "cena", "snacks"] as const;

async function buildDayLog(date: string) {
  const entries = await db.select().from(logEntriesTable).where(eq(logEntriesTable.date, date));
  const exercises = await db.select().from(exercisesTable).where(eq(exercisesTable.date, date));

  const enriched = await Promise.all(entries.map(async (entry) => {
    let food = null;
    let recipe = null;
    if (entry.foodId) {
      food = await db.select().from(foodsTable).where(eq(foodsTable.id, entry.foodId)).then(r => r[0] ?? null);
    }
    if (entry.recipeId) {
      recipe = await db.select().from(recipesTable).where(eq(recipesTable.id, entry.recipeId)).then(r => r[0] ?? null);
    }
    return { ...entry, food, recipe };
  }));

  const meals = MEAL_TYPES.map(mealType => {
    const mealEntries = enriched.filter(e => e.mealType === mealType);
    return {
      mealType,
      entries: mealEntries,
      totalCalories: mealEntries.reduce((s, e) => s + e.calories, 0),
      totalProtein: mealEntries.reduce((s, e) => s + e.protein, 0),
      totalCarbs: mealEntries.reduce((s, e) => s + e.carbs, 0),
      totalFat: mealEntries.reduce((s, e) => s + e.fat, 0),
    };
  });

  const caloriesBurned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);

  return {
    date,
    meals,
    totalCalories: enriched.reduce((s, e) => s + e.calories, 0),
    totalProtein: enriched.reduce((s, e) => s + e.protein, 0),
    totalCarbs: enriched.reduce((s, e) => s + e.carbs, 0),
    totalFat: enriched.reduce((s, e) => s + e.fat, 0),
    exercises,
    caloriesBurned,
  };
}

router.get("/:date", async (req, res) => {
  const { date } = GetDayLogParams.parse({ date: req.params.date });
  return res.json(await buildDayLog(date));
});

router.post("/:date/entries", async (req, res) => {
  const { date } = CreateLogEntryParams.parse({ date: req.params.date });
  const body = CreateLogEntryBody.parse(req.body);

  let calories = 0, protein = 0, carbs = 0, fat = 0;

  if (body.foodId) {
    const food = await db.select().from(foodsTable).where(eq(foodsTable.id, body.foodId)).then(r => r[0]);
    if (food) {
      const factor = body.amountGrams / 100;
      calories = food.caloriesPer100g * factor;
      protein = food.proteinPer100g * factor;
      carbs = food.carbsPer100g * factor;
      fat = food.fatPer100g * factor;
    }
  } else if (body.recipeId) {
    const recipe = await db.select().from(recipesTable).where(eq(recipesTable.id, body.recipeId)).then(r => r[0]);
    if (recipe) {
      const servingRatio = body.amountGrams / (recipe.totalGrams / recipe.servings);
      calories = recipe.caloriesPerServing * servingRatio;
      protein = recipe.proteinPerServing * servingRatio;
      carbs = recipe.carbsPerServing * servingRatio;
      fat = recipe.fatPerServing * servingRatio;
    }
  }

  const [entry] = await db.insert(logEntriesTable).values({
    date,
    mealType: body.mealType,
    foodId: body.foodId ?? null,
    recipeId: body.recipeId ?? null,
    amountGrams: body.amountGrams,
    calories,
    protein,
    carbs,
    fat,
  }).returning();

  let food = null;
  let recipe = null;
  if (entry.foodId) food = await db.select().from(foodsTable).where(eq(foodsTable.id, entry.foodId)).then(r => r[0] ?? null);
  if (entry.recipeId) recipe = await db.select().from(recipesTable).where(eq(recipesTable.id, entry.recipeId)).then(r => r[0] ?? null);

  return res.status(201).json({ ...entry, food, recipe });
});

router.put("/:date/entries/:entryId", async (req, res) => {
  const { date } = CreateLogEntryParams.parse({ date: req.params.date });
  const { entryId } = UpdateLogEntryParams.parse({ date, entryId: Number(req.params.entryId) });
  const body = UpdateLogEntryBody.parse(req.body);

  const existing = await db.select().from(logEntriesTable).where(eq(logEntriesTable.id, entryId)).then(r => r[0]);
  if (!existing) return res.status(404).json({ error: "Not found" });

  let calories = 0, protein = 0, carbs = 0, fat = 0;
  if (existing.foodId) {
    const food = await db.select().from(foodsTable).where(eq(foodsTable.id, existing.foodId)).then(r => r[0]);
    if (food) {
      const factor = body.amountGrams / 100;
      calories = food.caloriesPer100g * factor;
      protein = food.proteinPer100g * factor;
      carbs = food.carbsPer100g * factor;
      fat = food.fatPer100g * factor;
    }
  } else if (existing.recipeId) {
    const recipe = await db.select().from(recipesTable).where(eq(recipesTable.id, existing.recipeId)).then(r => r[0]);
    if (recipe) {
      const servingRatio = body.amountGrams / (recipe.totalGrams / recipe.servings);
      calories = recipe.caloriesPerServing * servingRatio;
      protein = recipe.proteinPerServing * servingRatio;
      carbs = recipe.carbsPerServing * servingRatio;
      fat = recipe.fatPerServing * servingRatio;
    }
  }

  const [updated] = await db.update(logEntriesTable)
    .set({ amountGrams: body.amountGrams, calories, protein, carbs, fat })
    .where(eq(logEntriesTable.id, entryId))
    .returning();

  let food = null;
  let recipe = null;
  if (updated.foodId) food = await db.select().from(foodsTable).where(eq(foodsTable.id, updated.foodId)).then(r => r[0] ?? null);
  if (updated.recipeId) recipe = await db.select().from(recipesTable).where(eq(recipesTable.id, updated.recipeId)).then(r => r[0] ?? null);

  return res.json({ ...updated, food, recipe });
});

router.delete("/:date/entries/:entryId", async (req, res) => {
  const { entryId } = DeleteLogEntryParams.parse({ date: req.params.date, entryId: Number(req.params.entryId) });
  await db.delete(logEntriesTable).where(eq(logEntriesTable.id, entryId));
  return res.status(204).end();
});

// Exercise routes
router.get("/exercises/all", async (req, res) => {
  const params = GetExercisesQueryParams.parse(req.query);
  const where = params.date ? eq(exercisesTable.date, params.date) : undefined;
  const exercises = await db.select().from(exercisesTable).where(where);
  return res.json(exercises);
});

router.post("/exercises", async (req, res) => {
  const body = CreateExerciseBody.parse(req.body);
  const [exercise] = await db.insert(exercisesTable).values(body).returning();
  return res.status(201).json(exercise);
});

router.delete("/exercises/:id", async (req, res) => {
  const { id } = DeleteExerciseParams.parse({ id: Number(req.params.id) });
  await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
  return res.status(204).end();
});

export { buildDayLog };
export default router;
