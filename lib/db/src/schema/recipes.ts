import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foodsTable } from "./foods";

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"),
  servings: integer("servings").notNull().default(1),
  totalGrams: real("total_grams").notNull().default(0),
  caloriesPerServing: real("calories_per_serving").notNull().default(0),
  proteinPerServing: real("protein_per_serving").notNull().default(0),
  carbsPerServing: real("carbs_per_serving").notNull().default(0),
  fatPerServing: real("fat_per_serving").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipeIngredientsTable = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipesTable.id, { onDelete: "cascade" }),
  foodId: integer("food_id").notNull().references(() => foodsTable.id, { onDelete: "restrict" }),
  amountGrams: real("amount_grams").notNull(),
});

export const insertRecipeSchema = createInsertSchema(recipesTable).omit({ id: true, createdAt: true });
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipesTable.$inferSelect;
export type RecipeIngredient = typeof recipeIngredientsTable.$inferSelect;
