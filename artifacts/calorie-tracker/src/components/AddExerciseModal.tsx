import { useState } from "react";
import { useCreateExercise, getGetDayLogQueryKey, getGetTodaySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Activity, Flame, Clock, Dumbbell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface AddExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
}

const EXERCISE_PRESETS = [
  { name: "Caminar", caloriesPerMin: 4, icon: "🚶" },
  { name: "Correr", caloriesPerMin: 10, icon: "🏃" },
  { name: "Ciclismo", caloriesPerMin: 8, icon: "🚴" },
  { name: "Natación", caloriesPerMin: 9, icon: "🏊" },
  { name: "Pesas", caloriesPerMin: 6, icon: "🏋️" },
  { name: "Yoga", caloriesPerMin: 3, icon: "🧘" },
  { name: "Pilates", caloriesPerMin: 4, icon: "💪" },
  { name: "Bailar", caloriesPerMin: 6, icon: "💃" },
  { name: "Fútbol", caloriesPerMin: 9, icon: "⚽" },
  { name: "Tenis", caloriesPerMin: 8, icon: "🎾" },
  { name: "Elíptica", caloriesPerMin: 8, icon: "⚡" },
  { name: "HIIT", caloriesPerMin: 12, icon: "🔥" },
];

export default function AddExerciseModal({ open, onOpenChange, date }: AddExerciseModalProps) {
  const today = date ?? format(new Date(), "yyyy-MM-dd");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [calories, setCalories] = useState("150");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createExercise = useCreateExercise();

  const reset = () => {
    setName("");
    setDuration("30");
    setCalories("150");
    setSelectedPreset(null);
  };

  const handlePreset = (preset: typeof EXERCISE_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    setName(preset.name);
    const mins = parseInt(duration) || 30;
    setCalories(String(Math.round(preset.caloriesPerMin * mins)));
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    const preset = EXERCISE_PRESETS.find(p => p.name === selectedPreset);
    if (preset) {
      setCalories(String(Math.round(preset.caloriesPerMin * (parseInt(val) || 0))));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Introduce un nombre para el ejercicio", variant: "destructive" });
      return;
    }
    createExercise.mutate(
      {
        data: {
          name: name.trim(),
          date: today,
          durationMinutes: parseInt(duration) || undefined,
          caloriesBurned: parseInt(calories) || 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(today) });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          toast({ title: "Ejercicio registrado", description: `${name} — ${calories} kcal quemadas` });
          reset();
          onOpenChange(false);
        },
        onError: () =>
          toast({ title: "Error", description: "No se pudo registrar el ejercicio.", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-3xl p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif flex items-center gap-2">
            <Activity size={20} className="text-orange-500" />
            Añadir ejercicio
          </DialogTitle>
        </DialogHeader>

        {/* Preset grid */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Actividad rápida</p>
          <div className="grid grid-cols-4 gap-2">
            {EXERCISE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                className={`flex flex-col items-center gap-1 p-2 rounded-2xl text-xs transition-all ${
                  selectedPreset === preset.name
                    ? "bg-orange-500/15 border-2 border-orange-400 text-orange-600"
                    : "bg-secondary/50 border-2 border-transparent text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-xl">{preset.icon}</span>
                <span className="font-medium leading-tight text-center">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom name */}
        <div>
          <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
            <Dumbbell size={14} /> Nombre del ejercicio
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setSelectedPreset(null); }}
            placeholder="Ej. Senderismo, Boxeo..."
            className="bg-secondary/30 border-none rounded-xl h-12"
          />
        </div>

        {/* Duration & Calories */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Clock size={14} /> Duración (min)
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="bg-secondary/30 border-none rounded-xl h-12 text-center text-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Flame size={14} className="text-orange-500" /> Kcal quemadas
            </label>
            <Input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="bg-secondary/30 border-none rounded-xl h-12 text-center text-lg"
            />
          </div>
        </div>

        {/* Preview */}
        {name && (
          <div className="bg-orange-500/10 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">
                {duration ? `${duration} min · ` : ""}{calories} kcal quemadas
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center">
              <Flame size={24} className="text-orange-500" />
            </div>
          </div>
        )}

        <Button
          className="w-full h-14 rounded-2xl text-base bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
          onClick={handleSave}
          disabled={createExercise.isPending || !name.trim()}
        >
          {createExercise.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Guardar ejercicio
        </Button>
      </DialogContent>
    </Dialog>
  );
}
