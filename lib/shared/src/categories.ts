// Única fuente de verdad de las categorías de alimentos.
// La usan el API (para normalizar lo que se guarda) y el front (chips,
// selectores y emojis), así que no hay que mantener listas duplicadas.

export interface FoodCategory {
  /** Valor que se guarda en foods.category */
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

// Palabras clave por categoría. Se comparan sin tildes y en minúsculas, y con
// límite de palabra al inicio para evitar falsos positivos como "aguacate" →
// "agua" o "panceta" → "pan". El orden importa: gana la primera coincidencia.
const KEYWORDS: Array<[category: string, pattern: RegExp]> = [
  ["frutos-secos", /\b(frutos? secos?|almendra|nuez|nueces|avellana|pistacho|anacardo|cacahuete|cacahuate|nut)/],
  ["frutas", /\b(fruta|manzana|platano|banana|naranja|mandarina|fresa|pera|uva|melon|sandia|kiwi|pina|mango|cereza|melocoton|ciruela|fruit)/],
  ["verduras", /\b(verdura|hortaliza|vegetal|lechuga|tomate|cebolla|zanahoria|pimiento|calabacin|pepino|espinaca|brocoli|coliflor|patata|aguacate|vegetable)/],
  ["legumbres", /\b(legumbre|garbanzo|lenteja|alubia|judia|haba|soja|legume)/],
  ["lacteos", /\b(lacteo|leche|yogur|queso|nata|mantequilla|kefir|dairy|milk|cheese|yogurt)/],
  ["huevos", /\b(huevo|egg)/],
  ["carnes", /\b(carne|pollo|pavo|cerdo|ternera|vacuno|cordero|jamon|embutido|chorizo|salchicha|bacon|meat|chicken|beef|pork)/],
  ["pescados", /\b(pescado|marisco|atun|salmon|merluza|bacalao|sardina|gamba|langostino|mejillon|calamar|fish|seafood|tuna)/],
  // Estas tres llevan límite de palabra al final (con plural opcional) porque
  // sus palabras son prefijo de otras: "pan" de "panceta", "agua" de "aguacate".
  ["grasas", /\b(aceite|grasa|margarina|manteca|oil|fat)(e?s)?\b/],
  ["cereales", /\b(cereal|pasta|arroz|pan|bolleria|tostada|avena|trigo|harina|galleta|bread|rice|oat)(e?s)?\b/],
  // Sin "beverage": Open Food Facts etiqueta casi todo lo vegetal como
  // "plant-based-foods-and-beverages" y lo mandaría todo a bebidas.
  ["bebidas", /\b(bebida|agua|zumo|jugo|refresco|cafe|te|infusion|cerveza|vino|drink|juice|water)(e?s)?\b/],
  ["snacks", /\b(snack|dulce|chocolate|golosina|postre|helado|tarta|pastel|patatas fritas|chips|candy|sweet|dessert)/],
  ["platos", /\b(plato|preparado|precocinado|pizza|hamburguesa|bocadillo|sandwich|ensalada|sopa|guiso|meal|dish|ready)/],
  ["salsas", /\b(salsa|condimento|especia|ketchup|mayonesa|mostaza|vinagre|sauce|spice|seasoning)/],
  ["suplementos", /\b(suplemento|proteina en polvo|whey|creatina|vitamina|supplement|protein powder)/],
];

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Convierte cualquier texto de categoría (de un formulario, de Open Food
 * Facts, de datos antiguos) a uno de los valores de FOOD_CATEGORIES.
 * Si no reconoce nada devuelve "otros".
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
 * Como normalizeCategory, pero si la categoría no dice nada intenta deducirla
 * del nombre y la marca del alimento.
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
