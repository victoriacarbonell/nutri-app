import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Healthy only if the database responds, so the host doesn't send traffic to
// an instance that can't serve anything.
router.get("/healthz", async (req, res) => {
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    req.log.error({ err }, "Health check: database unreachable");
    res.status(503).json(HealthCheckResponse.parse({ status: "database_unavailable" }));
    return;
  }
  res.json(HealthCheckResponse.parse({ status: "ok" }));
});

export default router;
