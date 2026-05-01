import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useGetMonthCalendar, getGetMonthCalendarQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const { data: calendarDays, isLoading } = useGetMonthCalendar(
    year, 
    month,
    { query: { queryKey: getGetMonthCalendarQueryKey(year, month) } }
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1)); // Adjust for Monday start

  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 0) {
    endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
  }

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'on_track': return 'bg-chart-1 text-chart-1-foreground';
      case 'over': return 'bg-destructive text-destructive-foreground';
      case 'under': return 'bg-chart-3 text-chart-3-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-20">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-6">Calendario</h1>

      <div className="bg-card rounded-3xl p-5 shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full">
            <ChevronLeft size={20} />
          </Button>
          <h2 className="text-lg font-medium capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full">
            <ChevronRight size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground pb-2">
              {day}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayData = calendarDays?.find(d => d.date === dateStr);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square rounded-full flex flex-col items-center justify-center relative",
                    !isCurrentMonth && "opacity-30",
                    isCurrentDay && "border-2 border-primary"
                  )}
                >
                  <span className="text-sm font-medium">{format(day, "d")}</span>
                  
                  {dayData?.hasLog && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full absolute bottom-1",
                      getStatusColor(dayData.status).split(' ')[0]
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="font-serif text-lg">Leyenda</h3>
        <div className="bg-card rounded-2xl p-4 border shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-chart-1" />
            <span className="text-sm">En el objetivo (±10%)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm">Por encima del objetivo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-chart-3" />
            <span className="text-sm">Por debajo del objetivo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
