import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfileTable = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // male, female, other
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  activityLevel: text("activity_level").notNull(), // sedentary, light, moderate, active, very_active
  goal: text("goal").notNull(), // lose, maintain, gain
  manualCalorieGoal: integer("manual_calorie_goal"),
  minCalories: integer("min_calories"),
  maxCalories: integer("max_calories"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const weightLogsTable = pgTable("weight_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  weightKg: real("weight_kg").notNull(),
  waistCm: real("waist_cm"),
  hipCm: real("hip_cm"),
  chestCm: real("chest_cm"),
  armCm: real("arm_cm"),
  thighCm: real("thigh_cm"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
export type WeightLog = typeof weightLogsTable.$inferSelect;
