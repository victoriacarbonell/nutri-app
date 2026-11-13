import { useState, useEffect } from "react";
import { useGetFoods, getGetFoodsQueryKey } from "@workspace/api-client-react";
import { Search, Plus, ScanBarcode, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreateFoodModal from "@/components/CreateFoodModal";
import LogEntryModal from "@/components/LogEntryModal";
import type { Food } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { FOOD_CATEGORIES, getCategoryEmoji, inferCategory } from "@workspace/shared";

// ─── Food card ────────────────────────────────────────────────────────────────

function FoodIcon({ food }: { food: Food }) {
  const isEmoji = food.photoUrl && food.photoUrl.length <= 4;
  const isUrl = food.photoUrl && !isEmoji;

  if (isUrl) {
    return (
      <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-secondary">
        <img src={food.photoUrl!} alt={food.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const emoji = isEmoji ? food.photoUrl! : getCategoryEmoji(food.category);
  return (
    <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0 text-2xl">
      {emoji}
    </div>
  );
}

function FoodCard({ food, onAdd }: { food: Food; onAdd: (f: Food) => void }) {
  return (
    <div
      className="bg-card rounded-2xl p-3.5 shadow-sm border flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]"
      onClick={() => onAdd(food)}
    >
      <FoodIcon food={food} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-medium text-foreground truncate text-sm">{food.name}</h3>
          {food.barcode && <ScanBarcode size={11} className="text-muted-foreground shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {food.brand ? `${food.brand} · ` : ""}
          {food.caloriesPer100g} kcal/100{food.unit}
        </p>
        <div className="flex gap-2 mt-1 text-[10px] font-medium text-muted-foreground">
          <span className="text-chart-1">P: {food.proteinPer100g}g</span>
          <span className="text-chart-3">C: {food.carbsPer100g}g</span>
          <span className="text-chart-2">G: {food.fatPer100g}g</span>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="rounded-full bg-secondary/50 text-primary pointer-events-none shrink-0">
        <Plus size={18} />
      </Button>
    </div>
  );
}

// ─── Category chips ───────────────────────────────────────────────────────────

function CategoryChips({ selected, onChange }: { selected: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
          !selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
        )}
      >
        Todos
      </button>
      {FOOD_CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value === selected ? null : cat.value)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
            selected === cat.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {cat.emoji} {cat.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Foods page ──────────────────────────────────────────────────────────

export default function Foods() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    q: debouncedSearch || undefined,
    category: selectedCategory || undefined,
    limit: 100,
  };

  const { data, isLoading } = useGetFoods(
    queryParams,
    { query: { queryKey: getGetFoodsQueryKey(queryParams) } }
  );

  const isSearching = debouncedSearch.length > 0 || !!selectedCategory;
  const foods = data?.foods ?? [];

  // Group by category when not filtering
  const groupedFoods = !isSearching
    ? foods.reduce<Record<string, Food[]>>((acc, food) => {
        const cat = inferCategory(food) || "otros";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(food);
        return acc;
      }, {})
    : null;

  const sortedCategories = groupedFoods
    ? Object.keys(groupedFoods).sort((a, b) => {
        const order = FOOD_CATEGORIES.map(c => c.value);
        return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
      })
    : [];

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-serif text-foreground font-medium">Alimentos</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full w-10 h-10 p-0 shadow-sm">
          <Plus size={20} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          className="pl-10 pr-10 rounded-2xl h-12 bg-card border-none shadow-sm text-base"
          placeholder="Buscar alimentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearch("")}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="mb-5">
        <CategoryChips selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {/* Food list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-3.5 shadow-sm border flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          ))}
        </div>
      ) : foods.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🔍</p>
          <p>{isSearching ? `Sin resultados${debouncedSearch ? ` para "${debouncedSearch}"` : ""}` : "No hay alimentos aún."}</p>
          <Button variant="link" onClick={() => setIsCreateModalOpen(true)} className="mt-2 text-primary">
            Crear nuevo alimento
          </Button>
        </div>
      ) : isSearching || !groupedFoods ? (
        /* Flat list when searching or filtering */
        <div className="space-y-3">
          {foods.map(food => (
            <FoodCard key={food.id} food={food} onAdd={setSelectedFood} />
          ))}
        </div>
      ) : (
        /* Grouped by category when browsing */
        <div className="space-y-6">
          {sortedCategories.map(cat => {
            const catInfo = FOOD_CATEGORIES.find(c => c.value === cat);
            const items = groupedFoods[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-xl">{catInfo?.emoji ?? "🍽️"}</span>
                  <h2 className="font-serif text-base font-medium capitalize">{catInfo?.label ?? cat}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-2.5">
                  {items.map(food => (
                    <FoodCard key={food.id} food={food} onAdd={setSelectedFood} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateFoodModal
        open={isCreateModalOpen}
        onOpenChange={(v) => setIsCreateModalOpen(v)}
      />

      {selectedFood && (
        <LogEntryModal
          food={selectedFood}
          open={!!selectedFood}
          onOpenChange={(open) => !open && setSelectedFood(null)}
        />
      )}
    </div>
  );
}
