import { pgTable, serial, text, real, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foodsTable } from "./foods";
import { recipesTable } from "./recipes";

export const logEntriesTable = pgTable("log_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(), // desayuno, almuerzo, comida, merienda, cena, snacks
  foodId: integer("food_id").references(() => foodsTable.id, { onDelete: "set null" }),
  recipeId: integer("recipe_id").references(() => recipesTable.id, { onDelete: "set null" }),
  amountGrams: real("amount_grams").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  caloriesBurned: real("calories_burned").notNull(),
  durationMinutes: integer("duration_minutes"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLogEntrySchema = createInsertSchema(logEntriesTable).omit({ id: true, createdAt: true });
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntriesTable.$inferSelect;
export type Exercise = typeof exercisesTable.$inferSelect;
