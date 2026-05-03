import { Router } from "express";
import { db } from "@workspace/db";
import { foodsTable, portionsTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
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

function normalizeCategory(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("fruta")) return "frutas";
  if (normalized.includes("verdura")) return "verduras";
  if (normalized.includes("carne") || normalized.includes("pollo") || normalized.includes("cerdo")) return "carnes";
  if (normalized.includes("pesc")) return "pescados";
  if (normalized.includes("huevo")) return "huevos";
  if (normalized.includes("aceit") || normalized.includes("grasa") || normalized.includes("mante")) return "aceites y grasas";
  if (normalized.includes("fruto seco") || normalized.includes("almendra") || normalized.includes("nuez") || normalized.includes("avellana")) return "frutos secos";
  if (normalized.includes("láct") || normalized.includes("lact")) return "lacteos";
  if (normalized.includes("cereal") || normalized.includes("pasta") || normalized.includes("arroz") || normalized.includes("pan")) return "cereales";
  if (normalized.includes("legumb") || normalized.includes("garban") || normalized.includes("lentej")) return "legumbres";
  if (normalized.includes("bebid") || normalized.includes("agua") || normalized.includes("zumo") || normalized.includes("jugo")) return "bebidas";
  if (normalized.includes("snack") || normalized.includes("dulc") || normalized.includes("boll") || normalized.includes("postre")) return "snacks";
  if (normalized.includes("plat") || normalized.includes("prepar")) return "platos preparados";
  if (normalized.includes("salsa") || normalized.includes("condiment")) return "salsas y condimentos";
  if (normalized.includes("suplement") || normalized.includes("prote") || normalized.includes("vitamin")) return "suplementos";
  return normalized || "otros";
}

const FOOD_CATEGORIES = [
  "Frutas", "Verduras", "Legumbres", "Cereales y pasta", "Pan y bollería",
  "Lácteos", "Carnes", "Pescados y mariscos", "Huevos", "Aceites y grasas",
  "Frutos secos", "Bebidas", "Dulces y snacks", "Salsas y condimentos",
  "Platos preparados", "Suplementos", "General"
];

router.get("/categories", async (req, res) => {
  return res.json(FOOD_CATEGORIES);
});

router.get("/", async (req, res) => {
  const params = GetFoodsQueryParams.parse(req.query);
  const hasBarcode = req.query.hasBarcode === "true";
  const conditions = [];
  if (params.q) conditions.push(ilike(foodsTable.name, `%${params.q}%`));
  if (params.category) conditions.push(eq(foodsTable.category, params.category));
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
    foods: foods.map((food) => ({ ...food, category: normalizeCategory(food.category) })),
    total: Number(countResult[0].count),
  });
});

router.post("/", async (req, res) => {
  const body = CreateFoodBody.parse(req.body);
  const [food] = await db.insert(foodsTable).values({ ...body, category: normalizeCategory(body.category) }).returning();
  return res.status(201).json({ ...food, category: normalizeCategory(food.category) });
});

router.get("/:id", async (req, res) => {
  const { id } = GetFoodParams.parse({ id: Number(req.params.id) });
  const foods = await db.select().from(foodsTable).where(eq(foodsTable.id, id));
  if (!foods.length) return res.status(404).json({ error: "Food not found" });
  return res.json({ ...foods[0], category: normalizeCategory(foods[0].category) });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateFoodParams.parse({ id: Number(req.params.id) });
  const body = UpdateFoodBody.parse(req.body);
  const [food] = await db.update(foodsTable).set({ ...body, category: normalizeCategory(body.category) }).where(eq(foodsTable.id, id)).returning();
  return res.json({ ...food, category: normalizeCategory(food.category) });
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
