import { useState, useEffect } from "react";
import { useGetFoods, getGetFoodsQueryKey, useCreateLogEntry, getGetDayLogQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { Search, Plus, Loader2, ScanBarcode, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateFoodModal from "@/components/CreateFoodModal";
import LogEntryModal from "@/components/LogEntryModal";
import type { Food } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function useFoodsWithBarcode() {
  const [data, setData] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    setLoading(true);
    fetch("/api/foods?hasBarcode=true&limit=30")
      .then((r) => r.json())
      .then((d) => {
        setData(d.foods ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
  }, []);

  return { data, loading, refetch };
}

function QuickAddModal({ food, open, onOpenChange }: { food: Food | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [amount, setAmount] = useState("100");
  const [mealType, setMealType] = useState("almuerzo");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLogEntry = useCreateLogEntry();

  useEffect(() => { if (open) setAmount("100"); }, [open]);
  if (!food) return null;

  const grams = parseFloat(amount) || 100;
  const mult = grams / 100;

  const handleSave = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    createLogEntry.mutate(
      { date: today, data: { mealType: mealType as any, foodId: food.id, amountGrams: grams } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(today) });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          toast({ title: "¡Añadido!", description: `${food.name} añadido a ${mealType}.` });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "No se pudo añadir.", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif leading-tight">{food.name}</DialogTitle>
          {food.brand && <p className="text-sm text-muted-foreground">{food.brand}</p>}
        </DialogHeader>
        <div className="bg-secondary/30 p-4 rounded-2xl my-4 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold">{Math.round(food.caloriesPer100g * mult)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">kcal</p>
          </div>
          <div>
            <p className="font-semibold text-chart-1">{(food.proteinPer100g * mult).toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Prot</p>
          </div>
          <div>
            <p className="font-semibold text-chart-3">{(food.carbsPer100g * mult).toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Carb</p>
          </div>
          <div>
            <p className="font-semibold text-chart-2">{(food.fatPer100g * mult).toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Grasa</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cantidad (g)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/30 border-none rounded-xl h-14 text-lg text-center"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Comida</label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-14 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desayuno">Desayuno</SelectItem>
                <SelectItem value="almuerzo">Almuerzo</SelectItem>
                <SelectItem value="comida">Comida</SelectItem>
                <SelectItem value="merienda">Merienda</SelectItem>
                <SelectItem value="cena">Cena</SelectItem>
                <SelectItem value="snacks">Snacks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="w-full h-14 rounded-2xl text-base shadow-md shadow-primary/20"
          onClick={handleSave}
          disabled={createLogEntry.isPending || grams <= 0}
        >
          {createLogEntry.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Añadir a Hoy
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function FoodCard({ food, onAdd }: { food: Food; onAdd: (f: Food) => void }) {
  return (
    <div
      className="bg-card rounded-2xl p-4 shadow-sm border flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]"
      onClick={() => onAdd(food)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate">{food.name}</h3>
          {food.barcode && (
            <ScanBarcode size={12} className="text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {food.brand ? `${food.brand} · ` : ""}
          {food.caloriesPer100g} kcal / 100{food.unit}
        </p>
        <div className="flex gap-2 mt-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-chart-1">P: {food.proteinPer100g}g</span>
          <span className="text-chart-3">C: {food.carbsPer100g}g</span>
          <span className="text-chart-2">G: {food.fatPer100g}g</span>
        </div>
      </div>
      <Button size="icon" variant="ghost" className="rounded-full bg-secondary/50 text-primary pointer-events-none shrink-0 ml-3">
        <Plus size={18} />
      </Button>
    </div>
  );
}

export default function Foods() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quickAddFood, setQuickAddFood] = useState<Food | null>(null);
  const [showAllScanned, setShowAllScanned] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetFoods(
    { q: debouncedSearch || undefined, limit: 50 },
    { query: { queryKey: getGetFoodsQueryKey({ q: debouncedSearch || undefined, limit: 50 }) } }
  );

  const { data: scannedFoods, loading: scannedLoading, refetch: refetchScanned } = useFoodsWithBarcode();

  const isSearching = debouncedSearch.length > 0;
  const visibleScanned = showAllScanned ? scannedFoods : scannedFoods.slice(0, 4);

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium">Alimentos</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full w-10 h-10 p-0 shadow-sm">
          <Plus size={20} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          className="pl-10 pr-10 rounded-2xl h-12 bg-card border-none shadow-sm text-base"
          placeholder="Buscar alimentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setSearch("")}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Scanned foods section (hidden while searching) ── */}
      {!isSearching && scannedFoods.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScanBarcode size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Escaneados recientemente</h2>
            </div>
            {scannedFoods.length > 4 && (
              <button
                onClick={() => setShowAllScanned((v) => !v)}
                className="text-xs text-primary font-medium flex items-center gap-0.5"
              >
                {showAllScanned ? "Ver menos" : `Ver todos (${scannedFoods.length})`}
                <ChevronRight size={14} className={`transition-transform ${showAllScanned ? "rotate-90" : ""}`} />
              </button>
            )}
          </div>

          {scannedLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-4 border flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleScanned.map((food) => (
                <div
                  key={food.id}
                  className="bg-gradient-to-r from-card to-secondary/20 rounded-2xl p-4 border border-primary/10 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]"
                  onClick={() => setQuickAddFood(food)}
                >
                  {/* Barcode icon badge */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ScanBarcode size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {food.brand ? `${food.brand} · ` : ""}
                      {food.caloriesPer100g} kcal/100g
                    </p>
                    <div className="flex gap-2 mt-1 text-[10px] font-medium">
                      <span className="text-chart-1">P:{food.proteinPer100g}g</span>
                      <span className="text-chart-3">C:{food.carbsPer100g}g</span>
                      <span className="text-chart-2">G:{food.fatPer100g}g</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Plus size={16} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── All foods / search results ── */}
      {!isSearching && scannedFoods.length > 0 && (
        <h2 className="text-sm font-semibold text-foreground mb-3">Todos los alimentos</h2>
      )}

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
            <p>{isSearching ? `Sin resultados para "${search}"` : "No hay alimentos aún."}</p>
            <Button variant="link" onClick={() => setIsCreateModalOpen(true)} className="mt-2 text-primary">
              Crear nuevo alimento
            </Button>
          </div>
        ) : (
          data?.foods.map((food) => (
            <FoodCard key={food.id} food={food} onAdd={setSelectedFood} />
          ))
        )}
      </div>

      <CreateFoodModal
        open={isCreateModalOpen}
        onOpenChange={(v) => {
          setIsCreateModalOpen(v);
          if (!v) refetchScanned();
        }}
      />

      {selectedFood && (
        <LogEntryModal
          food={selectedFood}
          open={!!selectedFood}
          onOpenChange={(open) => !open && setSelectedFood(null)}
        />
      )}

      <QuickAddModal
        food={quickAddFood}
        open={!!quickAddFood}
        onOpenChange={(v) => !v && setQuickAddFood(null)}
      />
    </div>
  );
}
