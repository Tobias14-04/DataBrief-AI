import {
  CircleDollarSign,
  FileSpreadsheet,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export const dashboardCardClass =
  "overflow-hidden rounded-lg border border-[#d8e3e8] bg-white shadow-[0_6px_22px_rgba(7,22,37,0.05)]";
export const chartCardClass =
  "overflow-hidden rounded-lg border border-[#d8e3e8] bg-white shadow-[0_6px_22px_rgba(7,22,37,0.045)]";
export const dashboardCardHeaderClass =
  "flex min-h-[70px] items-center justify-between gap-3 border-b border-[#e8eef1] bg-white px-4 py-3";
export const dashboardEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em]";
export const dashboardIconClass =
  "grid h-8 w-8 shrink-0 place-items-center rounded-md border border-brand-100 bg-brand-50/80 text-brand-700";
export const dashboardSectionClass = "space-y-6";
export const dashboardSectionHeaderClass =
  "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between";
export const dashboardDarkCardClass =
  "overflow-hidden rounded-lg border border-[#18334d] bg-[#10243a] shadow-[0_14px_36px_rgba(16,32,51,0.14)]";
export const dashboardUtilityCardClass =
  "overflow-hidden rounded-lg border border-[#dce6eb] bg-white shadow-[0_4px_16px_rgba(16,32,51,0.035)]";

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
        <p className="min-w-0 text-xs font-semibold leading-5 text-slate-600">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${styles.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 break-words font-semibold leading-none text-ink ${emphasis ? "text-[1.65rem] sm:text-[1.8rem]" : "text-[1.4rem]"}`}>
        {value}
      </p>
      <p className={`mt-auto border-t border-slate-100 pt-3 text-[11px] font-medium leading-4 ${styles.detail}`}>
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
      <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1.5 break-words text-base font-semibold leading-5 text-ink" title={value}>{value}</p>
      {detail ? <p className="mt-auto pt-2 text-[11px] leading-4 text-slate-500" title={detail}>{detail}</p> : null}
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
        <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

export function DatasetHeader({
  fileName,
  title,
  description,
  status,
  showEditMapping,
  onEditMapping,
}: {
  fileName: string;
  title: string;
  description: string;
  status: ReactNode;
  showEditMapping: boolean;
  onEditMapping: () => void;
}) {
  return (
    <section className={dashboardDarkCardClass} data-testid="dataset-header">
      <div className="grid gap-5 px-5 py-5 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:32px_32px] sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/10 text-cyan-200">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Excel-regneark</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-300" title={fileName}>{fileName}</p>
            <h2 className="mt-1.5 text-2xl font-semibold leading-tight text-white">{title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">{description}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center xl:justify-end">
          {status}
          {showEditMapping ? (
            <button
              type="button"
              onClick={onEditMapping}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 px-3.5 text-xs font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Rediger kolonnetilknytning
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ExecutiveSummaryCard({
  insights,
  conclusion,
  status,
}: {
  insights: string[];
  conclusion: string;
  status: string;
}) {
  return (
    <section className={`relative ${dashboardDarkCardClass} p-4 text-white sm:p-5`} data-testid="executive-summary">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-brand-500" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${dashboardEyebrowClass} text-cyan-200`}>Beslutningsgrundlag</p>
          <h2 className="mt-1.5 text-lg font-semibold text-white">Ledelsesresume</h2>
          <p className="mt-1 text-[11px] text-slate-400">Kort opsummering af den aktuelle visning</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 bg-white/10 text-cyan-200">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <ol className="mt-4 divide-y divide-white/[0.08]">
        {insights.map((insight, index) => (
          <li key={insight} className="grid grid-cols-[26px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-cyan-300/10 text-[10px] font-semibold text-cyan-300">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-xs leading-5 text-slate-200">{insight}</span>
          </li>
        ))}
      </ol>

      <div className="mt-4 border-t border-white/10 pt-3.5">
        <p className="text-xs font-semibold leading-5 text-white">{conclusion}</p>
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-300">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>{status}</span>
        </div>
      </div>
    </section>
  );
}
