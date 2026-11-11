import { useState } from "react";
import { useGetTodaySummary, useGetDayLog, getGetTodaySummaryQueryKey, getGetDayLogQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { Plus, Flame, Settings, Activity, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AddExerciseModal from "@/components/AddExerciseModal";
import { useDeleteLogEntry, useDeleteExercise, getGetDayLogQueryKey as getDayLogKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: summary, isLoading: isLoadingSummary } = useGetTodaySummary({ date: today }, { query: { queryKey: getGetTodaySummaryQueryKey({ date: today }) } });
  const { data: dayLog, isLoading: isLoadingLog } = useGetDayLog(today, { query: { queryKey: getGetDayLogQueryKey(today) } });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteEntry = useDeleteLogEntry();
  const deleteExercise = useDeleteExercise();

  const handleDeleteEntry = (id: number) => {
    deleteEntry.mutate({ date: today, entryId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(today) });
        queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
      },
      onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
    });
  };

  const handleDeleteExercise = (id: number) => {
    deleteExercise.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDayLogKey(today) });
        queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
      },
      onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
    });
  };

  if (isLoadingSummary || isLoadingLog) {
    return (
      <div className="p-6 space-y-8 pt-12">
        <Skeleton className="h-12 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const isProfileSetup = summary?.profileSetup;
  const calorieGoal = summary?.calorieGoal ?? 2000;
  const consumed = summary?.totalCalories ?? 0;
  const burned = summary?.caloriesBurned ?? 0;
  const remaining = Math.max(calorieGoal - consumed, 0);
  const progress = Math.min(consumed / calorieGoal, 1);
  const circumference = 251.2;

  return (
    <div className="min-h-[100dvh] bg-background pt-10 px-4 pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium capitalize">
          {format(new Date(), "EEEE, d", { locale: es })}
          <span className="text-muted-foreground ml-2">{format(new Date(), "MMMM", { locale: es })}</span>
        </h1>

        {!isProfileSetup && (
          <Link href="/perfil" className="mt-4 block">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary text-sm">Configura tu perfil</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Para calcular tus calorías ideales</p>
              </div>
              <div className="bg-primary text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center">
                <Settings size={16} />
              </div>
            </div>
          </Link>
        )}
      </header>

      <div className="space-y-4">
        {/* Calorie Ring */}
        <section className="bg-card rounded-[2rem] p-6 shadow-sm border flex flex-col items-center">
          <div className="relative w-44 h-44 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-secondary stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent" />
              <circle
                className="text-primary stroke-current transition-all duration-1000 ease-out"
                strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"
                strokeDasharray={`${progress * circumference} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-serif text-foreground">{remaining}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">restantes</span>
            </div>
          </div>

          <div className="flex justify-between w-full px-2 text-center">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Consumidas</div>
              <div className="font-semibold text-lg">{consumed}</div>
            </div>
            <div className="w-px bg-border my-1" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Quemadas</div>
              <div className="font-semibold text-lg text-orange-500 flex items-center justify-center gap-1">
                <Flame size={14} /> {burned}
              </div>
            </div>
          </div>
        </section>

        {/* Macros */}
        <section className="bg-card rounded-3xl p-5 shadow-sm border flex justify-between">
          {[
            { label: "Proteínas", value: summary?.totalProtein ?? 0, goal: summary?.proteinGoalG ?? 50, color: "chart-1" },
            { label: "Carbos", value: summary?.totalCarbs ?? 0, goal: summary?.carbsGoalG ?? 250, color: "chart-3" },
            { label: "Grasas", value: summary?.totalFat ?? 0, goal: summary?.fatGoalG ?? 65, color: "chart-2" },
          ].map((macro, i) => (
            <div key={macro.label} className={`flex-1 flex flex-col items-center ${i < 2 ? "border-r" : ""}`}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">{macro.label}</span>
              <span className={`font-semibold text-${macro.color}`}>{Math.round(macro.value)}g</span>
              <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden max-w-[40px]">
                <div className={`bg-${macro.color} h-full`} style={{ width: `${Math.min((macro.value / macro.goal) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </section>

        {/* Meals */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-serif text-xl">Comidas</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs h-auto p-0 hover:bg-transparent" onClick={() => setLocation('/alimentos')}>
              Buscar Alimentos
            </Button>
          </div>

          {dayLog?.meals.map((meal) => (
            <div key={meal.mealType} className="bg-card rounded-2xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium capitalize text-foreground">{meal.mealType}</span>
                  <span className="text-xs text-muted-foreground ml-2">{meal.totalCalories} kcal</span>
                </div>
                <Button
                  size="icon" variant="ghost"
                  className="rounded-full w-9 h-9 bg-secondary/50 text-primary hover:bg-secondary"
                  onClick={() => setLocation('/alimentos')}
                >
                  <Plus size={18} />
                </Button>
              </div>

              {meal.entries.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                  {meal.entries.map(entry => (
                    <div key={entry.id} className="flex justify-between items-center text-sm group">
                      <div>
                        <span className="text-foreground">{entry.food?.name ?? entry.recipe?.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({entry.amountGrams}g)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.calories} kcal</span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Exercise */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-serif text-xl flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />
              Ejercicio
            </h2>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-sm border">
            {dayLog?.exercises && dayLog.exercises.length > 0 ? (
              <div className="space-y-3 mb-4">
                {dayLog.exercises.map(exercise => (
                  <div key={exercise.id} className="flex justify-between items-center text-sm group">
                    <div>
                      <span className="text-foreground font-medium">{exercise.name}</span>
                      {exercise.durationMinutes && (
                        <span className="text-xs text-muted-foreground ml-1">· {exercise.durationMinutes} min</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-orange-500">{exercise.caloriesBurned} kcal</span>
                      <button
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">Sin actividad registrada hoy</p>
            )}

            <Button
              variant="outline"
              className="w-full rounded-xl border-dashed border-orange-300 text-orange-500 hover:bg-orange-50 hover:text-orange-600 h-11"
              onClick={() => setShowExerciseModal(true)}
            >
              <Plus size={16} className="mr-2" />
              Añadir Ejercicio
            </Button>
          </div>
        </section>
      </div>

      <AddExerciseModal
        open={showExerciseModal}
        onOpenChange={setShowExerciseModal}
        date={today}
      />
    </div>
  );
}
