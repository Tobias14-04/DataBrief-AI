import {
  Info,
  type LucideIcon,
} from "lucide-react";
import { memo, type ReactNode } from "react";
import { SmoothMetricValue } from "@/components/smooth-metric-value";

export type CommandTone = "brand" | "positive" | "warning" | "neutral" | "purple";
export type CommandVariant = "default" | "overview" | "analysis";

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
  "premium-panel-secondary overflow-hidden rounded-xl";

export const commandSectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.13em]";

export function CommandPageIntro({
  eyebrow,
  title,
  description,
  tone = "brand",
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: CommandTone;
  action?: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <div className="flex flex-col gap-4 px-0.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={`${commandSectionLabelClass} ${styles.helper}`}>{eyebrow}</p>
        <h2 className="mt-1.5 text-[clamp(1.75rem,2.4vw,2.125rem)] font-semibold leading-tight tracking-[-0.02em] text-[#0b1c2d]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export const CompactKpiCard = memo(function CompactKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  variant = "default",
  density = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: CommandTone;
  variant?: CommandVariant;
  density?: "default" | "balanced";
}) {
  const styles = toneStyles[tone];
  const isBalancedOverview = variant === "overview" && density === "balanced";

  if (variant === "overview") {
    return (
      <article
        className={`overview-card overview-interactive-card relative min-w-0 overflow-hidden rounded-xl ${
          isBalancedOverview ? "min-h-[164px] p-[18px]" : "min-h-[176px] p-5"
        }`}
      >
        <span className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.tint} to-transparent`} aria-hidden="true" />
        <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
        <div className={`relative flex items-start ${isBalancedOverview ? "gap-3.5" : "gap-4"}`}>
          <span
            className={`grid shrink-0 place-items-center rounded-lg border ${styles.overviewIcon} ${
              isBalancedOverview ? "h-11 w-11" : "h-12 w-12"
            }`}
          >
            <Icon className={isBalancedOverview ? "h-[18px] w-[18px]" : "h-5 w-5"} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className={isBalancedOverview
                ? "text-[13px] font-semibold leading-5 text-slate-600"
                : "text-sm font-semibold leading-5 text-slate-600"}
              title={label}
            >
              {label}
            </p>
            <SmoothMetricValue
              value={value}
              className={`whitespace-nowrap font-semibold leading-none text-[#0b1c2d] ${
                isBalancedOverview
                  ? "mt-1.5 text-[clamp(1.55rem,1.65vw,2rem)]"
                  : "mt-2 text-[clamp(1.7rem,1.8vw,2.15rem)]"
              }`}
              title={value}
            />
          </div>
        </div>
        <p
          className={`relative border-t border-slate-200/80 pt-3 font-medium leading-5 ${styles.helper} ${
            isBalancedOverview ? "mt-4 text-xs" : "mt-5 text-[13px]"
          }`}
          title={detail}
        >
          {detail}
        </p>
      </article>
    );
  }

  return (
    <article className={`relative min-h-[152px] min-w-0 ${commandCardClass} p-4`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-start gap-3.5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${styles.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-slate-600" title={label}>{label}</p>
          <SmoothMetricValue
            value={value}
            className="mt-1.5 whitespace-nowrap text-[clamp(1.45rem,1.7vw,1.85rem)] font-semibold leading-none text-[#0b1c2d]"
            title={value}
          />
        </div>
      </div>
      <p className={`mt-4 border-t border-slate-100 pt-3 text-xs font-medium leading-5 ${styles.helper}`} title={detail}>{detail}</p>
    </article>
  );
});

export const CompactSecondaryMetric = memo(function CompactSecondaryMetric({
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
          <SmoothMetricValue
            value={value}
            className="mt-1.5 truncate text-[17px] font-semibold leading-6 text-[#0b1c2d]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-panel-secondary min-w-0 rounded-xl px-3.5 py-3">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500" title={label}>{label}</p>
      <p className="mt-1.5 truncate text-base font-semibold text-[#0b1c2d]" title={value}>{value}</p>
    </div>
  );
});

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
  variant = "default",
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
  variant?: CommandVariant;
}) {
  const styles = toneStyles[tone];
  return (
    <section className={`premium-panel min-w-0 overflow-hidden rounded-xl ${className}`} data-testid={testId} data-variant={variant}>
      <header className="flex min-h-[82px] items-center justify-between gap-4 border-b border-[#e5ecef] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          {eyebrow ? <p className={`${commandSectionLabelClass} ${styles.helper}`}>{eyebrow}</p> : null}
          <h2 className={`${eyebrow ? "mt-1.5" : ""} text-lg font-semibold leading-6 text-[#0b1c2d]`} title={title}>{title}</h2>
          {description ? <p className="mt-1 text-[13px] leading-5 text-slate-500" title={description}>{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {Icon ? (
            <span className={`grid h-11 w-11 place-items-center rounded-lg border shadow-sm ${styles.icon}`}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
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
    <div className="space-y-3 p-4 sm:p-5">
      {visibleItems.map((item, index) => (
        <div key={item.name} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5">
          <span className="text-[11px] font-semibold tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-slate-700" title={item.name}>{item.name}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${styles.bar}`}
                style={{ width: `${Math.max(4, (Math.abs(item.value) / maxValue) * 100)}%` }}
              />
            </div>
          </div>
          <span className="max-w-[132px] truncate text-right text-[13px] font-semibold tabular-nums text-[#0b1c2d]" title={valueFormatter(item.value)}>
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
      {!visibleItems.length ? (
        <div className="py-8 text-center">
          <Info className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
          <p className="mt-2 text-sm text-slate-500">Ingen data i den aktuelle visning.</p>
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
        <p className="mt-3 text-base font-semibold text-[#0b1c2d]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p>
      </div>
    </div>
  );
}
