import { Router } from "express";
import { db, exercisesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { GetExercisesQueryParams, CreateExerciseBody, DeleteExerciseParams } from "@workspace/api-zod";
import { notFound } from "../lib/http-error";

const router = Router();

router.get("/", async (req, res) => {
  const params = GetExercisesQueryParams.parse(req.query);
  const conditions = [eq(exercisesTable.userId, req.userId)];
  if (params.date) conditions.push(eq(exercisesTable.date, params.date));
  const exercises = await db.select().from(exercisesTable).where(and(...conditions)).orderBy(desc(exercisesTable.date));
  res.json(exercises);
});

router.post("/", async (req, res) => {
  const body = CreateExerciseBody.parse(req.body);
  const [exercise] = await db.insert(exercisesTable).values({ ...body, userId: req.userId }).returning();
  res.status(201).json(exercise);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteExerciseParams.parse({ id: req.params.id });
  const deleted = await db.delete(exercisesTable)
    .where(and(eq(exercisesTable.id, id), eq(exercisesTable.userId, req.userId)))
    .returning({ id: exercisesTable.id });
  if (!deleted.length) throw notFound("Ejercicio");
  res.status(204).end();
});

export default router;
