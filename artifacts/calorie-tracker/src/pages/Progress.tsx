import { useState } from "react";
import { useGetWeightLogs, getGetWeightLogsQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Progress() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: weightLogs, isLoading } = useGetWeightLogs(
    { limit: 30 },
    { query: { queryKey: getGetWeightLogsQueryKey({ limit: 30 }) } }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 pt-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // Format data for chart (reverse to chronological order)
  const chartData = weightLogs ? [...weightLogs].reverse().map(log => ({
    date: format(parseISO(log.date), 'dd/MM'),
    peso: log.weightKg,
    fullDate: log.date
  })) : [];

  const latestWeight = weightLogs && weightLogs.length > 0 ? weightLogs[0].weightKg : null;

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium">Progreso</h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-full w-10 h-10 p-0 shadow-sm"
        >
          <Plus size={20} />
        </Button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Peso Actual</h2>
          <div className="text-4xl font-serif font-medium text-foreground">
            {latestWeight ? latestWeight : "--"} <span className="text-lg text-muted-foreground font-sans">kg</span>
          </div>
        </div>
        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <Scale size={32} />
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-card rounded-3xl p-5 shadow-sm border mb-8">
          <h2 className="font-serif text-lg mb-6">Historial de Peso</h2>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={10} 
                  minTickGap={20}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="peso" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-serif text-xl px-2">Registros recientes</h3>
        
        {weightLogs?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No tienes registros de peso.
          </div>
        ) : (
          weightLogs?.slice(0, 5).map(log => (
            <div key={log.id} className="bg-card rounded-2xl p-4 shadow-sm border flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {format(parseISO(log.date), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
                {log.notes && (
                  <span className="text-xs text-muted-foreground mt-1">{log.notes}</span>
                )}
              </div>
              <div className="text-lg font-semibold">
                {log.weightKg} kg
              </div>
            </div>
          ))
        )}
      </div>

      {/* Placeholder for modal */}
    </div>
  );
}
