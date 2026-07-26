"use client";

import {
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  Info,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { memo, type ReactNode } from "react";
import {
  type CommandTone,
} from "@/components/command-center-ui";
import { ViewAction } from "@/components/dashboard-command-shell";
import {
  formatDanishCurrency,
  formatDanishMonth,
  formatDanishNumber,
  formatDanishPercent,
  formatMetricTooltip,
} from "@/lib/dashboard-insights";
import type { DashboardView } from "@/lib/dashboard-navigation";

export type OverviewTrendMetric = "revenue" | "grossProfit" | "units" | "cost";

export type OverviewTrendPoint = {
  name: string;
  revenue: number;
  grossProfit: number;
  units: number;
  cost: number;
};

export type OverviewRankedItem = {
  name: string;
  revenue: number;
  units: number;
  grossProfit: number;
  cost: number;
  grossMargin?: number;
};

type TrendMetricOption = {
  value: OverviewTrendMetric;
  label: string;
};

type OverviewSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

const chartGridColor = "#dce7ec";
const chartAxisTick = { fill: "#64748b", fontSize: 12, fontWeight: 500 };
const chartTooltipStyle = {
  border: "1px solid #cfdde4",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  boxShadow: "0 18px 42px rgba(16,32,51,0.16)",
  color: "#102033",
  fontSize: "13px",
  padding: "10px 12px",
};
const overviewEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.14em]";

const previewToneStyles: Record<CommandTone, {
  accent: string;
  icon: string;
  bar: string;
  value: string;
}> = {
  brand: {
    accent: "bg-cyan-500",
    icon: "border-cyan-200 bg-cyan-50 text-cyan-700",
    bar: "bg-cyan-500",
    value: "text-cyan-800",
  },
  positive: {
    accent: "bg-emerald-500",
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    value: "text-emerald-800",
  },
  warning: {
    accent: "bg-orange-500",
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    bar: "bg-orange-500",
    value: "text-orange-800",
  },
  neutral: {
    accent: "bg-slate-500",
    icon: "border-slate-200 bg-slate-100 text-slate-700",
    bar: "bg-slate-500",
    value: "text-slate-700",
  },
  purple: {
    accent: "bg-violet-500",
    icon: "border-violet-200 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
    value: "text-violet-800",
  },
};

function formatTrendAxis(metric: OverviewTrendMetric, value: number) {
  return metric === "units"
    ? formatDanishNumber(value)
    : `${formatDanishNumber(value / 1000)} t.kr.`;
}

const OverviewTrendChart = memo(function OverviewTrendChart({
  data,
  metric,
  metricColor,
  domain,
}: {
  data: OverviewTrendPoint[];
  metric: OverviewTrendMetric;
  metricColor: string;
  domain: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 24, right: 22, bottom: 14, left: 6 }}>
        <defs>
          <linearGradient id="overviewTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metricColor} stopOpacity={0.24} />
            <stop offset="90%" stopColor={metricColor} stopOpacity={0.015} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartGridColor} strokeDasharray="2 6" vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={chartAxisTick}
          dy={10}
          minTickGap={24}
          interval="preserveStartEnd"
          tickFormatter={(value) => formatDanishMonth(String(value), "short")}
        />
        <YAxis
          domain={domain}
          tickCount={5}
          tickLine={false}
          axisLine={false}
          tick={chartAxisTick}
          width={68}
          tickFormatter={(value) => formatTrendAxis(metric, Number(value))}
        />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={formatMetricTooltip}
          labelFormatter={(label) => formatDanishMonth(String(label))}
        />
        <Area
          type="linear"
          dataKey={metric}
          stroke={metricColor}
          strokeWidth={3}
          fill="url(#overviewTrendFill)"
          isAnimationActive={false}
          dot={data.length <= 18 ? { r: 2.5, fill: "#ffffff", stroke: metricColor, strokeWidth: 2 } : false}
          activeDot={{ r: 5, fill: metricColor, stroke: "#ffffff", strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export function OverviewSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: OverviewSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={`${overviewEyebrowClass} text-brand-700`}>{eyebrow}</p>
        <h2 className="mt-1.5 text-[26px] font-semibold leading-tight text-ink sm:text-[28px]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export const OverviewTrendPanel = memo(function OverviewTrendPanel({
  data,
  metric,
  metricLabel,
  metricTotal,
  metricColor,
  metricOptions,
  domain,
  isPending,
  onMetricChange,
}: {
  data: OverviewTrendPoint[];
  metric: OverviewTrendMetric;
  metricLabel: string;
  metricTotal: string;
  metricColor: string;
  metricOptions: TrendMetricOption[];
  domain: [number, number];
  isPending: boolean;
  onMetricChange: (metric: OverviewTrendMetric) => void;
}) {
  return (
    <section
      className="overview-card-primary min-w-0 overflow-hidden rounded-xl"
      data-testid="revenue-chart"
      aria-busy={isPending}
    >
      <header className="flex min-h-[112px] flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={`${overviewEyebrowClass} text-brand-700`}>Primær udvikling</p>
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700" role="status">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
                Opdaterer visningen…
              </span>
            ) : null}
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-semibold leading-6 text-ink">{metricLabel}</h3>
            <p className="mt-1.5 text-[24px] font-semibold leading-none text-slate-700">{metricTotal}</p>
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-600">Månedlig udvikling i den aktuelle visning</p>
        </div>

        <label className="relative block w-full min-w-[190px] sm:w-auto">
          <span className="sr-only">Vælg nøgletal til grafen</span>
          <select
            value={metric}
            onChange={(event) => onMetricChange(event.target.value as OverviewTrendMetric)}
            className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white py-1 pl-3.5 pr-10 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        </label>
      </header>

      <div className="px-3 pb-4 pt-3 sm:px-6 sm:pb-6">
        {data.length ? (
          <div className="h-[340px] sm:h-[380px] xl:h-[410px]">
            <OverviewTrendChart
              data={data}
              metric={metric}
              metricColor={metricColor}
              domain={domain}
            />
          </div>
        ) : (
          <div className="grid min-h-[380px] place-items-center px-5 py-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-brand-100 bg-brand-50 text-brand-700">
                <Info className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-base font-semibold text-ink">Ingen udvikling i visningen</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">Tilpas eller nulstil filtrene for at vise udviklingen.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

function PreviewAction({
  label,
  view,
  onNavigate,
}: {
  label: string;
  view: DashboardView;
  onNavigate: (view: DashboardView) => void;
}) {
  return (
    <div className="border-t border-slate-200/80 px-5 py-3.5">
      <ViewAction label={label} onClick={() => onNavigate(view)} />
    </div>
  );
}

function PreviewEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="grid min-h-[210px] place-items-center px-6 py-7 text-center">
      <div className="max-w-xs">
        <Info className="mx-auto h-5 w-5 text-orange-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1.5 text-[13px] leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function RankedPreviewCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone,
  items,
  valueFormatter,
  limit,
  actionLabel,
  actionView,
  onNavigate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: CommandTone;
  items: Array<{ name: string; value: number }>;
  valueFormatter: (value: number) => string;
  limit: number;
  actionLabel: string;
  actionView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}) {
  const visibleItems = items.slice(0, limit);
  const maxValue = Math.max(...visibleItems.map((item) => Math.abs(item.value)), 1);
  const styles = previewToneStyles[tone];

  return (
    <article className="overview-card overview-interactive-card relative flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl">
      <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
      <header className="flex min-h-[96px] items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
        <div className="min-w-0">
          <p className={`${overviewEyebrowClass} ${styles.value}`}>{eyebrow}</p>
          <h3 className="mt-1.5 text-lg font-semibold leading-6 text-ink">{title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border shadow-sm ${styles.icon}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </header>
      <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-5">
        {visibleItems.length ? visibleItems.map((item, index) => (
          <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
            <p className="truncate text-[13px] font-semibold text-slate-700" title={item.name}>{item.name}</p>
            <p className={`text-right text-[13px] font-semibold ${styles.value}`}>{valueFormatter(item.value)}</p>
            <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${styles.bar}`}
                style={{ width: `${Math.max(7, (Math.abs(item.value) / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        )) : (
          <PreviewEmptyState title="Ingen data i visningen" message="Tilpas filtrene for at vise analysen." />
        )}
      </div>
      <PreviewAction label={actionLabel} view={actionView} onNavigate={onNavigate} />
    </article>
  );
}

function EmptyPreviewCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone,
  emptyTitle,
  emptyMessage,
  actionLabel,
  actionView,
  onNavigate,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: CommandTone;
  emptyTitle: string;
  emptyMessage: string;
  actionLabel?: string;
  actionView?: DashboardView;
  onNavigate: (view: DashboardView) => void;
}) {
  const styles = previewToneStyles[tone];

  return (
    <article className="overview-card relative flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl">
      <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
      <header className="flex min-h-[96px] items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
        <div className="min-w-0">
          <p className={`${overviewEyebrowClass} ${styles.value}`}>{eyebrow}</p>
          <h3 className="mt-1.5 text-lg font-semibold leading-6 text-ink">{title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border shadow-sm ${styles.icon}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </header>
      <div className="flex-1">
        <PreviewEmptyState title={emptyTitle} message={emptyMessage} />
      </div>
      {actionLabel && actionView ? (
        <PreviewAction label={actionLabel} view={actionView} onNavigate={onNavigate} />
      ) : null}
    </article>
  );
}

export const OverviewAnalysisPreviewGrid = memo(function OverviewAnalysisPreviewGrid({
  products,
  categories,
  coverage,
  coverageMode,
  costs,
  showCosts,
  onNavigate,
}: {
  products: OverviewRankedItem[];
  categories: OverviewRankedItem[];
  coverage: OverviewRankedItem[];
  coverageMode: "grossProfit" | "grossMargin" | "empty";
  costs: OverviewRankedItem[];
  showCosts: boolean;
  onNavigate: (view: DashboardView) => void;
}) {
  const coverageItems = coverage.map((item) => ({
    name: item.name,
    value: coverageMode === "grossMargin" ? (item.grossMargin ?? 0) : item.grossProfit,
  }));

  return (
    <section className="overview-section-surface space-y-5 rounded-2xl p-4 sm:p-6" data-testid="supplementary-analysis">
      <OverviewSectionHeader
        eyebrow="Næste analysetrin"
        title="Hvad driver resultaterne?"
        description="Korte previews af de vigtigste produkter, kategorier og omkostninger."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <RankedPreviewCard
          eyebrow="Produkter"
          title="Topprodukter"
          description="Rangeret efter solgte enheder"
          icon={BarChart3}
          tone="brand"
          items={products.map((item) => ({ name: item.name, value: item.units }))}
          valueFormatter={formatDanishNumber}
          limit={5}
          actionLabel="Se produktanalyse"
          actionView="products"
          onNavigate={onNavigate}
        />

        <RankedPreviewCard
          eyebrow="Kategorier"
          title="Omsætning pr. kategori"
          description="De største kategorier i visningen"
          icon={CircleDollarSign}
          tone="brand"
          items={categories.map((item) => ({ name: item.name, value: item.revenue }))}
          valueFormatter={formatDanishCurrency}
          limit={4}
          actionLabel="Se kategorianalyse"
          actionView="categories"
          onNavigate={onNavigate}
        />

        {coverageMode !== "empty" ? (
          <RankedPreviewCard
            eyebrow="Indtjening"
            title={coverageMode === "grossMargin" ? "Dækningsgrad pr. kategori" : "Dækningsbidrag pr. kategori"}
            description={coverageMode === "grossMargin" ? "Gennemsnitlig dækningsgrad" : "Bidrag til den samlede indtjening"}
            icon={TrendingUp}
            tone="positive"
            items={coverageItems}
            valueFormatter={coverageMode === "grossMargin" ? formatDanishPercent : formatDanishCurrency}
            limit={4}
            actionLabel="Se kategorianalyse"
            actionView="categories"
            onNavigate={onNavigate}
          />
        ) : (
          <EmptyPreviewCard
            eyebrow="Indtjening"
            title="Dækning pr. kategori"
            description="Vises, når dækningsdata er fundet"
            icon={TrendingUp}
            tone="positive"
            emptyTitle="Indtjeningsdata mangler"
            emptyMessage="Tilføj dækningsbidrag eller dækningsgrad for at se fordelingen."
            actionLabel="Se kategorianalyse"
            actionView="categories"
            onNavigate={onNavigate}
          />
        )}

        {showCosts && costs.length ? (
          <RankedPreviewCard
            eyebrow="Omkostninger"
            title="Omkostninger pr. kategori"
            description="De største registrerede omkostninger"
            icon={WalletCards}
            tone="warning"
            items={costs.map((item) => ({ name: item.name, value: item.cost }))}
            valueFormatter={formatDanishCurrency}
            limit={4}
            actionLabel="Se omkostningsanalyse"
            actionView="costs"
            onNavigate={onNavigate}
          />
        ) : (
          <EmptyPreviewCard
            eyebrow="Omkostninger"
            title="Omkostninger pr. kategori"
            description="Vises, når omkostningsdata er fundet"
            icon={WalletCards}
            tone="warning"
            emptyTitle="Omkostningsdata mangler"
            emptyMessage="Tilføj en kolonne med omkostning eller kostpris for at se fordelingen."
            onNavigate={onNavigate}
          />
        )}
      </div>
    </section>
  );
});
