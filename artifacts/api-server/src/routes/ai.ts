import { Router } from "express";
import { openai as openaiClient, AI_MODEL } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { logEntriesTable, exercisesTable, userProfileTable, weightLogsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, asc } from "drizzle-orm";
import { z } from "zod";
import {
  AnalyzeImageBody,
  AnalyzeImageResponse,
  GetAiWeeklySummaryQueryParams,
  GetAiMonthlySummaryQueryParams,
} from "@workspace/api-zod";
import { addDays, resolveDate } from "../lib/dates";
import { aiUsage, enforceAiLimit, recordAiRequest } from "../lib/ai-limits";
import { HttpError } from "../lib/http-error";
import { getCalorieGoal } from "./profile";

const router = Router();

// Without an OpenAI key configured, every AI route responds 503.
router.use((_req, res, next) => {
  if (!openaiClient) {
    res.status(503).json({
      error: "ai_disabled",
      message: "La IA no está configurada en este servidor (falta OPENAI_API_KEY).",
    });
    return;
  }
  next();
});

router.get("/usage", async (req, res) => {
  res.json(await aiUsage(req.userId));
});

// Daily call limit per user (AI_DAILY_LIMIT).
router.use(enforceAiLimit);

// The middleware above guarantees the client exists by the time a route runs.
const openai = openaiClient!;

// Real image type from its first base64 bytes. It used to always be declared
// as JPEG, even for PNG or WebP.
function imageMimeType(base64: string): string {
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  return "image/jpeg";
}

// Parses the model's reply and validates it. An unusable reply is an AI
// service failure (502), not an empty success.
function parseAiJson<T>(content: string, schema: z.ZodType<T>, log: { error: (obj: object, msg: string) => void }): T {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (err) {
    log.error({ err, raw: content }, "AI response is not JSON");
    throw new HttpError(502, "ai_invalid_response", "La IA ha devuelto una respuesta que no se ha podido leer. Inténtalo de nuevo.");
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    log.error({ issues: result.error.issues, raw: content }, "AI response does not match the schema");
    throw new HttpError(502, "ai_invalid_response", "La IA ha devuelto una respuesta incompleta. Inténtalo de nuevo.");
  }
  return result.data;
}

const AiSummaryContent = z.object({
  summary: z.string(),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
});

router.post("/analyze-image", async (req, res) => {
  const body = AnalyzeImageBody.parse(req.body);

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${imageMimeType(body.imageBase64)};base64,${body.imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Analyze this food photo and identify all food items visible. For each item, provide an estimation of the nutritional values per 100g and the estimated weight in the photo.

${body.prompt ? `Additional context: ${body.prompt}` : ""}

Respond ONLY with a valid JSON object in this exact format:
{
  "items": [
    {
      "name": "Food name in Spanish",
      "estimatedGrams": 150,
      "caloriesPer100g": 120,
      "proteinPer100g": 8,
      "carbsPer100g": 15,
      "fatPer100g": 4,
      "totalCalories": 180,
      "confidence": "high"
    }
  ],
  "totalCalories": 450,
  "totalProtein": 25,
  "totalCarbs": 50,
  "totalFat": 15,
  "description": "Brief description of the meal in Spanish",
  "notes": "Any relevant notes about estimation accuracy"
}

confidence must be one of: "high", "medium", "low"
Be realistic with portion sizes. If the image is unclear, use "low" confidence.`,
          },
        ],
      },
    ],
  });

  await recordAiRequest(req.userId, "analyze_image");
  const content = response.choices[0]?.message?.content ?? "{}";
  return res.json(parseAiJson(content, AnalyzeImageResponse, req.log));
});

// Data for the last `daysBack` days up to and including `endDate` (7 or 30, like the dashboard).
async function getRecentData(userId: number, daysBack: number, endDate: string) {
  const startDate = addDays(endDate, -daysBack + 1);

  const [entries, exercises, profile, weights] = await Promise.all([
    db.select({
      date: logEntriesTable.date,
      calories: sql<number>`sum(${logEntriesTable.calories})`,
      protein: sql<number>`sum(${logEntriesTable.protein})`,
      carbs: sql<number>`sum(${logEntriesTable.carbs})`,
      fat: sql<number>`sum(${logEntriesTable.fat})`,
    }).from(logEntriesTable)
      .where(and(eq(logEntriesTable.userId, userId), gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
      .groupBy(logEntriesTable.date),
    db.select().from(exercisesTable)
      .where(and(eq(exercisesTable.userId, userId), gte(exercisesTable.date, startDate), lte(exercisesTable.date, endDate))),
    db.select().from(userProfileTable).where(eq(userProfileTable.userId, userId)),
    db.select().from(weightLogsTable)
      .where(and(eq(weightLogsTable.userId, userId), gte(weightLogsTable.date, startDate), lte(weightLogsTable.date, endDate)))
      .orderBy(asc(weightLogsTable.date)),
  ]);

  return { entries, exercises, profile: profile[0], weights, startDate, endDate };
}

router.get("/weekly-summary", async (req, res) => {
  const params = GetAiWeeklySummaryQueryParams.parse(req.query);
  const { entries, exercises, profile, weights, startDate, endDate } = await getRecentData(req.userId, 7, resolveDate(params.date));

  const avgCalories = entries.length ? entries.reduce((s, e) => s + Number(e.calories), 0) / entries.length : 0;
  const totalExercise = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const { goal } = await getCalorieGoal(req.userId);

  if (entries.length === 0) {
    return res.json({
      period: "weekly",
      summary: "No hay suficientes datos para generar un resumen esta semana.",
      insights: [],
      recommendations: ["Registra tus comidas diariamente para obtener análisis personalizados."],
      generatedAt: new Date().toISOString(),
    });
  }

  const goalText = profile?.goal === "lose" ? "lose weight" : profile?.goal === "gain" ? "build muscle" : "maintain weight";
  const avg = (key: "protein" | "carbs" | "fat") =>
    Math.round(entries.reduce((s, e) => s + Number(e[key]), 0) / Math.max(entries.length, 1));
  const prompt = `You are an expert nutritionist. Analyze this user's data for the last week (${startDate} to ${endDate}) and write a motivating, useful summary.

User:
- Name: ${profile?.name ?? "Usuario"}
- Goal: ${goalText}
- Daily calorie goal: ${goal} kcal
- Activity level: ${profile?.activityLevel ?? "moderate"}

Week:
- Days logged: ${entries.length}/7
- Average daily calories: ${Math.round(avgCalories)} kcal
- Average protein: ${avg("protein")} g/day
- Average carbs: ${avg("carbs")} g/day
- Average fat: ${avg("fat")} g/day
- Calories burned through exercise: ${Math.round(totalExercise)} kcal in total
- Exercise sessions: ${exercises.length}
${weights.length >= 2 ? `- Weight change: ${(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)} kg` : ""}

Write every text value in Spanish. Respond with a JSON object in this format:
{
  "summary": "Overall summary in 2-3 sentences",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  await recordAiRequest(req.userId, "weekly_summary");
  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = parseAiJson(content, AiSummaryContent, req.log);
  return res.json({
    period: "weekly",
    ...parsed,
    score: Math.min(100, Math.round((entries.length / 7) * 50 + (Math.abs(avgCalories - goal) < 200 ? 50 : 25))),
    generatedAt: new Date().toISOString(),
  });
});

router.get("/monthly-summary", async (req, res) => {
  const params = GetAiMonthlySummaryQueryParams.parse(req.query);
  const { entries, exercises, profile, weights, startDate, endDate } = await getRecentData(req.userId, 30, resolveDate(params.date));

  const avgCalories = entries.length ? entries.reduce((s, e) => s + Number(e.calories), 0) / entries.length : 0;
  const totalExercise = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const { goal } = await getCalorieGoal(req.userId);

  if (entries.length === 0) {
    return res.json({
      period: "monthly",
      summary: "No hay suficientes datos para generar un resumen mensual.",
      insights: [],
      recommendations: ["Registra tus comidas diariamente para obtener análisis personalizados."],
      generatedAt: new Date().toISOString(),
    });
  }

  const goalText = profile?.goal === "lose" ? "lose weight" : profile?.goal === "gain" ? "build muscle" : "maintain weight";
  const prompt = `You are an expert nutritionist. Analyze this user's data for the last month (${startDate} to ${endDate}) and write a detailed analysis.

User: ${profile?.name ?? "Usuario"}, goal: ${goalText}, target: ${goal} kcal/day

Month:
- Days logged: ${entries.length}/30
- Average calories: ${Math.round(avgCalories)} kcal/day
- Total exercise calories: ${Math.round(totalExercise)} kcal
- Exercise sessions: ${exercises.length}
${weights.length >= 2 ? `- Weight change: ${(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)} kg` : "- No weight data"}

Write every text value in Spanish. Respond with a JSON object in this format:
{
  "summary": "Full analysis of the month in 3-4 sentences",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    max_completion_tokens: 1500,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  await recordAiRequest(req.userId, "monthly_summary");
  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = parseAiJson(content, AiSummaryContent, req.log);
  return res.json({
    period: "monthly",
    ...parsed,
    score: Math.min(100, Math.round((entries.length / 30) * 60 + (Math.abs(avgCalories - goal) < 300 ? 40 : 20))),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
