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
  CommandPanel,
  RankedMetricList,
  commandCardClass,
  commandSectionLabelClass,
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

const chartGridColor = "#e3ebef";
const chartAxisTick = { fill: "#718096" };
const chartTooltipStyle = {
  border: "1px solid #d8e3e8",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  boxShadow: "0 14px 34px rgba(16,32,51,0.12)",
  color: "#102033",
  fontSize: "12px",
};

function formatTrendAxis(metric: OverviewTrendMetric, value: number) {
  return metric === "units"
    ? formatDanishNumber(value)
    : `${formatDanishNumber(value / 1000)} t.kr.`;
}

export function OverviewSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: OverviewSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={`${commandSectionLabelClass} text-brand-700`}>{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold leading-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function OverviewTrendPanel({
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
      className={`${commandCardClass} min-w-0`}
      data-testid="revenue-chart"
      aria-busy={isPending}
    >
      <header className="flex min-h-[82px] flex-col gap-3 border-b border-[#e5ecef] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={`${commandSectionLabelClass} text-brand-700`}>Primær udvikling</p>
            {isPending ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-700" role="status">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
                Opdaterer visningen…
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold text-ink">{metricLabel}</h3>
            <p className="text-xl font-semibold text-ink">{metricTotal}</p>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Månedlig udvikling i den aktuelle visning</p>
        </div>

        <label className="relative block w-full min-w-[170px] sm:w-auto">
          <span className="sr-only">Vælg nøgletal til grafen</span>
          <select
            value={metric}
            onChange={(event) => onMetricChange(event.target.value as OverviewTrendMetric)}
            className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white py-1 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none transition hover:border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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

      <div className="px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
        {data.length ? (
          <div className="h-[300px] sm:h-[330px] xl:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 18, right: 16, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id="overviewTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricColor} stopOpacity={0.2} />
                    <stop offset="90%" stopColor={metricColor} stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGridColor} strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={chartAxisTick}
                  dy={8}
                  minTickGap={24}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => formatDanishMonth(String(value), "short")}
                />
                <YAxis
                  domain={domain}
                  tickCount={5}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tick={chartAxisTick}
                  width={58}
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
                  strokeWidth={2.5}
                  fill="url(#overviewTrendFill)"
                  isAnimationActive={false}
                  dot={data.length <= 18 ? { r: 2.5, fill: "#ffffff", stroke: metricColor, strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: metricColor, stroke: "#ffffff", strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid min-h-[300px] place-items-center px-5 py-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-md border border-brand-100 bg-brand-50 text-brand-700">
                <Info className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">Ingen udvikling i visningen</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tilpas eller nulstil filtrene for at vise udviklingen.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

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
    <div className="border-t border-[#e5ecef] px-4 py-3">
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
    <div className="grid min-h-[150px] place-items-center px-5 py-6 text-center">
      <div className="max-w-xs">
        <Info className="mx-auto h-5 w-5 text-orange-400" aria-hidden="true" />
        <p className="mt-2 text-xs font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function RankedPreviewCard({
  eyebrow,
  title,
  description,
  icon,
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
  return (
    <CommandPanel
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      className="flex min-h-[270px] flex-col"
    >
      <div className="flex-1">
        <RankedMetricList
          items={items}
          valueFormatter={valueFormatter}
          tone={tone}
          limit={limit}
        />
      </div>
      <PreviewAction label={actionLabel} view={actionView} onNavigate={onNavigate} />
    </CommandPanel>
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
    <section className="space-y-3" data-testid="supplementary-analysis">
      <OverviewSectionHeader
        eyebrow="Næste analysetrin"
        title="Hvad driver resultaterne?"
        description="Korte previews af de vigtigste produkter, kategorier og omkostninger."
      />

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
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
          <CommandPanel
            eyebrow="Indtjening"
            title="Dækning pr. kategori"
            description="Vises, når dækningsdata er fundet"
            icon={TrendingUp}
            tone="positive"
            className="flex min-h-[270px] flex-col"
          >
            <div className="flex-1">
              <PreviewEmptyState
                title="Indtjeningsdata mangler"
                message="Tilføj dækningsbidrag eller dækningsgrad for at se fordelingen."
              />
            </div>
            <PreviewAction label="Se kategorianalyse" view="categories" onNavigate={onNavigate} />
          </CommandPanel>
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
          <CommandPanel
            eyebrow="Omkostninger"
            title="Omkostninger pr. kategori"
            description="Vises, når omkostningsdata er fundet"
            icon={WalletCards}
            tone="warning"
            className="flex min-h-[270px] flex-col"
          >
            <div className="flex-1">
              <PreviewEmptyState
                title="Omkostningsdata mangler"
                message="Tilføj en kolonne med omkostning eller kostpris for at se fordelingen."
              />
            </div>
          </CommandPanel>
        )}
      </div>
    </section>
  );
});
