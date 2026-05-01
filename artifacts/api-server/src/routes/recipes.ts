import { Router } from "express";
import { db } from "@workspace/db";
import { recipesTable, recipeIngredientsTable, foodsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import {
  GetRecipesQueryParams,
  CreateRecipeBody,
  GetRecipeParams,
  UpdateRecipeParams,
  UpdateRecipeBody,
  DeleteRecipeParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const params = GetRecipesQueryParams.parse(req.query);
  const where = params.q ? ilike(recipesTable.name, `%${params.q}%`) : undefined;
  const recipes = await db.select().from(recipesTable).where(where);
  return res.json(recipes);
});

router.post("/", async (req, res) => {
  const body = CreateRecipeBody.parse(req.body);
  const { ingredients, ...recipeData } = body;

  const foods = await db.select().from(foodsTable)
    .where(eq(foodsTable.id, ingredients[0]?.foodId ?? 0));

  // Calculate totals
  let totalGrams = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const ing of ingredients) {
    const food = await db.select().from(foodsTable).where(eq(foodsTable.id, ing.foodId)).then(r => r[0]);
    if (!food) continue;
    const factor = ing.amountGrams / 100;
    totalGrams += ing.amountGrams;
    totalCalories += food.caloriesPer100g * factor;
    totalProtein += food.proteinPer100g * factor;
    totalCarbs += food.carbsPer100g * factor;
    totalFat += food.fatPer100g * factor;
  }

  const servings = recipeData.servings ?? 1;
  const [recipe] = await db.insert(recipesTable).values({
    ...recipeData,
    totalGrams,
    caloriesPerServing: totalCalories / servings,
    proteinPerServing: totalProtein / servings,
    carbsPerServing: totalCarbs / servings,
    fatPerServing: totalFat / servings,
  }).returning();

  await db.insert(recipeIngredientsTable).values(
    ingredients.map(ing => ({ recipeId: recipe.id, foodId: ing.foodId, amountGrams: ing.amountGrams }))
  );

  return res.status(201).json(recipe);
});

router.get("/:id", async (req, res) => {
  const { id } = GetRecipeParams.parse({ id: Number(req.params.id) });
  const recipes = await db.select().from(recipesTable).where(eq(recipesTable.id, id));
  if (!recipes.length) return res.status(404).json({ error: "Recipe not found" });
  const recipe = recipes[0];

  const rawIngredients = await db.select().from(recipeIngredientsTable)
    .where(eq(recipeIngredientsTable.recipeId, id));

  const ingredients = await Promise.all(
    rawIngredients.map(async (ing) => {
      const food = await db.select().from(foodsTable).where(eq(foodsTable.id, ing.foodId)).then(r => r[0]);
      return { ...ing, food };
    })
  );

  return res.json({ ...recipe, ingredients });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateRecipeParams.parse({ id: Number(req.params.id) });
  const body = UpdateRecipeBody.parse(req.body);
  const { ingredients, ...recipeData } = body as typeof body & { ingredients?: Array<{ foodId: number; amountGrams: number }> };

  if (ingredients) {
    let totalGrams = 0, totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    for (const ing of ingredients) {
      const food = await db.select().from(foodsTable).where(eq(foodsTable.id, ing.foodId)).then(r => r[0]);
      if (!food) continue;
      const factor = ing.amountGrams / 100;
      totalGrams += ing.amountGrams;
      totalCalories += food.caloriesPer100g * factor;
      totalProtein += food.proteinPer100g * factor;
      totalCarbs += food.carbsPer100g * factor;
      totalFat += food.fatPer100g * factor;
    }
    const servings = (recipeData as { servings?: number }).servings ?? 1;
    await db.delete(recipeIngredientsTable).where(eq(recipeIngredientsTable.recipeId, id));
    await db.insert(recipeIngredientsTable).values(
      ingredients.map(ing => ({ recipeId: id, foodId: ing.foodId, amountGrams: ing.amountGrams }))
    );
    const [updated] = await db.update(recipesTable).set({
      ...recipeData,
      totalGrams,
      caloriesPerServing: totalCalories / servings,
      proteinPerServing: totalProtein / servings,
      carbsPerServing: totalCarbs / servings,
      fatPerServing: totalFat / servings,
    }).where(eq(recipesTable.id, id)).returning();
    return res.json(updated);
  }

  const [updated] = await db.update(recipesTable).set(recipeData).where(eq(recipesTable.id, id)).returning();
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteRecipeParams.parse({ id: Number(req.params.id) });
  await db.delete(recipesTable).where(eq(recipesTable.id, id));
  return res.status(204).end();
});

export default router;
