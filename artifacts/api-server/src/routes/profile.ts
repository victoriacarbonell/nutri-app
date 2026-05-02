import { Router } from "express";
import { db } from "@workspace/db";
import { userProfileTable, weightLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { UpdateProfileBody, CreateWeightLogBody, GetWeightLogsQueryParams, DeleteWeightLogParams } from "@workspace/api-zod";

const router = Router();

function calcHarrisBenedict(profile: typeof userProfileTable.$inferSelect): number {
  const { gender, weightKg, heightCm, age, activityLevel, goal } = profile;
  let bmr: number;
  if (gender === "male") {
    bmr = 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age;
  }
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activityLevel] ?? 1.2);
  const goalAdj: Record<string, number> = { lose: -500, maintain: 0, gain: 300 };
  return Math.round(tdee + (goalAdj[goal] ?? 0));
}

router.get("/", async (req, res) => {
  const profiles = await db.select().from(userProfileTable).limit(1);
  if (!profiles.length) return res.json(null);
  const p = profiles[0];
  return res.json({ ...p, calculatedCalorieGoal: calcHarrisBenedict(p) });
});

router.put("/", async (req, res) => {
  const body = UpdateProfileBody.parse(req.body);
  const profiles = await db.select().from(userProfileTable).limit(1);
  let profile: typeof userProfileTable.$inferSelect;
  if (profiles.length) {
    const updated = await db.update(userProfileTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(userProfileTable.id, profiles[0].id))
      .returning();
    profile = updated[0];
  } else {
    const inserted = await db.insert(userProfileTable).values({ ...body, updatedAt: new Date() }).returning();
    profile = inserted[0];
  }
  return res.json({ ...profile, calculatedCalorieGoal: calcHarrisBenedict(profile) });
});

router.get("/weight", async (req, res) => {
  const params = GetWeightLogsQueryParams.parse(req.query);
  const limit = params.limit ?? 90;
  const logs = await db.select().from(weightLogsTable).orderBy(desc(weightLogsTable.date)).limit(limit);
  return res.json(logs);
});

router.post("/weight", async (req, res) => {
  const body = CreateWeightLogBody.parse(req.body);
  const [log] = await db.insert(weightLogsTable).values(body).returning();
  return res.status(201).json(log);
});

router.delete("/weight/:id", async (req, res) => {
  const { id } = DeleteWeightLogParams.parse({ id: Number(req.params.id) });
  await db.delete(weightLogsTable).where(eq(weightLogsTable.id, id));
  return res.status(204).end();
});

export { calcHarrisBenedict };
export default router;
