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
    description: "Registrerede omkostninger pr. m√•ned",
    color: "#f97316",
    previousColor: "#64748b",
  },
  costShare: {
    label: "Omkostningsandel",
    description: "Omkostninger som andel af oms√¶tningen",
    color: "#0891b2",
    previousColor: "#64748b",
  },
  result: {
    label: "Resultat",
    description: "Oms√¶tning minus registrerede omkostninger",
    color: "#10b981",
    previousColor: "#64748b",
  },
  grossProfit: {
    label: "D√¶kningsbidrag",
    description: "Registreret d√¶kningsbidrag pr. m√•ned",
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
  return `${value > 0 ? "+" : "‚àí"}${currency(Math.abs(value))}`;
}

function signedPercent(value: number | null) {
  if (value === null) return "Ikke retvisende";
  if (value === 0) return percent(0);
  return `${value > 0 ? "+" : "‚àí"}${percent(Math.abs(value))}`;
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
        : `Baseret p√• ${number(analysis.rowCount)} filtrerede r√¶kker`,
      icon: WalletCards,
      tone: "warning" as const,
    },
    analysis.costShare !== null
      ? {
          label: "Omkostningsandel",
          value: percent(analysis.costShare),
          detail: "Omkostninger divideret med oms√¶tning",
          icon: Gauge,
          tone: analysis.costShare <= 0.6 ? "positive" as const : "warning" as const,
        }
      : null,
    analysis.actualResult !== null
      ? {
          label: "Resultat",
          value: currency(analysis.actualResult),
          detail: "Oms√¶tning minus samlede omkostninger",
          icon: TrendingUp,
          tone: analysis.actualResult >= 0 ? "positive" as const : "warning" as const,
        }
      : null,
    analysis.comparison
      ? {
          label: "√Ündring",
          value: comparison?.costChangeLabel ?? "Ikke beregnelig",
          detail: comparison?.periodLabel ?? "",
          note: `Oms√¶tning: ${comparison?.revenueChangeLabel ?? "Ikke retvisende"}\n${comparison?.differenceText ?? ""}`,
          icon: costChange !== null && costChange <= 0 ? ArrowDownRight : ArrowUpRight,
          tone: costChange !== null && costChange <= 0 ? "positive" as const : "warning" as const,
        }
      : null,
    largestDriver
      ? {
          label: "St√∏rste driver",
          value: largestDriver.name,
          detail: `${currency(largestDriver.cost)} ¬∑ ${percent(largestDriver.share)} af omkostningerne`,
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
            ariaLabel="V√¶lg m√•ling til omkostningsgraf"
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
              <TÛ]Ù∂âûÀk∫wµÁyµÖ¿†°•—ï¥§ÄÙ¯Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—»Å≠ï‰ıÌ•—ï¥ππÖµïÙÅç±ÖÕÕ9ÖµîÙâ°ΩŸï»ÈâúµÕ±Ö—î¥‘¿º‹¿à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—êÅç±ÖÕÕ9ÖµîÙâ¡‡¥‘Å¡‰¥ÃÅôΩπ–µÕïµ•âΩ±êÅ—ï·–µlå¡à≈å…ëtà˘Ì•—ï¥ππÖµïÙΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—êÅç±ÖÕÕ9ÖµîÙâ¡‡¥ÃÅ¡‰¥ÃÅ—ï·–µ…•ù°–Å—ï·–µÕ±Ö—î¥ÿ¿¿à˘Ìç’……ïπç‰°•—ï¥π…ïŸïπ’î•ÙΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—êÅç±ÖÕÕ9ÖµîÙâ¡‡¥ÃÅ¡‰¥ÃÅ—ï·–µ…•ù°–Å—ï·–µÕ±Ö—î¥ÿ¿¿à˘Ìç’……ïπç‰°•—ï¥πçΩÕ–•ÙΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—êÅç±ÖÕÕ9ÖµîıÌÅ¡‡¥ÃÅ¡‰¥ÃÅ—ï·–µ…•ù°–ÅôΩπ–µÕïµ•âΩ±êÄëÌ•—ï¥πçΩπ—…•â’—•Ω∏Ä¯ÙÄ¿Ä¸Äâ—ï·–µïµï…Ö±ê¥‹¿¿àÄËÄâ—ï·–µ…ΩÕî¥‹¿¿âıÅÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌç’……ïπç‰°•—ï¥πçΩπ—…•â’—•Ω∏•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—êÅç±ÖÕÕ9ÖµîÙâ¡‡¥‘Å¡‰¥ÃÅ—ï·–µ…•ù°–ÅôΩπ–µÕïµ•âΩ±êÅ—ï·–µÕ±Ö—î¥‹¿¿à˘Ì•—ï¥πµÖ…ù•∏ÄÙÙÙÅπ’±∞Ä¸ÄãäLàÄËÅ¡ï…çïπ–°•—ï¥πµÖ…ù•∏•ÙΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ—»¯(ÄÄÄÄÄÄÄÄÄÄÄÄ§•Ù(ÄÄÄÄÄÄÄÄÄÄΩ—âΩë‰¯(ÄÄÄÄÄÄÄÄΩ—Öâ±î¯(ÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÒ¿Åç±ÖÕÕ9ÖµîÙââΩ…ëï»µ–ÅâΩ…ëï»µÕ±Ö—î¥ƒ¿¿Å¡‡¥‘Å¡‰¥ÃÅ—ï·–µlƒ≈¡·tÅ±ïÖë•πú¥‘Å—ï·–µÕ±Ö—î¥‘¿¿à¯(ÄÄÄÄÄÄÄÅIΩâ’Õ—°ïëÕ≠…ÖÿËÅµ•πëÕ–Ä»ÅÀô≠≠ï»ÅΩúÅµ•πëÕ–ÅÌç’……ïπç‰°ÖπÖ±ÂÕ•Ãπ¡…Ωô•—Öâ•±•—Â5•π•µ’µIïŸïπ’î•ÙÅ§ÅΩµœô—π•πúÅ¡»∏Åù…’¡¡î∏(ÄÄÄÄÄÄΩ¿¯(ÄÄÄÄΩΩµµÖπëAÖπï∞¯(ÄÄ§Ï)Ù()ô’πç—•Ω∏Å—Öâ±ïMΩ…—1Öâï∞°≠ï‰ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰§ÅÏ(ÄÅ…ï—’…∏Å=MQ}Q%1}=1U59}%9%Q%=9Mm≠ïÂtπ±Öâï∞π—Ω1ΩçÖ±ï1Ω›ï…ÖÕî†âëÑµ,à§Ï)Ù()ô’πç—•Ω∏ÅëΩ›π±ΩÖëΩÕ—Õÿ†(ÄÅ…Ω›ÃËÅΩÕ—ï—Ö•±IΩ›mt∞(ÄÅŸ•Õ•â±ïΩ±’µπÃËÅΩÕ—ï—Ö•±Ω±’µπ-ïÂmt∞(§ÅÏ(ÄÅçΩπÕ–ÅçÕÿÄÙÅâ’•±ëΩÕ—ï—Ö•±Õÿ°…Ω›Ã∞ÅŸ•Õ•â±ïΩ±’µπÃ∞ÅŸ•Õ•â±ïΩ±’µπÃ§Ï(ÄÅçΩπÕ–Åâ±ΩàÄÙÅπï‹Å	±Ωà°mçÕŸt∞ÅÏÅ—Â¡îËÄâ—ï·–ΩçÕÿÌç°Ö…Õï–ı’—ò¥‡àÅÙ§Ï(ÄÅçΩπÕ–Å’…∞ÄÙÅUI0πç…ïÖ—ï=â©ïç—UI0°â±Ωà§Ï(ÄÅçΩπÕ–ÅÖπç°Ω»ÄÙÅëΩç’µïπ–πç…ïÖ—ï±ïµïπ–†âÑà§Ï(ÄÅÖπç°Ω»π°…ïòÄÙÅ’…∞Ï(ÄÅÖπç°Ω»πëΩ›π±ΩÖêÄÙÄâëÖ—Öâ…•ïòµΩµ≠ΩÕ—π•πùï»πçÕÿàÏ(ÄÅÖπç°Ω»πç±•ç¨†§Ï(ÄÅUI0π…ïŸΩ≠ï=â©ïç—UI0°’…∞§Ï)Ù()ô’πç—•Ω∏ÅΩÕ—MΩ…—	’——Ω∏°Ï(ÄÅçΩ±’µ∏∞(ÄÅÖç—•ŸïΩ±’µ∏∞(ÄÅë•…ïç—•Ω∏∞(ÄÅΩπMΩ…–∞)ÙËÅÏ(ÄÅçΩ±’µ∏ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰Ï(ÄÅÖç—•ŸïΩ±’µ∏ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰Ï(ÄÅë•…ïç—•Ω∏ËÅΩÕ—ï—Ö•±MΩ…—•…ïç—•Ω∏Ï(ÄÅΩπMΩ…–ËÄ°çΩ±’µ∏ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰§ÄÙ¯ÅŸΩ•êÏ)Ù§ÅÏ(ÄÅçΩπÕ–ÅÕï±ïç—ïêÄÙÅçΩ±’µ∏ÄÙÙÙÅÖç—•ŸïΩ±’µ∏Ï(ÄÅçΩπÕ–Å%çΩ∏ÄÙÅÕï±ïç—ïêÄòòÅë•…ïç—•Ω∏ÄÙÙÙÄâÖÕåàÄ¸Å……Ω›U¿ÄËÅ……Ω›Ω›∏Ï(ÄÅ…ï—’…∏Ä†(ÄÄÄÄÒâ’——Ω∏(ÄÄÄÄÄÅ—Â¡îÙââ’——Ω∏à(ÄÄÄÄÄÅΩπ±•ç¨ıÏ†§ÄÙ¯ÅΩπMΩ…–°çΩ±’µ∏•Ù(ÄÄÄÄÄÅç±ÖÕÕ9ÖµîıÌÅ•π±•πîµô±ï‡Åµ•∏µ†¥ƒƒÅ•—ïµÃµçïπ—ï»ÅùÖ¿¥ƒÅ…Ω’πëïêµÕ¥ÅôΩπ–µÕïµ•âΩ±êÅΩ’—±•πîµπΩπîÅ—…ÖπÕ•—•Ω∏ÅôΩç’ÃµŸ•Õ•â±îÈ…•πú¥»ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµçÂÖ∏¥‘¿¿ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµΩôôÕï–¥»ÄëÏ(ÄÄÄÄÄÄÄÅÕï±ïç—ïêÄ¸Äâ—ï·–µçÂÖ∏¥‡¿¿àÄËÄâ—ï·–µÕ±Ö—î¥‘¿¿Å°ΩŸï»È—ï·–µÕ±Ö—î¥‡¿¿à(ÄÄÄÄÄÅıÅÙ(ÄÄÄÄÄÅÖ…•Ñµ±Öâï∞ıÌÅMΩ…”•»Åïô—ï»ÄëÌ—Öâ±ïMΩ…—1Öâï∞°çΩ±’µ∏•ÙëÌÕï±ïç—ïêÄ¸ÅÄ∞ÅÖ≠—’ï±–ÄëÌë•…ïç—•Ω∏ÄÙÙÙÄâÖÕåàÄ¸ÄâÕ—•ùïπëîàÄËÄâôÖ±ëïπëîâıÄÄËÄàâıÅÙ(ÄÄÄÄ¯(ÄÄÄÄÄÅÌ=MQ}Q%1}=1U59}%9%Q%=9MmçΩ±’µπtπ±Öâï±Ù(ÄÄÄÄÄÄÒ%çΩ∏Åç±ÖÕÕ9ÖµîıÌÅ†¥Ã∏‘Å‹¥Ã∏‘ÄëÌÕï±ïç—ïêÄ¸ÄâΩ¡Öç•—‰¥ƒ¿¿àÄËÄâΩ¡Öç•—‰¥Ã‘âıÅÙÅÖ…•Ñµ°•ëëï∏Ùâ—…’îàÄº¯(ÄÄÄÄΩâ’——Ω∏¯(ÄÄ§Ï)Ù()ô’πç—•Ω∏ÅΩÕ—ï—Ö•±ï±∞°Ï(ÄÅ…Ω‹∞(ÄÅçΩ±’µ∏∞)ÙËÅÏ(ÄÅ…Ω‹ËÅΩÕ—ï—Ö•±IΩ‹Ï(ÄÅçΩ±’µ∏ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰Ï)Ù§ÅÏ(ÄÅ•òÄ°çΩ±’µ∏ÄÙÙÙÄâπÖµîà§ÅÏ(ÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâôΩπ–µÕïµ•âΩ±êÅ—ï·–µlå¡à≈å…ëtà˘Ì…Ω‹ππÖµïÙΩÕ¡Ö∏¯Ï(ÄÅÙ((ÄÅçΩπÕ–ÅŸÖ±’îÄÙÅ…Ω›mçΩ±’µπtÏ(ÄÅ•òÄ°—Â¡ïΩòÅŸÖ±’îÄÑÙÙÄâπ’µâï»àÅÒÄÖ9’µâï»π•Õ•π•—î°ŸÖ±’î§§ÅÏ(ÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâ—ï·–µÕ±Ö—î¥–¿¿àÅÖ…•Ñµ±Öâï∞Ùâ%≠≠îÅ—•±üôπùï±•úà˚äLΩÕ¡Ö∏¯Ï(ÄÅÙ(ÄÅ•òÄ°çΩ±’µ∏ÄÙÙÙÄâÕ°Ö…îà§Å…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâôΩπ–µÕïµ•âΩ±êÅ—ï·–µÕ±Ö—î¥‹¿¿à˘Ì¡ï…çïπ–°ŸÖ±’î•ÙΩÕ¡Ö∏¯Ï(ÄÅ•òÄ°çΩ±’µ∏ÄÙÙÙÄâç°ÖπùïAï…çïπ–à§ÅÏ(ÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîıÌŸÖ±’îÄÙÄ¿Ä¸Äâ—ï·–µïµï…Ö±ê¥‹¿¿àÄËÄâ—ï·–µΩ…Öπùî¥‹¿¿âÙ˘ÌÕ•ùπïëAï…çïπ–°ŸÖ±’î•ÙΩÕ¡Ö∏¯Ï(ÄÅÙ(ÄÅ•òÄ°çΩ±’µ∏ÄÙÙÙÄââ’ëùï—YÖ…•Öπçîà§ÅÏ(ÄÄÄÅçΩπÕ–Å¡…ïÕïπ—Ö—•Ω∏ÄÙÅ—Â¡ïΩòÅ…Ω‹πâ’ëùï–ÄÙÙÙÄâπ’µâï»à(ÄÄÄÄÄÄ¸Åâ’•±ë	’ëùï—YÖ…•ÖπçïA…ïÕïπ—Ö—•Ω∏°…Ω‹πç’……ïπ–∞Å…Ω‹πâ’ëùï–§(ÄÄÄÄÄÄËÅπ’±∞Ï(ÄÄÄÅ•òÄ†Ö¡…ïÕïπ—Ö—•Ω∏§ÅÏ(ÄÄÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâ—ï·–µÕ±Ö—î¥–¿¿àÅÖ…•Ñµ±Öâï∞Ùâ%≠≠îÅ—•±üôπùï±•úà˚äLΩÕ¡Ö∏¯Ï(ÄÄÄÅÙ(ÄÄÄÅçΩπÕ–Å—Ωπï±ÖÕÃÄÙÅ¡…ïÕïπ—Ö—•Ω∏π—ΩπîÄÙÙÙÄâ¡ΩÕ•—•Ÿîà(ÄÄÄÄÄÄ¸Äâ—ï·–µïµï…Ö±ê¥‹¿¿à(ÄÄÄÄÄÄËÅ¡…ïÕïπ—Ö—•Ω∏π—ΩπîÄÙÙÙÄâç…•—•çÖ∞à(ÄÄÄÄÄÄÄÄ¸Äâ—ï·–µ…ΩÕî¥‹¿¿à(ÄÄÄÄÄÄÄÄËÅ¡…ïÕïπ—Ö—•Ω∏π—ΩπîÄÙÙÙÄâ›Ö…π•πúà(ÄÄÄÄÄÄÄÄÄÄ¸Äâ—ï·–µΩ…Öπùî¥‹¿¿à(ÄÄÄÄÄÄÄÄÄÄËÄâ—ï·–µÕ±Ö—î¥ÿ¿¿àÏ(ÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîıÌÅôΩπ–µÕïµ•âΩ±êÄëÌ—Ωπï±ÖÕÕıÅÙ˘Ì¡…ïÕïπ—Ö—•Ω∏π±Öâï±ÙΩÕ¡Ö∏¯Ï(ÄÅÙ(ÄÅ•òÄ°çΩ±’µ∏ÄÙÙÙÄâç°Öπùîà§ÅÏ(ÄÄÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîıÌŸÖ±’îÄÙÄ¿Ä¸ÄâôΩπ–µÕïµ•âΩ±êÅ—ï·–µïµï…Ö±ê¥‹¿¿àÄËÄâôΩπ–µÕïµ•âΩ±êÅ—ï·–µΩ…Öπùî¥‹¿¿âÙ˘ÌÕ•ùπïë’……ïπç‰°ŸÖ±’î•ÙΩÕ¡Ö∏¯Ï(ÄÅÙ(ÄÅ…ï—’…∏ÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîıÌçΩ±’µ∏ÄÙÙÙÄâç’……ïπ–àÄ¸ÄâôΩπ–µÕïµ•âΩ±êÅ—ï·–µÕ±Ö—î¥‡¿¿àÄËÄâ—ï·–µÕ±Ö—î¥ÿ¿¿âÙ˘Ìç’……ïπç‰°ŸÖ±’î•ÙΩÕ¡Ö∏¯Ï)Ù()ô’πç—•Ω∏ÅΩÕ—ï—Ö•±QÖâ±î°ÏÅÖπÖ±ÂÕ•ÃÅÙËÅÏÅÖπÖ±ÂÕ•ÃËÅΩÕ—%π—ï±±•ùïπçîÅÙ§ÅÏ(ÄÅçΩπÕ–Åm≈’ï…‰∞ÅÕï—E’ï…ÂtÄÙÅ’ÕïM—Ö—î†àà§Ï(ÄÅçΩπÕ–Åëïôï……ïëE’ï…‰ÄÙÅ’Õïïôï……ïëYÖ±’î°≈’ï…‰§Ï(ÄÅçΩπÕ–ÅmÕΩ…–∞ÅÕï—MΩ…—tÄÙÅ’ÕïM—Ö—îÒÏÅ≠ï‰ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰ÏÅë•…ïç—•Ω∏ËÅΩÕ—ï—Ö•±MΩ…—•…ïç—•Ω∏ÅÙ¯°Ï(ÄÄÄÅ≠ï‰ËÄâç’……ïπ–à∞(ÄÄÄÅë•…ïç—•Ω∏ËÄâëïÕåà∞(ÄÅÙ§Ï(ÄÅçΩπÕ–ÅmÕï±ïç—ïëΩ±’µπÃ∞ÅÕï—Mï±ïç—ïëΩ±’µπÕtÄÙÅ’ÕïM—Ö—îÒΩÕ—ï—Ö•±Ω±’µπ-ïÂmt¯°l(ÄÄÄÄ∏∏π=MQ}Q%1}AI%5Ie}=1U59L∞(ÄÅt§Ï(ÄÅçΩπÕ–Åm¡…ïôï…ïπçïÕ1ΩÖëïê∞ÅÕï—A…ïôï…ïπçïÕ1ΩÖëïëtÄÙÅ’ÕïM—Ö—î°ôÖ±Õî§Ï(ÄÅçΩπÕ–ÅÖŸÖ•±Öâ±ïΩ±’µπÃÄÙÅ’Õï5ïµº†(ÄÄÄÄ†§ÄÙ¯Åùï—ŸÖ•±Öâ±ïΩÕ—ï—Ö•±Ω±’µπÃ°ÖπÖ±ÂÕ•Ãπëï—Ö•±IΩ›Ã§∞(ÄÄÄÅmÖπÖ±ÂÕ•Ãπëï—Ö•±IΩ›Õt∞(ÄÄ§Ï(ÄÅçΩπÕ–ÅŸ•Õ•â±ïΩ±’µπÃÄÙÅ’Õï5ïµº†(ÄÄÄÄ†§ÄÙ¯ÅπΩ…µÖ±•ÈïΩÕ—ï—Ö•±Ω±’µπMï±ïç—•Ω∏°Õï±ïç—ïëΩ±’µπÃ∞ÅÖŸÖ•±Öâ±ïΩ±’µπÃ§∞(ÄÄÄÅmÖŸÖ•±Öâ±ïΩ±’µπÃ∞ÅÕï±ïç—ïëΩ±’µπÕt∞(ÄÄ§Ï(ÄÅçΩπÕ–Åïôôïç—•ŸïMΩ…–ÄÙÅŸ•Õ•â±ïΩ±’µπÃπ•πç±’ëïÃ°ÕΩ…–π≠ï‰§(ÄÄÄÄ¸ÅÕΩ…–(ÄÄÄÄËÅÏÅ≠ï‰ËÄâç’……ïπ–àÅÖÃÅçΩπÕ–∞Åë•…ïç—•Ω∏ËÄâëïÕåàÅÖÃÅçΩπÕ–ÅÙÏ((ÄÅ’Õïôôïç–††§ÄÙ¯ÅÏ(ÄÄÄÅçΩπÕ–ÅÕ—Ω…ïêÄÙÅ›•πëΩ‹πÕïÕÕ•ΩπM—Ω…Öùîπùï—%—ï¥°=MQ}Q%1}=1U59}MMM%=9}-d§Ï(ÄÄÄÅÕï—Mï±ïç—ïëΩ±’µπÃ°¡Ö…ÕïΩÕ—ï—Ö•±Ω±’µπMï±ïç—•Ω∏°Õ—Ω…ïê∞Å=MQ}Q%1}=1U59}=IH§§Ï(ÄÄÄÅÕï—A…ïôï…ïπçïÕ1ΩÖëïê°—…’î§Ï(ÄÅÙ∞Åmt§Ï((ÄÅ’Õïôôïç–††§ÄÙ¯ÅÏ(ÄÄÄÅ•òÄ†Ö¡…ïôï…ïπçïÕ1ΩÖëïê§Å…ï—’…∏Ï(ÄÄÄÅ›•πëΩ‹πÕïÕÕ•ΩπM—Ω…ÖùîπÕï—%—ï¥†(ÄÄÄÄÄÅ=MQ}Q%1}=1U59}MMM%=9}-d∞(ÄÄÄÄÄÅÕï…•Ö±•ÈïΩÕ—ï—Ö•±Ω±’µπMï±ïç—•Ω∏°Õï±ïç—ïëΩ±’µπÃ§∞(ÄÄÄÄ§Ï(ÄÅÙ∞Åm¡…ïôï…ïπçïÕ1ΩÖëïê∞ÅÕï±ïç—ïëΩ±’µπÕt§Ï((ÄÅçΩπÕ–ÅŸ•Õ•â±ïIΩ›ÃÄÙÅ’Õï5ïµº††§ÄÙ¯ÅÏ(ÄÄÄÅçΩπÕ–ÅπΩ…µÖ±•ÈïëE’ï…‰ÄÙÅπΩ…µÖ±•ÈïΩ…Ωµ¡Ö…•ÕΩ∏°ëïôï……ïëE’ï…‰§Ï(ÄÄÄÅçΩπÕ–Å…Ω›ÃÄÙÅπΩ…µÖ±•ÈïëE’ï…‰(ÄÄÄÄÄÄ¸ÅÖπÖ±ÂÕ•Ãπëï—Ö•±IΩ›Ãπô•±—ï»†°…Ω‹§ÄÙ¯ÅπΩ…µÖ±•ÈïΩ…Ωµ¡Ö…•ÕΩ∏°…Ω‹ππÖµî§π•πç±’ëïÃ°πΩ…µÖ±•ÈïëE’ï…‰§§(ÄÄÄÄÄÄËÅÖπÖ±ÂÕ•Ãπëï—Ö•±IΩ›ÃÏ(ÄÄÄÅ…ï—’…∏ÅÕΩ…—ΩÕ—ï—Ö•±IΩ›Ã°…Ω›Ã∞Åïôôïç—•ŸïMΩ…–π≠ï‰∞Åïôôïç—•ŸïMΩ…–πë•…ïç—•Ω∏§Ï(ÄÅÙ∞ÅmÖπÖ±ÂÕ•Ãπëï—Ö•±IΩ›Ã∞Åëïôï……ïëE’ï…‰∞Åïôôïç—•ŸïMΩ…–πë•…ïç—•Ω∏∞Åïôôïç—•ŸïMΩ…–π≠ïÂt§Ï((ÄÅô’πç—•Ω∏Å—Ωùù±ïMΩ…–°≠ï‰ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰§ÅÏ(ÄÄÄÅÕï—MΩ…–†°ç’……ïπ–§ÄÙ¯Åç’……ïπ–π≠ï‰ÄÙÙÙÅ≠ï‰(ÄÄÄÄÄÄ¸ÅÏÅ≠ï‰∞Åë•…ïç—•Ω∏ËÅç’……ïπ–πë•…ïç—•Ω∏ÄÙÙÙÄâÖÕåàÄ¸ÄâëïÕåàÄËÄâÖÕåàÅÙ(ÄÄÄÄÄÄËÅÏÅ≠ï‰∞Åë•…ïç—•Ω∏ËÅ≠ï‰ÄÙÙÙÄâπÖµîàÄ¸ÄâÖÕåàÄËÄâëïÕåàÅÙ§Ï(ÄÅÙ((ÄÅô’πç—•Ω∏Å—Ωùù±ïΩ±’µ∏°çΩ±’µ∏ËÅΩÕ—ï—Ö•±Ω±’µπ-ï‰§ÅÏ(ÄÄÄÅÕï—Mï±ïç—ïëΩ±’µπÃ†°ç’……ïπ–§ÄÙ¯ÅπΩ…µÖ±•ÈïΩÕ—ï—Ö•±Ω±’µπMï±ïç—•Ω∏†(ÄÄÄÄÄÅç’……ïπ–π•πç±’ëïÃ°çΩ±’µ∏§(ÄÄÄÄÄÄÄÄ¸Åç’……ïπ–πô•±—ï»†°≠ï‰§ÄÙ¯Å≠ï‰ÄÑÙÙÅçΩ±’µ∏§(ÄÄÄÄÄÄÄÄËÅl∏∏πç’……ïπ–∞ÅçΩ±’µπt∞(ÄÄÄÄÄÅ=MQ}Q%1}=1U59}=IH∞(ÄÄÄÄ§§Ï(ÄÅÙ((ÄÅ…ï—’…∏Ä†(ÄÄÄÄÒΩµµÖπëAÖπï∞(ÄÄÄÄÄÅ—•—±îÙâï—Ö±©ï…ï–ÅΩµ≠ΩÕ—π•πùÕ—Öâï∞à(ÄÄÄÄÄÅëïÕç…•¡—•Ω∏ıÌÅ≠—’ï∞Åô•±—…ï…ï–ÅŸ•Õπ•πúÉ
‹ÅÕΩ…—ï…ï–Åïô—ï»ÄëÌ—Öâ±ïMΩ…—1Öâï∞°ïôôïç—•ŸïMΩ…–π≠ï‰•ıÅÙ(ÄÄÄÄÄÅ•çΩ∏ıÌIΩ›ÃÕÙ(ÄÄÄÄÄÅ—ΩπîÙâπï’—…Ö∞à(ÄÄÄÄÄÅ—ïÕ—%êÙâçΩÕ–µëï—Ö•∞µ—Öâ±îà(ÄÄÄÄ¯(ÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâô±ï‡Åô±ï‡µçΩ∞ÅùÖ¿¥ÃÅâΩ…ëï»µàÅâΩ…ëï»µÕ±Ö—î¥ƒ¿¿Å¿¥–ÅÕ¥Èô±ï‡µ…Ω‹ÅÕ¥È•—ïµÃµÕ—Ö…–ÅÕ¥È©’Õ—•ô‰µâï—›ïï∏ÅÕ¥È¡‡¥‘à¯(ÄÄÄÄÄÄÄÄÒ±Öâï∞Åç±ÖÕÕ9ÖµîÙâ…ï±Ö—•ŸîÅâ±Ωç¨Å‹µô’±∞ÅÕ¥ÈµÖ‡µ‹µÕ¥à¯(ÄÄÄÄÄÄÄÄÄÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâÕ»µΩπ±‰à˘O·úÅ§ÅΩµ≠ΩÕ—π•πùÕ≠Ö—ïùΩ…•ï»ΩÕ¡Ö∏¯(ÄÄÄÄÄÄÄÄÄÄÒMïÖ…ç†Åç±ÖÕÕ9ÖµîÙâ¡Ω•π—ï»µïŸïπ—ÃµπΩπîÅÖâÕΩ±’—îÅ±ïô–¥Ã∏‘Å—Ω¿¥ƒº»Å†¥–Å‹¥–Äµ—…ÖπÕ±Ö—îµ‰¥ƒº»Å—ï·–µÕ±Ö—î¥–¿¿àÅÖ…•Ñµ°•ëëï∏Ùâ—…’îàÄº¯(ÄÄÄÄÄÄÄÄÄÄÒ•π¡’–(ÄÄÄÄÄÄÄÄÄÄÄÅ—Â¡îÙâÕïÖ…ç†à(ÄÄÄÄÄÄÄÄÄÄÄÅŸÖ±’îıÌ≈’ï…ÂÙ(ÄÄÄÄÄÄÄÄÄÄÄÅΩπ°ÖπùîıÏ°ïŸïπ–§ÄÙ¯ÅÕï—E’ï…‰°ïŸïπ–π—Ö…ùï–πŸÖ±’î•Ù(ÄÄÄÄÄÄÄÄÄÄÄÅ¡±Öçï°Ω±ëï»ÙâO·úÅ§ÅΩµ≠ΩÕ—π•πùÕ≠Ö—ïùΩ…•ï»à(ÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâ†¥ƒƒÅ‹µô’±∞Å…Ω’πëïêµ±úÅâΩ…ëï»ÅâΩ…ëï»µÕ±Ö—î¥»¿¿ÅâúµÕ±Ö—î¥‘¿º‹¿Å¡∞¥ƒ¿Å¡»¥ÃÅ—ï·–µÕ¥Å—ï·–µlå¡à≈å…ëtÅΩ’—±•πîµπΩπîÅ—…ÖπÕ•—•Ω∏ÅôΩç’ÃÈâΩ…ëï»µçÂÖ∏¥–¿¿ÅôΩç’ÃÈâúµ›°•—îÅôΩç’ÃÈ…•πú¥»ÅôΩç’ÃÈ…•πúµçÂÖ∏¥ƒ¿¿à(ÄÄÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄÄÄΩ±Öâï∞¯(ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâô±ï‡Å‹µô’±∞Åô±ï‡µçΩ∞ÅùÖ¿¥»ÅÕ¥È‹µÖ’—ºÅÕ¥È•—ïµÃµïπêà¯(ÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâô±ï‡Åô±ï‡µçΩ∞ÅùÖ¿¥»Åµ•∏µl–ÿ¡¡·tÈô±ï‡µ…Ω‹à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒëï—Ö•±ÃÅç±ÖÕÕ9ÖµîÙâù…Ω’¿Åµ•∏µ‹µlƒ‰¡¡·tÅ…Ω’πëïêµ±úÅâΩ…ëï»ÅâΩ…ëï»µÕ±Ö—î¥»¿¿Åâúµ›°•—îÅ—ï·–µ·ÃÅ—ï·–µÕ±Ö—î¥‹¿¿à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒÕ’µµÖ…‰Åç±ÖÕÕ9ÖµîÙâô±ï‡Åµ•∏µ†¥ƒƒÅç’…ÕΩ»µ¡Ω•π—ï»Å±•Õ–µπΩπîÅ•—ïµÃµçïπ—ï»Å©’Õ—•ô‰µçïπ—ï»ÅùÖ¿¥»Å…Ω’πëïêµ±úÅ¡‡¥ÃÅôΩπ–µÕïµ•âΩ±êÅΩ’—±•πîµπΩπîÅ—…ÖπÕ•—•Ω∏Å°ΩŸï»ÈâΩ…ëï»µçÂÖ∏¥Ã¿¿Å°ΩŸï»È—ï·–µçÂÖ∏¥‡¿¿ÅôΩç’ÃµŸ•Õ•â±îÈ…•πú¥»ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµçÂÖ∏¥‘¿¿ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµΩôôÕï–¥»à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒMï——•πùÃ»Åç±ÖÕÕ9ÖµîÙâ†¥–Å‹¥–àÅÖ…•Ñµ°•ëëï∏Ùâ—…’îàÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅQ•±¡ÖÃÅ≠Ω±Ωππï»(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩÕ’µµÖ…‰¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒô•ï±ëÕï–Åç±ÖÕÕ9ÖµîÙâÕ¡Öçîµ‰¥ƒÅâΩ…ëï»µ–ÅâΩ…ëï»µÕ±Ö—î¥ƒ¿¿Å¿¥»∏‘à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ±ïùïπêÅç±ÖÕÕ9ÖµîÙâÕ»µΩπ±‰à˘YÖ±ùô…•îÅ—Öâï±≠Ω±Ωππï»Ω±ïùïπê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌ=MQ}Q%1}=AQ%=91}=1U59LπµÖ¿†°çΩ±’µ∏§ÄÙ¯ÅÏ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅçΩπÕ–ÅÖŸÖ•±Öâ±îÄÙÅÖŸÖ•±Öâ±ïΩ±’µπÃπ•πç±’ëïÃ°çΩ±’µ∏§Ï(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ…ï—’…∏Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ±Öâï∞(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ≠ï‰ıÌçΩ±’µπÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîıÌÅô±ï‡Åµ•∏µ†¥‰Å•—ïµÃµçïπ—ï»ÅùÖ¿¥»Å…Ω’πëïêµµêÅ¡‡¥»Å¡‰¥ƒ∏‘ÄëÏ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÖŸÖ•±Öâ±îÄ¸Äâç’…ÕΩ»µ¡Ω•π—ï»Å°ΩŸï»ÈâúµÕ±Ö—î¥‘¿àÄËÄâç’…ÕΩ»µπΩ–µÖ±±Ω›ïêÅ—ï·–µÕ±Ö—î¥–¿¿à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅıÅÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—•—±îıÌÖŸÖ•±Öâ±îÄ¸Å’πëïô•πïêÄËÄâ-Ω±Ωππï∏Å≠ÀôŸï»Åï–Å…ïù•Õ—…ï…ï–ÅÕÖµµïπ±•ùπ•πùÃ¥Åï±±ï»Å≠Ö—ïùΩ…•â’ëùï–âÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ•π¡’–(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—Â¡îÙâç°ïç≠âΩ‡à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç°ïç≠ïêıÌÖŸÖ•±Öâ±îÄòòÅÕï±ïç—ïëΩ±’µπÃπ•πç±’ëïÃ°çΩ±’µ∏•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅΩπ°ÖπùîıÏ†§ÄÙ¯Å—Ωùù±ïΩ±’µ∏°çΩ±’µ∏•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅë•ÕÖâ±ïêıÏÖÖŸÖ•±Öâ±ïÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâ†¥–Å‹¥–Å…Ω’πëïêÅâΩ…ëï»µÕ±Ö—î¥Ã¿¿Å—ï·–µçÂÖ∏¥‹¿¿ÅôΩç’ÃÈ…•πúµçÂÖ∏¥‘¿¿à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒÕ¡Ö∏˘Ì=MQ}Q%1}=1U59}%9%Q%=9MmçΩ±’µπtπ±Öâï±ÙΩÕ¡Ö∏¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ±Öâï∞¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ§Ï(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÙ•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩô•ï±ëÕï–¯(ÄÄÄÄÄÄÄÄÄÄÄÄΩëï—Ö•±Ã¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒâ’——Ω∏(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—Â¡îÙââ’——Ω∏à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅΩπ±•ç¨ıÏ†§ÄÙ¯ÅëΩ›π±ΩÖëΩÕ—Õÿ°Ÿ•Õ•â±ïIΩ›Ã∞ÅŸ•Õ•â±ïΩ±’µπÃ•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅë•ÕÖâ±ïêıÏÖŸ•Õ•â±ïIΩ›Ãπ±ïπù—°Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâ•π±•πîµô±ï‡Åµ•∏µ†¥ƒƒÅ•—ïµÃµçïπ—ï»Å©’Õ—•ô‰µçïπ—ï»ÅùÖ¿¥»Å…Ω’πëïêµ±úÅâΩ…ëï»ÅâΩ…ëï»µÕ±Ö—î¥»¿¿Åâúµ›°•—îÅ¡‡¥ÃÅ—ï·–µ·ÃÅôΩπ–µÕïµ•âΩ±êÅ—ï·–µÕ±Ö—î¥‹¿¿ÅΩ’—±•πîµπΩπîÅ—…ÖπÕ•—•Ω∏Å°ΩŸï»ÈâΩ…ëï»µçÂÖ∏¥Ã¿¿Å°ΩŸï»È—ï·–µçÂÖ∏¥‡¿¿ÅôΩç’ÃµŸ•Õ•â±îÈ…•πú¥»ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµçÂÖ∏¥‘¿¿ÅôΩç’ÃµŸ•Õ•â±îÈ…•πúµΩôôÕï–¥»Åë•ÕÖâ±ïêÈç’…ÕΩ»µπΩ–µÖ±±Ω›ïêÅë•ÕÖâ±ïêÈΩ¡Öç•—‰¥–‘à(ÄÄÄÄÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒΩ›π±ΩÖêÅç±ÖÕÕ9ÖµîÙâ†¥–Å‹¥–àÅÖ…•Ñµ°•ëëï∏Ùâ—…’îàÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅ≠Õ¡Ω…”•»ÅMX(ÄÄÄÄÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÄÄÄÄÒ¿Åç±ÖÕÕ9ÖµîÙâ—ï·–µlƒ≈¡·tÅ±ïÖë•πú¥–Å—ï·–µÕ±Ö—î¥‘¿¿à¯(ÄÄÄÄÄÄÄÄÄÄÄÅ-Ω±ΩππïŸÖ±ùï–ÅùïµµïÃÅ§ÅëïππîÅâ…Ω›Õï…ÕïÕÕ•Ω∏∏(ÄÄÄÄÄÄÄÄÄÄΩ¿¯(ÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâΩŸï…ô±Ω‹µ‡µÖ’—ºÅΩŸï…Õç…Ω±∞µ‡µçΩπ—Ö•∏à¯(ÄÄÄÄÄÄÄÄÒ—Öâ±î(ÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâ‹µô’±∞Å—ï·–µ±ïô–à(ÄÄÄÄÄÄÄÄÄÅÕ—Â±îıÌÏÅµ•π]•ë—†ËÅŸ•Õ•â±ïΩ±’µπÃπ±ïπù—†Ä¯Ä‘Ä¸ÅÄëÌ5Ö—†πµÖ‡†‹ÿ¿∞ÅŸ•Õ•â±ïΩ±’µπÃπ±ïπù—†Ä®Äƒ‘¿•ı¡·ÄÄËÄàÿ–¡¡‡àÅıÙ(ÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÄÒ—°ïÖêÅç±ÖÕÕ9ÖµîÙââúµlçò—ò·ôÖtÅ—ï·–µlƒ≈¡·tÅ’¡¡ï…çÖÕîÅ—…Öç≠•πúµl¿∏¿·ïµtÅÕ°ÖëΩ‹µl¡|≈¡·|¡|ççïëëî—tà¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒ—»¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌŸ•Õ•â±ïΩ±’µπÃπµÖ¿†°çΩ±’µ∏∞Å•πëï‡§ÄÙ¯Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ≠ï‰ıÌçΩ±’µπÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîıÌÄëÌ•πëï‡ÄÙÙÙÄ¿Ä¸Äâ¡‡¥‘Å—ï·–µ±ïô–àÄËÅ•πëï‡ÄÙÙÙÅŸ•Õ•â±ïΩ±’µπÃπ±ïπù—†Ä¥ÄƒÄ¸Äâ¡‡¥‘Å—ï·–µ…•ù°–àÄËÄâ¡‡¥ÃÅ—ï·–µ…•ù°–âıÅÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÖ…•ÑµÕΩ…–ıÌïôôïç—•ŸïMΩ…–π≠ï‰ÄÙÙÙÅçΩ±’µ∏(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¸Åïôôïç—•ŸïMΩ…–πë•…ïç—•Ω∏ÄÙÙÙÄâÖÕåàÄ¸ÄâÖÕçïπë•πúàÄËÄâëïÕçïπë•πúà(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄËÄâπΩπîâÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîıÌÅ•π±•πîµô±ï‡Å•—ïµÃµÕ—Ö…–ÅùÖ¿¥ƒÄëÌ•πëï‡ÄÙÙÙÄ¿Ä¸ÄààÄËÄâ©’Õ—•ô‰µïπêâıÅÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒΩÕ—MΩ…—	’——Ω∏(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅçΩ±’µ∏ıÌçΩ±’µπÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÖç—•ŸïΩ±’µ∏ıÌïôôïç—•ŸïMΩ…–π≠ïÂÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅë•…ïç—•Ω∏ıÌïôôïç—•ŸïMΩ…–πë•…ïç—•ΩπÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅΩπMΩ…–ıÌ—Ωùù±ïMΩ…—Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌ=MQ}Q%1}=1U59}%9%Q%=9MmçΩ±’µπtπ°ï±¡Qï·–Ä¸Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ%π±•πï%πôΩï—Ö•±Ã(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ±Öâï∞ıÌÅΩ…≠±Ö»ÄëÌ=MQ}Q%1}=1U59}%9%Q%=9MmçΩ±’µπtπ±Öâï∞π—Ω1ΩçÖ±ï1Ω›ï…ÖÕî†âëÑµ,à•ıÅÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—ï·–ıÌ=MQ}Q%1}=1U59}%9%Q%=9MmçΩ±’µπtπ°ï±¡Qï·—Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—ïÕ—%êıÌÅçΩÕ–µçΩ±’µ∏µ°ï±¿¥ëÌçΩ±’µπıÅÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ§ÄËÅπ’±±Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ—†¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄ§•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄΩ—»¯(ÄÄÄÄÄÄÄÄÄÄΩ—°ïÖê¯(ÄÄÄÄÄÄÄÄÄÄÒ—âΩë‰Åç±ÖÕÕ9ÖµîÙâë•Ÿ•ëîµ‰Åë•Ÿ•ëîµÕ±Ö—î¥ƒ¿¿Åâúµ›°•—îÅ—ï·–µÕ¥Å—Öâ’±Ö»µπ’µÃà¯(ÄÄÄÄÄÄÄÄÄÄÄÅÌŸ•Õ•â±ïIΩ›ÃπµÖ¿†°…Ω‹§ÄÙ¯Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—»Å≠ï‰ıÌ…Ω‹ππÖµïÙÅç±ÖÕÕ9ÖµîÙâ—…ÖπÕ•—•Ω∏Å°ΩŸï»ÈâúµçÂÖ∏¥‘¿ºÃ‘à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌŸ•Õ•â±ïΩ±’µπÃπµÖ¿†°çΩ±’µ∏∞Å•πëï‡§ÄÙ¯Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ—ê(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ≠ï‰ıÌçΩ±’µπÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîıÌÄëÌ•πëï‡ÄÙÙÙÄ¿Ä¸Äâ¡‡¥‘Å—ï·–µ±ïô–àÄËÅ•πëï‡ÄÙÙÙÅŸ•Õ•â±ïΩ±’µπÃπ±ïπù—†Ä¥ÄƒÄ¸Äâ¡‡¥‘Å—ï·–µ…•ù°–àÄËÄâ¡‡¥ÃÅ—ï·–µ…•ù°–âÙÅ¡‰¥Ã∏’ÅÙ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒΩÕ—ï—Ö•±ï±∞Å…Ω‹ıÌ…Ω›ÙÅçΩ±’µ∏ıÌçΩ±’µπÙÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ—ê¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ§•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩ—»¯(ÄÄÄÄÄÄÄÄÄÄÄÄ§•Ù(ÄÄÄÄÄÄÄÄÄÄΩ—âΩë‰¯(ÄÄÄÄÄÄÄÄΩ—Öâ±î¯(ÄÄÄÄÄÄÄÅÏÖŸ•Õ•â±ïIΩ›Ãπ±ïπù—†Ä¸Ä†(ÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâù…•êÅµ•∏µ†¥–¿Å¡±Öçîµ•—ïµÃµçïπ—ï»Åâúµ›°•—îÅ¡‡¥‘Å—ï·–µçïπ—ï»Å—ï·–µÕ¥Å—ï·–µÕ±Ö—î¥‘¿¿à¯(ÄÄÄÄÄÄÄÄÄÄÄÅ%πùï∏ÅΩµ≠ΩÕ—π•πùÕ≠Ö—ïùΩ…•ï»ÅµÖ—ç°ï»Åœ·ùπ•πùï∏∏(ÄÄÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÄÄ§ÄËÅπ’±±Ù(ÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄΩΩµµÖπëAÖπï∞¯(ÄÄ§Ï)Ù()ï·¡Ω…–ÅçΩπÕ–ÅΩÕ—%π—ï±±•ùïπçïÖÕ°âΩÖ…êÄÙÅµïµº°ô’πç—•Ω∏ÅΩÕ—%π—ï±±•ùïπçïÖÕ°âΩÖ…ê°Ï(ÄÅÖπÖ±ÂÕ•Ã∞)ÙËÅÏ(ÄÅÖπÖ±ÂÕ•ÃËÅΩÕ—%π—ï±±•ùïπçîÏ)Ù§ÅÏ(ÄÅ•òÄ†ÖÖπÖ±ÂÕ•Ãπ…Ω›Ω’π–ÅÒÄ†ÖÖπÖ±ÂÕ•Ãπ°ÖÕIΩ›ΩÕ—ÃÄòòÄÖÖπÖ±ÂÕ•Ãπë•Õ—…•â’—•Ω∏π±ïπù—†§§ÅÏ(ÄÄÄÅ…ï—’…∏Ä†(ÄÄÄÄÄÄÒΩµµÖπëAÖπï∞Å—•—±îÙâ=µ≠ΩÕ—π•πùÕëÖ—ÑàÅ•çΩ∏ıÌ]Ö±±ï—Ö…ëÕÙÅ—ΩπîÙâ›Ö…π•πúà¯(ÄÄÄÄÄÄÄÄÒΩµµÖπëµ¡—ÂM—Ö—î(ÄÄÄÄÄÄÄÄÄÅ—•—±îÙâ=µ≠ΩÕ—π•πùÕëÖ—ÑÅµÖπù±ï»à(ÄÄÄÄÄÄÄÄÄÅµïÕÕÖùîÙâQ•±õ·®Åï∏Å≠Ω±ΩππîÅµïêÅΩµ≠ΩÕ—π•πú∞Å≠ΩÕ—¡…•ÃÅï±±ï»Åìô≠π•πùÕâ•ë…ÖúÅôΩ»ÅÖ–ÉïâπîÅΩµ≠ΩÕ—π•πùÕÖπÖ±ÂÕï∏∏à(ÄÄÄÄÄÄÄÄÄÅ—ΩπîÙâ›Ö…π•πúà(ÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄΩΩµµÖπëAÖπï∞¯(ÄÄÄÄ§Ï(ÄÅÙ((ÄÅ…ï—’…∏Ä†(ÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâÕ¡Öçîµ‰¥‘ÅÕ¥ÈÕ¡Öçîµ‰¥ÿà¯(ÄÄÄÄÄÄÒΩÕ—-¡•…•êÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯((ÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâù…•êÅ•—ïµÃµÕ—Ö…–ÅùÖ¿¥‘Å·∞Èù…•êµçΩ±Ãµmµ•πµÖ‡†¿∞ƒ∏‘’ô»•}µ•πµÖ‡†Ã»¡¡‡∞¿∏‹’ô»•tà¯(ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâµ•∏µ‹¥¿ÅÕ¡Öçîµ‰¥‘à¯(ÄÄÄÄÄÄÄÄÄÅÌÖπÖ±ÂÕ•Ãπ°ÖÕΩÕ—Q•µï±•πîÄ¸Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÒΩÕ—Q…ïπë°Ö…–ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄÄÄ§ÄËÄ†(ÄÄÄÄÄÄÄÄÄÄÄÄÒΩµµÖπëAÖπï∞Å—•—±îÙâ=µ≠ΩÕ—π•πùÕ’ëŸ•≠±•πúàÅ•çΩ∏ıÌQ…ïπë•πùU¡ÙÅ—ΩπîÙâ›Ö…π•πúà¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒΩµµÖπëµ¡—ÂM—Ö—î(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—•—±îÙâQ•ëÕÕï…•îÅµÖπù±ï»à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅµïÕÕÖùîÙâQ•±õ·®Å∑ïπïêÅï±±ï»ÅëÖ—ºÅÕÖµ–ÅΩµ≠ΩÕ—π•πúÅ§ÅÕÖ±ùÕëÖ—ÑÅôΩ»ÅÖ–ÅÕîÅ’ëŸ•≠±•πùï∏ÅΩŸï»Å—•ê∏à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅ—ΩπîÙâ›Ö…π•πúà(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄº¯(ÄÄÄÄÄÄÄÄÄÄÄÄΩΩµµÖπëAÖπï∞¯(ÄÄÄÄÄÄÄÄÄÄ•Ù(ÄÄÄÄÄÄÄÄÄÄÒΩÕ—•Õ—…•â’—•ΩπAÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄÄÄÒΩÕ—°ÖπùïÕAÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâÕ¡Öçîµ‰¥‘à¯(ÄÄÄÄÄÄÄÄÄÄÒΩÕ—	’ëùï—AÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄÄÄÒΩÕ—%πÕ•ù°—ÕAÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄÄÄÒΩÕ—ôô•ç•ïπçÂAÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄΩë•ÿ¯((ÄÄÄÄÄÄÒIïŸïπ’ïΩÕ—AÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÒ1Ω›A…Ωô•—Öâ•±•—ÂAÖπï∞ÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄÄÄÒΩÕ—ï—Ö•±QÖâ±îÅÖπÖ±ÂÕ•ÃıÌÖπÖ±ÂÕ•ÕÙÄº¯(ÄÄÄÄΩë•ÿ¯(ÄÄ§Ï)Ù§Ï(