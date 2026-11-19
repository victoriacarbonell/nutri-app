import { useEffect, useState } from "react";
import { useCreateLogEntry } from "@workspace/api-client-react";
import type { Recipe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { recipeMacrosForGrams } from "@workspace/shared";
import { Loader2, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MealTypeSelect from "@/components/MealTypeSelect";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_MEAL, invalidateDayData, mealLabel, todayString, type MealType } from "@/lib/meals";
import { formatGrams } from "@/lib/format";

interface LogRecipeModalProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  dateLabel?: string;
  defaultMeal?: MealType | null;
}

// Logs a recipe to the diary by servings. The API stores the entry in grams,
// so servings are converted with the recipe's grams per serving.
export default function LogRecipeModal({ recipe, open, onOpenChange, date, dateLabel = "hoy", defaultMeal }: LogRecipeModalProps) {
  const [servings, setServings] = useState("1");
  const [mealType, setMealType] = useState<MealType>(defaultMeal ?? DEFAULT_MEAL);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLogEntry = useCreateLogEntry();

  useEffect(() => {
    if (open) {
      setServings("1");
      setMealType(defaultMeal ?? DEFAULT_MEAL);
    }
  }, [open, defaultMeal]);

  if (!recipe) return null;

  const targetDate = date ?? todayString();
  const numServings = parseFloat(servings) || 0;
  const gramsPerServing = recipe.servings > 0 ? recipe.totalGrams / recipe.servings : 0;
  const grams = numServings * gramsPerServing;
  const macros = recipeMacrosForGrams(recipe, grams);

  const step = (delta: number) => setServings(String(Math.max(0.5, Math.round((numServings + delta) * 2) / 2)));

  const handleSave = () => {
    createLogEntry.mutate(
      { date: targetDate, data: { mealType, recipeId: recipe.id, amountGrams: Math.round(grams) } },
      {
        onSuccess: () => {
          invalidateDayData(queryClient, targetDate);
          toast({ title: "Añadido", description: `${recipe.name} añadida a ${mealLabel(mealType).toLowerCase()} (${dateLabel}).` });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "No se pudo añadir la receta.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif leading-tight">{recipe.name}</DialogTitle>
          <DialogDescription>
            1 porción = {formatGrams(gramsPerServing)} g · la receta da {recipe.servings} {recipe.servings === 1 ? "porción" : "porciones"}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-secondary/30 p-4 rounded-2xl my-4 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold">{Math.round(macros.calories)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">kcal</p>
          </div>
          <div>
            <p className="font-semibold text-chart-1">{macros.protein.toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Prot</p>
          </div>
          <div>
            <p className="font-semibold text-chart-3">{macros.carbs.toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Carb</p>
          </div>
          <div>
            <p className="font-semibold text-chart-2">{macros.fat.toFixed(1)}g</p>
            <p className="text-[10px] uppercase text-muted-foreground">Grasa</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Porciones</label>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-xl shrink-0" onClick={() => step(-0.5)} aria-label="Media porción menos">
                <Minus size={18} />
              </Button>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0.5"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="bg-secondary/30 border-none rounded-xl h-14 text-lg text-center"
              />
              <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-xl shrink-0" onClick={() => step(0.5)} aria-label="Media porción más">
                <Plus size={18} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">{formatGrams(grams)} g</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Comida</label>
            <MealTypeSelect value={mealType} onChange={setMealType} />
          </div>
        </div>

        <Button
          className="w-full h-14 rounded-2xl text-base shadow-md shadow-primary/20"
          onClick={handleSave}
          disabled={createLogEntry.isPending || grams <= 0}
        >
          {createLogEntry.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {dateLabel === "hoy" ? "Añadir a Hoy" : `Añadir al ${dateLabel}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
