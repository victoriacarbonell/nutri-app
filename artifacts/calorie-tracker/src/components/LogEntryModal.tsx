import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useCreateLogEntry, getGetDayLogQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Food } from "@workspace/api-client-react";

interface LogEntryModalProps {
  food: Food | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogEntryModal({ food, open, onOpenChange }: LogEntryModalProps) {
  const [amount, setAmount] = useState<string>("100");
  const [mealType, setMealType] = useState<string>("almuerzo");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createLogEntry = useCreateLogEntry();

  useEffect(() => {
    if (open) {
      setAmount("100");
    }
  }, [open]);

  if (!food) return null;

  const numAmount = parseFloat(amount) || 0;
  const multiplier = numAmount / 100;
  
  const calcCalories = Math.round(food.caloriesPer100g * multiplier);
  const calcProtein = (food.proteinPer100g * multiplier).toFixed(1);
  const calcCarbs = (food.carbsPer100g * multiplier).toFixed(1);
  const calcFat = (food.fatPer100g * multiplier).toFixed(1);

  const handleSave = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    createLogEntry.mutate(
      { 
        date: today,
        data: {
          mealType: mealType as any,
          foodId: food.id,
          amountGrams: numAmount
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(today) });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          toast({
            title: "Añadido",
            description: `${food.name} añadido a ${mealType}.`,
          });
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo añadir el alimento.",
            variant: "destructive",
          });
        }
      }
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
             <div className="text-2xl font-bold">{calcCalories}</div>
             <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">kcal</div>
           </div>
           <div className="flex gap-4">
             <div>
                <div className="font-semibold text-chart-1">{calcProtein}g</div>
                <div className="text-[10px] uppercase text-muted-foreground">Prot</div>
             </div>
             <div>
                <div className="font-semibold text-chart-3">{calcCarbs}g</div>
                <div className="text-[10px] uppercase text-muted-foreground">Carb</div>
             </div>
             <div>
                <div className="font-semibold text-chart-2">{calcFat}g</div>
                <div className="text-[10px] uppercase text-muted-foreground">Grasa</div>
             </div>
           </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cantidad ({food.unit})</label>
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
          disabled={createLogEntry.isPending || numAmount <= 0}
        >
          {createLogEntry.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Añadir a Hoy
        </Button>
      </DialogContent>
    </Dialog>
  );
}
