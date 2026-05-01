import { useState } from "react";
import { useGetFoods, getGetFoodsQueryKey } from "@workspace/api-client-react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreateFoodModal from "@/components/CreateFoodModal";
import LogEntryModal from "@/components/LogEntryModal";
import type { Food } from "@workspace/api-client-react";

export default function Foods() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  // Simple debounce
  useState(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetFoods(
    { q: debouncedSearch, limit: 50 },
    { query: { queryKey: getGetFoodsQueryKey({ q: debouncedSearch, limit: 50 }) } }
  );

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium">Alimentos</h1>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full w-10 h-10 p-0 shadow-sm"
        >
          <Plus size={20} />
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input 
          className="pl-10 rounded-2xl h-12 bg-card border-none shadow-sm text-base"
          placeholder="Buscar alimentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          ))
        ) : data?.foods.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No se encontraron alimentos.</p>
            <Button 
              variant="link" 
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 text-primary"
            >
              Crear nuevo alimento
            </Button>
          </div>
        ) : (
          data?.foods.map((food) => (
            <div 
              key={food.id} 
              className="bg-card rounded-2xl p-4 shadow-sm border flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedFood(food)}
            >
              <div>
                <h3 className="font-medium text-foreground">{food.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {food.brand ? `${food.brand} • ` : ''}
                  {food.caloriesPer100g} kcal / 100{food.unit}
                </p>
                <div className="flex gap-2 mt-2 text-[10px] font-medium text-muted-foreground">
                  <span className="text-chart-1">P: {food.proteinPer100g}g</span>
                  <span className="text-chart-3">C: {food.carbsPer100g}g</span>
                  <span className="text-chart-2">G: {food.fatPer100g}g</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full bg-secondary/50 text-primary pointer-events-none">
                <Plus size={18} />
              </Button>
            </div>
          ))
        )}
      </div>

      <CreateFoodModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
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
