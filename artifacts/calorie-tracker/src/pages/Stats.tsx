import { useState } from "react";
import { useGetWeeklyStats, getGetWeeklyStatsQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

export default function Stats() {
  // Fecha local del cliente: así "hoy" es el del usuario y no el del servidor.
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: stats, isLoading } = useGetWeeklyStats(
    { date: today },
    { query: { queryKey: getGetWeeklyStatsQueryKey({ date: today }) } },
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 pt-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full rounded-3xl" />
        <Skeleton className="h-[300px] w-full rounded-3xl" />
      </div>
    );
  }

  // Format data for charts
  const barData = stats?.dailyData.map(day => ({
    name: format(parseISO(day.date), 'EE', { locale: es }).substring(0, 2),
    calorias: day.totalCalories,
    objetivo: day.calorieGoal,
  })) || [];

  const pieData = [
    { name: 'Proteínas', value: stats?.avgProtein || 0, color: 'hsl(var(--chart-1))' },
    { name: 'Carbohidratos', value: stats?.avgCarbs || 0, color: 'hsl(var(--chart-3))' },
    { name: 'Grasas', value: stats?.avgFat || 0, color: 'hsl(var(--chart-2))' },
  ];

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-6">Estadísticas</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-3xl p-5 shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Promedio Diario</div>
          <div className="text-2xl font-semibold">{Math.round(stats?.avgDailyCalories || 0)} <span className="text-sm font-normal text-muted-foreground">kcal</span></div>
        </div>
        <div className="bg-card rounded-3xl p-5 shadow-sm border">
          <div className="text-sm text-muted-foreground mb-1">Días en Objetivo</div>
          <div className="text-2xl font-semibold text-chart-1">{stats?.daysOnTrack || 0} <span className="text-sm font-normal text-foreground">/ 7</span></div>
        </div>
      </div>

      <div className="bg-card rounded-3xl p-5 shadow-sm border mb-6">
        <h2 className="font-serif text-lg mb-6">Calorías últimos 7 días</h2>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--secondary))', opacity: 0.4 }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="calorias" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-3xl p-5 shadow-sm border">
        <h2 className="font-serif text-lg mb-2">Promedio de Macros</h2>
        <div className="h-[220px] w-full flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-4 pl-4">
            {pieData.map((entry, index) => (
              <div key={index}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium">{entry.name}</span>
                </div>
                <div className="text-2xl font-semibold pl-5">
                  {Math.round(entry.value)}<span className="text-sm font-normal text-muted-foreground">g</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
