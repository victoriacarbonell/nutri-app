import { Router } from "express";
import { db, foodsTable, portionsTable } from "@workspace/db";
import { eq, ilike, and, sql, asc } from "drizzle-orm";
import { FOOD_CATEGORIES, inferCategory, normalizeCategory } from "@workspace/shared";
import {
  GetFoodsQueryParams,
  CreateFoodBody,
  GetFoodParams,
  UpdateFoodParams,
  UpdateFoodBody,
  DeleteFoodParams,
  GetFoodPortionsParams,
  CreatePortionParams,
  CreatePortionBody,
  DeletePortionParams,
} from "@workspace/api-zod";
import { notFound } from "../lib/http-error";

const router = Router();

// Las categorías viven en @workspace/shared. Al leer se normalizan por si hay
// filas antiguas guardadas con otros nombres.
function withCategory<T extends { category: string }>(food: T): T {
  return { ...food, category: normalizeCategory(food.category) };
}

async function findOwnFood(userId: number, id: number) {
  const [food] = await db.select().from(foodsTable).where(and(eq(foodsTable.id, id), eq(foodsTable.userId, userId)));
  if (!food) throw notFound("Alimento");
  return food;
}

router.get("/categories", async (_req, res) => {
  res.json(FOOD_CATEGORIES.map((c) => c.value));
});

router.get("/", async (req, res) => {
  const params = GetFoodsQueryParams.parse(req.query);
  const hasBarcode = req.query.hasBarcode === "true";
  const conditions = [eq(foodsTable.userId, req.userId)];
  if (params.q) conditions.push(ilike(foodsTable.name, `%${params.q}%`));
  if (params.category) conditions.push(eq(foodsTable.category, normalizeCategory(params.category)));
  if (params.barcode) conditions.push(eq(foodsTable.barcode, params.barcode));
  if (hasBarcode) conditions.push(sql`${foodsTable.barcode} IS NOT NULL AND ${foodsTable.barcode} != ''`);
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const where = and(...conditions);
  const [foods, countResult] = await Promise.all([
    db.select().from(foodsTable).where(where).orderBy(asc(foodsTable.name)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(foodsTable).where(where),
  ]);
  res.json({
    foods: foods.map(withCategory),
    total: Number(countResult[0].count),
  });
});

router.post("/", async (req, res) => {
  const body = CreateFoodBody.parse(req.body);
  const [food] = await db.insert(foodsTable)
    .values({ ...body, userId: req.userId, category: inferCategory(body) })
    .returning();
  res.status(201).json(withCategory(food));
});

router.get("/:id", async (req, res) => {
  const { id } = GetFoodParams.parse({ id: req.params.id });
  res.json(withCategory(await findOwnFood(req.userId, id)));
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateFoodParams.parse({ id: req.params.id });
  const body = UpdateFoodBody.parse(req.body);
  await findOwnFood(req.userId, id);
  const [food] = await db.update(foodsTable)
    .set({ ...body, category: inferCategory(body) })
    .where(eq(foodsTable.id, id))
    .returning();
  res.json(withCategory(food));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteFoodParams.parse({ id: req.params.id });
  const deleted = await db.delete(foodsTable)
    .where(and(eq(foodsTable.id, id), eq(foodsTable.userId, req.userId)))
    .returning({ id: foodsTable.id });
  if (!deleted.length) throw notFound("Alimento");
  res.status(204).end();
});

router.get("/:id/portions", async (req, res) => {
  const { id } = GetFoodPortionsParams.parse({ id: req.params.id });
  await findOwnFood(req.userId, id);
  const portions = await db.select().from(portionsTable).where(eq(portionsTable.foodId, id));
  res.json(portions);
});

router.post("/:id/portions", async (req, res) => {
  const { id } = CreatePortionParams.parse({ id: req.params.id });
  const body = CreatePortionBody.parse(req.body);
  await findOwnFood(req.userId, id);
  const [portion] = await db.insert(portionsTable).values({ foodId: id, ...body }).returning();
  res.status(201).json(portion);
});

router.delete("/portions/:id", async (req, res) => {
  const { id } = DeletePortionParams.parse({ id: req.params.id });
  // Solo se puede borrar una porción de un alimento propio.
  const [portion] = await db.select({ id: portionsTable.id })
    .from(portionsTable)
    .innerJoin(foodsTable, eq(foodsTable.id, portionsTable.foodId))
    .where(and(eq(portionsTable.id, id), eq(foodsTable.userId, req.userId)));
  if (!portion) throw notFound("Porción");
  await db.delete(portionsTable).where(eq(portionsTable.id, id));
  res.status(204).end();
});

export default router;
