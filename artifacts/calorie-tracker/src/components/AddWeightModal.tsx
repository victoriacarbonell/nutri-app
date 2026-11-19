import { useState } from "react";
import { useCreateWeightLog, getGetWeightLogsQueryKey, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Loader2, Ruler, Scale } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { todayString } from "@/lib/meals";

interface AddWeightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Body measurements the API stores alongside each weight log.
export const MEASUREMENTS = [
  { key: "waistCm", label: "Cintura" },
  { key: "hipCm", label: "Cadera" },
  { key: "chestCm", label: "Pecho" },
  { key: "armCm", label: "Brazo" },
  { key: "thighCm", label: "Muslo" },
] as const;

type MeasurementKey = (typeof MEASUREMENTS)[number]["key"];

const EMPTY_MEASUREMENTS: Record<MeasurementKey, string> = { waistCm: "", hipCm: "", chestCm: "", armCm: "", thighCm: "" };

export default function AddWeightModal({ open, onOpenChange }: AddWeightModalProps) {
  const today = todayString();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [measurements, setMeasurements] = useState(EMPTY_MEASUREMENTS);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createWeightLog = useCreateWeightLog();

  const reset = () => {
    setDate(todayString());
    setWeight("");
    setNotes("");
    setShowMeasurements(false);
    setMeasurements(EMPTY_MEASUREMENTS);
  };

  const handleSave = () => {
    const kg = parseFloat(weight);
    if (!kg || kg < 20 || kg > 400) {
      toast({ title: "Introduce un peso válido (20–400 kg)", variant: "destructive" });
      return;
    }
    if (!date || date > today) {
      toast({ title: "Elige una fecha que no sea futura", variant: "destructive" });
      return;
    }
    const cm: Partial<Record<MeasurementKey, number>> = {};
    for (const { key, label } of MEASUREMENTS) {
      const raw = measurements[key].trim();
      if (!raw) continue;
      const value = parseFloat(raw);
      if (!value || value < 10 || value > 300) {
        toast({ title: `${label}: introduce un valor entre 10 y 300 cm`, variant: "destructive" });
        return;
      }
      cm[key] = value;
    }

    createWeightLog.mutate(
      { data: { date, weightKg: kg, notes: notes || undefined, ...cm } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWeightLogsQueryKey() });
          // The latest weight updates the profile, and with it the calorie goal.
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          queryClient.invalidateQueries({
            predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/dashboard"),
          });
          toast({ title: "Peso registrado", description: `${kg} kg · ${format(parseISO(date), "d 'de' MMMM", { locale: es })}` });
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
      <DialogContent className="max-w-md rounded-3xl p-6 max-h-[90dvh] overflow-y-auto">
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
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ej. 70.5"
              className="bg-secondary/30 border-none rounded-xl h-16 text-center text-3xl font-serif"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="weight-date">Fecha</label>
            <Input
              id="weight-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/30 border-none rounded-xl h-12"
            />
          </div>

          <div className="bg-secondary/20 rounded-2xl">
            <button
              type="button"
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="w-full flex items-center justify-between px-4 h-12 text-sm font-medium"
              aria-expanded={showMeasurements}
            >
              <span className="flex items-center gap-2"><Ruler size={16} className="text-primary" /> Medidas corporales (opcional)</span>
              <ChevronDown size={16} className={cn("transition-transform", showMeasurements && "rotate-180")} />
            </button>
            {showMeasurements && (
              <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                {MEASUREMENTS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground mb-1 block" htmlFor={key}>{label} (cm)</label>
                    <Input
                      id={key}
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={measurements[key]}
                      onChange={(e) => setMeasurements({ ...measurements, [key]: e.target.value })}
                      className="bg-background border-none rounded-xl h-11"
                    />
                  </div>
                ))}
              </div>
            )}
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
