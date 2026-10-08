import {
  formatDanishCurrency,
  formatDanishNumber,
  formatDanishPercent,
  formatDanishMonth,
  monthSortKey,
} from "./dashboard-insights.ts";
import { resolveGrossMargin, resolveGrossProfit } from "./gross-margin.ts";
import { isFiniteNumber as finite, safeRatio } from "./numeric-foundation.ts";
import { describeCostBasis, type CostBasis } from "./result-basis.ts";
import { formatSignedPercentage, formatSignedPercentagePoints } from "./display-change.ts";
import { growthChange, resolvePeriodComparison } from "./period-comparison.ts";
import { COST_TO_REVENUE_LABEL, costToRevenue } from "./cost-share.ts";
import {
  chooseRepresentativeLabel,
  comparableLabel,
  normalizeForComparison,
} from "./data-labels.ts";

export type InsightMetricKey =
  | "revenue"
  | "units"
  | "averagePrice"
  | "grossProfit"
  | "grossMargin"
  | "cost"
  | "result"
  | "costShare";

export type InsightDimension = "product" | "category" | "channel" | "region";
export type InsightReliability = "high" | "medium" | "low";
export type InsightTone = "positive" | "negative" | "neutral";

export type InsightSourceRow = {
  date: Date | null;
  month: string;
  product: string;
  category: string;
  channel: string;
  region: string;
  revenue: number;
  units: number;
  grossProfit: number | null;
  grossMargin?: number | null;
  cost: number | null;
};

export type InsightBudgetFacts = {
  revenue?: number | null;
  costs?: number | null;
  result?: number | null;
  basis?: "registered" | "proportional";
  label?: string;
};

export type InsightCostDistributionFact = {
  name: string;
  cost: number;
};

export type InsightAnalysisOptions = {
  selectedMonth?: string | null;
  selectedMonths?: readonly string[];
  sourceName?: string;
  totalRowCount?: number;
  activeFilterLabels?: readonly string[];
  budget?: InsightBudgetFacts | null;
  costDistribution?: readonly InsightCostDistributionFact[];
  actualCost?: number | null;
  actualCostBasis?: "registered" | "row-derived";
  costSource?: CostBasis;
  partialMonths?: readonly string[];
};

export type InsightPeriodReference = {
  key: string;
  label: string;
  rowCount: number;
};

export type InsightSnapshotItem = {
  metric: InsightMetricKey;
  label: string;
  value: number;
  formattedValue: string;
  change: number | null;
  changeLabel: string | null;
  tone: InsightTone;
  evidenceId: string;
};

export type InsightMetricChange = InsightSnapshotItem & {
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null;
  percentagePointChange: number | null;
  comparisonLabel: string;
  reliability: InsightReliability;
};

export type InsightDriver = {
  metric: InsightMetricKey;
  dimension: InsightDimension;
  dimensionValue: string;
  scopeFilters: readonly string[];
  previousPeriod: string;
  currentPeriod: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null;
  contribution: number | null;
  movementShare: number | null;
  measures: {
    amount: { id: string; label: string; value: number };
    netShare: { id: string; label: "Andel af nettoændringen"; value: number | null };
    movementShare: { id: string; label: "Andel af absolut bevægelse"; value: number | null };
  };
  sampleSize: number;
  reliability: InsightReliability;
  evidenceId: string;
};

export type InsightDriverAnalysis = {
  metric: InsightMetricKey;
  label: string;
  dimension: InsightDimension;
  dimensionLabel: string;
  totalChange: number;
  currentValue: number;
  previousValue: number;
  comparisonPeriod: string;
  positiveDrivers: InsightDriver[];
  negativeDrivers: InsightDriver[];
  unchangedDrivers: InsightDriver[];
  hasKnownMembers: boolean;
  reconciliationDifference: number;
  scopeFilters: readonly string[];
  previousPeriod: string;
  currentPeriod: string;
  evidenceId: string;
};

export function summarizeDriverTopN(items: readonly InsightDriver[], limit: number) {
  const shown = items.slice(0, Math.max(0, limit));
  const omitted = items.slice(Math.max(0, limit));
  return {
    shown,
    omittedCount: omitted.length,
    omittedChange: omitted.reduce((sum, item) => sum + item.absoluteChange, 0),
    omittedNetShare: omitted.every((item) => item.contribution !== null)
      ? omitted.reduce((sum, item) => sum + (item.contribution ?? 0), 0) : null,
    omittedMovementShare: omitted.every((item) => item.movementShare !== null)
      ? omitted.reduce((sum, item) => sum + (item.movementShare ?? 0), 0) : null,
  };
}

export type InsightEvidence = {
  id: string;
  type: "metric" | "change" | "driver" | "budget" | "distribution" | "data-basis";
  title: string;
  metric?: InsightMetricKey;
  currentValue?: number;
  previousValue?: number;
  absoluteChange?: number;
  percentageChange?: number | null;
  percentagePointChange?: number | null;
  dimension?: InsightDimension;
  dimensionValue?: string;
  contribution?: number | null;
  movementShare?: number | null;
  driverMeasures?: InsightDriver["measures"];
  scopeFilters?: readonly string[];
  previousPeriod?: string;
  currentPeriod?: string;
  sampleSize: number;
  reliability: InsightReliability;
  supportingFacts: string[];
};

export type InsightObservation = {
  id: string;
  title: string;
  text: string;
  tone: InsightTone;
  priority: number;
  evidenceIds: string[];
};

export type InsightRecommendation = {
  id: string;
  text: string;
  evidenceIds: string[];
};

export type InsightReportSectionKey =
  | "executive-summary"
  | "central-metrics"
  | "development"
  | "positive-drivers"
  | "negative-drivers"
  | "costs-profitability"
  | "risks"
  | "opportunities"
  | "recommended-focus"
  | "data-basis";

export type InsightReportSection = {
  key: InsightReportSectionKey;
  title: string;
  available: boolean;
  paragraphs: string[];
  evidenceIds: string[];
};

export type InsightAnalysis = {
  snapshot: InsightSnapshotItem[];
  changes: InsightMetricChange[];
  driverAnalyses: InsightDriverAnalysis[];
  observations: InsightObservation[];
  recommendations: InsightRecommendation[];
  evidence: InsightEvidence[];
  report: { title: "Ledelsesrapport"; sections: InsightReportSection[] };
  reliability: InsightReliability;
  dataBasis: {
    sourceName: string;
    scopeMode: "selected-period" | "all-filtered-periods";
    scopeLabel: string;
    rowCount: number;
    totalRowCount: number;
    periodCount: number;
    activeFilterLabels: string[];
    hasComparison: boolean;
    budgetBasis: "registered" | "proportional" | null;
    costBasis: "registered" | "row-derived" | null;
    costSource: CostBasis | null;
  };
  currentPeriod: InsightPeriodReference | null;
  comparisonPeriod: InsightPeriodReference | null;
};

type Accumulator = {
  rowCount: number;
  revenue: number;
  revenueCount: number;
  units: number;
  unitsCount: number;
  grossProfit: number;
  grossProfitCount: number;
  weightedMargin: number;
  marginRevenue: number;
  marginCount: number;
  cost: number;
  costCount: number;
};

type DimensionAccumulator = Accumulator & { name: string };
type PeriodAccumulator = Accumulator & {
  key: string;
  label: string;
  sortKey: number;
  firstIndex: number;
  dimensions: Record<InsightDimension, Map<string, DimensionAccumulator>>;
};

const metricLabels: Record<InsightMetricKey, string> = {
  revenue: "Omsætning",
  units: "Solgte enheder",
  averagePrice: "Gennemsnitspris",
  grossProfit: "Dækningsbidrag",
  grossMargin: "Dækningsgrad",
  cost: "Omkostninger",
  result: "Resultat",
  costShare: COST_TO_REVENUE_LABEL,
};

const dimensionLabels: Record<InsightDimension, string> = {
  product: "Produkt",
  category: "Kategori",
  channel: "Kanal",
  region: "Region",
};

const metricOrder: InsightMetricKey[] = [
  "revenue", "result", "grossMargin", "cost", "units", "averagePrice", "grossProfit", "costShare",
];
const additiveDriverMetrics: InsightMetricKey[] = ["revenue", "result", "grossProfit", "cost", "units"];
const dimensions: InsightDimension[] = ["product", "category", "channel", "region"];
const UNKNOWN_DIMENSION_KEY = "\u0000unknown";
const UNKNOWN_DIMENSION_LABEL = "Ukendt/ufordelt";
const MINIMUM_COVERAGE = 0.95;
const MINIMUM_PERCENT_BASE_SHARE = 0.005;
const danishCollator = new Intl.Collator("da-DK", { numeric: true, sensitivity: "base" });

function createAccumulator(): Accumulator {
  return {
    rowCount: 0,
    revenue: 0,
    revenueCount: 0,
    units: 0,
    unitsCount: 0,
    grossProfit: 0,
    grossProfitCount: 0,
    weightedMargin: 0,
    marginRevenue: 0,
    marginCount: 0,
    cost: 0,
    costCount: 0,
  };
}

function addRow(target: Accumulator, row: InsightSourceRow) {
  target.rowCount += 1;
  if (finite(row.revenue)) {
    target.revenue += row.revenue;
    target.revenueCount += 1;
  }
  if (finite(row.units)) {
    target.units += row.units;
    target.unitsCount += 1;
  }
  if (finite(row.grossProfit)) {
    target.grossProfit += row.grossProfit;
    target.grossProfitCount += 1;
  }
  if (finite(row.grossMargin) && finite(row.revenue)) {
    target.weightedMargin += row.grossMargin * row.revenue;
    target.marginRevenue += row.revenue;
    target.marginCount += 1;
  }
  const cost = finite(row.cost) ? row.cost : null;
  if (cost !== null && Number.isFinite(cost)) {
    target.cost += cost;
    target.costCount += 1;
  }
}

function coverage(count: number, total: number) {
  return total > 0 ? count / total : 0;
}

function adequate(count: number, total: number) {
  return coverage(count, total) >= MINIMUM_COVERAGE;
}

function metricValue(accumulator: Accumulator, metric: InsightMetricKey): number | null {
  const revenueAvailable = adequate(accumulator.revenueCount, accumulator.rowCount);
  const unitsAvailable = adequate(accumulator.unitsCount, accumulator.rowCount);
  const grossProfitAvailable = resolveGrossProfit(accumulator).value !== null;
  const costAvailable = adequate(accumulator.costCount, accumulator.rowCount);
  let value: number | null = null;
  if (metric === "revenue") value = revenueAvailable ? accumulator.revenue : null;
  if (metric === "units") value = unitsAvailable ? accumulator.units : null;
  if (metric === "averagePrice") value = revenueAvailable && unitsAvailable
    ? safeRatio(accumulator.revenue, accumulator.units)
    : null;
  if (metric === "grossProfit") value = grossProfitAvailable ? accumulator.grossProfit : null;
  if (metric === "grossMargin") {
    value = resolveGrossMargin(accumulator).value;
  }
  if (metric === "cost") value = costAvailable ? accumulator.cost : null;
  if (metric === "result") value = revenueAvailable && costAvailable
    ? accumulator.revenue - accumulator.cost
    : null;
  if (metric === "costShare") value = revenueAvailable && costAvailable
    ? costToRevenue(accumulator.cost, accumulator.revenue)
    : null;
  return value !== null && Number.isFinite(value) ? value : null;
}

function metricCoverage(accumulator: Accumulator, metric: InsightMetricKey) {
  if (metric === "units" || metric === "averagePrice") return coverage(accumulator.unitsCount, accumulator.rowCount);
  if (metric === "grossProfit" || metric === "grossMargin") {
    if (metric === "grossMargin") {
      return resolveGrossMargin(accumulator).value === null ? 0 : 1;
    }
    return Math.max(
      coverage(accumulator.grossProfitCount, accumulator.rowCount),
      coverage(accumulator.marginCount, accumulator.rowCount),
    );
  }
  if (metric === "cost" || metric === "result" || metric === "costShare") {
    return coverage(accumulator.costCount, accumulator.rowCount);
  }
  return coverage(accumulator.revenueCount, accumulator.rowCount);
}

function reliability(sampleSize: number, valueCoverage = 1): InsightReliability {
  if (sampleSize >= 10 && valueCoverage >= 1) return "high";
  if (sampleSize >= 2 && valueCoverage >= MINIMUM_COVERAGE) return "medium";
  return "low";
}

function formatMetric(metric: InsightMetricKey, value: number) {
  if (metric === "units") return formatDanishNumber(value);
  if (metric === "grossMargin" || metric === "costShare") return formatDanishPercent(value);
  return formatDanishCurrency(value);
}

function signedMetric(metric: InsightMetricKey, value: number) {
  if (value === 0) return formatMetric(metric, 0);
  return `${value > 0 ? "+" : "−"}${formatMetric(metric, Math.abs(value))}`;
}

function endSentence(text: string) {
  const trimmed = text.trimEnd();
  return /[.!?]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

function changeTone(metric: InsightMetricKey, change: number): InsightTone {
  if (change === 0) return "neutral";
  const lowerIsBetter = metric === "cost" || metric === "costShare";
  return (change > 0) !== lowerIsBetter ? "positive" : "negative";
}

function metricChangeLabel(
  metric: InsightMetricKey,
  absoluteChange: number,
  percentage: number | null,
  percentagePointChange: number | null,
) {
  if (percentagePointChange !== null) {
    return formatSignedPercentagePoints(percentagePointChange);
  }
  if (percentage !== null) {
    return formatSignedPercentage(percentage, formatDanishPercent(Math.abs(percentage)));
  }
  return signedMetric(metric, absoluteChange);
}

function periodIdentity(row: InsightSourceRow, index: number) {
  const dateKey = row.date && !Number.isNaN(row.date.getTime())
    ? new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime()
    : monthSortKey(row.month);
  const label = formatDanishMonth(row.month || row.date || "Ukendt måned");
  return {
    key: dateKey === null ? `text:${normalizeForComparison(label)}` : String(dateKey),
    label,
    sortKey: dateKey ?? Number.MAX_SAFE_INTEGER,
    firstIndex: index,
  };
}

function createPeriod(identity: ReturnType<typeof periodIdentity>): PeriodAccumulator {
  return {
    ...createAccumulator(),
    ...identity,
    dimensions: {
      product: new Map(),
      category: new Map(),
      channel: new Map(),
      region: new Map(),
    },
  };
}

function mergeAccumulator(target: Accumulator, source: Accumulator) {
  target.rowCount += source.rowCount;
  target.revenue += source.revenue;
  target.revenueCount += source.revenueCount;
  target.units += source.units;
  target.unitsCount += source.unitsCount;
  target.grossProfit += source.grossProfit;
  target.grossProfitCount += source.grossProfitCount;
  target.weightedMargin += source.weightedMargin;
  target.marginRevenue += source.marginRevenue;
  target.marginCount += source.marginCount;
  target.cost += source.cost;
  target.costCount += source.costCount;
}

function periodRangeLabel(periods: readonly PeriodAccumulator[]) {
  const first = periods[0];
  const last = periods.at(-1);
  if (!first || !last) return "Valgt periode";
  return first.key === last.key ? first.label : `${first.label} – ${last.label}`;
}

function combinePeriods(periods: readonly PeriodAccumulator[], keyPrefix: string) {
  if (!periods.length) return null;
  if (periods.length === 1) return periods[0];
  const combined = createPeriod({
    key: `${keyPrefix}:${periods.map((period) => period.key).join("|")}`,
    label: periodRangeLabel(periods),
    sortKey: periods.at(-1)?.sortKey ?? Number.MAX_SAFE_INTEGER,
    firstIndex: periods[0]?.firstIndex ?? 0,
  });
  for (const period of periods) {
    mergeAccumulator(combined, period);
    for (const dimension of dimensions) {
      for (const [key, group] of period.dimensions[dimension]) {
        const current = combined.dimensions[dimension].get(key) ?? {
          ...createAccumulator(),
          name: group.name,
        };
        current.name = chooseRepresentativeLabel(current.name, group.name);
        mergeAccumulator(current, group);
        combined.dimensions[dimension].set(key, current);
      }
    }
  }
  return combined;
}

function addDimensionRow(period: PeriodAccumulator, dimension: InsightDimension, rawValue: string, row: InsightSourceRow) {
  const comparisonKey = normalizeForComparison(rawValue);
  const isUnknown = !comparisonKey || ["ukategoriseret", "ukendt", "unknown", "ikke angivet", "n/a", "ukendt/ufordelt"].includes(comparisonKey);
  const identity = isUnknown
    ? { key: UNKNOWN_DIMENSION_KEY, label: UNKNOWN_DIMENSION_LABEL }
    : comparableLabel(rawValue);
  const current = period.dimensions[dimension].get(identity.key) ?? {
    ...createAccumulator(),
    name: identity.label,
  };
  current.name = chooseRepresentativeLabel(current.name, identity.label);
  addRow(current, row);
  period.dimensions[dimension].set(identity.key, current);
}

function percentageChange(current: number, previous: number, previousTotal: number) {
  const minimumBase = Math.max(1, Math.abs(previousTotal) * MINIMUM_PERCENT_BASE_SHARE);
  return Math.abs(previous) >= minimumBase
    ? safeRatio(current - previous, Math.abs(previous))
    : null;
}

function evidenceId(...parts: Array<string | number>) {
  return parts.map((part) => {
    const value = String(part).normalize("NFC");
    return `${value.length}.${encodeURIComponent(value)}`;
  }).join(":");
}

function driverMeasures(metric: InsightMetricKey, id: string, amount: number, netShare: number | null, movementShare: number | null): InsightDriver["measures"] {
  return {
    amount: { id: evidenceId(id, "amount"), label: metric === "revenue" ? "Omsætningsbidrag i kr." : `${metricLabels[metric]}: absolut ændring`, value: amount },
    netShare: { id: evidenceId(id, "net-change-share"), label: "Andel af nettoændringen", value: netShare },
    movementShare: { id: evidenceId(id, "absolute-movement-share"), label: "Andel af absolut bevægelse", value: movementShare },
  };
}

function buildDrivers(
  current: PeriodAccumulator,
  previous: PeriodAccumulator,
  metric: InsightMetricKey,
  dimension: InsightDimension,
  scopeFilters: readonly string[],
): InsightDriverAnalysis | null {
  const currentTotal = metricValue(current, metric);
  const previousTotal = metricValue(previous, metric);
  if (currentTotal === null || previousTotal === null) return null;
  const currentGroups = current.dimensions[dimension];
  const previousGroups = previous.dimensions[dimension];
  const keys = new Set([...currentGroups.keys(), ...previousGroups.keys()]);
  const items: InsightDriver[] = [];
  for (const key of keys) {
    const currentGroup = currentGroups.get(key);
    const previousGroup = previousGroups.get(key);
    const currentValue = currentGroup ? metricValue(currentGroup, metric) : 0;
    const previousValue = previousGroup ? metricValue(previousGroup, metric) : 0;
    if (currentValue === null || previousValue === null) continue;
    const absoluteChange = currentValue - previousValue;
    if (!Number.isFinite(absoluteChange)) continue;
    const name = currentGroup && previousGroup
      ? chooseRepresentativeLabel(currentGroup.name, previousGroup.name)
      : currentGroup?.name ?? previousGroup?.name ?? key;
    const driverId = evidenceId("driver", metric, dimension, key, previous.key, current.key, ...scopeFilters);
    items.push({
      metric,
      dimension,
      dimensionValue: name,
      scopeFilters,
      previousPeriod: previous.label,
      currentPeriod: current.label,
      currentValue,
      previousValue,
      absoluteChange,
      percentageChange: percentageChange(currentValue, previousValue, previousTotal),
      contribution: null,
      movementShare: null,
      measures: driverMeasures(metric, driverId, absoluteChange, null, null),
      sampleSize: (currentGroup?.rowCount ?? 0) + (previousGroup?.rowCount ?? 0),
      reliability: reliability(
        (currentGroup?.rowCount ?? 0) + (previousGroup?.rowCount ?? 0),
        Math.min(
          currentGroup ? metricCoverage(currentGroup, metric) : 1,
          previousGroup ? metricCoverage(previousGroup, metric) : 1,
        ),
      ),
      evidenceId: driverId,
    });
  }
  if (!items.length) return null;
  const totalChange = currentTotal - previousTotal;
  const allocatedChange = items.reduce((sum, item) => sum + item.absoluteChange, 0);
  const reconciliationDifference = totalChange - allocatedChange;
  if (!Number.isFinite(totalChange) || !Number.isFinite(reconciliationDifference)) return null;
  const tolerance = Math.max(1, Math.abs(totalChange), Math.abs(allocatedChange)) * 1e-10;
  if (Math.abs(reconciliationDifference) > tolerance) {
    const remainderId = evidenceId("driver", metric, dimension, "unallocated-remainder", previous.key, current.key, ...scopeFilters);
    items.push({
      metric, dimension, dimensionValue: "Ufordelt rest", scopeFilters,
      previousPeriod: previous.label, currentPeriod: current.label,
      currentValue: reconciliationDifference, previousValue: 0,
      absoluteChange: reconciliationDifference, percentageChange: null,
      contribution: null, movementShare: null, sampleSize: 0, reliability: "low",
      measures: driverMeasures(metric, remainderId, reconciliationDifference, null, null),
      evidenceId: remainderId,
    });
  }
  const totalMovement = items.reduce((sum, item) => sum + Math.abs(item.absoluteChange), 0);
  items.forEach((item) => {
    item.contribution = safeRatio(item.absoluteChange, totalChange);
    item.movementShare = safeRatio(Math.abs(item.absoluteChange), totalMovement);
    item.measures = driverMeasures(metric, item.evidenceId, item.absoluteChange, item.contribution, item.movementShare);
  });
  const sortDrivers = (left: InsightDriver, right: InsightDriver) => (
    Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange)
    || danishCollator.compare(left.dimensionValue, right.dimensionValue)
  );
  const id = evidenceId("driver-analysis", metric, dimension, previous.key, current.key, ...scopeFilters);
  return {
    metric,
    label: metricLabels[metric],
    dimension,
    dimensionLabel: dimensionLabels[dimension],
    totalChange,
    currentValue: currentTotal,
    previousValue: previousTotal,
    comparisonPeriod: `${previous.label} → ${current.label}`,
    positiveDrivers: items.filter((item) => item.absoluteChange > 0).sort(sortDrivers),
    negativeDrivers: items.filter((item) => item.absoluteChange < 0).sort(sortDrivers),
    unchangedDrivers: items.filter((item) => item.absoluteChange === 0).sort(sortDrivers),
    hasKnownMembers: keys.size > (keys.has(UNKNOWN_DIMENSION_KEY) ? 1 : 0),
    reconciliationDifference: Math.abs(reconciliationDifference) > tolerance ? reconciliationDifference : 0,
    scopeFilters,
    previousPeriod: previous.label,
    currentPeriod: current.label,
    evidenceId: id,
  };
}

function reportSection(
  key: InsightReportSectionKey,
  title: string,
  paragraphs: string[],
  evidenceIds: string[],
): InsightReportSection {
  return { key, title, available: paragraphs.length > 0, paragraphs, evidenceIds };
}

function economicImpact(change: InsightMetricChange, changes: readonly InsightMetricChange[]) {
  const companion = (metric: InsightMetricKey) => changes.find((item) => item.metric === metric);
  const reliabilityWeight = change.reliability === "high" ? 1 : change.reliability === "medium" ? 0.85 : 0.6;
  let impact = Math.abs(change.absoluteChange);

  if (change.metric === "grossMargin" || change.metric === "costShare") {
    const revenue = companion("revenue");
    impact *= Math.max(Math.abs(revenue?.value ?? 0), Math.abs(revenue?.previousValue ?? 0), 1);
  } else if (change.metric === "units") {
    const averagePrice = companion("averagePrice");
    impact *= Math.max(Math.abs(averagePrice?.value ?? 0), Math.abs(averagePrice?.previousValue ?? 0), 1);
  } else if (change.metric === "averagePrice") {
    const units = companion("units");
    impact *= Math.max(Math.abs(units?.value ?? 0), Math.abs(units?.previousValue ?? 0), 1);
  }

  return impact * reliabilityWeight;
}

function proseChangeValue(change: InsightMetricChange) {
  if (change.percentagePointChange !== null) {
    return `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 })
      .format(Math.abs(change.percentagePointChange) * 100)} procentpoint`;
  }
  if (change.percentageChange !== null) return formatDanishPercent(Math.abs(change.percentageChange));
  return formatMetric(change.metric, Math.abs(change.absoluteChange));
}

function movementVerb(change: InsightMetricChange) {
  return change.absoluteChange > 0 ? "steg" : change.absoluteChange < 0 ? "faldt" : "var uændret";
}

function displayedPercent(value: number | null) {
  return value === null ? null : Math.round(Math.abs(value) * 1_000) / 10;
}

function metricProseSubject(metric: InsightMetricKey) {
  const subjects: Record<InsightMetricKey, string> = {
    revenue: "Omsætningen",
    units: "Antallet af solgte enheder",
    averagePrice: "Gennemsnitsprisen",
    grossProfit: "Dækningsbidraget",
    grossMargin: "Dækningsgraden",
    cost: "Omkostningerne",
    result: "Resultatet",
    costShare: COST_TO_REVENUE_LABEL,
  };
  return subjects[metric];
}

function buildDevelopmentNarrative(
  changes: readonly InsightMetricChange[],
  comparisonPeriod: InsightPeriodReference | null,
  currentPeriod: InsightPeriodReference | null,
) {
  const paragraphs: string[] = [];
  const evidenceIds: string[] = [];
  const consumed = new Set<InsightMetricKey>();
  const revenue = changes.find((item) => item.metric === "revenue") ?? null;
  const units = changes.find((item) => item.metric === "units") ?? null;
  const grossMargin = changes.find((item) => item.metric === "grossMargin") ?? null;
  const periodText = comparisonPeriod && currentPeriod
    ? ` fra ${comparisonPeriod.label} til ${currentPeriod.label}`
    : " i sammenligningsperioden";

  if (revenue || units) {
    const first = revenue ?? units;
    if (first) {
      const subject = first.metric === "revenue" ? "Omsætningen" : "Antallet af solgte enheder";
      let paragraph = `${subject} ${movementVerb(first)}${first.absoluteChange === 0 ? "" : ` ${proseChangeValue(first)}`}${periodText}`;
      consumed.add(first.metric);
      evidenceIds.push(first.evidenceId);

      const companion = first.metric === "revenue" ? units : revenue;
      if (companion) {
        const companionSubject = companion.metric === "units" ? "antallet af solgte enheder" : "omsætningen";
        const sameDisplayedRate = displayedPercent(first.percentageChange) !== null
          && displayedPercent(first.percentageChange) === displayedPercent(companion.percentageChange)
          && Math.sign(first.absoluteChange) === Math.sign(companion.absoluteChange);
        paragraph += `, samtidig med at ${companionSubject} ${movementVerb(companion)}${companion.absoluteChange === 0
          ? ""
          : ` ${sameDisplayedRate ? "tilsvarende " : ""}${proseChangeValue(companion)}`}`;
        consumed.add(companion.metric);
        evidenceIds.push(companion.evidenceId);
      }
      paragraph += ".";

      if (grossMargin) {
        const isStableMargin = Math.abs(grossMargin.absoluteChange) < 0.01;
        const supportsActivityComparison = Boolean(
          revenue
          && units
          && revenue.percentageChange !== null
          && units.percentageChange !== null
          && Math.sign(revenue.absoluteChange) === Math.sign(units.absoluteChange)
          && Math.abs(revenue.percentageChange - units.percentageChange) < 0.015,
        );
        paragraph += isStableMargin
          ? supportsActivityComparison
            ? ` Dækningsgraden var stort set stabil med en ændring på ${proseChangeValue(grossMargin)}; de registrerede bevægelser lå dermed i omsætning og volumen, mens marginen ændrede sig begrænset.`
            : ` Dækningsgraden var stort set stabil med en ændring på ${proseChangeValue(grossMargin)}.`
          : ` Dækningsgraden ${movementVerb(grossMargin)} ${proseChangeValue(grossMargin)} i samme periode.`;
        consumed.add("grossMargin");
        evidenceIds.push(grossMargin.evidenceId);
      }
      paragraphs.push(paragraph);
    }
  } else if (grossMargin) {
    paragraphs.push(`Dækningsgraden ${movementVerb(grossMargin)}${grossMargin.absoluteChange === 0 ? "" : ` ${proseChangeValue(grossMargin)}`}${periodText}.`);
    consumed.add("grossMargin");
    evidenceIds.push(grossMargin.evidenceId);
  }

  const remaining = changes.filter((change) => !consumed.has(change.metric) && change.absoluteChange !== 0);
  for (let index = 0; index < remaining.length; index += 2) {
    const first = remaining[index];
    const second = remaining[index + 1];
    if (!first) continue;
    let paragraph = `${metricProseSubject(first.metric)} ${movementVerb(first)} ${proseChangeValue(first)}`;
    evidenceIds.push(first.evidenceId);
    if (second) {
      const secondSubject = metricProseSubject(second.metric);
      paragraph += `, mens ${secondSubject.charAt(0).toLocaleLowerCase("da-DK")}${secondSubject.slice(1)} ${movementVerb(second)} ${proseChangeValue(second)}`;
      evidenceIds.push(second.evidenceId);
    }
    paragraphs.push(`${paragraph}${periodText}.`);
  }

  return { paragraphs, evidenceIds: Array.from(new Set(evidenceIds)) };
}

export function buildInsightAnalysis(
  rows: ReadonlyArray<InsightSourceRow>,
  options: InsightAnalysisOptions = {},
): InsightAnalysis {
  const periods = new Map<string, PeriodAccumulator>();
  const overall = createAccumulator();
  rows.forEach((row, index) => {
    addRow(overall, row);
    const identity = periodIdentity(row, index);
    const period = periods.get(identity.key) ?? createPeriod(identity);
    addRow(period, row);
    for (const dimension of dimensions) addDimensionRow(period, dimension, row[dimension], row);
    periods.set(identity.key, period);
  });
  const allPeriods = Array.from(periods.values());
  const orderedPeriods = allPeriods
    .filter((period) => period.sortKey !== Number.MAX_SAFE_INTEGER)
    .sort((left, right) => (
    left.sortKey - right.sortKey || left.firstIndex - right.firstIndex || danishCollator.compare(left.label, right.label)
  ));
  const requestedMonths = Array.from(new Set(
    (options.selectedMonths?.length
      ? options.selectedMonths
      : options.selectedMonth ? [options.selectedMonth] : [])
      .map((month) => month.trim())
      .filter(Boolean),
  ));
  const requestedKeys = requestedMonths.map((month) => {
    const sortKey = monthSortKey(month);
    return sortKey === null ? `text:${normalizeForComparison(formatDanishMonth(month))}` : String(sortKey);
  });
  const hasSelectedPeriod = requestedMonths.length > 0;
  const selectedPeriods = requestedKeys
    .map((key) => periods.get(key) ?? null)
    .filter((period): period is PeriodAccumulator => Boolean(period))
    .sort((left, right) => left.sortKey - right.sortKey || left.firstIndex - right.firstIndex);
  const periodComparison = resolvePeriodComparison(orderedPeriods.map((period) => period.label), {
    selectedMonths: requestedMonths,
    partialMonths: options.partialMonths,
  });
  const previousPeriods = periodComparison.status === "available"
    ? periodComparison.previousMonths.map((month) => periods.get(String(monthSortKey(month)))).filter((period): period is PeriodAccumulator => Boolean(period))
    : [];
  const current = hasSelectedPeriod
    ? combinePeriods(selectedPeriods, "selected-periods")
    : orderedPeriods.at(-1) ?? null;
  const previous = combinePeriods(previousPeriods, "comparison-periods");
  const scope = hasSelectedPeriod ? current : overall.rowCount ? overall : null;
  const scopeKey = hasSelectedPeriod
    ? current?.key ?? `selected:${requestedKeys.join("|") || "missing"}`
    : "all-filtered-periods";
  const firstPeriod = orderedPeriods[0] ?? null;
  const hasUnorderedPeriods = allPeriods.length !== orderedPeriods.length;
  const scopeLabel = hasSelectedPeriod
    ? current?.label ?? (requestedMonths.map((month) => formatDanishMonth(month)).join(", ") || "Valgt periode")
    : hasUnorderedPeriods
      ? "Alle filtrerede perioder"
      : firstPeriod && current && firstPeriod.key !== current.key
      ? `${firstPeriod.label} – ${current.label}`
      : current?.label ?? "Aktuel filtreret visning";
  const currentPeriod = current ? { key: current.key, label: current.label, rowCount: current.rowCount } : null;
  const comparisonPeriod = previous ? { key: previous.key, label: previous.label, rowCount: previous.rowCount } : null;
  const evidence: InsightEvidence[] = [];
  const snapshot: InsightSnapshotItem[] = [];
  const changes: InsightMetricChange[] = [];
  const actualCost = options.costSource
    ? options.costSource.totalCosts
    : finite(options.actualCost) ? options.actualCost : null;
  const variableOnly = options.costSource?.source === "variable-only" && actualCost === null;
  const reportedCost = actualCost ?? (variableOnly ? options.costSource?.variableCosts ?? null : null);
  const actualCostBasis = reportedCost === null ? null : options.actualCostBasis ?? "row-derived";
  const displayedMetricLabel = (metric: InsightMetricKey) => variableOnly && metric === "cost"
    ? "Variable omkostninger" : variableOnly && metric === "costShare"
      ? "Variable omkostninger i % af omsætning" : metricLabels[metric];
  const suppressPeriodizedCostMetrics = Boolean(options.costSource && (options.costSource.status === "unavailable" || options.costSource.source !== "row-cost"))
    || actualCostBasis === "registered";
  const usesActualCost = (metric: InsightMetricKey) => (
    (actualCost !== null || options.costSource !== undefined)
      && (metric === "cost" || metric === "result" || metric === "costShare")
  );
  const scopeMetricValue = (metric: InsightMetricKey) => {
    if (!scope) return null;
    if (!usesActualCost(metric)) return metricValue(scope, metric);
    if (metric === "result") {
      if (actualCost === null) return null;
      const revenue = metricValue(scope, "revenue");
      return revenue === null ? null : finite(revenue - actualCost) ? revenue - actualCost : null;
    }
    if (reportedCost === null) return null;
    if (metric === "cost") return reportedCost;
    const revenue = metricValue(scope, "revenue");
    if (revenue === null) return null;
    return costToRevenue(reportedCost, revenue);
  };
  const scopeMetricCoverage = (metric: InsightMetricKey) => {
    if (!scope) return 0;
    if (usesActualCost(metric)) {
      if (metric === "result" ? actualCost === null : reportedCost === null) return 0;
      return metric === "cost"
        ? 1
        : Math.min(1, metricCoverage(scope, "revenue"));
    }
    return metricCoverage(scope, metric);
  };

  if (current && previous) {
    for (const metric of metricOrder) {
      if (suppressPeriodizedCostMetrics && (metric === "cost" || metric === "result" || metric === "costShare")) continue;
      const value = metricValue(current, metric);
      const previousValue = metricValue(previous, metric);
      if (value === null || previousValue === null) continue;
      const absoluteChange = value - previousValue;
      const isRate = metric === "grossMargin" || metric === "costShare";
      const rateChange = isRate ? absoluteChange : null;
      const percentChange = !isRate ? growthChange(value, previousValue).percentage : null;
      const id = evidenceId("change", metric, previous.key, current.key);
      const tone = changeTone(metric, absoluteChange);
      const changeLabel = metricChangeLabel(metric, absoluteChange, percentChange, rateChange);
      changes.push({
        metric,
        label: displayedMetricLabel(metric),
        value,
        formattedValue: formatMetric(metric, value),
        change: absoluteChange,
        changeLabel,
        tone,
        evidenceId: id,
        previousValue,
        absoluteChange,
        percentageChange: percentChange,
        percentagePointChange: rateChange,
        comparisonLabel: `${previous.label} → ${current.label}`,
        reliability: reliability(
          current.rowCount + previous.rowCount,
          Math.min(metricCoverage(current, metric), metricCoverage(previous, metric)),
        ),
      });
      evidence.push({
        id,
        type: "change",
        title: metricLabels[metric],
        metric,
        currentValue: value,
        previousValue,
        absoluteChange,
        percentageChange: percentChange,
        percentagePointChange: rateChange,
        sampleSize: current.rowCount + previous.rowCount,
        reliability: reliability(
          current.rowCount + previous.rowCount,
          Math.min(metricCoverage(current, metric), metricCoverage(previous, metric)),
        ),
        supportingFacts: [
          endSentence(`${metricLabels[metric]} i ${current.label}: ${formatMetric(metric, value)}`),
          endSentence(`${metricLabels[metric]} i ${previous.label}: ${formatMetric(metric, previousValue)}`),
        ],
      });
    }
  }

  if (scope) {
    for (const metric of metricOrder) {
      const value = scopeMetricValue(metric);
      if (value === null) continue;
      const periodChange = hasSelectedPeriod
        ? changes.find((change) => change.metric === metric) ?? null
        : null;
      const id = evidenceId("metric", metric, scopeKey);
      snapshot.push({
        metric,
        label: displayedMetricLabel(metric),
        value,
        formattedValue: formatMetric(metric, value),
        change: periodChange?.absoluteChange ?? null,
        changeLabel: periodChange?.changeLabel ?? null,
        tone: periodChange?.tone ?? "neutral",
        evidenceId: id,
      });
      const supportingFacts = [endSentence(`${displayedMetricLabel(metric)} for ${scopeLabel}: ${formatMetric(metric, value)}`)];
      if (usesActualCost(metric)) {
        supportingFacts.push(actualCostBasis === "registered"
          ? "Omkostningstallet kommer fra den registrerede omkostningsopgørelse."
          : "Omkostningstallet er beregnet fra de filtrerede salgsrækker.");
      }
      evidence.push({
        id,
        type: "metric",
        title: displayedMetricLabel(metric),
        metric,
        currentValue: value,
        sampleSize: scope.rowCount,
        reliability: actualCostBasis === "registered" && usesActualCost(metric)
          ? "high"
          : reliability(scope.rowCount, scopeMetricCoverage(metric)),
        supportingFacts,
      });
    }
  }

  const driverAnalyses: InsightDriverAnalysis[] = [];
  const driverScopeFilters = [...(options.activeFilterLabels ?? [])].sort(danishCollator.compare);
  if (current && previous) {
    for (const metric of additiveDriverMetrics) {
      if (suppressPeriodizedCostMetrics && (metric === "cost" || metric === "result")) continue;
      for (const dimension of dimensions) {
        const analysis = buildDrivers(current, previous, metric, dimension, driverScopeFilters);
        if (!analysis) continue;
        driverAnalyses.push(analysis);
        const positiveTop = summarizeDriverTopN(analysis.positiveDrivers, 3);
        const negativeTop = summarizeDriverTopN(analysis.negativeDrivers, 3);
        evidence.push({
          id: analysis.evidenceId,
          type: "driver",
          title: `${analysis.label} efter ${analysis.dimensionLabel.toLocaleLowerCase("da-DK")}`,
          metric,
          currentValue: analysis.currentValue,
          previousValue: analysis.previousValue,
          absoluteChange: analysis.totalChange,
          dimension: analysis.dimension,
          scopeFilters: analysis.scopeFilters,
          previousPeriod: analysis.previousPeriod,
          currentPeriod: analysis.currentPeriod,
          sampleSize: current.rowCount + previous.rowCount,
          reliability: reliability(current.rowCount + previous.rowCount),
          supportingFacts: [
            `Sammenligning: ${analysis.comparisonPeriod}. Dimension: ${analysis.dimensionLabel}. ${analysis.scopeFilters.length ? `Filtre: ${analysis.scopeFilters.join(", ")}.` : "Ingen dimensionsfiltre."}`,
            endSentence(`Afstemning: ${signedMetric(metric, analysis.totalChange)} i alt; ufordelt rest ${signedMetric(metric, analysis.reconciliationDifference)}`),
            ...positiveTop.shown.map((driver) => `${driver.dimensionValue}: ${signedMetric(metric, driver.absoluteChange)} registreret bidrag.`),
            ...negativeTop.shown.map((driver) => `${driver.dimensionValue}: ${signedMetric(metric, driver.absoluteChange)} registreret bidrag.`),
            ...(positiveTop.omittedCount ? [endSentence(`Øvrige ${positiveTop.omittedCount} positive medlemmer: ${signedMetric(metric, positiveTop.omittedChange)}`)] : []),
            ...(negativeTop.omittedCount ? [endSentence(`Øvrige ${negativeTop.omittedCount} negative medlemmer: ${signedMetric(metric, negativeTop.omittedChange)}`)] : []),
          ],
        });
        for (const driver of [...analysis.positiveDrivers, ...analysis.negativeDrivers, ...analysis.unchangedDrivers]) {
          evidence.push({
            id: driver.evidenceId,
            type: "driver",
            title: `${analysis.dimensionLabel}: ${driver.dimensionValue} · ${driver.measures.amount.label}`,
            metric,
            currentValue: driver.currentValue,
            previousValue: driver.previousValue,
            absoluteChange: driver.absoluteChange,
            percentageChange: driver.percentageChange,
            dimension: analysis.dimension,
            dimensionValue: driver.dimensionValue,
            contribution: driver.contribution,
            movementShare: driver.movementShare,
            driverMeasures: driver.measures,
            scopeFilters: driver.scopeFilters,
            previousPeriod: driver.previousPeriod,
            currentPeriod: driver.currentPeriod,
            sampleSize: driver.sampleSize,
            reliability: driver.reliability,
            supportingFacts: [
              `${driver.dimensionValue} ændrede sig med ${signedMetric(metric, driver.absoluteChange)} i de registrerede data.`,
              `Andel af nettoændringen: ${driver.contribution === null ? "utilgængelig ved nul nettoændring" : formatDanishPercent(driver.contribution)}.`,
              `Andel af absolut bevægelse: ${driver.movementShare === null ? "utilgængelig ved nul bevægelse" : formatDanishPercent(driver.movementShare)}.`,
              `Sammenligning: ${analysis.comparisonPeriod}. Dimension: ${analysis.dimensionLabel}. ${analysis.scopeFilters.length ? `Filtre: ${analysis.scopeFilters.join(", ")}.` : "Ingen dimensionsfiltre."}`,
              "Dataene dokumenterer, hvor ændringen opstod, men ikke den bagvedliggende forretningsmæssige årsag.",
            ],
          });
        }
      }
    }
  }

  const primaryChanges = [...changes].sort((left, right) => (
    economicImpact(right, changes) - economicImpact(left, changes)
    || metricOrder.indexOf(left.metric) - metricOrder.indexOf(right.metric)
  ));
  const observations: InsightObservation[] = primaryChanges.slice(0, 5).map((change, index) => ({
    id: `observation-${index + 1}`,
    title: change.label,
    text: `${change.label} ${change.absoluteChange > 0 ? "steg" : change.absoluteChange < 0 ? "faldt" : "var uændret"}${change.changeLabel ? ` (${change.changeLabel})` : ""} fra ${comparisonPeriod?.label} til ${currentPeriod?.label}.`,
    tone: change.tone,
    priority: economicImpact(change, changes) - index * Number.EPSILON,
    evidenceIds: [change.evidenceId],
  }));
  const dimensionPriority: Record<InsightDimension, number> = {
    category: 0,
    product: 1,
    channel: 2,
    region: 3,
  };
  const primaryRevenueAnalysis = driverAnalyses
    .filter((analysis) => analysis.metric === "revenue")
    .sort((left, right) => Number(right.hasKnownMembers) - Number(left.hasKnownMembers)
      || dimensionPriority[left.dimension] - dimensionPriority[right.dimension])[0];
  const strongestDriver = primaryRevenueAnalysis
    ? [...primaryRevenueAnalysis.positiveDrivers, ...primaryRevenueAnalysis.negativeDrivers]
        .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))[0]
    : undefined;
  if (strongestDriver && primaryRevenueAnalysis) {
    const driverContext = `${primaryRevenueAnalysis.dimensionLabel.toLocaleLowerCase("da-DK")} ${strongestDriver.dimensionValue} i ${primaryRevenueAnalysis.comparisonPeriod}${primaryRevenueAnalysis.scopeFilters.length ? ` med filtre ${primaryRevenueAnalysis.scopeFilters.join(", ")}` : ""}`;
    observations.unshift({
      id: "observation-driver",
      title: "Største registrerede bidrag",
      text: `${endSentence(`Det største registrerede omsætningsbidrag er ${signedMetric("revenue", strongestDriver.absoluteChange)} for ${driverContext}`)} Dataene viser, hvor ændringen er registreret, men ikke den bagvedliggende forretningsmæssige årsag.`,
      tone: strongestDriver.absoluteChange > 0 ? "positive" : "negative",
      priority: Math.abs(strongestDriver.absoluteChange) * 1.01,
      evidenceIds: [strongestDriver.evidenceId],
    });
  }
  const recommendations: InsightRecommendation[] = strongestDriver && primaryRevenueAnalysis ? [{
    id: "focus-primary-driver",
    text: `Undersøg ${primaryRevenueAnalysis.dimensionLabel.toLocaleLowerCase("da-DK")} ${strongestDriver.dimensionValue} nærmere; her er det største registrerede absolutte omsætningsbidrag i ${primaryRevenueAnalysis.comparisonPeriod}.`,
    evidenceIds: [strongestDriver.evidenceId],
  }] : [];

  const budget = options.budget ?? null;
  const budgetEvidenceIds: string[] = [];
  if (budget) {
    for (const [metric, value] of [["revenue", budget.revenue], ["cost", budget.costs], ["result", budget.result]] as const) {
      if (variableOnly && metric === "cost") continue;
      if (!finite(value)) continue;
      const currentValue = scopeMetricValue(metric);
      if (currentValue === null) continue;
      const id = evidenceId("budget", metric, scopeKey);
      budgetEvidenceIds.push(id);
      evidence.push({ id, type: "budget", title: `${metricLabels[metric]} mod budget`, metric, currentValue, previousValue: value, absoluteChange: currentValue - value, sampleSize: scope?.rowCount ?? 0, reliability: budget.basis === "proportional" ? "medium" : "high", supportingFacts: [`${endSentence(`Faktisk: ${formatMetric(metric, currentValue)}`)} ${endSentence(`Budget: ${formatMetric(metric, value)}`)}`] });
    }
  }
  for (const [index, id] of budgetEvidenceIds.entries()) {
    const fact = evidence.find((item) => item.id === id);
    if (!fact?.metric || fact.absoluteChange === undefined) continue;
    const difference = fact.absoluteChange;
    const favorable = fact.metric === "cost" ? difference < 0 : difference > 0;
    const metricName = metricLabels[fact.metric];
    observations.push({
      id: `observation-budget-${fact.metric}`,
      title: `${metricName} mod budget`,
      text: difference === 0
        ? `${metricName} er på budget.`
        : `${metricName} ligger ${formatMetric(fact.metric, Math.abs(difference))} ${difference > 0 ? "over" : "under"} budgettet${budget?.basis === "proportional" ? " på et proportionelt fordelt grundlag" : ""}.`,
      tone: difference === 0 ? "neutral" : favorable ? "positive" : "negative",
      priority: Math.abs(difference) - index * Number.EPSILON,
      evidenceIds: [id],
    });
  }

  const registeredCostGroups = new Map<string, InsightCostDistributionFact>();
  for (const item of options.costDistribution ?? []) {
    if (!finite(item.cost)) continue;
    const identity = comparableLabel(item.name);
    const existing = registeredCostGroups.get(identity.key);
    registeredCostGroups.set(identity.key, {
      name: existing ? chooseRepresentativeLabel(existing.name, identity.label) : identity.label,
      cost: (existing?.cost ?? 0) + item.cost,
    });
  }
  const costDistribution = Array.from(registeredCostGroups.values()).sort((left, right) => (
    right.cost - left.cost || danishCollator.compare(left.name, right.name)
  ));
  const costDistributionTotal = options.costSource?.status === "available"
    ? options.costSource.totalCosts
    : variableOnly ? options.costSource?.variableCosts ?? null
      : costDistribution.reduce((sum, item) => sum + item.cost, 0);
  const largestCostGroup = costDistribution.find((item) => item.cost > 0) ?? null;
  const largestCostEvidenceId = largestCostGroup
    ? evidenceId("cost-distribution", largestCostGroup.name, scopeKey)
    : null;
  const largestCostShare = largestCostGroup && costDistributionTotal !== null
    ? safeRatio(largestCostGroup.cost, costDistributionTotal)
    : null;
  if (largestCostGroup && largestCostEvidenceId && largestCostShare !== null) {
    const share = largestCostShare;
    evidence.push({
      id: largestCostEvidenceId,
      type: "distribution",
      title: "Største registrerede omkostningspost",
      metric: "cost",
      currentValue: largestCostGroup.cost,
      dimension: "category",
      dimensionValue: largestCostGroup.name,
      contribution: share,
      sampleSize: costDistribution.length,
      reliability: costDistribution.length >= 2 ? "high" : "medium",
      supportingFacts: [
        endSentence(`${largestCostGroup.name}: ${formatDanishCurrency(largestCostGroup.cost)}`),
        `${formatDanishPercent(share)} af de ${variableOnly ? "variable" : "samlede"} omkostninger.`,
      ],
    });
    observations.push({
      id: "observation-largest-cost-group",
      title: "Største registrerede omkostningspost",
      text: `${largestCostGroup.name} er den største registrerede omkostningspost med ${formatDanishCurrency(largestCostGroup.cost)} og ${formatDanishPercent(share)} af de ${variableOnly ? "variable" : "samlede"} omkostninger.`,
      tone: "neutral",
      priority: Math.abs(largestCostGroup.cost),
      evidenceIds: [largestCostEvidenceId],
    });
    if (share >= 0.35) {
      recommendations.push({
        id: "focus-largest-cost-group",
        text: `Undersøg ${largestCostGroup.name} nærmere, da posten udgør ${formatDanishPercent(share)} af de ${variableOnly ? "variable" : "samlede"} omkostninger.`,
        evidenceIds: [largestCostEvidenceId],
      });
    }
  }

  if (current) {
    const currentRevenue = metricValue(current, "revenue");
    if (currentRevenue !== null && currentRevenue > 0) {
      for (const dimension of dimensions) {
        const revenueGroups = Array.from(current.dimensions[dimension], ([key, group]) => ({
          key,
          group,
          revenue: metricValue(group, "revenue"),
        })).filter((item): item is { key: string; group: DimensionAccumulator; revenue: number } => (
          item.revenue !== null && item.revenue > 0
        ));
        if (revenueGroups.length < 2) continue;
        const positiveRevenueTotal = revenueGroups.reduce((sum, item) => sum + item.revenue, 0);
        const comparisonTolerance = Math.max(0.01, Math.abs(currentRevenue) * Number.EPSILON * 16);
        if (positiveRevenueTotal > currentRevenue + comparisonTolerance) continue;
        for (const { key, group, revenue: groupRevenue } of revenueGroups) {
          const share = safeRatio(groupRevenue, currentRevenue);
          if (share === null || share <= 0) continue;
          const id = evidenceId("revenue-distribution", dimension, key, current.key);
          evidence.push({
            id,
            type: "distribution",
            title: `${group.name}: omsætningsandel`,
            metric: "revenue",
            currentValue: groupRevenue,
            dimension,
            dimensionValue: group.name,
            contribution: share,
            sampleSize: group.rowCount,
            reliability: reliability(group.rowCount, metricCoverage(group, "revenue")),
            supportingFacts: [
              `${group.name}: ${formatDanishCurrency(groupRevenue)} i ${current.label}.`,
              `${formatDanishPercent(share)} af omsætningen i ${current.label}.`,
            ],
          });
        }
      }
    }
  }

  const revenueSnapshot = snapshot.find((item) => item.metric === "revenue");
  const summaryParagraphs = snapshot.length
    ? [hasSelectedPeriod
        ? comparisonPeriod
          ? `I ${scopeLabel} var omsætningen ${revenueSnapshot?.formattedValue ?? "ikke tilgængelig"} sammenlignet med ${comparisonPeriod.label}.`
          : `${endSentence(`I ${scopeLabel} var omsætningen ${revenueSnapshot?.formattedValue ?? "ikke tilgængelig"}`)} Der findes ingen tidligere sammenlignelig periode i datagrundlaget.`
        : `${endSentence(`Den filtrerede visning for ${scopeLabel} omfatter en omsætning på ${revenueSnapshot?.formattedValue ?? "ikke tilgængelig"}`)}${comparisonPeriod && currentPeriod ? ` Udviklingen sammenlignes fra ${comparisonPeriod.label} til ${currentPeriod.label}.` : " Der findes ingen tidligere sammenlignelig periode i datagrundlaget."}`]
    : [];
  const bestPositive = primaryRevenueAnalysis?.positiveDrivers[0];
  const bestNegative = primaryRevenueAnalysis?.negativeDrivers[0];
  const costSnapshot = snapshot.find((item) => item.metric === "cost");
  const resultSnapshot = snapshot.find((item) => item.metric === "result");
  const costParagraphs = costSnapshot && resultSnapshot
    ? [endSentence(`Omkostningerne var ${costSnapshot.formattedValue}, og resultatet var ${resultSnapshot.formattedValue}`)]
    : [];
  if (largestCostGroup && largestCostEvidenceId && largestCostShare !== null) {
    costParagraphs.push(
      `${largestCostGroup.name} var den største registrerede omkostningspost med ${formatDanishCurrency(largestCostGroup.cost)} og ${formatDanishPercent(largestCostShare)} af de ${variableOnly ? "variable" : "samlede"} omkostninger.`,
    );
  }
  if (costSnapshot && !variableOnly && finite(budget?.costs)) {
    const variance = costSnapshot.value - budget.costs;
    costParagraphs.push(
      variance === 0
        ? "De registrerede omkostninger var på budget."
        : `De registrerede omkostninger var ${formatDanishCurrency(Math.abs(variance))} ${variance > 0 ? "over" : "under"} budgettet${budget.basis === "proportional" ? " på det proportionelt fordelte grundlag" : ""}.`,
    );
  }
  const dataBasisEvidenceId = evidenceId("data-basis", scopeKey, rows.length);
  const sourceName = options.sourceName ?? "det valgte datasæt";
  const totalRowCount = finite(options.totalRowCount)
    ? Math.max(rows.length, Math.floor(options.totalRowCount))
    : rows.length;
  const activeFilterText = options.activeFilterLabels?.length
    ? options.activeFilterLabels.join(", ")
    : "Ingen";
  const invalidPeriodRows = allPeriods
    .filter((period) => period.sortKey === Number.MAX_SAFE_INTEGER)
    .reduce((sum, period) => sum + period.rowCount, 0);
  evidence.push({
    id: dataBasisEvidenceId,
    type: "data-basis",
    title: "Datagrundlag",
    sampleSize: scope?.rowCount ?? 0,
    reliability: reliability(scope?.rowCount ?? 0),
    supportingFacts: [
      `${formatDanishNumber(scope?.rowCount ?? 0)} rækker indgår i den aktuelle visning.`,
      `${formatDanishNumber(totalRowCount)} rækker findes i den fulde datakilde.`,
      `Datakilde: ${sourceName}.`,
      `Analyseomfang: ${scopeLabel}.`,
      `Aktive filtre: ${activeFilterText}.`,
      `${formatDanishNumber(allPeriods.length)} perioder er registreret; ${formatDanishNumber(orderedPeriods.length)} kan indgå i en kronologisk sammenligning.`,
      ...(invalidPeriodRows > 0
        ? [`${formatDanishNumber(invalidPeriodRows)} rækker uden en gyldig periode indgår i totalen, men ikke i periodeudviklingen.`]
        : []),
      ...(actualCostBasis
        ? [`Omkostningsgrundlag: ${actualCostBasis === "registered" ? "registreret omkostningsopgørelse" : "filtrerede salgsrækker"}.`]
        : []),
      ...(options.costSource?.reason ? [`Resultat utilgængeligt: ${options.costSource.reason}`] : []),
      ...(options.costSource ? [`Resultatgrundlag: ${describeCostBasis(options.costSource)}.`] : []),
      ...(periodComparison.reason ? [`Periodesammenligning utilgængelig: ${periodComparison.reason}`] : []),
    ],
  });
  const snapshotEvidenceIds = snapshot.map((item) => item.evidenceId);
  const revenueChange = changes.find((item) => item.metric === "revenue");
  const executiveEvidenceIds = [
    revenueSnapshot?.evidenceId,
    comparisonPeriod ? revenueChange?.evidenceId : null,
  ].filter((id): id is string => Boolean(id));
  const developmentNarrative = buildDevelopmentNarrative(
    primaryChanges,
    comparisonPeriod,
    currentPeriod,
  );
  const costBudgetEvidenceId = evidence.find((item) => item.type === "budget" && item.metric === "cost")?.id;
  const sections: InsightReportSection[] = [
    reportSection("executive-summary", "Ledelsesresumé", summaryParagraphs, executiveEvidenceIds),
    reportSection("central-metrics", "Centrale nøgletal", snapshot.map((item) => endSentence(`${item.label}: ${item.formattedValue}`)), snapshotEvidenceIds),
    reportSection(
      "development",
      "Udvikling siden sammenligningsperioden",
      developmentNarrative.paragraphs,
      developmentNarrative.evidenceIds,
    ),
    reportSection("positive-drivers", "Vigtigste positive drivere", bestPositive && primaryRevenueAnalysis ? [endSentence(`Største positive omsætningsbidrag i kr.: ${signedMetric("revenue", bestPositive.absoluteChange)} for ${primaryRevenueAnalysis.dimensionLabel.toLocaleLowerCase("da-DK")} ${bestPositive.dimensionValue}, ${primaryRevenueAnalysis.comparisonPeriod}${primaryRevenueAnalysis.scopeFilters.length ? `, filtre: ${primaryRevenueAnalysis.scopeFilters.join(", ")}` : ""}`)] : [], bestPositive ? [bestPositive.evidenceId] : []),
    reportSection("negative-drivers", "Vigtigste negative drivere", bestNegative && primaryRevenueAnalysis ? [endSentence(`Største negative omsætningsbidrag i kr.: ${signedMetric("revenue", bestNegative.absoluteChange)} for ${primaryRevenueAnalysis.dimensionLabel.toLocaleLowerCase("da-DK")} ${bestNegative.dimensionValue}, ${primaryRevenueAnalysis.comparisonPeriod}${primaryRevenueAnalysis.scopeFilters.length ? `, filtre: ${primaryRevenueAnalysis.scopeFilters.join(", ")}` : ""}`)] : [], bestNegative ? [bestNegative.evidenceId] : []),
    reportSection("costs-profitability", "Omkostninger og rentabilitet", costParagraphs, [costSnapshot?.evidenceId, resultSnapshot?.evidenceId, largestCostEvidenceId, costBudgetEvidenceId].filter((id): id is string => Boolean(id))),
    reportSection("risks", "Risici / opmærksomhedspunkter", observations.filter((item) => item.tone === "negative").map((item) => item.text), observations.filter((item) => item.tone === "negative").flatMap((item) => item.evidenceIds)),
    reportSection("opportunities", "Muligheder", observations.filter((item) => item.tone === "positive").map((item) => item.text), observations.filter((item) => item.tone === "positive").flatMap((item) => item.evidenceIds)),
    reportSection("recommended-focus", "Anbefalet fokus", recommendations.map((item) => item.text), recommendations.flatMap((item) => item.evidenceIds)),
    reportSection("data-basis", "Datagrundlag", [`Analysen omfatter ${formatDanishNumber(scope?.rowCount ?? 0)} rækker fra ${sourceName}. Aktive filtre: ${activeFilterText}.${invalidPeriodRows > 0 ? ` ${formatDanishNumber(invalidPeriodRows)} rækker uden en gyldig periode indgår i totalen, men ikke i periodeudviklingen.` : ""}`], [dataBasisEvidenceId]),
  ];
  const reliabilitySampleSize = hasSelectedPeriod && previous
    ? (scope?.rowCount ?? 0) + previous.rowCount
    : scope?.rowCount ?? 0;
  const overallReliability = reliability(
    reliabilitySampleSize,
    scope ? Math.min(...snapshot.map((item) => scopeMetricCoverage(item.metric)), 1) : 0,
  );
  return {
    snapshot,
    changes: primaryChanges,
    driverAnalyses,
    observations: observations.sort((left, right) => right.priority - left.priority).slice(0, 5),
    recommendations: recommendations.slice(0, 3),
    evidence,
    report: { title: "Ledelsesrapport", sections },
    reliability: overallReliability,
    dataBasis: {
      sourceName: options.sourceName ?? "Datakilde",
      scopeMode: hasSelectedPeriod ? "selected-period" : "all-filtered-periods",
      scopeLabel,
      rowCount: scope?.rowCount ?? 0,
      totalRowCount,
      periodCount: allPeriods.length,
      activeFilterLabels: [...(options.activeFilterLabels ?? [])],
      hasComparison: Boolean(previous),
      budgetBasis: budget?.basis ?? null,
      costBasis: actualCostBasis,
      costSource: options.costSource ?? null,
    },
    currentPeriod,
    comparisonPeriod,
  };
}
