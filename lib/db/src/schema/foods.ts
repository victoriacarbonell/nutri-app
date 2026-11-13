import { pgTable, serial, text, real, timestamp, varchar, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const foodsTable = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category").notNull().default("otros"),
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
  },
  (t) => [
    index("foods_user_id_idx").on(t.userId),
    // Un mismo código de barras no puede repetirse dentro de un usuario.
    uniqueIndex("foods_user_barcode_idx").on(t.userId, t.barcode).where(sql`${t.barcode} is not null`),
  ],
);

export const insertFoodSchema = createInsertSchema(foodsTable).omit({ id: true, createdAt: true });
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foodsTable.$inferSelect;
