import { Router } from "express";
import { db } from "@workspace/db";
import { logEntriesTable, exercisesTable, userProfileTable, weightLogsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  GetTodaySummaryQueryParams,
  GetWeeklyStatsQueryParams,
  GetMonthlyStatsQueryParams,
} from "@workspace/api-zod";
import { calcHarrisBenedict } from "./profile";
import { addDays, resolveDate } from "../lib/dates";

const router = Router();

function getCalorieGoal(profile: typeof userProfileTable.$inferSelect | undefined): { goal: number; min: number | null; max: number | null } {
  if (!profile) return { goal: 2000, min: null, max: null };
  const calculated = calcHarrisBenedict(profile);
  return {
    goal: profile.manualCalorieGoal ?? calculated,
    min: profile.minCalories ?? null,
    max: profile.maxCalories ?? null,
  };
}

function getDayStatus(calories: number, goal: number, min: number | null, max: number | null, hasLog: boolean): "on_track" | "over" | "under" | "no_data" {
  if (!hasLog) return "no_data";
  const lower = min ?? goal * 0.9;
  const upper = max ?? goal * 1.1;
  if (calories >= lower && calories <= upper) return "on_track";
  if (calories > upper) return "over";
  return "under";
}

router.get("/today", async (req, res) => {
  const params = GetTodaySummaryQueryParams.parse(req.query);
  const today = resolveDate(params.date);
  const profiles = await db.select().from(userProfileTable).limit(1);
  const profile = profiles[0];
  const { goal, min, max } = getCalorieGoal(profile);

  const entries = await db.select().from(logEntriesTable).where(eq(logEntriesTable.date, today));
  const exercises = await db.select().from(exercisesTable).where(eq(exercisesTable.date, today));

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = entries.reduce((s, e) => s + e.protein, 0);
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0);
  const totalFat = entries.reduce((s, e) => s + e.fat, 0);
  const caloriesBurned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);

  const proteinGoalG = goal * 0.3 / 4;
  const carbsGoalG = goal * 0.45 / 4;
  const fatGoalG = goal * 0.25 / 9;

  return res.json({
    date: today,
    totalCalories,
    calorieGoal: goal,
    minCalories: min,
    maxCalories: max,
    caloriesBurned,
    netCalories: totalCalories - caloriesBurned,
    totalProtein,
    totalCarbs,
    totalFat,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
    profileSetup: !!profile,
  });
});

router.get("/calendar/:year/:month", async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const profiles = await db.select().from(userProfileTable).limit(1);
  const profile = profiles[0];
  const { goal, min, max } = getCalorieGoal(profile);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const entries = await db.select({
    date: logEntriesTable.date,
    calories: sql<number>`sum(${logEntriesTable.calories})`,
  }).from(logEntriesTable)
    .where(and(gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
    .groupBy(logEntriesTable.date);

  const dateMap = new Map(entries.map(e => [e.date, Number(e.calories)]));

  const result = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const totalCalories = dateMap.get(dateStr) ?? 0;
    const hasLog = dateMap.has(dateStr);
    result.push({
      date: dateStr,
      totalCalories,
      calorieGoal: goal,
      minCalories: min,
      maxCalories: max,
      status: getDayStatus(totalCalories, goal, min, max, hasLog),
      hasLog,
    });
  }

  return res.json(result);
});

// Estadísticas de los últimos `daysBack` días, terminando en `endDate` incluido.
async function getPeriodStats(daysBack: number, endDate: string) {
  const startDate = addDays(endDate, -daysBack + 1);

  const profiles = await db.select().from(userProfileTable).limit(1);
  const profile = profiles[0];
  const { goal, min, max } = getCalorieGoal(profile);

  const entries = await db.select({
    date: logEntriesTable.date,
    calories: sql<number>`sum(${logEntriesTable.calories})`,
    protein: sql<number>`sum(${logEntriesTable.protein})`,
    carbs: sql<number>`sum(${logEntriesTable.carbs})`,
    fat: sql<number>`sum(${logEntriesTable.fat})`,
  }).from(logEntriesTable)
    .where(and(gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
    .groupBy(logEntriesTable.date);

  const exercises = await db.select({
    calories: sql<number>`sum(${exercisesTable.caloriesBurned})`,
  }).from(exercisesTable)
    .where(and(gte(exercisesTable.date, startDate), lte(exercisesTable.date, endDate)));

  const dateMap = new Map(entries.map(e => [e.date, { calories: Number(e.calories), protein: Number(e.protein), carbs: Number(e.carbs), fat: Number(e.fat) }]));

  const dailyData = [];
  let daysOnTrack = 0, daysOver = 0, daysUnder = 0;

  for (let d = 0; d < daysBack; d++) {
    const dateStr = addDays(startDate, d);
    const data = dateMap.get(dateStr);
    const totalCalories = data?.calories ?? 0;
    const hasLog = !!data;
    const status = getDayStatus(totalCalories, goal, min, max, hasLog);
    if (status === "on_track") daysOnTrack++;
    else if (status === "over") daysOver++;
    else if (status === "under") daysUnder++;
    dailyData.push({ date: dateStr, totalCalories, calorieGoal: goal, minCalories: min, maxCalories: max, status, hasLog });
  }

  const daysWithData = entries.length;
  const avgDailyCalories = daysWithData ? entries.reduce((s, e) => s + Number(e.calories), 0) / daysWithData : 0;
  const avgProtein = daysWithData ? entries.reduce((s, e) => s + Number(e.protein), 0) / daysWithData : 0;
  const avgCarbs = daysWithData ? entries.reduce((s, e) => s + Number(e.carbs), 0) / daysWithData : 0;
  const avgFat = daysWithData ? entries.reduce((s, e) => s + Number(e.fat), 0) / daysWithData : 0;

  // Weight change
  const weights = await db.select().from(weightLogsTable)
    .where(and(gte(weightLogsTable.date, startDate), lte(weightLogsTable.date, endDate)))
    .orderBy(weightLogsTable.date);

  const weightChange = weights.length >= 2
    ? weights[weights.length - 1].weightKg - weights[0].weightKg
    : null;

  return {
    avgDailyCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    daysOnTrack,
    daysOver,
    daysUnder,
    totalExerciseCalories: Number(exercises[0]?.calories ?? 0),
    weightChange,
    dailyData,
  };
}

router.get("/stats/weekly", async (req, res) => {
  const params = GetWeeklyStatsQueryParams.parse(req.query);
  return res.json(await getPeriodStats(7, resolveDate(params.date)));
});

router.get("/stats/monthly", async (req, res) => {
  const params = GetMonthlyStatsQueryParams.parse(req.query);
  return res.json(await getPeriodStats(30, resolveDate(params.date)));
});

export default router;
