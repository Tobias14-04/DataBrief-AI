import {
  Check,
  FileSpreadsheet,
  Info,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type CommandTone = "brand" | "positive" | "warning" | "neutral" | "purple";
export type CommandVariant = "default" | "overview";

const toneStyles: Record<CommandTone, {
  accent: string;
  icon: string;
  overviewIcon: string;
  tint: string;
  helper: string;
  bar: string;
}> = {
  brand: {
    accent: "bg-cyan-500",
    icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
    overviewIcon: "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-[0_8px_20px_rgba(8,145,178,0.12)]",
    tint: "from-cyan-50/95",
    helper: "text-cyan-700",
    bar: "bg-cyan-500",
  },
  positive: {
    accent: "bg-emerald-500",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    overviewIcon: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.12)]",
    tint: "from-emerald-50/95",
    helper: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  warning: {
    accent: "bg-orange-500",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    overviewIcon: "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_8px_20px_rgba(249,115,22,0.12)]",
    tint: "from-orange-50/95",
    helper: "text-orange-700",
    bar: "bg-orange-500",
  },
  neutral: {
    accent: "bg-slate-400",
    icon: "border-slate-200 bg-slate-100 text-slate-700",
    overviewIcon: "border-slate-200 bg-slate-100 text-slate-700 shadow-[0_8px_20px_rgba(71,85,105,0.1)]",
    tint: "from-slate-100/90",
    helper: "text-slate-500",
    bar: "bg-slate-500",
  },
  purple: {
    accent: "bg-violet-500",
    icon: "border-violet-100 bg-violet-50 text-violet-700",
    overviewIcon: "border-violet-200 bg-violet-50 text-violet-700 shadow-[0_8px_20px_rgba(139,92,246,0.12)]",
    tint: "from-violet-50/95",
    helper: "text-violet-700",
    bar: "bg-violet-500",
  },
};

export const commandCardClass =
  "overflow-hidden rounded-lg border border-[#d8e3e8] bg-white shadow-[0_6px_22px_rgba(7,22,37,0.05)]";

export const commandSectionLabelClass =
  "text-[9px] font-semibold uppercase tracking-[0.15em]";

export function CompactKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  variant = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: CommandTone;
  variant?: CommandVariant;
}) {
  const styles = toneStyles[tone];

  if (variant === "overview") {
    return (
      <article className="overview-card overview-interactive-card relative min-h-[176px] min-w-0 overflow-hidden rounded-xl p-5">
        <span className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.tint} to-transparent`} aria-hidden="true" />
        <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border ${styles.overviewIcon}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold leading-5 text-slate-600" title={label}>{label}</p>
            <p
              className="mt-2 whitespace-nowrap text-[clamp(1.7rem,1.8vw,2.15rem)] font-semibold leading-none text-[#0b1c2d]"
              title={value}
            >
              {value}
            </p>
          </div>
        </div>
        <p className={`relative mt-5 border-t border-slate-200/80 pt-3 text-[13px] font-medium leading-5 ${styles.helper}`} title={detail}>
          {detail}
        </p>
      </article>
    );
  }

  return (
    <article className={`relative min-w-0 ${commandCardClass} px-3.5 py-3.5`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${styles.icon}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold text-slate-500" title={label}>{label}</p>
          <p className="mt-1 break-words text-xl font-semibold leading-6 text-[#0b1c2d]" title={value}>{value}</p>
        </div>
      </div>
      <p className={`mt-3 truncate border-t border-slate-100 pt-2.5 text-[9px] font-medium ${styles.helper}`} title={detail}>{detail}</p>
    </article>
  );
}

export function CompactSecondaryMetric({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  variant = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: CommandTone;
  variant?: CommandVariant;
}) {
  const styles = toneStyles[tone];

  if (variant === "overview") {
    return (
      <div className="overview-card-muted overview-interactive-card flex min-h-[98px] min-w-0 items-center gap-3 rounded-xl px-4 py-3.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${styles.overviewIcon}`}>
          {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : <span className={`h-2 w-2 rounded-full ${styles.accent}`} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500" title={label}>{label}</p>
          <p className="mt-1.5 truncate text-[17px] font-semibold leading-6 text-[#0b1c2d]" title={value}>{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 rounded-md border border-[#dfe8ec] bg-white px-3 py-2.5">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400" title={label}>{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-[#0b1c2d]" title={value}>{value}</p>
    </div>
  );
}

export function DatasetCommandCenter({
  fileName,
  sheetName,
  rowCount,
  statusLabel,
  warning,
  onUpload,
  onEditMapping,
  variant = "default",
}: {
  fileName: string;
  sheetName: string;
  rowCount: number;
  statusLabel: string;
  warning?: string;
  onUpload: () => void;
  onEditMapping: () => void;
  variant?: CommandVariant;
}) {
  const isOverview = variant === "overview";

  return (
    <section
      className={`${isOverview ? "overview-card-muted rounded-xl p-4 sm:p-5" : `${commandCardClass} p-3.5`} grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}
      data-testid="dataset-command-center"
    >
      <div className={`flex min-w-0 items-center ${isOverview ? "gap-4" : "gap-3"}`}>
        <span className={`${isOverview ? "h-12 w-12 rounded-lg shadow-[0_8px_22px_rgba(16,185,129,0.12)]" : "h-10 w-10 rounded-md"} grid shrink-0 place-items-center border border-emerald-100 bg-emerald-50 text-emerald-700`}>
          <FileSpreadsheet className={isOverview ? "h-5 w-5" : "h-[18px] w-[18px]"} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`max-w-full truncate font-semibold text-[#0b1c2d] ${isOverview ? "text-sm" : "text-xs"}`} title={fileName}>{fileName}</p>
            <span className={`inline-flex items-center gap-1 rounded-md bg-emerald-50 font-semibold text-emerald-700 ${isOverview ? "px-2.5 py-1.5 text-xs" : "px-2 py-1 text-[9px]"}`}>
              <Check className={isOverview ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
              {statusLabel}
            </span>
          </div>
          <p className={`mt-1 text-slate-500 ${isOverview ? "text-[13px]" : "text-[10px]"}`}>
            {rowCount.toLocaleString("da-DK")} rækker · Ark: {sheetName}
          </p>
          {warning ? <p className={`mt-1 truncate text-amber-700 ${isOverview ? "text-xs" : "text-[9px]"}`} title={warning}>{warning}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          onClick={onEditMapping}
          className={`inline-flex items-center justify-center rounded-md border border-[#d8e3e8] bg-white font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${isOverview ? "h-11 px-4 text-[13px] shadow-sm" : "h-9 px-3 text-[10px]"}`}
        >
          Rediger kolonnetilknytning
        </button>
        <button
          type="button"
          onClick={onUpload}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0b1c2d] font-semibold text-white transition hover:bg-[#15334d] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isOverview ? "h-11 px-4 text-[13px] shadow-[0_8px_20px_rgba(11,28,45,0.16)]" : "h-9 px-3 text-[10px]"}`}
        >
          <Upload className={isOverview ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
          Skift fil
        </button>
      </div>
    </section>
  );
}

export function CommandPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = "brand",
  action,
  children,
  className = "",
  testId,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: CommandTone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <section className={`${commandCardClass} ${className}`} data-testid={testId}>
      <header className="flex min-h-[66px] items-center justify-between gap-3 border-b border-[#e5ecef] px-4 py-3">
        <div className="min-w-0">
          {eyebrow ? <p className={`${commandSectionLabelClass} ${styles.helper}`}>{eyebrow}</p> : null}
          <h2 className={`${eyebrow ? "mt-1" : ""} truncate text-sm font-semibold text-[#0b1c2d]`} title={title}>{title}</h2>
          {description ? <p className="mt-0.5 truncate text-[10px] text-slate-500" title={description}>{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {Icon ? (
            <span className={`grid h-8 w-8 place-items-center rounded-md border ${styles.icon}`}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function RankedMetricList({
  items,
  valueFormatter,
  tone = "brand",
  limit = 6,
}: {
  items: Array<{ name: string; value: number }>;
  valueFormatter: (value: number) => string;
  tone?: CommandTone;
  limit?: number;
}) {
  const visibleItems = items.slice(0, limit);
  const maxValue = Math.max(...visibleItems.map((item) => Math.abs(item.value)), 1);
  const styles = toneStyles[tone];

  return (
    <div className="space-y-2.5 p-4">
      {visibleItems.map((item, index) => (
        <div key={item.name} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5">
          <span className="text-[9px] font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-medium text-slate-700" title={item.name}>{item.name}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${styles.bar}`}
                style={{ width: `${Math.max(4, (Math.abs(item.value) / maxValue) * 100)}%` }}
              />
            </div>
          </div>
          <span className="max-w-[100px] truncate text-right text-[10px] font-semibold text-[#0b1c2d]" title={valueFormatter(item.value)}>
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
      {!visibleItems.length ? (
        <div className="py-8 text-center">
          <Info className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
          <p className="mt-2 text-xs text-slate-500">Ingen data i den aktuelle visning.</p>
        </div>
      ) : null}
    </div>
  );
}

export function CommandEmptyState({
  title,
  message,
  tone = "brand",
}: {
  title: string;
  message: string;
  tone?: CommandTone;
}) {
  const styles = toneStyles[tone];

  return (
    <div className="grid min-h-[190px] place-items-center px-5 py-8 text-center">
      <div className="max-w-sm">
        <span className={`mx-auto grid h-9 w-9 place-items-center rounded-md border ${styles.icon}`}>
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[#0b1c2d]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}
