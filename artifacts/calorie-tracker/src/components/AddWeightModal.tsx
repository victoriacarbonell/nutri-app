import { useState } from "react";
import { useCreateWeightLog, getGetWeightLogsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Scale } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface AddWeightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddWeightModal({ open, onOpenChange }: AddWeightModalProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createWeightLog = useCreateWeightLog();

  const reset = () => { setWeight(""); setNotes(""); };

  const handleSave = () => {
    const kg = parseFloat(weight);
    if (!kg || kg < 20 || kg > 400) {
      toast({ title: "Introduce un peso válido (20–400 kg)", variant: "destructive" });
      return;
    }
    createWeightLog.mutate(
      { data: { date: today, weightKg: kg, notes: notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWeightLogsQueryKey() });
          toast({ title: "Peso registrado", description: `${kg} kg — ${today}` });
          reset();
          onOpenChange(false);
        },
        onError: () =>
          toast({ title: "Error", description: "No se pudo guardar el peso.", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif flex items-center gap-2">
            <Scale size={20} className="text-primary" />
            Registrar peso
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Peso (kg)</label>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ej. 70.5"
              className="bg-secondary/30 border-none rounded-xl h-16 text-center text-3xl font-serif"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notas (opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="En ayunas, después del entreno..."
              className="bg-secondary/30 border-none rounded-xl h-12"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Fecha: {format(new Date(), "d 'de' MMMM, yyyy")}
          </p>
        </div>

        <Button
          className="w-full h-14 rounded-2xl text-base shadow-md shadow-primary/20"
          onClick={handleSave}
          disabled={createWeightLog.isPending || !weight}
        >
          {createWeightLog.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Guardar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
