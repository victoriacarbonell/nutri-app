// Single source of truth for food categories. The API uses it to normalize
// what gets stored, and the front end for chips, selects and emojis, so
// there are no duplicated lists to keep in sync.

export interface FoodCategory {
  /** Value stored in foods.category */
  value: string;
  label: string;
  emoji: string;
}

export const DEFAULT_CATEGORY = "otros";

export const FOOD_CATEGORIES: readonly FoodCategory[] = [
  { value: "frutas", label: "Frutas", emoji: "🍎" },
  { value: "verduras", label: "Verduras", emoji: "🥦" },
  { value: "legumbres", label: "Legumbres", emoji: "🫘" },
  { value: "cereales", label: "Cereales y pan", emoji: "🌾" },
  { value: "lacteos", label: "Lácteos", emoji: "🥛" },
  { value: "huevos", label: "Huevos", emoji: "🥚" },
  { value: "carnes", label: "Carnes", emoji: "🥩" },
  { value: "pescados", label: "Pescados y mariscos", emoji: "🐟" },
  { value: "frutos-secos", label: "Frutos secos", emoji: "🥜" },
  { value: "grasas", label: "Aceites y grasas", emoji: "🫒" },
  { value: "bebidas", label: "Bebidas", emoji: "🧃" },
  { value: "snacks", label: "Dulces y snacks", emoji: "🍿" },
  { value: "platos", label: "Platos preparados", emoji: "🍲" },
  { value: "salsas", label: "Salsas y condimentos", emoji: "🧂" },
  { value: "suplementos", label: "Suplementos", emoji: "💊" },
  { value: DEFAULT_CATEGORY, label: "Otros", emoji: "🍽️" },
];

const CATEGORY_VALUES = new Set(FOOD_CATEGORIES.map((c) => c.value));

// Keywords per category, compared without accents and in lowercase, with a
// word boundary at the start to avoid false positives such as "aguacate" →
// "agua" or "panceta" → "pan". Order matters: the first match wins.
const KEYWORDS: Array<[category: string, pattern: RegExp]> = [
  ["frutos-secos", /\b(frutos? secos?|almendra|nuez|nueces|avellana|pistacho|anacardo|cacahuete|cacahuate|nut)/],
  ["frutas", /\b(fruta|manzana|platano|banana|naranja|mandarina|fresa|pera|uva|melon|sandia|kiwi|pina|mango|cereza|melocoton|ciruela|fruit)/],
  ["verduras", /\b(verdura|hortaliza|vegetal|lechuga|tomate|cebolla|zanahoria|pimiento|calabacin|pepino|espinaca|brocoli|coliflor|patata|aguacate|vegetable)/],
  ["legumbres", /\b(legumbre|garbanzo|lenteja|alubia|judia|haba|soja|legume)/],
  ["lacteos", /\b(lacteo|leche|yogur|queso|nata|mantequilla|kefir|dairy|milk|cheese|yogurt)/],
  ["huevos", /\b(huevo|egg)/],
  ["carnes", /\b(carne|pollo|pavo|cerdo|ternera|vacuno|cordero|jamon|embutido|chorizo|salchicha|bacon|meat|chicken|beef|pork)/],
  ["pescados", /\b(pescado|marisco|atun|salmon|merluza|bacalao|sardina|gamba|langostino|mejillon|calamar|fish|seafood|tuna)/],
  // These three also need a word boundary at the end (with an optional plural)
  // because their words prefix others: "pan" in "panceta", "agua" in "aguacate".
  ["grasas", /\b(aceite|grasa|margarina|manteca|oil|fat)(e?s)?\b/],
  ["cereales", /\b(cereal|pasta|arroz|pan|bolleria|tostada|avena|trigo|harina|galleta|bread|rice|oat)(e?s)?\b/],
  // No "beverage": Open Food Facts tags almost everything plant-based as
  // "plant-based-foods-and-beverages", which would send it all to drinks.
  ["bebidas", /\b(bebida|agua|zumo|jugo|refresco|cafe|te|infusion|cerveza|vino|drink|juice|water)(e?s)?\b/],
  ["snacks", /\b(snack|dulce|chocolate|golosina|postre|helado|tarta|pastel|patatas fritas|chips|candy|sweet|dessert)/],
  ["platos", /\b(plato|preparado|precocinado|pizza|hamburguesa|bocadillo|sandwich|ensalada|sopa|guiso|meal|dish|ready)/],
  ["salsas", /\b(salsa|condimento|especia|ketchup|mayonesa|mostaza|vinagre|sauce|spice|seasoning)/],
  ["suplementos", /\b(suplemento|proteina en polvo|whey|creatina|vitamina|supplement|protein powder)/],
];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Maps any category text (from a form, Open Food Facts or old data) to
 * one of the FOOD_CATEGORIES values.
 * Returns "otros" when nothing matches.
 */
export function normalizeCategory(value: string | null | undefined): string {
  const folded = fold(value ?? "").replace(/[-_]/g, " ");
  if (!folded) return DEFAULT_CATEGORY;
  const asSlug = folded.replace(/\s+/g, "-");
  if (CATEGORY_VALUES.has(asSlug)) return asSlug;
  for (const [category, pattern] of KEYWORDS) {
    if (pattern.test(folded)) return category;
  }
  return DEFAULT_CATEGORY;
}

/**
 * Like normalizeCategory, but when the category says nothing it tries to
 * infer one from the food's name and brand.
 */
export function inferCategory(food: { name: string; brand?: string | null; category?: string | null }): string {
  const fromCategory = normalizeCategory(food.category);
  if (fromCategory !== DEFAULT_CATEGORY) return fromCategory;
  return normalizeCategory(`${food.name} ${food.brand ?? ""}`);
}

export function getCategory(value: string | null | undefined): FoodCategory {
  const normalized = normalizeCategory(value);
  return FOOD_CATEGORIES.find((c) => c.value === normalized) ?? FOOD_CATEGORIES[FOOD_CATEGORIES.length - 1];
}

export function getCategoryEmoji(value: string | null | undefined): string {
  return getCategory(value).emoji;
}

export function getCategoryLabel(value: string | null | undefined): string {
  return getCategory(value).label;
}
