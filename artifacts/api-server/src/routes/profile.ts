import { Router } from "express";
import { db, userProfileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const router = Router();

type Profile = typeof userProfileTable.$inferSelect;

function calcHarrisBenedict(profile: Profile): number {
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

async function getProfile(userId: number): Promise<Profile | undefined> {
  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, userId));
  return profile;
}

router.get("/", async (req, res) => {
  const profile = await getProfile(req.userId);
  if (!profile) return res.json(null);
  return res.json({ ...profile, calculatedCalorieGoal: calcHarrisBenedict(profile) });
});

router.put("/", async (req, res) => {
  const body = UpdateProfileBody.parse(req.body);
  // Un perfil por usuario (user_id es único): crea o actualiza.
  const [profile] = await db.insert(userProfileTable)
    .values({ ...body, userId: req.userId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProfileTable.userId,
      set: { ...body, updatedAt: new Date() },
    })
    .returning();
  res.json({ ...profile, calculatedCalorieGoal: calcHarrisBenedict(profile) });
});

export { calcHarrisBenedict, getProfile };
export default router;
