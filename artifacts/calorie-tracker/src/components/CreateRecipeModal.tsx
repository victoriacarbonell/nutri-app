import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateRecipe, getGetRecipesQueryKey,
  useGetFoods, getGetFoodsQueryKey,
} from "@workspace/api-client-react";
import type { Food } from "@workspace/api-client-react";
import { getCategoryEmoji, recipeTotals } from "@workspace/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const recipeSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  servings: z.coerce.number().min(1, "Debe tener al menos 1 porción"),
});

type RecipeFormValues = z.infer<typeof recipeSchema>;

interface IngredientState {
  food: Food;
  amountGrams: string;
}

interface CreateRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function CreateRecipeModal({ open, onOpenChange }: CreateRecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRecipe = useCreateRecipe();

  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim(), 300);

  const searchParams = { q: debouncedSearch, limit: 8 };
  const { data: searchData, isFetching: isSearching } = useGetFoods(searchParams, {
    query: { queryKey: getGetFoodsQueryKey(searchParams), enabled: open && debouncedSearch.length >= 2 },
  });
  const searchResults = (searchData?.foods ?? []).filter(
    (food) => !ingredients.some((ing) => ing.food.id === food.id),
  );

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      description: "",
      servings: 1,
    },
  });

  const servings = Math.max(1, Number(form.watch("servings")) || 1);

  // Mismo cálculo que hace el API al guardar.
  const totals = recipeTotals(
    ingredients.map((ing) => ({ food: ing.food, amountGrams: parseFloat(ing.amountGrams) || 0 })),
    servings,
  );

  const validIngredients = ingredients
    .map((ing) => ({ foodId: ing.food.id, amountGrams: parseFloat(ing.amountGrams) || 0 }))
    .filter((ing) => ing.amountGrams > 0);

  const addIngredient = (food: Food) => {
    setIngredients((list) => [...list, { food, amountGrams: "100" }]);
    setSearch("");
  };

  const updateIngredient = (index: number, amountGrams: string) => {
    setIngredients((list) => list.map((ing, i) => (i === index ? { ...ing, amountGrams } : ing)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((list) => list.filter((_, i) => i !== index));
  };

  const reset = () => {
    form.reset();
    setIngredients([]);
    setSearch("");
  };

  const onSubmit = (data: RecipeFormValues) => {
    if (validIngredients.length === 0) {
      toast({ title: "Faltan ingredientes", description: "Añade al menos un ingrediente con gramos.", variant: "destructive" });
      return;
    }
    createRecipe.mutate(
      { data: { ...data, ingredients: validIngredients } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRecipesQueryKey() });
          toast({
            title: "Receta creada",
            description: `${data.name}: ${Math.round(totals.perServing.calories)} kcal por porción.`,
          });
          reset();
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo crear la receta.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-3xl p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Crear Receta</DialogTitle>
          <DialogDescription>
            Añade los ingredientes de tu base de alimentos y las porciones que salen.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la receta</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Ensalada César" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-[1fr_auto] gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Deliciosa ensalada..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="servings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porciones</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} className="bg-secondary/30 border-none rounded-xl h-12 w-24 text-center" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Ingredientes */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ingredientes</label>

              {ingredients.length > 0 && (
                <div className="space-y-2 mb-3">
                  {ingredients.map((ing, i) => (
                    <div key={ing.food.id} className="flex items-center gap-2 text-sm">
                      <span className="text-lg shrink-0">{getCategoryEmoji(ing.food.category)}</span>
                      <span className="flex-1 min-w-0 truncate">{ing.food.name}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={ing.amountGrams}
                        onChange={(e) => updateIngredient(i, e.target.value)}
                        className="bg-secondary/30 border-none rounded-xl h-10 w-20 text-center"
                        aria-label={`Gramos de ${ing.food.name}`}
                      />
                      <span className="text-xs text-muted-foreground w-5">g</span>
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${ing.food.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar alimento para añadir..."
                  className="pl-9 bg-secondary/30 border-none rounded-xl h-12"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" size={16} />}
              </div>

              {debouncedSearch.length >= 2 && (
                <div className="mt-2 bg-secondary/30 rounded-2xl p-2 space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.length === 0 && !isSearching && (
                    <p className="text-xs text-muted-foreground px-2 py-1">Sin resultados. Crea el alimento en la pestaña Alimentos.</p>
                  )}
                  {searchResults.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => addIngredient(food)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left text-sm hover:bg-card transition-colors"
                    >
                      <span className="text-lg shrink-0">{getCategoryEmoji(food.category)}</span>
                      <span className="flex-1 min-w-0 truncate">{food.name}{food.brand ? ` · ${food.brand}` : ""}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{Math.round(food.caloriesPer100g)} kcal/100g</span>
                      <Plus size={14} className="text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {ingredients.length > 0 && (
              <div className="bg-secondary/30 rounded-2xl p-4 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">{Math.round(totals.perServing.calories)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">kcal/porción</p>
                </div>
                <div>
                  <p className="font-semibold text-chart-1">{totals.perServing.protein.toFixed(1)}g</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Prot</p>
                </div>
                <div>
                  <p className="font-semibold text-chart-3">{totals.perServing.carbs.toFixed(1)}g</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Carb</p>
                </div>
                <div>
                  <p className="font-semibold text-chart-2">{totals.perServing.fat.toFixed(1)}g</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Grasa</p>
                </div>
                <p className="col-span-4 text-xs text-muted-foreground mt-1">
                  {Math.round(totals.totalGrams)} g en total · {servings} {servings === 1 ? "porción" : "porciones"}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
              <Button
                type="submit"
                className="h-12 rounded-xl px-8 shadow-md shadow-primary/20"
                disabled={createRecipe.isPending || validIngredients.length === 0}
              >
                {createRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
