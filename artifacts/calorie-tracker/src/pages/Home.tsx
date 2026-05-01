import { useState } from "react";
import { useGetTodaySummary, useGetDayLog, getGetTodaySummaryQueryKey, getGetDayLogQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { Plus, Flame, Settings, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, setLocation] = useLocation();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: summary, isLoading: isLoadingSummary } = useGetTodaySummary({ query: { queryKey: getGetTodaySummaryQueryKey() } });
  const { data: dayLog, isLoading: isLoadingLog } = useGetDayLog(today, { query: { queryKey: getGetDayLogQueryKey(today) } });

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

  return (
    <div className="min-h-[100dvh] bg-background pt-12 px-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-foreground font-medium capitalize">
          {format(new Date(), "EEEE, d", { locale: es })}
          <span className="text-muted-foreground ml-2">
            {format(new Date(), "MMMM", { locale: es })}
          </span>
        </h1>
        
        {!isProfileSetup && (
          <Link href="/perfil" className="mt-4 block">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary-foreground text-sm text-primary">Configura tu perfil</h3>
                <p className="text-xs text-muted-foreground mt-1">Para calcular tus calorías ideales</p>
              </div>
              <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center">
                <Settings size={16} />
              </div>
            </div>
          </Link>
        )}
      </header>

      <div className="space-y-8">
        {/* Main Progress Ring Area */}
        <section className="bg-card rounded-[2rem] p-6 shadow-sm border flex flex-col items-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                className="text-secondary stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              {/* Progress ring */}
              <circle
                className="text-primary stroke-current transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${Math.min(((summary?.netCalories || 0) / (summary?.calorieGoal || 2000)) * 251.2, 251.2)} 251.2`}
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-serif text-foreground">
                {Math.max((summary?.calorieGoal || 2000) - (summary?.netCalories || 0), 0)}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">restantes</span>
            </div>
          </div>
          
          <div className="flex justify-between w-full px-2 text-center">
            <div className="flex-1">
              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs mb-1 uppercase tracking-wider font-medium">
                Consumidas
              </div>
              <div className="font-semibold text-lg">{summary?.totalCalories || 0}</div>
            </div>
            <div className="w-px bg-border my-2"></div>
            <div className="flex-1">
              <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs mb-1 uppercase tracking-wider font-medium">
                Quemadas
              </div>
              <div className="font-semibold text-lg text-orange-500 flex items-center justify-center gap-1">
                <Flame size={14} /> {summary?.caloriesBurned || 0}
              </div>
            </div>
          </div>
        </section>

        {/* Macros */}
        <section className="bg-card rounded-3xl p-5 shadow-sm border flex justify-between">
          <div className="flex-1 flex flex-col items-center border-r">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Proteínas</span>
            <span className="font-semibold text-chart-1">{summary?.totalProtein || 0}g</span>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden max-w-[40px]">
              <div className="bg-chart-1 h-full" style={{ width: `${Math.min(((summary?.totalProtein || 0) / (summary?.proteinGoalG || 50)) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center border-r">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Carbos</span>
            <span className="font-semibold text-chart-3">{summary?.totalCarbs || 0}g</span>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden max-w-[40px]">
              <div className="bg-chart-3 h-full" style={{ width: `${Math.min(((summary?.totalCarbs || 0) / (summary?.carbsGoalG || 250)) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Grasas</span>
            <span className="font-semibold text-chart-2">{summary?.totalFat || 0}g</span>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden max-w-[40px]">
              <div className="bg-chart-2 h-full" style={{ width: `${Math.min(((summary?.totalFat || 0) / (summary?.fatGoalG || 65)) * 100, 100)}%` }} />
            </div>
          </div>
        </section>

        {/* Meals */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h2 className="font-serif text-xl">Comidas</h2>
            <Button variant="ghost" size="sm" className="text-primary text-xs h-auto p-0 hover:bg-transparent" onClick={() => setLocation('/alimentos')}>
              Buscar Alimentos
            </Button>
          </div>
          
          {dayLog?.meals.map((meal) => (
            <div key={meal.mealType} className="bg-card rounded-2xl p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="font-medium capitalize text-foreground">{meal.mealType}</span>
                  <span className="text-xs text-muted-foreground">{meal.totalCalories} kcal</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="rounded-full w-10 h-10 bg-secondary/50 text-primary hover:bg-secondary"
                  onClick={() => setLocation('/alimentos')}
                >
                  <Plus size={20} />
                </Button>
              </div>

              {meal.entries.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-border/50">
                  {meal.entries.map(entry => (
                    <div key={entry.id} className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="text-foreground">{entry.food?.name || entry.recipe?.name}</span>
                        <span className="text-xs text-muted-foreground">{entry.amountGrams}g</span>
                      </div>
                      <span className="font-medium">{entry.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Exercises */}
        <section className="space-y-4 pt-4">
          <div className="flex justify-between items-end px-2">
            <h2 className="font-serif text-xl flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />
              Ejercicio
            </h2>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-sm border">
            {dayLog?.exercises && dayLog.exercises.length > 0 ? (
               <div className="space-y-3">
                 {dayLog.exercises.map(exercise => (
                   <div key={exercise.id} className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="text-foreground">{exercise.name}</span>
                        {exercise.durationMinutes && <span className="text-xs text-muted-foreground">{exercise.durationMinutes} min</span>}
                      </div>
                      <span className="font-medium text-orange-500">{exercise.caloriesBurned} kcal</span>
                    </div>
                 ))}
               </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sin actividad registrada hoy</span>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5"
            >
              <Plus size={16} className="mr-2" />
              Añadir Ejercicio
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
