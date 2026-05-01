import { pgTable, serial, integer, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { foodsTable } from "./foods";

export const portionsTable = pgTable("portions", {
  id: serial("id").primaryKey(),
  foodId: integer("food_id").notNull().references(() => foodsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  grams: real("grams").notNull(),
});

export const insertPortionSchema = createInsertSchema(portionsTable).omit({ id: true });
export type InsertPortion = z.infer<typeof insertPortionSchema>;
export type Portion = typeof portionsTable.$inferSelect;
