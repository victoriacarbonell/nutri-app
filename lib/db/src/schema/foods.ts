import { pgTable, serial, text, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodsTable = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull().default("General"),
  caloriesPer100g: real("calories_per_100g").notNull(),
  proteinPer100g: real("protein_per_100g").notNull().default(0),
  carbsPer100g: real("carbs_per_100g").notNull().default(0),
  fatPer100g: real("fat_per_100g").notNull().default(0),
  fiberPer100g: real("fiber_per_100g"),
  sugarPer100g: real("sugar_per_100g"),
  sodiumMgPer100g: real("sodium_mg_per_100g"),
  photoUrl: text("photo_url"),
  barcode: varchar("barcode", { length: 64 }),
  unit: varchar("unit", { length: 20 }).notNull().default("g"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFoodSchema = createInsertSchema(foodsTable).omit({ id: true, createdAt: true });
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foodsTable.$inferSelect;
