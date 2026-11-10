import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { logEntriesTable, exercisesTable, userProfileTable, weightLogsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, asc } from "drizzle-orm";
import { AnalyzeImageBody } from "@workspace/api-zod";

const router = Router();

router.post("/analyze-image", async (req, res) => {
  const body = AnalyzeImageBody.parse(req.body);

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${body.imageBase64}`,
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

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    return res.json(parsed);
  } catch {
    return res.status(500).json({ error: "Failed to parse AI response", raw: content });
  }
});

async function getRecentData(daysBack: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const [entries, exercises, profile, weights] = await Promise.all([
    db.select({
      date: logEntriesTable.date,
      calories: sql<number>`sum(${logEntriesTable.calories})`,
      protein: sql<number>`sum(${logEntriesTable.protein})`,
      carbs: sql<number>`sum(${logEntriesTable.carbs})`,
      fat: sql<number>`sum(${logEntriesTable.fat})`,
    }).from(logEntriesTable)
      .where(and(gte(logEntriesTable.date, startDate), lte(logEntriesTable.date, endDate)))
      .groupBy(logEntriesTable.date),
    db.select().from(exercisesTable)
      .where(and(gte(exercisesTable.date, startDate), lte(exercisesTable.date, endDate))),
    db.select().from(userProfileTable).limit(1),
    db.select().from(weightLogsTable)
      .where(and(gte(weightLogsTable.date, startDate), lte(weightLogsTable.date, endDate)))
      .orderBy(asc(weightLogsTable.date)),
  ]);

  return { entries, exercises, profile: profile[0], weights, startDate, endDate };
}

router.get("/weekly-summary", async (req, res) => {
  const { entries, exercises, profile, weights, startDate, endDate } = await getRecentData(7);

  const avgCalories = entries.length ? entries.reduce((s, e) => s + Number(e.calories), 0) / entries.length : 0;
  const totalExercise = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const goal = profile?.manualCalorieGoal ?? 2000;

  const prompt = `Eres un nutricionista experto. Analiza estos datos de la última semana (${startDate} al ${endDate}) de un usuario y proporciona un resumen motivador y útil en español.

Datos del usuario:
- Nombre: ${profile?.name ?? "Usuario"}
- Objetivo: ${profile?.goal === "lose" ? "perder peso" : profile?.goal === "gain" ? "ganar músculo" : "mantener peso"}
- Meta calórica diaria: ${goal} kcal
- Nivel de actividad: ${profile?.activityLevel ?? "moderado"}

Datos de la semana:
- Días registrados: ${entries.length}/7
- Calorías promedio diarias: ${Math.round(avgCalories)} kcal
- Proteínas promedio: ${Math.round(entries.reduce((s, e) => s + Number(e.protein), 0) / Math.max(entries.length, 1))}g/día
- Carbohidratos promedio: ${Math.round(entries.reduce((s, e) => s + Number(e.carbs), 0) / Math.max(entries.length, 1))}g/día
- Grasas promedio: ${Math.round(entries.reduce((s, e) => s + Number(e.fat), 0) / Math.max(entries.length, 1))}g/día
- Calorías quemadas con ejercicio: ${Math.round(totalExercise)} kcal total
- Número de sesiones de ejercicio: ${exercises.length}
${weights.length >= 2 ? `- Cambio de peso: ${(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)} kg` : ""}

Responde en formato JSON:
{
  "summary": "Resumen general de 2-3 frases",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendación 1", "recomendación 2", "recomendación 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    return res.json({
      period: "weekly",
      ...parsed,
      score: Math.min(100, Math.round((entries.length / 7) * 50 + (Math.abs(avgCalories - goal) < 200 ? 50 : 25))),
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return res.json({
      period: "weekly",
      summary: "No hay suficientes datos para generar un resumen esta semana.",
      insights: [],
      recommendations: ["Registra tus comidas diariamente para obtener análisis personalizados."],
      generatedAt: new Date().toISOString(),
    });
  }
});

router.get("/monthly-summary", async (req, res) => {
  const { entries, exercises, profile, weights, startDate, endDate } = await getRecentData(30);

  const avgCalories = entries.length ? entries.reduce((s, e) => s + Number(e.calories), 0) / entries.length : 0;
  const totalExercise = exercises.reduce((s, e) => s + e.caloriesBurned, 0);
  const goal = profile?.manualCalorieGoal ?? 2000;

  const prompt = `Eres un nutricionista experto. Analiza estos datos del último mes (${startDate} al ${endDate}) y proporciona un análisis detallado en español.

Usuario: ${profile?.name ?? "Usuario"}, objetivo: ${profile?.goal === "lose" ? "perder peso" : profile?.goal === "gain" ? "ganar músculo" : "mantener peso"}, meta: ${goal} kcal/día

Datos del mes:
- Días registrados: ${entries.length}/30
- Calorías promedio: ${Math.round(avgCalories)} kcal/día
- Calorías totales ejercicio: ${Math.round(totalExercise)} kcal
- Sesiones de ejercicio: ${exercises.length}
${weights.length >= 2 ? `- Cambio de peso: ${(weights[weights.length - 1].weightKg - weights[0].weightKg).toFixed(1)} kg` : "- Sin datos de peso"}

Responde en JSON:
{
  "summary": "Análisis completo del mes en 3-4 frases",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4"],
  "recommendations": ["recomendación 1", "recomendación 2", "recomendación 3"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(content);
    return res.json({
      period: "monthly",
      ...parsed,
      score: Math.min(100, Math.round((entries.length / 30) * 60 + (Math.abs(avgCalories - goal) < 300 ? 40 : 20))),
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return res.json({
      period: "monthly",
      summary: "No hay suficientes datos para generar un resumen mensual.",
      insights: [],
      recommendations: ["Registra tus comidas diariamente para obtener análisis personalizados."],
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;
