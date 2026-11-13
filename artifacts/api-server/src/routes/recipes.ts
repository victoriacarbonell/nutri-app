import { Router } from "express";
import { db, recipesTable, recipeIngredientsTable, foodsTable } from "@workspace/db";
import { eq, and, ilike, inArray } from "drizzle-orm";
import { recipeTotals } from "@workspace/shared";
import {
  GetRecipesQueryParams,
  CreateRecipeBody,
  GetRecipeParams,
  UpdateRecipeParams,
  UpdateRecipeBody,
  DeleteRecipeParams,
} from "@workspace/api-zod";
import { HttpError, notFound } from "../lib/http-error";

const router = Router();

type IngredientInput = { foodId: number; amountGrams: number };

// Carga los alimentos de los ingredientes (solo los del usuario) y calcula
// los totales de la receta con la misma función que usa el front.
async function computeRecipe(userId: number, ingredients: IngredientInput[], servings: number) {
  const foodIds = [...new Set(ingredients.map((i) => i.foodId))];
  const foods = await db.select().from(foodsTable)
    .where(and(eq(foodsTable.userId, userId), inArray(foodsTable.id, foodIds)));
  const foodById = new Map(foods.map((f) => [f.id, f]));
  const missing = foodIds.filter((id) => !foodById.has(id));
  if (missing.length) {
    throw new HttpError(400, "validation_error", `Ingredientes no encontrados: ${missing.join(", ")}`);
  }
  const totals = recipeTotals(
    ingredients.map((i) => ({ food: foodById.get(i.foodId)!, amountGrams: i.amountGrams })),
    servings,
  );
  return {
    totalGrams: totals.totalGrams,
    caloriesPerServing: totals.perServing.calories,
    proteinPerServing: totals.perServing.protein,
    carbsPerServing: totals.perServing.carbs,
    fatPerServing: totals.perServing.fat,
  };
}

router.get("/", async (req, res) => {
  const params = GetRecipesQueryParams.parse(req.query);
  const conditions = [eq(recipesTable.userId, req.userId)];
  if (params.q) conditions.push(ilike(recipesTable.name, `%${params.q}%`));
  const recipes = await db.select().from(recipesTable).where(and(...conditions)).orderBy(recipesTable.name);
  res.json(recipes);
});

router.post("/", async (req, res) => {
  const body = CreateRecipeBody.parse(req.body);
  const { ingredients, ...recipeData } = body;
  const servings = recipeData.servings ?? 1;
  const computed = await computeRecipe(req.userId, ingredients, servings);

  const recipe = await db.transaction(async (tx) => {
    const [created] = await tx.insert(recipesTable).values({
      ...recipeData,
      userId: req.userId,
      servings,
      ...computed,
    }).returning();
    await tx.insert(recipeIngredientsTable).values(
      ingredients.map((ing) => ({ recipeId: created.id, foodId: ing.foodId, amountGrams: ing.amountGrams })),
    );
    return created;
  });

  res.status(201).json(recipe);
});

router.get("/:id", async (req, res) => {
  const { id } = GetRecipeParams.parse({ id: req.params.id });
  const [recipe] = await db.select().from(recipesTable)
    .where(and(eq(recipesTable.id, id), eq(recipesTable.userId, req.userId)));
  if (!recipe) throw notFound("Receta");

  const rows = await db.select({
    id: recipeIngredientsTable.id,
    recipeId: recipeIngredientsTable.recipeId,
    foodId: recipeIngredientsTable.foodId,
    amountGrams: recipeIngredientsTable.amountGrams,
    food: foodsTable,
  }).from(recipeIngredientsTable)
    .innerJoin(foodsTable, eq(foodsTable.id, recipeIngredientsTable.foodId))
    .where(eq(recipeIngredientsTable.recipeId, id));

  res.json({ ...recipe, ingredients: rows });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateRecipeParams.parse({ id: req.params.id });
  const body = UpdateRecipeBody.parse(req.body);
  const { ingredients, ...recipeData } = body;

  const [existing] = await db.select({ id: recipesTable.id }).from(recipesTable)
    .where(and(eq(recipesTable.id, id), eq(recipesTable.userId, req.userId)));
  if (!existing) throw notFound("Receta");

  const servings = recipeData.servings ?? 1;
  const computed = await computeRecipe(req.userId, ingredients, servings);

  const updated = await db.transaction(async (tx) => {
    await tx.delete(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));
    await tx.insert(recipeIngredientsTable).values(
      ingredients.map((ing) => ({ recipeId: id, foodId: ing.foodId, amountGrams: ing.amountGrams })),
    );
    const [row] = await tx.update(recipesTable)
      .set({ ...recipeData, servings, ...computed })
      .where(eq(recipesTable.id, id))
      .returning();
    return row;
  });

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteRecipeParams.parse({ id: req.params.id });
  const deleted = await db.delete(recipesTable)
    .where(and(eq(recipesTable.id, id), eq(recipesTable.userId, req.userId)))
    .returning({ id: recipesTable.id });
  if (!deleted.length) throw notFound("Receta");
  res.status(204).end();
});

export default router;
