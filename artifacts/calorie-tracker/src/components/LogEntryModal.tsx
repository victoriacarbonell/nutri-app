import { useState, useEffect } from "react";
import { useCreateLogEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MealTypeSelect from "@/components/MealTypeSelect";
import type { Food } from "@workspace/api-client-react";
import { scaleMacros } from "@workspace/shared";
import { DEFAULT_MEAL, invalidateDayData, mealLabel, todayString, type MealType } from "@/lib/meals";

interface LogEntryModalProps {
  food: Food | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Day to log to (YYYY-MM-DD). Defaults to today. */
  date?: string;
  /** "hoy" or the formatted date, for the button and toast. */
  dateLabel?: string;
  defaultMeal?: MealType | null;
}

export default function LogEntryModal({ food, open, onOpenChange, date, dateLabel = "hoy", defaultMeal }: LogEntryModalProps) {
  const [amount, setAmount] = useState<string>("100");
  const [mealType, setMealType] = useState<MealType>(defaultMeal ?? DEFAULT_MEAL);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLogEntry = useCreateLogEntry();

  useEffect(() => {
    if (open) {
      setAmount("100");
      setMealType(defaultMeal ?? DEFAULT_MEAL);
    }
  }, [open, defaultMeal]);

  if (!food) return null;

  const targetDate = date ?? todayString();
  const numAmount = parseFloat(amount) || 0;
  // Same calculation the API does when saving.
  const macros = scaleMacros(food, numAmount);

  const handleSave = () => {
    createLogEntry.mutate(
      { date: targetDate, data: { mealType, foodId: food.id, amountGrams: numAmount } },
      {
        onSuccess: () => {
          invalidateDayData(queryClient, targetDate);
          toast({ title: "Añadido", description: `${food.name} añadido a ${mealLabel(mealType).toLowerCase()} (${dateLabel}).` });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudo añadir el alimento.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif leading-tight">{food.name}</DialogTitle>
          {food.brand && <div className="text-sm text-muted-foreground">{food.brand}</div>}
        </DialogHeader>

        <div className="bg-secondary/30 p-4 rounded-2xl my-4 flex justify-between items-center text-center">
          <div>
            <div className="text-2xl font-bold">{Math.round(macros.calories)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">kcal</div>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="font-semibold text-chart-1">{macros.protein.toFixed(1)}g</div>
              <div className="text-[10px] uppercase text-muted-foreground">Prot</div>
            </div>
            <div>
              <div className="font-semibold text-chart-3">{macros.carbs.toFixed(1)}g</div>
              <div className="text-[10px] uppercase text-muted-foreground">Carb</div>
            </div>
            <div>
              <div className="font-semibold text-chart-2">{macros.fat.toFixed(1)}g</div>
              <div className="text-[10px] uppercase text-muted-foreground">Grasa</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cantidad ({food.unit})</label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/30 border-none rounded-xl h-14 text-lg text-center"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Comida</label>
            <MealTypeSelect value={mealType} onChange={setMealType} />
          </div>
        </div>

        <Button
          className="w-full h-14 rounded-2xl text-base shadow-md shadow-primary/20"
          onClick={handleSave}
          disabled={createLogEntry.isPending || numAmount <= 0}
        >
          {createLogEntry.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {dateLabel === "hoy" ? "Añadir a Hoy" : `Añadir al ${dateLabel}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
