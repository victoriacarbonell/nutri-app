import { useState } from "react";
import {
  useGetAiWeeklySummary, getGetAiWeeklySummaryQueryKey,
  useGetAiMonthlySummary, getGetAiMonthlySummaryQueryKey,
} from "@workspace/api-client-react";
import { Sparkles, RefreshCw, Lightbulb, Target, Star, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Period = "weekly" | "monthly";

function ScoreBadge({ score }: { score?: number | null }) {
  if (!score) return null;
  const color =
    score >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    score >= 60 ? "bg-amber-100 text-amber-700 border-amber-200" :
                  "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold", color)}>
      <Star size={13} className="fill-current" />
      {score} / 100
    </div>
  );
}

function SummaryCard({ period }: { period: Period }) {
  const weekly = useGetAiWeeklySummary({
    query: { queryKey: getGetAiWeeklySummaryQueryKey(), enabled: period === "weekly", staleTime: 5 * 60 * 1000 },
  });
  const monthly = useGetAiMonthlySummary({
    query: { queryKey: getGetAiMonthlySummaryQueryKey(), enabled: period === "monthly", staleTime: 5 * 60 * 1000 },
  });

  const { data, isLoading, isFetching, refetch } = period === "weekly" ? weekly : monthly;

  if (isLoading || isFetching) {
    return (
      <div className="space-y-5">
        <div className="bg-card rounded-3xl p-6 border shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="bg-card rounded-3xl p-6 border shadow-sm space-y-3">
          <Skeleton className="h-5 w-32" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
        </div>
        <div className="bg-card rounded-3xl p-6 border shadow-sm space-y-3">
          <Skeleton className="h-5 w-32" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 rounded-3xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-primary/15 rounded-full flex items-center justify-center">
            <Sparkles size={22} className="text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={data.score} />
            <button
              onClick={() => refetch()}
              className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <p className="text-foreground leading-relaxed text-[15px]">{data.summary}</p>
        <p className="text-xs text-muted-foreground mt-3">
          Generado el {new Date(data.generatedAt).toLocaleDateString("es-ES", {
            weekday: "long", day: "numeric", month: "long"
          })}
        </p>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="bg-card rounded-3xl p-5 border shadow-sm">
          <h3 className="font-serif text-lg flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-amber-500" />
            Observaciones
          </h3>
          <div className="space-y-3">
            {data.insights.map((insight, i) => (
              <div key={i} className="flex gap-3 bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
                <div className="w-6 h-6 bg-amber-200/60 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-amber-700">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-card rounded-3xl p-5 border shadow-sm">
          <h3 className="font-serif text-lg flex items-center gap-2 mb-4">
            <Target size={18} className="text-primary" />
            Recomendaciones
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-3.5">
                <div className="w-6 h-6 bg-primary/15 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AISummaries() {
  const [period, setPeriod] = useState<Period>("weekly");

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={22} className="text-primary" />
          <h1 className="text-3xl font-serif text-foreground font-medium">Análisis IA</h1>
        </div>
        <p className="text-sm text-muted-foreground">Tu nutricionista personal powered by IA</p>
      </div>

      {/* Period switcher */}
      <div className="flex gap-2 mb-6 bg-secondary/50 p-1 rounded-2xl">
        <button
          onClick={() => setPeriod("weekly")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all",
            period === "weekly"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp size={15} />
          Esta semana
        </button>
        <button
          onClick={() => setPeriod("monthly")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all",
            period === "monthly"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar size={15} />
          Este mes
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-secondary/40 border border-border rounded-2xl p-4 mb-5 flex gap-3">
        <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          El análisis se genera en tiempo real con tus datos de alimentación, ejercicio y peso.
          Cuantos más días registres, más preciso será.
        </p>
      </div>

      <SummaryCard period={period} />
    </div>
  );
}
