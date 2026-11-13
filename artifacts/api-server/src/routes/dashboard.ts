import { Router } from "express";
import { db, logEntriesTable, exercisesTable, weightLogsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { macroGoalsForCalories, sumMacros } from "@workspace/shared";
import {
  GetTodaySummaryQueryParams,
  GetWeeklyStatsQueryParams,
  GetMonthlyStatsQueryParams,
} from "@workspace/api-zod";
import { calcHarrisBenedict, getProfile } from "./profile";
import { addDays, resolveDate } from "../lib/dates";

const router = Router();

async function getCalorieGoal(userId: number): Promise<{ goal: number; min: number | null; max: number | null; profileSetup: boolean }> {
  const profile = await getProfile(userId);
  if (!profile) return { goal: 2000, min: null, max: null, profileSetup: false };
  return {
    goal: profile.manualCalorieGoal ?? calcHarrisBenedict(profile),
    min: profile.minCalories ?? null,
    max: profile.maxCalories ?? null,
    profileSetup: true,
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
  const userId = req.userId;
  const [{ goal, min, max, profileSetup }, entries, exercises] = await Promise.all([
    getCalorieGoal(userId),
    db.select().from(logEntriesTable).where(and(eq(logEntriesTable.userId, userId), eq(logEntriesTable.date, today))),
    db.select().from(exercisesTable).where(and(eq(exercisesTable.userId, userId), eq(exercisesTable.date, today))),
  ]);

  const totals = sumMacros(entries);
  const caloriesBurned = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const goals = macroGoalsForCalories(goal);

  res.json({
    date: today,
    totalCalories: totals.calories,
    calorieGoal: goal,
    minCalories: min,
    maxCalories: max,
    caloriesBurned,
    netCalories: totals.calories - caloriesBurned,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    proteinGoalG: goals.proteinG,
    carbsGoalG: goals.carbsG,
    fatGoalG: goals.fatG,
    profileSetup,
  });
});

router.get("/calendar/:year/:month", async (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);
  const { goal, min, max } = await getCalorieGoal(req.userId);

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const entries = await db.select({
    date: logEntriesTable.date,
    calories: sql<number>`sum(${logEntriesTable.calories})`,
  }).from(logEntriesTable)
    .where(and(eq(logEntriesTable.userId, req.userId), gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
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

  res.json(result);
});

// Estadísticas de los últimos `daysBack` días, terminando en `endDate` incluido.
async function getPeriodStats(userId: number, daysBack: number, endDate: string) {
  const startDate = addDays(endDate, -daysBack + 1);
  const { goal, min, max } = await getCalorieGoal(userId);

  const entries = await db.select({
    date: logEntriesTable.date,
    calories: sql<number>`sum(${logEntriesTable.calories})`,
    protein: sql<number>`sum(${logEntriesTable.protein})`,
    carbs: sql<number>`sum(${logEntriesTable.carbs})`,
    fat: sql<number>`sum(${logEntriesTable.fat})`,
  }).from(logEntriesTable)
    .where(and(eq(logEntriesTable.userId, userId), gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
    .groupBy(logEntriesTable.date);

  const exercises = await db.select({
    calories: sql<number>`sum(${exercisesTable.caloriesBurned})`,
  }).from(exercisesTable)
    .where(and(eq(exercisesTable.userId, userId), gte(exercisesTable.date, startDate), lte(exercisesTable.date, endDate)));

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
  const avg = (key: "calories" | "protein" | "carbs" | "fat") =>
    daysWithData ? entries.reduce((s, e) => s + Number(e[key]), 0) / daysWithData : 0;

  const weights = await db.select().from(weightLogsTable)
    .where(and(eq(weightLogsTable.userId, userId), gte(weightLogsTable.date, startDate), lte(weightLogsTable.date, endDate)))
    .orderBy(weightLogsTable.date);

  const weightChange = weights.length >= 2
    ? weights[weights.length - 1].weightKg - weights[0].weightKg
    : null;

  return {
    avgDailyCalories: avg("calories"),
    avgProtein: avg("protein"),
    avgCarbs: avg("carbs"),
    avgFat: avg("fat"),
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
  res.json(await getPeriodStats(req.userId, 7, resolveDate(params.date)));
});

router.get("/stats/monthly", async (req, res) => {
  const params = GetMonthlyStatsQueryParams.parse(req.query);
  res.json(await getPeriodStats(req.userId, 30, resolveDate(params.date)));
});

export default router;
