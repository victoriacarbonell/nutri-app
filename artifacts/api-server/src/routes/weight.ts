import { Router } from "express";
import { db } from "@workspace/db";
import { weightLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { CreateWeightLogBody, GetWeightLogsQueryParams, DeleteWeightLogParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const params = GetWeightLogsQueryParams.parse(req.query);
  const limit = params.limit ?? 90;
  const logs = await db.select().from(weightLogsTable).orderBy(desc(weightLogsTable.date)).limit(limit);
  return res.json(logs);
});

router.post("/", async (req, res) => {
  const body = CreateWeightLogBody.parse(req.body);
  const [log] = await db.insert(weightLogsTable).values(body).returning();
  return res.status(201).json(log);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteWeightLogParams.parse({ id: Number(req.params.id) });
  await db.delete(weightLogsTable).where(eq(weightLogsTable.id, id));
  return res.status(204).end();
});

export default router;
