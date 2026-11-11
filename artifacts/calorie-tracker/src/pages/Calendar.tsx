import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, addMonths, subMonths, isFuture, parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Flame, Beef, Wheat, Droplets, Activity } from "lucide-react";
import {
  useGetMonthCalendar, getGetMonthCalendarQueryKey,
  useGetDayLog, getGetDayLogQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── Color helpers ───────────────────────────────────────────────────────────

function cellStyle(status: string, hasLog: boolean, future: boolean) {
  if (future || !hasLog) return { bg: "bg-transparent", text: "text-foreground", dot: "" };
  switch (status) {
    case "on_track": return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" };
    case "over":     return { bg: "bg-rose-100 dark:bg-rose-900/40",    text: "text-rose-800 dark:text-rose-200",    dot: "bg-rose-500" };
    case "under":    return { bg: "bg-amber-100 dark:bg-amber-900/40",  text: "text-amber-800 dark:text-amber-200",  dot: "bg-amber-500" };
    default:         return { bg: "bg-transparent", text: "text-foreground", dot: "" };
  }
}

// ─── Day Detail Modal ────────────────────────────────────────────────────────

interface DayDetailModalProps {
  date: string | null;
  calendarDay?: { totalCalories: number; calorieGoal: number; status: string; hasLog: boolean } | null;
  onClose: () => void;
}

function DayDetailModal({ date, calendarDay, onClose }: DayDetailModalProps) {
  const { data: dayLog, isLoading } = useGetDayLog(date ?? "", {
    query: { queryKey: getGetDayLogQueryKey(date ?? ""), enabled: !!date },
  });

  if (!date) return null;

  const pct = calendarDay?.calorieGoal
    ? Math.round((calendarDay.totalCalories / calendarDay.calorieGoal) * 100)
    : 0;

  const totalProtein = dayLog?.totalProtein ?? 0;
  const totalCarbs = dayLog?.totalCarbs ?? 0;
  const totalFat = dayLog?.totalFat ?? 0;
  const totalExercise = dayLog?.exercises?.reduce((s, e) => s + e.caloriesBurned, 0) ?? 0;

  const style = cellStyle(calendarDay?.status ?? "no_data", calendarDay?.hasLog ?? false, false);

  return (
    <Dialog open={!!date} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className={cn("p-6 pb-5", style.bg)}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-60 mb-1">
                  {format(parseISO(date), "EEEE", { locale: es })}
                </p>
                <DialogTitle className={cn("text-2xl font-serif", style.text)}>
                  {format(parseISO(date), "d 'de' MMMM", { locale: es })}
                </DialogTitle>
              </div>
              <button onClick={onClose} className="opacity-50 hover:opacity-80 mt-1">
                <X size={18} />
              </button>
            </div>

            {calendarDay?.hasLog && (
              <div className="mt-4">
                <div className="flex items-end gap-2">
                  <span className={cn("text-4xl font-serif font-medium", style.text)}>
                    {calendarDay.totalCalories}
                  </span>
                  <span className="text-sm opacity-60 pb-1">/ {calendarDay.calorieGoal} kcal</span>
                </div>
                <div className="mt-3 h-2 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", style.dot)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className={cn("text-xs mt-1.5 font-medium", style.text)}>
                  {pct}% del objetivo
                  {calendarDay.status === "on_track" && " · En objetivo ✓"}
                  {calendarDay.status === "over" && " · Por encima del objetivo"}
                  {calendarDay.status === "under" && " · Por debajo del objetivo"}
                </p>
              </div>
            )}
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {!calendarDay?.hasLog && (
            <p className="text-muted-foreground text-sm text-center py-4">Sin registros este día.</p>
          )}

          {calendarDay?.hasLog && (
            <>
              {/* Macros */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Beef size={14} />, label: "Proteínas", val: Math.round(totalProtein), unit: "g", color: "text-chart-1" },
                  { icon: <Wheat size={14} />, label: "Carbos", val: Math.round(totalCarbs), unit: "g", color: "text-chart-3" },
                  { icon: <Droplets size={14} />, label: "Grasas", val: Math.round(totalFat), unit: "g", color: "text-chart-2" },
                ].map(m => (
                  <div key={m.label} className="bg-secondary/50 rounded-2xl p-3 text-center">
                    <div className={cn("flex justify-center mb-1", m.color)}>{m.icon}</div>
                    <div className="font-semibold">{m.val}<span className="text-xs font-normal text-muted-foreground">{m.unit}</span></div>
                    <div className="text-[10px] text-muted-foreground">{m.label}</div>
                  </div>
                ))}
              </div>

              {totalExercise > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500/15 rounded-full flex items-center justify-center">
                    <Activity size={16} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{totalExercise} kcal quemadas</p>
                    <p className="text-xs text-muted-foreground">{dayLog?.exercises?.length} ejercicio(s)</p>
                  </div>
                </div>
              )}

              {isLoading && <Skeleton className="h-20 rounded-2xl" />}

              {/* Meals */}
              {dayLog?.meals.filter(m => m.entries.length > 0).map(meal => (
                <div key={meal.mealType}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex justify-between">
                    <span>{meal.mealType}</span>
                    <span>{meal.totalCalories} kcal</span>
                  </h4>
                  <div className="space-y-1.5">
                    {meal.entries.map(entry => (
                      <div key={entry.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{entry.food?.name ?? entry.recipe?.name}</span>
                        <span className="text-muted-foreground">{entry.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Calendar Component ─────────────────────────────────────────────────

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: calendarDays, isLoading } = useGetMonthCalendar(
    year, month,
    { query: { queryKey: getGetMonthCalendarQueryKey(year, month) } }
  );

  // Build grid starting on Monday
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);

  const gridStart = new Date(monthStart);
  const dow = gridStart.getDay();
  gridStart.setDate(gridStart.getDate() - (dow === 0 ? 6 : dow - 1));

  const gridEnd = new Date(monthEnd);
  const edow = gridEnd.getDay();
  if (edow !== 0) gridEnd.setDate(gridEnd.getDate() + (7 - edow));

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Monthly stats
  const logsThisMonth = calendarDays?.filter(d => d.hasLog) ?? [];
  const onTrack = logsThisMonth.filter(d => d.status === "on_track").length;
  const over    = logsThisMonth.filter(d => d.status === "over").length;
  const under   = logsThisMonth.filter(d => d.status === "under").length;
  const avgCals = logsThisMonth.length > 0
    ? Math.round(logsThisMonth.reduce((s, d) => s + d.totalCalories, 0) / logsThisMonth.length)
    : 0;

  const selectedDayData = selectedDate
    ? calendarDays?.find(d => d.date === selectedDate) ?? null
    : null;

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-6">Calendario</h1>

      {/* Calendar card */}
      <div className="bg-card rounded-3xl p-4 shadow-sm border mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-full">
            <ChevronLeft size={20} />
          </Button>
          <h2 className="text-base font-semibold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-full">
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["L", "M", "X", "J", "V", "S", "D"].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayData = calendarDays?.find(d => d.date === dateStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const future = isFuture(day) && !isToday(day);
              const style = cellStyle(dayData?.status ?? "no_data", dayData?.hasLog ?? false, future);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={i}
                  onClick={() => !future && setSelectedDate(isSelected ? null : dateStr)}
                  disabled={future}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
                    "text-xs font-medium select-none",
                    !isCurrentMonth && "opacity-25",
                    future && "opacity-20 cursor-default",
                    !future && isCurrentMonth && "active:scale-95",
                    style.bg,
                    style.text,
                    isCurrentDay && "ring-2 ring-primary ring-offset-1",
                    isSelected && "ring-2 ring-foreground ring-offset-1",
                  )}
                >
                  <span className={cn("text-sm font-semibold", isCurrentDay && "font-extrabold")}>
                    {format(day, "d")}
                  </span>
                  {dayData?.hasLog && (
                    <span className="text-[9px] leading-none opacity-80 mt-0.5">
                      {dayData.totalCalories > 999
                        ? `${(dayData.totalCalories / 1000).toFixed(1)}k`
                        : dayData.totalCalories}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center mb-5">
        {[
          { color: "bg-emerald-400", label: "En objetivo" },
          { color: "bg-rose-400",    label: "Excedido" },
          { color: "bg-amber-400",   label: "Bajo" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Monthly stats */}
      {logsThisMonth.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-lg px-1">Resumen del mes</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl p-4 border shadow-sm text-center">
              <div className="text-3xl font-serif font-medium text-foreground">{avgCals}</div>
              <div className="text-xs text-muted-foreground mt-1">Kcal promedio/día</div>
            </div>
            <div className="bg-card rounded-2xl p-4 border shadow-sm text-center">
              <div className="text-3xl font-serif font-medium text-foreground">{logsThisMonth.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Días registrados</div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 border shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Adherencia al objetivo</h4>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
              {onTrack > 0 && <div className="bg-emerald-400 rounded-full" style={{ flex: onTrack }} />}
              {over > 0    && <div className="bg-rose-400 rounded-full"    style={{ flex: over }} />}
              {under > 0   && <div className="bg-amber-400 rounded-full"   style={{ flex: under }} />}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 font-medium">{onTrack} en objetivo</span>
              <span className="text-rose-500 font-medium">{over} excedido</span>
              <span className="text-amber-600 font-medium">{under} bajo</span>
            </div>
          </div>

          {logsThisMonth.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border shadow-sm">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Mejor racha</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <Flame size={22} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-serif font-medium">{onTrack} días</div>
                  <div className="text-xs text-muted-foreground">en el objetivo este mes</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {logsThisMonth.length === 0 && !isLoading && (
        <div className="bg-card rounded-2xl p-8 border text-center">
          <p className="text-muted-foreground text-sm">No hay registros en {format(currentDate, "MMMM", { locale: es })}.</p>
          <p className="text-xs text-muted-foreground mt-1">Los días que registres comidas aparecerán aquí.</p>
        </div>
      )}

      {/* Day detail modal */}
      <DayDetailModal
        date={selectedDate}
        calendarDay={selectedDayData}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}
