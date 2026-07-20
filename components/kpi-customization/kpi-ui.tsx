"use client";

import {
  Calculator,
  CircleDollarSign,
  PackageCheck,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  formatNumber,
  type KpiColor,
  type KpiDefinition,
  type KpiEvaluation,
  type KpiIcon,
} from "@/lib/kpi-customization";

export const kpiIconMap: Record<KpiIcon, LucideIcon> = {
  revenue: CircleDollarSign,
  profit: TrendingUp,
  target: Target,
  units: PackageCheck,
  calculator: Calculator,
};

export const kpiColorStyles: Record<
  KpiColor,
  { icon: string; accent: string; text: string; soft: string }
> = {
  cyan: {
    icon: "border-cyan-200 bg-cyan-50 text-cyan-700",
    accent: "bg-cyan-500",
    text: "text-cyan-700",
    soft: "border-cyan-100 bg-cyan-50/70",
  },
  green: {
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accent: "bg-emerald-500",
    text: "text-emerald-700",
    soft: "border-emerald-100 bg-emerald-50/70",
  },
  orange: {
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    accent: "bg-orange-500",
    text: "text-orange-700",
    soft: "border-orange-100 bg-orange-50/70",
  },
  navy: {
    icon: "border-slate-200 bg-slate-100 text-slate-800",
    accent: "bg-slate-500",
    text: "text-slate-600",
    soft: "border-slate-200 bg-slate-50",
  },
  purple: {
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    accent: "bg-violet-500",
    text: "text-violet-700",
    soft: "border-violet-100 bg-violet-50/70",
  },
};

export function KpiIconBadge({
  definition,
  size = "default",
}: {
  definition: Pick<KpiDefinition, "icon" | "color">;
  size?: "small" | "default";
}) {
  const Icon = kpiIconMap[definition.icon];
  const styles = kpiColorStyles[definition.color];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-md border ${styles.icon} ${
        size === "small" ? "h-8 w-8" : "h-9 w-9"
      }`}
    >
      <Icon className={size === "small" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
    </span>
  );
}

export function KpiMiniCard({
  definition,
  evaluation,
}: {
  definition: KpiDefinition;
  evaluation: KpiEvaluation;
}) {
  const styles = kpiColorStyles[definition.color];
  return (
    <article className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_8px_22px_rgba(16,32,51,0.05)]">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-center gap-2.5">
        <KpiIconBadge definition={definition} size="small" />
        <p className="min-w-0 truncate text-xs font-semibold text-slate-700">{definition.name}</p>
      </div>
      <p className="mt-3 truncate text-lg font-semibold text-slate-950">
        {evaluation.available && evaluation.value !== null
          ? formatNumber(evaluation.value, definition.format, definition.decimals)
          : "Kan ikke beregnes"}
      </p>
    </article>
  );
}
