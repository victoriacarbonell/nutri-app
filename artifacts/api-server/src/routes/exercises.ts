import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetExercisesQueryParams, CreateExerciseBody, DeleteExerciseParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const params = GetExercisesQueryParams.parse(req.query);
  const where = params.date ? eq(exercisesTable.date, params.date) : undefined;
  const exercises = await db.select().from(exercisesTable).where(where);
  return res.json(exercises);
});

router.post("/", async (req, res) => {
  const body = CreateExerciseBody.parse(req.body);
  const [exercise] = await db.insert(exercisesTable).values(body).returning();
  return res.status(201).json(exercise);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExerciseParams.parse({ id: Number(req.params.id) });
  await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
  return res.status(204).end();
});

export default router;
