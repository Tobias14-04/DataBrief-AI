import {
  ChevronRight,
  CircleDollarSign,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { memo } from "react";

export const dashboardCardClass =
  "premium-panel overflow-hidden rounded-xl";
export const chartCardClass =
  "premium-panel-primary overflow-hidden rounded-xl";
export const dashboardCardHeaderClass =
  "flex min-h-[82px] items-center justify-between gap-3 border-b border-[#e8eef1] bg-white px-5 py-4 sm:px-6";
export const dashboardEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.13em]";
export const dashboardIconClass =
  "grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50/80 text-brand-700";
export const dashboardSectionClass = "space-y-6";
export const dashboardSectionHeaderClass =
  "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between";
export const dashboardDarkCardClass =
  "premium-panel-dark overflow-hidden rounded-xl";
export const dashboardUtilityCardClass =
  "premium-panel-secondary overflow-hidden rounded-xl";

type KpiTone = "brand" | "positive" | "warning" | "neutral" | "purple";

export function DashboardKpiCard({
  label,
  value,
  detail,
  emphasis = false,
  icon: Icon = CircleDollarSign,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
  icon?: LucideIcon;
  tone?: KpiTone;
}) {
  const styles = {
    brand: {
      icon: "border-brand-200 bg-brand-50 text-brand-700",
      accent: "bg-brand-500",
      detail: "text-brand-700",
    },
    positive: {
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
      accent: "bg-emerald-500",
      detail: "text-emerald-700",
    },
    warning: {
      icon: "border-orange-200 bg-orange-50 text-orange-700",
      accent: "bg-accent-500",
      detail: "text-orange-700",
    },
    neutral: {
      icon: "border-slate-200 bg-slate-100 text-ink",
      accent: "bg-slate-400",
      detail: "text-slate-500",
    },
    purple: {
      icon: "border-violet-200 bg-violet-50 text-violet-700",
      accent: "bg-violet-500",
      detail: "text-violet-700",
    },
  }[tone];

  return (
    <div
      className={`relative flex min-w-0 flex-col ${dashboardCardClass} ${
        emphasis ? "min-h-[154px] p-5" : "min-h-32 p-4"
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] font-semibold leading-5 text-slate-600">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${styles.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 whitespace-nowrap font-semibold leading-none tabular-nums text-ink ${emphasis ? "text-[clamp(1.55rem,2vw,1.9rem)]" : "text-[clamp(1.35rem,1.7vw,1.6rem)]"}`}>
        {value}
      </p>
      <p className={`mt-auto border-t border-slate-100 pt-3 text-xs font-medium leading-5 ${styles.detail}`}>
        {detail}
      </p>
    </div>
  );
}

export function DashboardSecondaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex min-h-[104px] min-w-0 flex-col px-4 py-4">
      <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1.5 break-words text-base font-semibold leading-5 text-ink" title={value}>{value}</p>
      {detail ? <p className="mt-auto pt-2 text-xs leading-5 text-slate-500" title={detail}>{detail}</p> : null}
    </div>
  );
}

export function EmptyAnalysisState({
  title = "Ingen data i visningen",
  message,
  tone = "brand",
}: {
  title?: string;
  message: string;
  tone?: "brand" | "positive" | "warning";
}) {
  const toneClasses = {
    brand: "border-brand-100 bg-brand-50/70 text-brand-700",
    positive: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    warning: "border-orange-100 bg-orange-50/70 text-orange-700",
  }[tone];

  return (
    <div className="grid h-full min-h-52 place-items-center rounded-md bg-[#f7fafb] px-6 text-center">
      <div className="max-w-xs">
        <span className={`mx-auto grid h-10 w-10 place-items-center rounded-md border ${toneClasses}`}>
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export const ExecutiveSummaryCard = memo(function ExecutiveSummaryCard({
  insights,
  conclusion,
  status,
  onViewAll,
  variant = "default",
}: {
  insights: string[];
  conclusion: string;
  status: string;
  onViewAll?: () => void;
  variant?: "default" | "overview";
}) {
  const isOverview = variant === "overview";

  return (
    <section
      className={`relative ${dashboardDarkCardClass} p-5 text-white ${isOverview ? "shadow-[0_22px_48px_rgba(8,28,45,0.2)] sm:p-6" : "sm:p-6"}`}
      data-testid="executive-summary"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 bg-brand-500" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${dashboardEyebrowClass} text-cyan-200`}>Beslutningsgrundlag</p>
          <h2 className={isOverview ? "mt-2 text-[22px] font-semibold text-white" : "mt-2 text-xl font-semibold text-white"}>Ledelsesresume</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-slate-300">Kort opsummering af den aktuelle visning</p>
        </div>
        <span className={`grid shrink-0 place-items-center border border-white/10 bg-white/10 text-cyan-200 ${isOverview ? "h-11 w-11 rounded-lg" : "h-9 w-9 rounded-md"}`}>
          <Sparkles className={isOverview ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
        </span>
      </div>

      <ol className={`${isOverview ? "mt-6" : "mt-4"} divide-y divide-white/[0.08]`}>
        {insights.map((insight, index) => (
          <li
            key={insight}
            className={`grid gap-3 first:pt-0 last:pb-0 ${isOverview ? "grid-cols-[30px_1fr] py-4" : "grid-cols-[28px_1fr] py-3.5"}`}
          >
            <span className={`grid place-items-center rounded-md bg-cyan-300/10 font-semibold text-cyan-300 ${isOverview ? "h-[30px] w-[30px] text-[11px]" : "h-7 w-7 text-[11px]"}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-sm leading-6 text-slate-100">{insight}</span>
          </li>
        ))}
      </ol>

      <div className={`${isOverview ? "mt-5 pt-4" : "mt-4 pt-3.5"} border-t border-white/10`}>
        <p className="text-sm font-semibold leading-6 text-white">{conclusion}</p>
        <div className={`flex items-start gap-2 text-xs leading-5 text-slate-300 ${isOverview ? "mt-4" : "mt-3.5"}`}>
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>{status}</span>
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 border border-white/10 bg-white/[0.06] px-3 font-semibold text-white transition hover:border-cyan-300/25 hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
              isOverview ? "h-11 rounded-lg text-[13px]" : "h-10 rounded-lg text-[13px]"
            }`}
          >
            Se alle indsigter
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
});
