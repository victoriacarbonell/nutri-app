import { Link } from "wouter";
import { CalendarDays, X } from "lucide-react";
import { mealLabel, type LogTarget } from "@/lib/meals";

interface LogTargetBannerProps {
  target: LogTarget;
  /** Path of the current page, used by the button that clears the target. */
  basePath: string;
  /** Optional link to the other picker (foods ↔ recipes) keeping the same target. */
  switchTo?: { href: string; label: string };
}

// Shown on Foods and Recipes when the user came from a meal's "+" or from the
// calendar, so it's clear which day and meal the next item goes to.
export default function LogTargetBanner({ target, basePath, switchTo }: LogTargetBannerProps) {
  if (!target.query) return null;
  const parts = [target.meal ? mealLabel(target.meal) : null, target.isToday ? "Hoy" : target.dateLabel].filter(Boolean);

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
      <CalendarDays size={18} className="text-primary shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="text-foreground">
          Añadiendo a <span className="font-semibold">{parts.join(" · ")}</span>
        </p>
        {switchTo && (
          <Link href={`${switchTo.href}${target.query}`} className="text-xs text-primary">
            {switchTo.label}
          </Link>
        )}
      </div>
      <Link href={basePath} aria-label="Quitar destino" className="text-muted-foreground hover:text-foreground">
        <X size={16} />
      </Link>
    </div>
  );
}
