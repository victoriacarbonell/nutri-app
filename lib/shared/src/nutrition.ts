// The single place where calories and macros are computed. The API uses it
// when saving entries and recipes, and the front end for previews, so the
// numbers you see before saving are the ones that get saved.

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Nutrition values per 100 g (or 100 ml), as in the foods table. */
export interface MacrosPer100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

/** Per-serving values of a recipe, as in the recipes table. */
export interface RecipeMacros {
  totalGrams: number;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
}

export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** Macros for `grams` grams of a food. */
export function scaleMacros(per100: MacrosPer100g, grams: number): Macros {
  const factor = grams > 0 ? grams / 100 : 0;
  return {
    calories: per100.caloriesPer100g * factor,
    protein: per100.proteinPer100g * factor,
    carbs: per100.carbsPer100g * factor,
    fat: per100.fatPer100g * factor,
  };
}

/** Macros for `grams` grams of a recipe, from its per-serving values. */
export function recipeMacrosForGrams(recipe: RecipeMacros, grams: number): Macros {
  const gramsPerServing = recipe.servings > 0 ? recipe.totalGrams / recipe.servings : 0;
  if (gramsPerServing <= 0 || grams <= 0) return { ...ZERO_MACROS };
  const servings = grams / gramsPerServing;
  return {
    calories: recipe.caloriesPerServing * servings,
    protein: recipe.proteinPerServing * servings,
    carbs: recipe.carbsPerServing * servings,
    fat: recipe.fatPerServing * servings,
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { ...ZERO_MACROS },
  );
}

export interface RecipeTotals {
  totalGrams: number;
  total: Macros;
  perServing: Macros;
}

/** Recipe totals from its ingredients and number of servings. */
export function recipeTotals(
  ingredients: readonly { food: MacrosPer100g; amountGrams: number }[],
  servings: number,
): RecipeTotals {
  const valid = ingredients.filter((i) => i.amountGrams > 0);
  const totalGrams = valid.reduce((s, i) => s + i.amountGrams, 0);
  const total = sumMacros(valid.map((i) => scaleMacros(i.food, i.amountGrams)));
  const divisor = Math.max(1, servings);
  return {
    totalGrams,
    total,
    perServing: {
      calories: total.calories / divisor,
      protein: total.protein / divisor,
      carbs: total.carbs / divisor,
      fat: total.fat / divisor,
    },
  };
}

/** Split of calories between macros used for the daily goals. */
export const MACRO_CALORIE_SPLIT = { protein: 0.3, carbs: 0.45, fat: 0.25 } as const;
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export function macroGoalsForCalories(calorieGoal: number): { proteinG: number; carbsG: number; fatG: number } {
  return {
    proteinG: (calorieGoal * MACRO_CALORIE_SPLIT.protein) / KCAL_PER_GRAM.protein,
    carbsG: (calorieGoal * MACRO_CALORIE_SPLIT.carbs) / KCAL_PER_GRAM.carbs,
    fatG: (calorieGoal * MACRO_CALORIE_SPLIT.fat) / KCAL_PER_GRAM.fat,
  };
}
