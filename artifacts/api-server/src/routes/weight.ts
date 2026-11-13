import { Router } from "express";
import { db, weightLogsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { CreateWeightLogBody, GetWeightLogsQueryParams, DeleteWeightLogParams } from "@workspace/api-zod";
import { notFound } from "../lib/http-error";

const router = Router();

router.get("/", async (req, res) => {
  const params = GetWeightLogsQueryParams.parse(req.query);
  const limit = params.limit ?? 90;
  const logs = await db.select().from(weightLogsTable)
    .where(eq(weightLogsTable.userId, req.userId))
    .orderBy(desc(weightLogsTable.date), desc(weightLogsTable.id))
    .limit(limit);
  res.json(logs);
});

router.post("/", async (req, res) => {
  const body = CreateWeightLogBody.parse(req.body);
  const [log] = await db.insert(weightLogsTable).values({ ...body, userId: req.userId }).returning();
  res.status(201).json(log);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteWeightLogParams.parse({ id: req.params.id });
  const deleted = await db.delete(weightLogsTable)
    .where(and(eq(weightLogsTable.id, id), eq(weightLogsTable.userId, req.userId)))
    .returning({ id: weightLogsTable.id });
  if (!deleted.length) throw notFound("Registro de peso");
  res.status(204).end();
});

export default router;
