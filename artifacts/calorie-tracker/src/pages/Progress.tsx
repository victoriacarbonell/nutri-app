import { useState } from "react";
import { useGetWeightLogs, getGetWeightLogsQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AddWeightModal from "@/components/AddWeightModal";
import { useDeleteWeightLog } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Progress() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: weightLogs, isLoading } = useGetWeightLogs(
    { limit: 30 },
    { query: { queryKey: getGetWeightLogsQueryKey({ limit: 30 }) } }
  );

  const deleteWeightLog = useDeleteWeightLog();

  const handleDelete = (id: number) => {
    deleteWeightLog.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWeightLogsQueryKey() });
        toast({ title: "Registro eliminado" });
      },
      onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
    });
  };

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

  const sortedLogs = weightLogs ? [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)) : [];

  const chartData = sortedLogs.map(log => ({
    date: format(parseISO(log.date), 'dd/MM'),
    peso: log.weightKg,
  }));

  const latestWeight = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].weightKg : null;
  const firstWeight = sortedLogs.length > 1 ? sortedLogs[0].weightKg : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium">Progreso</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="rounded-full w-10 h-10 p-0 shadow-sm">
          <Plus size={20} />
        </Button>
      </div>

      {/* Current weight card */}
      <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Peso Actual</h2>
          <div className="text-4xl font-serif font-medium text-foreground">
            {latestWeight ?? "--"} <span className="text-lg text-muted-foreground font-sans">kg</span>
          </div>
          {weightChange !== null && (
            <p className={`text-sm mt-1 font-medium ${weightChange < 0 ? "text-green-600" : weightChange > 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg desde el inicio
            </p>
          )}
        </div>
        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <Scale size={32} />
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="bg-card rounded-3xl p-5 shadow-sm border mb-5">
          <h2 className="font-serif text-lg mb-4">Evolución del peso</h2>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={8} minTickGap={20} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13 }}
                  formatter={(v: number) => [`${v} kg`, "Peso"]}
                />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-3xl p-8 shadow-sm border mb-5 text-center">
          <Scale size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Añade al menos 2 registros para ver la gráfica de evolución</p>
        </div>
      )}

      {/* Log list */}
      <div className="space-y-3">
        <h3 className="font-serif text-lg px-1">Historial</h3>
        {!weightLogs || weightLogs.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border text-center">
            <p className="text-muted-foreground text-sm">No hay registros de peso aún.</p>
            <Button variant="link" className="text-primary mt-2" onClick={() => setIsAddModalOpen(true)}>
              Registrar peso ahora
            </Button>
          </div>
        ) : (
          [...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).map(log => (
            <div key={log.id} className="bg-card rounded-2xl p-4 shadow-sm border flex items-center justify-between group">
              <div>
                <span className="font-medium text-foreground">
                  {format(parseISO(log.date), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
                {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">{log.weightKg} kg</span>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddWeightModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
}
