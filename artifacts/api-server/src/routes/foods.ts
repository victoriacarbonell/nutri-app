import { Router } from "express";
import { db } from "@workspace/db";
import { foodsTable, portionsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
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

const router = Router();

// Las categorías viven en @workspace/shared. Al leer se normalizan por si hay
// filas antiguas guardadas con otros nombres.
function withCategory<T extends { category: string }>(food: T): T {
  return { ...food, category: normalizeCategory(food.category) };
}

router.get("/categories", async (req, res) => {
  return res.json(FOOD_CATEGORIES.map((c) => c.value));
});

router.get("/", async (req, res) => {
  const params = GetFoodsQueryParams.parse(req.query);
  const hasBarcode = req.query.hasBarcode === "true";
  const conditions = [];
  if (params.q) conditions.push(ilike(foodsTable.name, `%${params.q}%`));
  if (params.category) conditions.push(eq(foodsTable.category, normalizeCategory(params.category)));
  if (params.barcode) conditions.push(eq(foodsTable.barcode, params.barcode));
  if (hasBarcode) conditions.push(sql`${foodsTable.barcode} IS NOT NULL AND ${foodsTable.barcode} != ''`);
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const where = conditions.length ? and(...conditions) : undefined;
  const [foods, countResult] = await Promise.all([
    db.select().from(foodsTable).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(foodsTable).where(where),
  ]);
  return res.json({
    foods: foods.map(withCategory),
    total: Number(countResult[0].count),
  });
});

router.post("/", async (req, res) => {
  const body = CreateFoodBody.parse(req.body);
  const [food] = await db.insert(foodsTable).values({ ...body, category: inferCategory(body) }).returning();
  return res.status(201).json(withCategory(food));
});

router.get("/:id", async (req, res) => {
  const { id } = GetFoodParams.parse({ id: Number(req.params.id) });
  const foods = await db.select().from(foodsTable).where(eq(foodsTable.id, id));
  if (!foods.length) return res.status(404).json({ error: "Food not found" });
  return res.json(withCategory(foods[0]));
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateFoodParams.parse({ id: Number(req.params.id) });
  const body = UpdateFoodBody.parse(req.body);
  const [food] = await db.update(foodsTable).set({ ...body, category: inferCategory(body) }).where(eq(foodsTable.id, id)).returning();
  return res.json(withCategory(food));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteFoodParams.parse({ id: Number(req.params.id) });
  await db.delete(foodsTable).where(eq(foodsTable.id, id));
  return res.status(204).end();
});

router.get("/:id/portions", async (req, res) => {
  const { id } = GetFoodPortionsParams.parse({ id: Number(req.params.id) });
  const portions = await db.select().from(portionsTable).where(eq(portionsTable.foodId, id));
  return res.json(portions);
});

router.post("/:id/portions", async (req, res) => {
  const { id } = CreatePortionParams.parse({ id: Number(req.params.id) });
  const body = CreatePortionBody.parse(req.body);
  const [portion] = await db.insert(portionsTable).values({ foodId: id, ...body }).returning();
  return res.status(201).json(portion);
});

router.delete("/portions/:id", async (req, res) => {
  const { id } = DeletePortionParams.parse({ id: Number(req.params.id) });
  await db.delete(portionsTable).where(eq(portionsTable.id, id));
  return res.status(204).end();
});

export default router;
