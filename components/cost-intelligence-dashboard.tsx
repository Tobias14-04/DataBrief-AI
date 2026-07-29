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
  Settings2,
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
  useEffect,
  useId,
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
  formatDanishCurrencyPrecise as preciseCurrency,
  formatDanishCompactCurrency as compactAxisCurrency,
  formatDanishMonth,
  formatDanishNumber as number,
  formatDanishPercent as percent,
  formatDanishPercentPrecise as precisePercent,
} from "@/lib/dashboard-insights";
import {
  buildCostComparisonPresentation,
  buildCostInsightDisclosure,
  buildCostInsightSummary,
  PROFITABILITY_RATE_LABEL,
  PROFITABILITY_VALUE_LABEL,
  type CostChangeDriver,
  type CostDetailRow,
  type CostIntelligence,
} from "@/lib/cost-intelligence";
import {
  buildBudgetVariancePresentation,
  buildCostDetailCsv,
  COST_DETAIL_COLUMN_DEFINITIONS,
  COST_DETAIL_COLUMN_ORDER,
  COST_DETAIL_OPTIONAL_COLUMNS,
  COST_DETAIL_PRIMARY_COLUMNS,
  getAvailableCostDetailColumns,
  normalizeCostDetailColumnSelection,
  parseCostDetailColumnSelection,
  serializeCostDetailColumnSelection,
  sortCostDetailRows,
  type CostDetailColumnKey,
  type CostDetailSortDirection,
} from "@/lib/cost-detail-table";
import { normalizeForComparison } from "@/lib/data-labels";

type CostChartMetric = "cost" | "costShare" | "result" | "grossProfit";
type Tone = "warning" | "positive" | "brand" | "neutral";

const COST_DETAIL_COLUMN_SESSION_KEY = "databrief.cost-detail-columns.v1";

function InlineInfoDetails({
  label,
  text,
  testId,
}: {
  label: string;
  text: string;
  testId?: string;
}) {
  return (
    <details
      className="group max-w-[min(18rem,60vw)] text-left text-xs font-normal normal-case tracking-normal text-slate-600"
      data-testid={testId}
    >
      <summary
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 outline-none transition hover:border-cyan-300 hover:text-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        aria-label={label}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </summary>
      <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 leading-5 text-slate-700 shadow-sm">
        {text}
      </p>
    </details>
  );
}

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
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  note?: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const styles = kpiToneClasses[tone];
  return (
    <article className="premium-panel-secondary relative min-h-[168px] min-w-0 overflow-hidden rounded-xl p-4">
      <span className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${styles.glow} to-transparent`} aria-hidden="true" />
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${styles.icon}`}>
          <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className={`mt-2 break-words text-[clamp(1.35rem,1.6vw,1.85rem)] font-semibold leading-tight tabular-nums ${styles.value}`} title={value}>
            {value}
          </p>
        </div>
      </div>
      <p className={`relative mt-4 border-t border-slate-100 pt-3 text-xs font-medium leading-5 ${styles.helper}`}>
        {detail}
      </p>
      {note ? (
        <p className="relative mt-1 whitespace-pre-line text-[11px] leading-[1.1rem] text-slate-600">
          {note}
        </p>
      ) : null}
    </article>
  );
}

function CostKpiGrid({ analysis }: { analysis: CostIntelligence }) {
  const largestDriver = analysis.distribution[0];
  const costChange = analysis.comparison?.costChange ?? null;
  const comparison = analysis.comparison
    ? buildCostComparisonPresentation(analysis.comparison)
    : null;
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
          value: comparison?.costChangeLabel ?? "Ikke beregnelig",
          detail: comparison?.periodLabel ?? "",
          note: `Omsætning: ${comparison?.revenueChangeLabel ?? "Ikke retvisende"}\n${comparison?.differenceText ?? ""}`,
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
  const chartId = useId();
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
        value: typeof value === "number" && Number.isFinite(value) ? value : null,
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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600" aria-label="Signaturforklaring">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-7 rounded-full" style={{ backgroundColor: definition.color }} aria-hidden="true" />
              Aktuel periode
            </span>
            {comparisonAvailable ? (
              <span
                className={`inline-flex items-center gap-2 transition-opacity ${showComparison ? "visible opacity-100" : "invisible opacity-0"}`}
                aria-hidden={!showComparison}
              >
                <span className="w-7 border-t-2 border-dashed border-slate-500" aria-hidden="true" />
                Forrige periode
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {comparisonAvailable ? (
            <button
              type="button"
              onClick={() => setShowComparison((current) => !current)}
              aria-pressed={showComparison}
              aria-controls={chartId}
              className={`inline-flex min-h-11 items-center justify-center gap-2.5 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 sm:w-auto ${
                showComparison
                  ? "border-cyan-300 bg-cyan-50 text-cyan-950 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-cyan-400 hover:text-cyan-800"
              }`}
            >
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${showComparison ? "bg-cyan-700" : "bg-slate-300"}`}
                aria-hidden="true"
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showComparison ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </span>
              Sammenlign med forrige periode
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
        </div>
        <div
          id={chartId}
          className="h-[310px] min-w-0 sm:h-[350px]"
          data-testid="cost-trend-chart"
          role="img"
          aria-label={`${definition.label} for ${analysis.periods.length} perioder. ${showComparison && comparisonAvailable ? "Aktuel periode sammenlignes med forrige periode." : "Kun aktuel periode vises."}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 20, bottom: 30, left: 12 }}>
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
                includeHidden
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
              {comparisonAvailable ? (
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
                  hide={!showComparison}
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

  const {
    actual,
    budget,
    variance,
    variancePercent,
    utilization,
    remaining,
    status,
  } = analysis.budget;
  const maximum = Math.max(actual, budget, 1);
  const actualWidth = Math.min(100, Math.max(0, (actual / maximum) * 100));
  const budgetPosition = Math.min(100, Math.max(0, (budget / maximum) * 100));
  const statusLabel = variance === 0
    ? "På budgettet"
    : status === "favorable"
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">Faktisk forbrug</p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#0b1c2d]">{currency(actual)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">Budgetgrænse</p>
            <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#0b1c2d]">{currency(budget)}</p>
          </div>
        </div>
        <div>
          <div
            className="relative h-3 rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Andel af omkostningsbudget anvendt"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={utilization === null ? undefined : Math.min(100, Math.max(0, Math.round(utilization * 100)))}
            aria-valuetext={utilization === null ? "Kan ikke beregnes" : `${precisePercent(utilization)} af budgettet anvendt`}
          >
            <div
              className={`h-full rounded-full ${status === "favorable" ? "bg-emerald-500" : status === "watch" ? "bg-orange-500" : "bg-rose-500"}`}
              style={{ width: `${actualWidth}%` }}
            />
            <span
              className="absolute top-1/2 h-6 w-0.5 -translate-y-1/2 bg-[#0b1c2d]"
              style={{ left: `${budgetPosition}%` }}
              title={`Budgetmarkør: ${currency(budget)}`}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500">
            <span>{utilization === null ? "Udnyttelse kan ikke beregnes" : `${precisePercent(utilization)} anvendt`}</span>
            <span>Streg = budgetgrænse</span>
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
        <div className={`rounded-lg border px-3 py-2.5 text-xs font-medium ${
          remaining >= 0
            ? "border-emerald-100 bg-emerald-50/60 text-emerald-800"
            : "border-rose-100 bg-rose-50/60 text-rose-800"
        }`}>
          {remaining >= 0
            ? `${currency(remaining)} resterer af budgettet.`
            : `${currency(Math.abs(remaining))} er overskredet.`}
        </div>
        {analysis.budgetBasis === "proportional" ? (
          <p className="text-[11px] leading-5 text-slate-500">
            Budgettet er forholdsmæssigt fordelt efter de filtrerede rækker og er ikke et registreret kategori- eller periodebudget.
          </p>
        ) : null}
        <details className="group text-[11px] leading-5 text-slate-500">
          <summary className="w-fit cursor-pointer rounded font-medium text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
            Sådan fastsættes status
          </summary>
          <p className="mt-2">
            Under budget er gunstigt. Overskridelser til og med 8 % markeres til opfølgning; større overskridelser markeres som væsentlige.
          </p>
        </details>
      </div>
    </CommandPanel>
  );
}

function CostInsightsPanel({ analysis }: { analysis: CostIntelligence }) {
  const summary = useMemo(() => buildCostInsightSummary(analysis), [analysis]);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const additionalInsightsId = useId();
  const disclosure = buildCostInsightDisclosure(summary.insights, showAllInsights);

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
          {disclosure.primaryInsights.map((insight, index) => (
            <li key={insight} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-200">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 text-[11px] font-semibold text-cyan-200">
                {index + 1}
              </span>
              <span>{insight}</span>
            </li>
          ))}
        </ol>
        {disclosure.hasToggle ? (
          <>
            <div
              id={additionalInsightsId}
              className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out motion-reduce:transition-none ${
                disclosure.expanded
                  ? "mt-3 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
              aria-hidden={!disclosure.expanded}
            >
              <div className="overflow-hidden">
                <ol className="space-y-3" start={disclosure.primaryInsights.length + 1}>
                  {disclosure.additionalInsights.map((insight, index) => (
                    <li key={insight} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-sm leading-6 text-slate-200">
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-200/15 bg-cyan-300/10 text-[11px] font-semibold text-cyan-200">
                        {disclosure.primaryInsights.length + index + 1}
                      </span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAllInsights((current) => !current)}
              aria-expanded={disclosure.expanded}
              aria-controls={additionalInsightsId}
              className="mt-4 min-h-10 rounded-lg border border-cyan-200/15 bg-white/[0.045] px-3 text-xs font-semibold text-cyan-100 outline-none transition hover:border-cyan-200/30 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08263a]"
            >
              {disclosure.buttonLabel}
            </button>
          </>
        ) : null}
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
  return buildCostComparisonPresentation(comparison).summary;
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
          value: preciseCurrency(analysis.efficiency.costPerUnit),
          formula: "Samlede omkostninger / solgte enheder",
        }
      : null,
    analysis.efficiency.resultPerUnit !== null
      ? {
          label: "Resultat pr. enhed",
          value: preciseCurrency(analysis.efficiency.resultPerUnit),
          formula: "Resultat / solgte enheder",
        }
      : null,
    analysis.efficiency.revenuePerCostKrone !== null
      ? {
          label: "Omsætning pr. omkostningskrone",
          value: preciseCurrency(analysis.efficiency.revenuePerCostKrone),
          formula: "Omsætning / samlede omkostninger",
        }
      : null,
    analysis.efficiency.costShare !== null
      ? {
          label: "Omkostningsandel",
          value: precisePercent(analysis.efficiency.costShare),
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
      description={`Laveste robuste ${PROFITABILITY_RATE_LABEL.toLocaleLowerCase("da-DK")} i den filtrerede visning`}
      icon={PackageSearch}
      tone="warning"
      testId="low-profitability-panel"
      action={(
        <InlineInfoDetails
          label="Forklar robust rentabilitet"
          text="Kun produkter med et tilstrækkeligt datagrundlag medtages, så enkelte små salg ikke skaber misvisende resultater."
          testId="profitability-method-info"
        />
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Navn</th>
              <th className="px-3 py-3 text-right">Omsætning</th>
              <th className="px-3 py-3 text-right">Omkostning</th>
              <th className="px-3 py-3 text-right">{PROFITABILITY_VALUE_LABEL}</th>
              <th className="px-5 py-3 text-right" title="Resultat divideret med omsætning">{PROFITABILITY_RATE_LABEL}</th>
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

function tableSortLabel(key: CostDetailColumnKey) {
  return COST_DETAIL_COLUMN_DEFINITIONS[key].label.toLocaleLowerCase("da-DK");
}

function downloadCostCsv(
  rows: CostDetailRow[],
  visibleColumns: CostDetailColumnKey[],
) {
  const csv = buildCostDetailCsv(rows, visibleColumns, visibleColumns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "databrief-omkostninger.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function CostSortButton({
  column,
  activeColumn,
  direction,
  onSort,
}: {
  column: CostDetailColumnKey;
  activeColumn: CostDetailColumnKey;
  direction: CostDetailSortDirection;
  onSort: (column: CostDetailColumnKey) => void;
}) {
  const selected = column === activeColumn;
  const Icon = selected && direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex min-h-11 items-center gap-1 rounded-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${
        selected ? "text-cyan-800" : "text-slate-500 hover:text-slate-800"
      }`}
      aria-label={`Sortér efter ${tableSortLabel(column)}${selected ? `, aktuelt ${direction === "asc" ? "stigende" : "faldende"}` : ""}`}
    >
      {COST_DETAIL_COLUMN_DEFINITIONS[column].label}
      <Icon className={`h-3.5 w-3.5 ${selected ? "opacity-100" : "opacity-35"}`} aria-hidden="true" />
    </button>
  );
}

function CostDetailCell({
  row,
  column,
}: {
  row: CostDetailRow;
  column: CostDetailColumnKey;
}) {
  if (column === "name") {
    return <span className="font-semibold text-[#0b1c2d]">{row.name}</span>;
  }

  const value = row[column];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span className="text-slate-400" aria-label="Ikke tilgængelig">–</span>;
  }
  if (column === "share") return <span className="font-semibold text-slate-700">{percent(value)}</span>;
  if (column === "changePercent") {
    return <span className={value <= 0 ? "text-emerald-700" : "text-orange-700"}>{signedPercent(value)}</span>;
  }
  if (column === "budgetVariance") {
    const presentation = typeof row.budget === "number"
      ? buildBudgetVariancePresentation(row.current, row.budget)
      : null;
    if (!presentation) {
      return <span className="text-slate-400" aria-label="Ikke tilgængelig">–</span>;
    }
    const toneClass = presentation.tone === "positive"
      ? "text-emerald-700"
      : presentation.tone === "critical"
        ? "text-rose-700"
        : presentation.tone === "warning"
          ? "text-orange-700"
          : "text-slate-600";
    return <span className={`font-semibold ${toneClass}`}>{presentation.label}</span>;
  }
  if (column === "change") {
    return <span className={value <= 0 ? "font-semibold text-emerald-700" : "font-semibold text-orange-700"}>{signedCurrency(value)}</span>;
  }
  return <span className={column === "current" ? "font-semibold text-slate-800" : "text-slate-600"}>{currency(value)}</span>;
}

function CostDetailTable({ analysis }: { analysis: CostIntelligence }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<{ key: CostDetailColumnKey; direction: CostDetailSortDirection }>({
    key: "current",
    direction: "desc",
  });
  const [selectedColumns, setSelectedColumns] = useState<CostDetailColumnKey[]>([
    ...COST_DETAIL_PRIMARY_COLUMNS,
  ]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const availableColumns = useMemo(
    () => getAvailableCostDetailColumns(analysis.detailRows),
    [analysis.detailRows],
  );
  const visibleColumns = useMemo(
    () => normalizeCostDetailColumnSelection(selectedColumns, availableColumns),
    [availableColumns, selectedColumns],
  );
  const effectiveSort = visibleColumns.includes(sort.key)
    ? sort
    : { key: "current" as const, direction: "desc" as const };

  useEffect(() => {
    const stored = window.sessionStorage.getItem(COST_DETAIL_COLUMN_SESSION_KEY);
    setSelectedColumns(parseCostDetailColumnSelection(stored, COST_DETAIL_COLUMN_ORDER));
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.sessionStorage.setItem(
      COST_DETAIL_COLUMN_SESSION_KEY,
      serializeCostDetailColumnSelection(selectedColumns),
    );
  }, [preferencesLoaded, selectedColumns]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = normalizeForComparison(deferredQuery);
    const rows = normalizedQuery
      ? analysis.detailRows.filter((row) => normalizeForComparison(row.name).includes(normalizedQuery))
      : analysis.detailRows;
    return sortCostDetailRows(rows, effectiveSort.key, effectiveSort.direction);
  }, [analysis.detailRows, deferredQuery, effectiveSort.direction, effectiveSort.key]);

  function toggleSort(key: CostDetailColumnKey) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "name" ? "asc" : "desc" });
  }

  function toggleColumn(column: CostDetailColumnKey) {
    setSelectedColumns((current) => normalizeCostDetailColumnSelection(
      current.includes(column)
        ? current.filter((key) => key !== column)
        : [...current, column],
      COST_DETAIL_COLUMN_ORDER,
    ));
  }

  return (
    <CommandPanel
      title="Detaljeret omkostningstabel"
      description={`Aktuel filtreret visning · sorteret efter ${tableSortLabel(effectiveSort.key)}`}
      icon={Rows3}
      tone="neutral"
      testId="cost-detail-table"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-col gap-2 min-[460px]:flex-row">
            <details className="group min-w-[190px] rounded-lg border border-slate-200 bg-white text-xs text-slate-700">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 font-semibold outline-none transition hover:border-cyan-300 hover:text-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Tilpas kolonner
              </summary>
              <fieldset className="space-y-1 border-t border-slate-100 p-2.5">
                <legend className="sr-only">Valgfrie tabelkolonner</legend>
                {COST_DETAIL_OPTIONAL_COLUMNS.map((column) => {
                  const available = availableColumns.includes(column);
                  return (
                    <label
                      key={column}
                      className={`flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 ${
                        available ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed text-slate-400"
                      }`}
                      title={available ? undefined : "Kolonnen kræver et registreret sammenlignings- eller kategoribudget"}
                    >
                      <input
                        type="checkbox"
                        checked={available && selectedColumns.includes(column)}
                        onChange={() => toggleColumn(column)}
                        disabled={!available}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                      />
                      <span>{COST_DETAIL_COLUMN_DEFINITIONS[column].label}</span>
                    </label>
                  );
                })}
              </fieldset>
            </details>
            <button
              type="button"
              onClick={() => downloadCostCsv(visibleRows, visibleColumns)}
              disabled={!visibleRows.length}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition hover:border-cyan-300 hover:text-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Eksportér CSV
            </button>
          </div>
          <p className="text-[11px] leading-4 text-slate-500">
            Kolonnevalget gemmes i denne browsersession.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <table
          className="w-full text-left"
          style={{ minWidth: visibleColumns.length > 5 ? `${Math.max(760, visibleColumns.length * 150)}px` : "640px" }}
        >
          <thead className="bg-[#f4f8fa] text-[11px] uppercase tracking-[0.08em] shadow-[0_1px_0_#cedde4]">
            <tr>
              {visibleColumns.map((column, index) => (
                <th
                  key={column}
                  className={`${index === 0 ? "px-5 text-left" : index === visibleColumns.length - 1 ? "px-5 text-right" : "px-3 text-right"}`}
                  aria-sort={effectiveSort.key === column
                    ? effectiveSort.direction === "asc" ? "ascending" : "descending"
                    : "none"}
                >
                  <div className={`inline-flex items-start gap-1 ${index === 0 ? "" : "justify-end"}`}>
                    <CostSortButton
                      column={column}
                      activeColumn={effectiveSort.key}
                      direction={effectiveSort.direction}
                      onSort={toggleSort}
                    />
                    {COST_DETAIL_COLUMN_DEFINITIONS[column].helpText ? (
                      <InlineInfoDetails
                        label={`Forklar ${COST_DETAIL_COLUMN_DEFINITIONS[column].label.toLocaleLowerCase("da-DK")}`}
                        text={COST_DETAIL_COLUMN_DEFINITIONS[column].helpText}
                        testId={`cost-column-help-${column}`}
                      />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm tabular-nums">
            {visibleRows.map((row) => (
              <tr key={row.name} className="transition hover:bg-cyan-50/35">
                {visibleColumns.map((column, index) => (
                  <td
                    key={column}
                    className={`${index === 0 ? "px-5 text-left" : index === visibleColumns.length - 1 ? "px-5 text-right" : "px-3 text-right"} py-3.5`}
                  >
                    <CostDetailCell row={row} column={column} />
                  </td>
                ))}
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
        <div className="min-w-0 space-y-5">
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
          <CostDistributionPanel analysis={analysis} />
          <CostChangesPanel analysis={analysis} />
        </div>
        <div className="space-y-5">
          <CostBudgetPanel analysis={analysis} />
          <CostInsightsPanel analysis={analysis} />
          <CostEfficiencyPanel analysis={analysis} />
        </div>
      </div>

      <RevenueCostPanel analysis={analysis} />
      <LowProfitabilityPanel analysis={analysis} />
      <CostDetailTable analysis={analysis} />
    </div>
  );
});
