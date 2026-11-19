import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Sano solo si la base de datos responde: así el hosting no manda tráfico a
// una instancia que no puede servir nada.
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
