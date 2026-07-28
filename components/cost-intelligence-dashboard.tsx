"use client";

import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Gauge,
  Info,
  Lightbulb,
  PackageSearch,
  Rows3,
  Search,
  Target,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  memo,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  CommandEmptyState,
  CommandPanel,
} from "@/components/command-center-ui";
import { PremiumSelect } from "@/components/premium-select";
import {
  formatDanishCurrency as currency,
  formatDanishMonth,
  formatDanishNumber as number,
  formatDanishPercent as percent,
} from "@/lib/dashboard-insights";
import {
  buildCostInsightSummary,
  type CostChangeDriver,
  type CostDetailRow,
  type CostIntelligence,
} from "@/lib/cost-intelligence";
import {
  buildExcelCompatibleCsv,
  normalizeForComparison,
} from "@/lib/data-labels";

type CostChartMetric = "cost" | "costShare" | "result" | "grossProfit";
type CostSortKey = "name" | "current" | "change" | "share";
type Tone = "warning" | "positive" | "brand" | "neutral";

const costChartDefinitions: Record<CostChartMetric, {
  label: string;
  description: string;
  color: string;
  previousColor: string;
}> = {
  cost: {
    label: "Omkostninger",
    description: "Registrerede omkostninger pr. måned",
    color: "#f97316",
    previousColor: "#64748b",
  },
  costShare: {
    label: "Omkostningsandel",
    description: "Omkostninger som andel af omsætningen",
    color: "#0891b2",
    previousColor: "#64748b",
  },
  result: {
    label: "Resultat",
    description: "Omsætning minus registrerede omkostninger",
    color: "#10b981",
    previousColor: "#64748b",
  },
  grossProfit: {
    label: "Dækningsbidrag",
    description: "Registreret dækningsbidrag pr. måned",
    color: "#0e7490",
    previousColor: "#64748b",
  },
};

const kpiToneClasses: Record<Tone, {
  accent: string;
  icon: string;
  value: string;
  helper: string;
  glow: string;
}> = {
  warning: {
    accent: "bg-orange-500",
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    value: "text-[#0b1c2d]",
    helper: "text-orange-700",
    glow: "from-orange-50/80",
  },
  positive: {
    accent: "bg-emerald-500",
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    value: "text-emerald-950",
    helper: "text-emerald-700",
    glow: "from-emerald-50/80",
  },
  brand: {
    accent: "bg-cyan-500",
    icon: "border-cyan-200 bg-cyan-50 text-cyan-700",
    value: "text-[#0b1c2d]",
    helper: "text-cyan-700",
    glow: "from-cyan-50/80",
  },
  neutral: {
    accent: "bg-slate-400",
    icon: "border-slate-200 bg-slate-100 text-slate-700",
    value: "text-[#0b1c2d]",
    helper: "text-slate-600",
    glow: "from-slate-100/75",
  },
};

function compactAxisCurrency(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${number(value / 1_000_000)} mio.`;
  if (absolute >= 1_000) return `${number(value / 1_000)} t.`;
  return number(value);
}

function formatMetric(metric: CostChartMetric, value: number) {
  return metric === "costShare" ? percent(value) : currency(value);
}

function axisMetric(metric: CostChartMetric, value: number) {
  return metric === "costShare" ? percent(value) : compactAxisCurrency(value);
}

function signedCurrency(value: number) {
  if (value === 0) return currency(0);
  return `${value > 0 ? "+" : "−"}${currency(Math.abs(value))}`;
}

function signedPercent(value: number | null) {
  if (value === null) return "Ikke retvisende";
  if (value === 0) return percent(0);
  return `${value > 0 ? "+" : "−"}${percent(Math.abs(value))}`;
}

function CostKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const styles = kpiToneClasses[tone];
  return (
    <article className="premium-panel-secondary relative min-h-[154px] min-w-0 overflow-hidden rounded-xl p-4">
      <span className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${styles.glow} to-transparent`} aria-hidden="true" />
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${styles.icon}`}>
          <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className={`mt-2 truncate text-[clamp(1.35rem,1.6vw,1.85rem)] font-semibold leading-none tabular-nums ${styles.value}`} title={value}>
            {value}
          </p>
        </div>
      </div>
      <p className={`relative mt-4 border-t border-slate-100 pt-3 text-xs font-medium leading-5 ${styles.helper}`}>
        {detail}
      </p>
    </article>
  );
}

function CostKpiGrid({ analysis }: { analysis: CostIntelligence }) {
  const largestDriver = analysis.distribution[0];
  const costChange = analysis.comparison?.costChange ?? null;
  const cards = [
    {
      label: "Samlede omkostninger",
      value: currency(analysis.totalCosts),
      detail: analysis.distributionSource === "workbook"
        ? "Samlet fra det registrerede omkostningsark"
        : `Baseret på ${number(analysis.rowCount)} filtrerede rækker`,
      icon: WalletCards,
      tone: "warning" as const,
    },
    analysis.costShare !== null
      ? {
          label: "Omkostningsandel",
          value: percent(analysis.costShare),
          detail: "Omkostninger divideret med omsætning",
          icon: Gauge,
          tone: analysis.costShare <= 0.6 ? "positive" as const : "warning" as const,
        }
      : null,
    analysis.actualResult !== null
      ? {
          label: "Resultat",
          value: currency(analysis.actualResult),
          detail: "Omsætning minus samlede omkostninger",
          icon: TrendingUp,
          tone: analysis.actualResult >= 0 ? "positive" as const : "warning" as const,
        }
      : null,
    analysis.comparison
      ? {
          label: "Ændring",
          value: signedPercent(analysis.comparison.costChangePercent),
          detail: `${analysis.comparison.previousPeriod} → ${analysis.comparison.currentPeriod}`,
          icon: costChange !== null && costChange <= 0 ? ArrowDownRight : ArrowUpRight,
          tone: costChange !== null && costChange <= 0 ? "positive" as const : "warning" as const,
        }
      : null,
    largestDriver
      ? {
          label: "Største driver",
          value: largestDriver.name,
          detail: `${currency(largestDriver.cost)} · ${percent(largestDriver.share)} af omkostningerne`,
          icon: CircleDollarSign,
          tone: "brand" as const,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => card !== null).slice(0, 5);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="cost-kpi-grid">
      {cards.map((card) => <CostKpiCard key={card.label} {...card} />)}
    </div>
  );
}

function CostTrendChart({ analysis }: { analysis: CostIntelligence }) {
  const availableMetrics = useMemo(() => {
    const metrics: CostChartMetric[] = ["cost"];
    if (analysis.hasRevenue) metrics.push("costShare", "result");
    if (analysis.hasGrossProfit) metrics.push("grossProfit");
    return metrics;
  }, [analysis.hasGrossProfit, analysis.hasRevenue]);
  const [selectedMetric, setSelectedMetric] = useState<CostChartMetric>("cost");
  const [showComparison, setShowComparison] = useState(true);
  const activeMetric = availableMetrics.includes(selectedMetric) ? selectedMetric : "cost";
  const definition = costChartDefinitions[activeMetric];
  const chartData = useMemo(
    () => analysis.periods.map((period, index) => {
      const value = period[activeMetric];
      const previousPeriod = analysis.periods[index - 1];
      return {
        name: formatDanishMonth(period.name, "short"),
        fullName: period.name,
        value: value ?? 0,
        previous: previousPeriod ? (previousPeriod[activeMetric] ?? null) : null,
      };
    }),
    [activeMetric, analysis.periods],
  );
  const options = useMemo(
    () => availableMetrics.map((metric) => ({
      value: metric,
      label: costChartDefinitions[metric].label,
      description: costChartDefinitions[metric].description,
    })),
    [availableMetrics],
  );
  const comparisonAvailable = analysis.hasComparison && chartData.length > 1;

  return (
    <CommandPanel
      title="Omkostningsudvikling"
      description={definition.description}
      icon={TrendingUp}
      tone="warning"
      className="premium-panel-primary"
    >
      <div className="px-3 pb-5 pt-4 sm:px-5 sm:pb-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {comparisonAvailable ? (
            <button
              type="button"
              onClick={() => setShowComparison((current) => !current)}
              aria-pressed={showComparison}
              className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition sm:w-auto ${
                showComparison
                  ? "border-slate-300 bg-slate-100 text-slate-800"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              Forrige periode
            </button>
          ) : null}
          <PremiumSelect
            value={activeMetric}
            options={options}
            onChange={(value) => setSelectedMetric(value as CostChartMetric)}
            ariaLabel="Vælg måling til omkostningsgraf"
            align="right"
            className="w-full sm:w-[210px]"
          />
        </div>
        <div className="h-[310px] min-w-0 sm:h-[350px]" data-testid="cost-trend-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 20, bottom: 24, left: 8 }}>
              <defs>
                <linearGradient id="costTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={definition.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={definition.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dce7ec" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#526779", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#c9d9e1" }}
                minTickGap={24}
                interval="preserveStartEnd"
                height={44}
              />
              <YAxis
                tickFormatter={(value) => axisMetric(activeMetric, Number(value))}
                tick={{ fill: "#526779", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                labelFormatter={(label) => String(label)}
                formatter={(value, name) => [
                  formatMetric(activeMetric, Number(value)),
                  name === "previous" ? "Forrige periode" : definition.label,
                ]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #cedde4",
                  boxShadow: "0 16px 38px rgba(13,35,55,0.14)",
                  fontSize: 12,
                }}
              />
              {showComparison && comparisonAvailable ? (
                <Area
                  type="monotone"
                  dataKey="previous"
                  name="previous"
                  stroke={definition.previousColor}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  fill="transparent"
                  connectNulls
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="value"
                name="value"
                stroke={definition.color}
                strokeWidth={2.5}
                fill="url(#costTrendFill)"
                dot={chartData.length <= 18 ? { r: 3, fill: "#fff", stroke: definition.color, strokeWidth: 2 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          <span>
            {analysis.periods.length === 1
              ? "Én registreret periode – sammenligning er ikke tilgængelig."
              : `${number(analysis.periods.length)} perioder i den filtrerede visning.`}
          </span>
          {analysis.distributionSource === "workbook" && analysis.costCoverageRatio !== null ? (
            <span className="font-medium text-slate-600">
              Tidsserien bruger omkostninger fra salgsrækkerne; totalen bruger omkostningsarket.
            </span>
          ) : null}
        </div>
      </div>
    </CommandPanel>
  );
}

function CostBudgetPanel({ analysis }: { analysis: CostIntelligence }) {
  if (!analysis.budget) {
    return (
      <CommandPanel
        title="Budgetanalyse"
        description="Aktiveres med et registreret omkostningsbudget"
        icon={Target}
        tone="neutral"
      >
        <CommandEmptyState
          title="Omkostningsbudget mangler"
          message="Upload et budget med en omkostningskolonne for at se afvigelse og budgetstatus. Et omsætningsbudget bruges ikke som omkostningsbudget."
          tone="neutral"
        />
      </CommandPanel>
    );
  }

  const { actual, budget, variance, variancePercent, status } = analysis.budget;
  const maximum = Math.max(actual, budget, 1);
  const actualWidth = Math.min(100, Math.max(0, (actual / maximum) * 100));
  const budgetPosition = Math.min(100, Math.max(0, (budget / maximum) * 100));
  const statusLabel = status === "favorable"
    ? "Under budgettet"
    : status === "watch"
      ? "Mindre overskridelse"
      : "Væsentligt over budget";
  const statusClasses = status === "favorable"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "watch"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <CommandPanel
      title="Budgetanalyse"
      description="Faktiske omkostninger mod registreret omkostningsbudget"
      icon={Target}
      tone={status === "favorable" ? "positive" : "warning"}
      testId="cost-budget-panel"
    >
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">Faktisk</p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#0b1c2d]">{currency(actual)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">Budget</p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#0b1c2d]">{currency(budget)}</p>
          </div>
        </div>
        <div>
          <div className="relative h-3 rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${status === "favorable" ? "bg-emerald-500" : status === "watch" ? "bg-orange-500" : "bg-rose-500"}`}
              style={{ width: `${actualWidth}%` }}
            />
            <span
              className="absolute top-1/2 h-6 w-0.5 -translate-y-1/2 bg-[#0b1c2d]"
              style={{ left: `${budgetPosition}%` }}
              title={`Budgetmarkør: ${currency(budget)}`}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500">
            <span>0 kr.</span>
            <span>Budgetmarkør</span>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Afvigelse</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${variance <= 0 ? "text-emerald-700" : "text-orange-700"}`}>
              {signedCurrency(variance)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{signedPercent(variancePercent)}</p>
          </div>
          <span className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold ${statusClasses}`}>
            {status === "favorable" ? <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> : null}
            {statusLabel}
          </span>
        </div>
        <p className="text-[11px] leading-5 text-slate-500">
          Statusgrænser: under budget er gunstigt; overskridelser til og med 8 % markeres til opfølgning, og større overskridelser markeres som væsentlige.
        </p>
      </div>
    </CommandPanel>
  );
}

function CostInsightsPanel({ analysis }: { analysis: CostIntelligence }) {
  const summary = useMemo(() => buildCostInsightSummary(analysis), [analysis]);
  return (
    <section className="premium-panel-dark overflow-hidden rounded-xl text-white" data-testid="cost-insights-panel">
      <header className="flex items-start justify-between gap-4 border-b border-cyan-100/10 px-5 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-300">Baseret på registrerede data</p>
          <h2 className="mt-1.5 text-xl font-semibold">Omkostningsindsigter</h2>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-200/15 bg-cyan-300/10 text-cyan-200">
          <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </header>
      <div className="p-5">
        <ol className="space-y-3">
          {summary.insights.map((insight, index) => (
            <li key={insight} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-200">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 text-[11px] font-semibold text-cyan-200">
                {index + 1}
              </span>
              <span>{insight}</span>
            </li>
          ))}
        </ol>
        {summary.recommendation ? (
          <div className="mt-5 rounded-lg border border-cyan-200/15 bg-white/[0.055] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-300">Anbefalet fokus</p>
            <p className="mt-2 text-sm font-medium leading-6 text-white">{summary.recommendation}</p>
          </div>
        ) : null}
        <p className="mt-4 text-[11px] leading-5 text-slate-400">Regelbaseret analyse · Ingen simulerede tal</p>
      </div>
    </section>
  );
}

function visibleDistribution(analysis: CostIntelligence) {
  if (analysis.distribution.length <= 7) return analysis.distribution;
  const leading = analysis.distribution.slice(0, 6);
  const rest = analysis.distribution.slice(6);
  return [
    ...leading,
    {
      name: "Andre",
      cost: rest.reduce((sum, item) => sum + item.cost, 0),
      share: rest.reduce((sum, item) => sum + item.share, 0),
    },
  ];
}

function CostDistributionPanel({ analysis }: { analysis: CostIntelligence }) {
  const items = useMemo(() => visibleDistribution(analysis), [analysis]);
  const maxValue = Math.max(...items.map((item) => Math.abs(item.cost)), 1);
  const comparisonByName = useMemo(
    () => new Map(
      analysis.detailRows.map((item) => [normalizeForComparison(item.name), item]),
    ),
    [analysis.detailRows],
  );

  return (
    <CommandPanel
      title="Omkostningsfordeling"
      description={analysis.distributionSource === "workbook"
        ? "Registrerede omkostningskategorier fra omkostningsarket"
        : "Fordeling på kategorier i den filtrerede visning"}
      icon={WalletCards}
      tone="warning"
      testId="cost-distribution-panel"
    >
      <div className="space-y-4 p-5">
        {items.map((item) => {
          const comparison = comparisonByName.get(normalizeForComparison(item.name));
          return (
            <div key={item.name}>
              <div className="mb-1.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0b1c2d]" title={item.name}>{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {percent(item.share)}
                    {comparison?.changePercent !== null && comparison?.changePercent !== undefined
                      ? ` · ${signedPercent(comparison.changePercent)} mod forrige periode`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{currency(item.cost)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-orange-50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                  style={{ width: `${Math.max(3, (Math.abs(item.cost) / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CommandPanel>
  );
}

function comparisonConclusion(analysis: CostIntelligence) {
  const comparison = analysis.comparison;
  if (!comparison) return "Der kræves mindst to perioder for at beregne udviklingen.";
  if (comparison.revenueChangePercent === null || comparison.costChangePercent === null) {
    return `Omkostningerne ændrede sig med ${signedCurrency(comparison.costChange)} fra ${comparison.previousPeriod} til ${comparison.currentPeriod}.`;
  }
  if (comparison.costShareChange !== null && Math.abs(comparison.costShareChange) >= 0.001) {
    const direction = comparison.costShareChange <= 0 ? "faldt" : "steg";
    return `Omkostningsandelen ${direction} ${percent(Math.abs(comparison.costShareChange))}point; omkostningerne ændrede sig ${signedPercent(comparison.costChangePercent)}, mens omsætningen ændrede sig ${signedPercent(comparison.revenueChangePercent)}.`;
  }
  return `Omkostningerne ændrede sig ${signedPercent(comparison.costChangePercent)}, mens omsætningen ændrede sig ${signedPercent(comparison.revenueChangePercent)}.`;
}

function RevenueCostPanel({ analysis }: { analysis: CostIntelligence }) {
  if (!analysis.hasRevenue) {
    return (
      <CommandPanel title="Omsætning kontra omkostninger" icon={CircleDollarSign} tone="brand">
        <CommandEmptyState
          title="Omsætning mangler"
          message="Upload data med omsætning for at sammenligne omkostninger med salg."
          tone="brand"
        />
      </CommandPanel>
    );
  }

  const chartData = analysis.periods.map((period) => ({
    ...period,
    shortName: formatDanishMonth(period.name, "short"),
  }));

  return (
    <CommandPanel
      title="Omsætning kontra omkostninger"
      description="Månedlig udvikling i salg, omkostninger og resultat"
      icon={CircleDollarSign}
      tone="brand"
      testId="revenue-cost-panel"
    >
      <div className="px-3 pb-5 pt-4 sm:px-5">
        <div className="h-[300px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 18, bottom: 22, left: 4 }}>
              <CartesianGrid stroke="#dce7ec" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fill: "#526779", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#c9d9e1" }}
                minTickGap={20}
                height={42}
              />
              <YAxis
                tickFormatter={(value) => compactAxisCurrency(Number(value))}
                tick={{ fill: "#526779", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={66}
              />
              <Tooltip
                labelFormatter={(label) => String(label)}
                formatter={(value, name) => [
                  currency(Number(value)),
                  name === "revenue" ? "Omsætning" : name === "cost" ? "Omkostninger" : "Resultat",
                ]}
                contentStyle={{ borderRadius: 12, border: "1px solid #cedde4", fontSize: 12 }}
              />
              <Bar dataKey="revenue" name="revenue" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Bar dataKey="cost" name="cost" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Line dataKey="result" name="result" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50/60 px-4 py-3 text-sm font-medium leading-6 text-cyan-950">
          {comparisonConclusion(analysis)}
        </div>
      </div>
    </CommandPanel>
  );
}

function CostChangesPanel({ analysis }: { analysis: CostIntelligence }) {
  if (!analysis.comparison || !analysis.changeDrivers.length) {
    return (
      <CommandPanel title="Største omkostningsændringer" icon={ArrowUpRight} tone="neutral">
        <CommandEmptyState
          title="Sammenligningsperiode mangler"
          message="Der kræves mindst to perioder med omkostninger for at identificere ændringsdrivere."
          tone="neutral"
        />
      </CommandPanel>
    );
  }

  return (
    <CommandPanel
      title="Største omkostningsændringer"
      description={`Top 5 efter absolut bevægelse · ${analysis.changeDimension === "category" ? "kategorier" : "produkter"}`}
      icon={ArrowUpRight}
      tone="warning"
      testId="cost-change-panel"
    >
      <div className="divide-y divide-slate-100 px-5">
        {analysis.changeDrivers.slice(0, 5).map((item, index) => (
          <ChangeDriverRow key={item.name} item={item} index={index} />
        ))}
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">
        Sorteret efter absolut ændring. Procent skjules, når sammenligningsgrundlaget er under 0,5 % af periodens omkostninger.
      </p>
    </CommandPanel>
  );
}

function ChangeDriverRow({ item, index }: { item: CostChangeDriver; index: number }) {
  const increased = item.change > 0;
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-3.5">
      <span className="text-[11px] font-semibold tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#0b1c2d]" title={item.name}>{item.name}</p>
        <p className="mt-1 text-xs text-slate-500">{percent(item.movementShare)} af den absolutte bevægelse</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold tabular-nums ${increased ? "text-orange-700" : "text-emerald-700"}`}>
          {signedCurrency(item.change)}
        </p>
        <p className="mt-1 text-xs font-medium tabular-nums text-slate-500">{signedPercent(item.changePercent)}</p>
      </div>
    </div>
  );
}

function CostEfficiencyPanel({ analysis }: { analysis: CostIntelligence }) {
  const items = [
    analysis.efficiency.costPerUnit !== null
      ? {
          label: "Omkostning pr. enhed",
          value: currency(analysis.efficiency.costPerUnit),
          formula: "Samlede omkostninger / solgte enheder",
        }
      : null,
    analysis.efficiency.resultPerUnit !== null
      ? {
          label: "Resultat pr. enhed",
          value: currency(analysis.efficiency.resultPerUnit),
          formula: "Resultat / solgte enheder",
        }
      : null,
    analysis.efficiency.revenuePerCostKrone !== null
      ? {
          label: "Omsætning pr. omkostningskrone",
          value: currency(analysis.efficiency.revenuePerCostKrone),
          formula: "Omsætning / samlede omkostninger",
        }
      : null,
    analysis.efficiency.costShare !== null
      ? {
          label: "Omkostningsandel",
          value: percent(analysis.efficiency.costShare),
          formula: "Samlede omkostninger / omsætning",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <CommandPanel
      title="Omkostningseffektivitet"
      description="Fagligt beregnelige nøgletal i den aktuelle visning"
      icon={Calculator}
      tone="positive"
      testId="cost-efficiency-panel"
    >
      {items.length ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border border-emerald-100 bg-emerald-50/45 p-4" title={`Formel: ${item.formula}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold leading-5 text-slate-600">{item.label}</p>
                <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums text-emerald-950">{item.value}</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{item.formula}</p>
            </div>
          ))}
        </div>
      ) : (
        <CommandEmptyState
          title="Datagrundlaget er utilstrækkeligt"
          message="Tilføj omsætning og antal for at beregne enheds- og effektivitetsnøgletal."
          tone="positive"
        />
      )}
      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">
        Break-even vises ikke, fordi datamodellen ikke dokumenterer en pålidelig opdeling mellem faste og variable omkostninger.
      </p>
    </CommandPanel>
  );
}

function LowProfitabilityPanel({ analysis }: { analysis: CostIntelligence }) {
  const title = analysis.profitabilityDimension === "product"
    ? "Produkter med lavest rentabilitet"
    : "Kategorier med lavest rentabilitet";
  if (!analysis.profitability.length) {
    return (
      <CommandPanel title="Laveste rentabilitet" icon={PackageSearch} tone="neutral">
        <CommandEmptyState
          title="Ingen robuste grupper"
          message="Der kræves økonomiske data og mindst to registreringer pr. produkt eller kategori."
          tone="neutral"
        />
      </CommandPanel>
    );
  }

  return (
    <CommandPanel
      title={title}
      description="Laveste robuste dækningsgrad i den filtrerede visning"
      icon={PackageSearch}
      tone="warning"
      testId="low-profitability-panel"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Navn</th>
              <th className="px-3 py-3 text-right">Omsætning</th>
              <th className="px-3 py-3 text-right">Omkostning</th>
              <th className="px-3 py-3 text-right">Resultat</th>
              <th className="px-5 py-3 text-right">Grad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm tabular-nums">
            {analysis.profitability.slice(0, 5).map((item) => (
              <tr key={item.name} className="hover:bg-slate-50/70">
                <td className="px-5 py-3 font-semibold text-[#0b1c2d]">{item.name}</td>
                <td className="px-3 py-3 text-right text-slate-600">{currency(item.revenue)}</td>
                <td className="px-3 py-3 text-right text-slate-600">{currency(item.cost)}</td>
                <td className={`px-3 py-3 text-right font-semibold ${item.contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {currency(item.contribution)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-slate-700">{item.margin === null ? "–" : percent(item.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">
        Robusthedskrav: mindst 2 rækker og mindst {currency(analysis.profitabilityMinimumRevenue)} i omsætning pr. gruppe.
      </p>
    </CommandPanel>
  );
}

function tableSortLabel(key: CostSortKey) {
  if (key === "name") return "kategori";
  if (key === "current") return "aktuel periode";
  if (key === "change") return "ændring";
  return "andel";
}

function downloadCostCsv(rows: CostDetailRow[], includeComparison: boolean) {
  const headers = [
    "Omkostningskategori",
    "Aktuel periode",
    ...(includeComparison ? ["Forrige periode", "Ændring i kr.", "Ændring i %"] : []),
    "Andel af samlede omkostninger",
  ];
  const csvRows = rows.map((row) => [
    row.name,
    row.current.toFixed(2),
    ...(includeComparison
      ? [
          (row.previous ?? 0).toFixed(2),
          (row.change ?? 0).toFixed(2),
          row.changePercent === null ? "" : (row.changePercent * 100).toFixed(2),
        ]
      : []),
    (row.share * 100).toFixed(2),
  ]);
  const csv = buildExcelCompatibleCsv([headers, ...csvRows]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "databrief-omkostninger.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function CostDetailTable({ analysis }: { analysis: CostIntelligence }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<{ key: CostSortKey; direction: "asc" | "desc" }>({
    key: "current",
    direction: "desc",
  });
  const includeComparison = analysis.detailRows.some((row) => row.previous !== null);
  const visibleRows = useMemo(() => {
    const normalizedQuery = normalizeForComparison(deferredQuery);
    const rows = normalizedQuery
      ? analysis.detailRows.filter((row) => normalizeForComparison(row.name).includes(normalizedQuery))
      : analysis.detailRows;
    const sorted = [...rows].sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name, "da-DK");
      const aValue = sort.key === "current" ? a.current : sort.key === "change" ? (a.change ?? 0) : a.share;
      const bValue = sort.key === "current" ? b.current : sort.key === "change" ? (b.change ?? 0) : b.share;
      return aValue - bValue;
    });
    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [analysis.detailRows, deferredQuery, sort]);

  function toggleSort(key: CostSortKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "name" ? "asc" : "desc" });
  }

  function SortButton({ sortKey, children }: { sortKey: CostSortKey; children: string }) {
    const selected = sort.key === sortKey;
    const Icon = selected && sort.direction === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className={`inline-flex min-h-11 items-center gap-1 font-semibold ${selected ? "text-cyan-800" : "text-slate-500 hover:text-slate-800"}`}
        aria-label={`Sortér efter ${tableSortLabel(sortKey)}`}
      >
        {children}
        <Icon className={`h-3.5 w-3.5 ${selected ? "opacity-100" : "opacity-35"}`} aria-hidden="true" />
      </button>
    );
  }

  return (
    <CommandPanel
      title="Detaljeret omkostningstabel"
      description={includeComparison
        ? `Aktuel periode mod forrige periode · sorteret efter ${tableSortLabel(sort.key)}`
        : `Aktuel filtreret visning · sorteret efter ${tableSortLabel(sort.key)}`}
      icon={Rows3}
      tone="neutral"
      testId="cost-detail-table"
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Søg i omkostningskategorier</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søg i omkostningskategorier"
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm text-[#0b1c2d] outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        <button
          type="button"
          onClick={() => downloadCostCsv(visibleRows, includeComparison)}
          disabled={!visibleRows.length}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Eksportér CSV
        </button>
      </div>
      <div className="max-h-[520px] overflow-auto overscroll-contain">
        <table className="w-full min-w-[760px] text-left">
          <thead className="sticky top-0 z-10 bg-[#f4f8fa] text-[11px] uppercase tracking-[0.08em] shadow-[0_1px_0_#cedde4]">
            <tr>
              <th className="px-5"><SortButton sortKey="name">Omkostningskategori</SortButton></th>
              <th className="px-3 text-right"><SortButton sortKey="current">Aktuel periode</SortButton></th>
              {includeComparison ? <th className="px-3 py-3 text-right font-semibold text-slate-500">Forrige periode</th> : null}
              {includeComparison ? <th className="px-3 text-right"><SortButton sortKey="change">Ændring</SortButton></th> : null}
              {includeComparison ? <th className="px-3 py-3 text-right font-semibold text-slate-500">Ændring %</th> : null}
              <th className="px-5 text-right"><SortButton sortKey="share">Andel</SortButton></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm tabular-nums">
            {visibleRows.map((row) => (
              <tr key={row.name} className="transition hover:bg-cyan-50/35">
                <td className="px-5 py-3.5 font-semibold text-[#0b1c2d]">{row.name}</td>
                <td className="px-3 py-3.5 text-right font-semibold text-slate-800">{currency(row.current)}</td>
                {includeComparison ? <td className="px-3 py-3.5 text-right text-slate-600">{currency(row.previous ?? 0)}</td> : null}
                {includeComparison ? (
                  <td className={`px-3 py-3.5 text-right font-semibold ${(row.change ?? 0) <= 0 ? "text-emerald-700" : "text-orange-700"}`}>
                    {signedCurrency(row.change ?? 0)}
                  </td>
                ) : null}
                {includeComparison ? <td className="px-3 py-3.5 text-right text-slate-600">{signedPercent(row.changePercent)}</td> : null}
                <td className="px-5 py-3.5 text-right font-semibold text-slate-700">{percent(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleRows.length ? (
          <div className="grid min-h-40 place-items-center bg-white px-5 text-center text-sm text-slate-500">
            Ingen omkostningskategorier matcher søgningen.
          </div>
        ) : null}
      </div>
    </CommandPanel>
  );
}

export const CostIntelligenceDashboard = memo(function CostIntelligenceDashboard({
  analysis,
}: {
  analysis: CostIntelligence;
}) {
  if (!analysis.rowCount || (!analysis.hasRowCosts && !analysis.distribution.length)) {
    return (
      <CommandPanel title="Omkostningsdata" icon={WalletCards} tone="warning">
        <CommandEmptyState
          title="Omkostningsdata mangler"
          message="Tilføj en kolonne med omkostning, kostpris eller dækningsbidrag for at åbne omkostningsanalysen."
          tone="warning"
        />
      </CommandPanel>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <CostKpiGrid analysis={analysis} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        {analysis.hasCostTimeline ? (
          <CostTrendChart analysis={analysis} />
        ) : (
          <CommandPanel title="Omkostningsudvikling" icon={TrendingUp} tone="warning">
            <CommandEmptyState
              title="Tidsserie mangler"
              message="Tilføj måned eller dato samt omkostning i salgsdata for at se udviklingen over tid."
              tone="warning"
            />
          </CommandPanel>
        )}
        <div className="space-y-5">
          <CostBudgetPanel analysis={analysis} />
          <CostInsightsPanel analysis={analysis} />
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <CostDistributionPanel analysis={analysis} />
        <RevenueCostPanel analysis={analysis} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <CostChangesPanel analysis={analysis} />
        <CostEfficiencyPanel analysis={analysis} />
      </div>

      <LowProfitabilityPanel analysis={analysis} />
      <CostDetailTable analysis={analysis} />
    </div>
  );
});
