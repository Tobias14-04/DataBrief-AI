import {
  formatDanishCurrency,
  formatDanishNumber,
  formatDanishPercent,
} from "./dashboard-insights.ts";
import type { KpiConfiguration, KpiEvaluation } from "./kpi-customization.ts";
import type {
  InsightAnalysis,
  InsightDimension,
  InsightMetricKey,
  InsightReportSection,
  InsightReportSectionKey,
} from "./insight-engine.ts";
import type { StrategicAnalysis, StrategicFinding } from "./strategy-engine.ts";

export const focusAreaOptions = [
  { id: "sales", label: "Salget" },
  { id: "profitability", label: "Indtjeningen" },
  { id: "costs", label: "Omkostningerne" },
  { id: "products", label: "Produkterne" },
  { id: "trends", label: "Udviklingen over tid" },
  { id: "changes", label: "Hvad der har ændret sig siden sidste periode" },
] as const;

export const primaryGoalOptions = [
  { id: "grow-sales", label: "Få mere salg" },
  { id: "improve-profit", label: "Tjene mere på det salg, vi allerede har" },
  { id: "control-costs", label: "Få bedre styr på omkostningerne" },
  { id: "top-products", label: "Se hvilke produkter der klarer sig bedst" },
  { id: "early-warning", label: "Opdage problemer tidligere" },
  { id: "overview", label: "Jeg vil bare have et bedre samlet overblik" },
] as const;

export type AnalysisFocusArea = (typeof focusAreaOptions)[number]["id"];
export type AnalysisPrimaryGoal = (typeof primaryGoalOptions)[number]["id"];
export type AnalysisTargetKpiId =
  | "total-revenue"
  | "result"
  | "gross-margin"
  | "total-costs"
  | "total-units";
export type AnalysisTargetDirection = "at-least" | "at-most";
export type AnalysisTargetFormat = "currency" | "percent" | "integer";
export type AnalysisOverviewTrendMetric = "revenue" | "grossProfit" | "units" | "cost";
export type AnalysisOverviewPriority = "sales" | "profitability" | "costs" | "products";

export type AnalysisSupportingInsight = {
  text: string;
  topics: readonly AnalysisFocusArea[];
};

export type AnalysisTarget = {
  kpiId: AnalysisTargetKpiId;
  value: number;
  direction: AnalysisTargetDirection;
};

export type AnalysisPreferences = {
  focusAreas: AnalysisFocusArea[];
  primaryGoal: AnalysisPrimaryGoal | null;
  targets: AnalysisTarget[];
};

export type AnalysisTargetMetric = {
  id: AnalysisTargetKpiId;
  label: string;
  subject: string;
  format: AnalysisTargetFormat;
  direction: AnalysisTargetDirection;
  inputSuffix: string;
};

export type AnalysisTargetStatus = {
  kpiId: AnalysisTargetKpiId;
  label: string;
  currentValue: number;
  targetValue: number;
  deviation: number;
  direction: AnalysisTargetDirection;
  state: "on-track" | "behind" | "matched";
  formattedCurrent: string;
  formattedTarget: string;
  formattedDeviation: string;
  text: string;
};

export const analysisTargetMetrics: readonly AnalysisTargetMetric[] = [
  {
    id: "total-revenue",
    label: "Omsætning",
    subject: "Omsætningen",
    format: "currency",
    direction: "at-least",
    inputSuffix: "kr.",
  },
  {
    id: "result",
    label: "Resultat",
    subject: "Resultatet",
    format: "currency",
    direction: "at-least",
    inputSuffix: "kr.",
  },
  {
    id: "gross-margin",
    label: "Dækningsgrad",
    subject: "Dækningsgraden",
    format: "percent",
    direction: "at-least",
    inputSuffix: "%",
  },
  {
    id: "total-costs",
    label: "Omkostninger",
    subject: "Omkostningerne",
    format: "currency",
    direction: "at-most",
    inputSuffix: "kr.",
  },
  {
    id: "total-units",
    label: "Solgte enheder",
    subject: "Antallet af solgte enheder",
    format: "integer",
    direction: "at-least",
    inputSuffix: "enheder",
  },
] as const;

const targetMetricMap = new Map(analysisTargetMetrics.map((metric) => [metric.id, metric]));

const focusKpis: Record<AnalysisFocusArea, readonly string[]> = {
  sales: ["total-revenue", "revenue-growth", "total-units", "avg-revenue-unit"],
  profitability: ["result", "gross-profit", "gross-margin"],
  costs: ["total-costs", "result", "gross-margin"],
  products: ["best-product", "total-revenue", "total-units"],
  trends: ["revenue-growth", "best-month", "total-revenue"],
  changes: ["revenue-growth", "revenue-vs-budget", "result"],
};

const goalKpis: Record<AnalysisPrimaryGoal, readonly string[]> = {
  "grow-sales": ["total-revenue", "revenue-growth", "total-units"],
  "improve-profit": ["result", "gross-profit", "gross-margin"],
  "control-costs": ["total-costs", "result", "gross-margin"],
  "top-products": ["best-product", "total-revenue", "total-units"],
  "early-warning": ["revenue-growth", "revenue-vs-budget", "result", "total-costs"],
  overview: [],
};

const focusMetrics: Record<AnalysisFocusArea, readonly InsightMetricKey[]> = {
  sales: ["revenue", "units", "averagePrice"],
  profitability: ["result", "grossProfit", "grossMargin"],
  costs: ["cost", "costShare", "result"],
  products: ["revenue", "units", "grossProfit", "grossMargin"],
  trends: ["revenue", "grossProfit", "grossMargin", "cost", "units"],
  changes: ["revenue", "result", "grossProfit", "grossMargin", "cost", "units"],
};

const goalMetrics: Record<AnalysisPrimaryGoal, readonly InsightMetricKey[]> = {
  "grow-sales": ["revenue", "units", "averagePrice"],
  "improve-profit": ["result", "grossProfit", "grossMargin"],
  "control-costs": ["cost", "costShare", "result"],
  "top-products": ["revenue", "units", "grossProfit", "grossMargin"],
  "early-warning": ["revenue", "result", "cost", "grossMargin", "units"],
  overview: [],
};

const targetInsightMetrics: Record<AnalysisTargetKpiId, InsightMetricKey> = {
  "total-revenue": "revenue",
  result: "result",
  "gross-margin": "grossMargin",
  "total-costs": "cost",
  "total-units": "units",
};

const targetTopics: Record<AnalysisTargetKpiId, readonly AnalysisFocusArea[]> = {
  "total-revenue": ["sales"],
  result: ["profitability"],
  "gross-margin": ["profitability"],
  "total-costs": ["costs"],
  "total-units": ["sales", "products"],
};

const goalTopics: Record<AnalysisPrimaryGoal, readonly AnalysisFocusArea[]> = {
  "grow-sales": ["sales", "trends"],
  "improve-profit": ["profitability"],
  "control-costs": ["costs"],
  "top-products": ["products"],
  "early-warning": ["changes", "trends"],
  overview: [],
};

const targetTrendMetrics: Record<AnalysisTargetKpiId, readonly AnalysisOverviewTrendMetric[]> = {
  "total-revenue": ["revenue"],
  result: ["grossProfit", "cost", "revenue"],
  "gross-margin": ["grossProfit", "revenue"],
  "total-costs": ["cost"],
  "total-units": ["units", "revenue"],
};

const goalTrendMetrics: Record<AnalysisPrimaryGoal, readonly AnalysisOverviewTrendMetric[]> = {
  "grow-sales": ["revenue", "units"],
  "improve-profit": ["grossProfit", "cost", "revenue"],
  "control-costs": ["cost", "grossProfit", "revenue"],
  "top-products": ["units", "revenue"],
  "early-warning": ["revenue", "cost", "grossProfit", "units"],
  overview: ["revenue"],
};

const focusTrendMetrics: Record<AnalysisFocusArea, readonly AnalysisOverviewTrendMetric[]> = {
  sales: ["revenue", "units"],
  profitability: ["grossProfit", "cost", "revenue"],
  costs: ["cost", "grossProfit", "revenue"],
  products: ["units", "revenue"],
  trends: ["revenue", "grossProfit", "cost", "units"],
  changes: ["revenue", "cost", "grossProfit", "units"],
};

const targetOverviewPriorities: Record<AnalysisTargetKpiId, AnalysisOverviewPriority> = {
  "total-revenue": "sales",
  result: "profitability",
  "gross-margin": "profitability",
  "total-costs": "costs",
  "total-units": "products",
};

const goalOverviewPriorities: Record<AnalysisPrimaryGoal, AnalysisOverviewPriority | null> = {
  "grow-sales": "sales",
  "improve-profit": "profitability",
  "control-costs": "costs",
  "top-products": "products",
  "early-warning": "sales",
  overview: null,
};

const focusOverviewPriorities: Record<AnalysisFocusArea, AnalysisOverviewPriority> = {
  sales: "sales",
  profitability: "profitability",
  costs: "costs",
  products: "products",
  trends: "sales",
  changes: "sales",
};

const reportSectionTopics: Partial<Record<InsightReportSectionKey, readonly AnalysisFocusArea[]>> = {
  "central-metrics": ["sales", "profitability"],
  development: ["trends", "changes", "sales"],
  "positive-drivers": ["products", "sales", "profitability"],
  "negative-drivers": ["products", "changes", "costs"],
  "costs-profitability": ["costs", "profitability"],
  risks: ["changes", "costs"],
  opportunities: ["products", "sales", "profitability"],
  "recommended-focus": ["changes"],
};

export function createEmptyAnalysisPreferences(): AnalysisPreferences {
  return { focusAreas: [], primaryGoal: null, targets: [] };
}

export function hasAnalysisPreferences(preferences: AnalysisPreferences) {
  return Boolean(
    preferences.focusAreas.length
    || preferences.primaryGoal
    || preferences.targets.length,
  );
}

function topicPreferenceScore(topic: AnalysisFocusArea, preferences: AnalysisPreferences) {
  let score = 0;
  preferences.targets.forEach((target, index) => {
    if (targetTopics[target.kpiId].includes(topic)) score = Math.max(score, 300 - index);
  });
  if (preferences.primaryGoal) {
    const index = goalTopics[preferences.primaryGoal].indexOf(topic);
    if (index >= 0) score = Math.max(score, 200 - index);
  }
  const focusIndex = preferences.focusAreas.indexOf(topic);
  if (focusIndex >= 0) score = Math.max(score, 100 - focusIndex);
  return score;
}

function stablePrioritize<T>(
  items: readonly T[],
  score: (item: T) => number,
) {
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item);
}

export function preferredOverviewTrendMetric(
  preferences: AnalysisPreferences,
  availableMetrics: readonly AnalysisOverviewTrendMetric[],
) {
  if (!availableMetrics.length) return null;
  if (!hasAnalysisPreferences(preferences)) {
    return availableMetrics.includes("revenue") ? "revenue" : availableMetrics[0];
  }
  const candidates = [
    ...preferences.targets.flatMap((target) => targetTrendMetrics[target.kpiId]),
    ...(preferences.primaryGoal ? goalTrendMetrics[preferences.primaryGoal] : []),
    ...preferences.focusAreas.flatMap((focusArea) => focusTrendMetrics[focusArea]),
  ];
  return candidates.find((metric) => availableMetrics.includes(metric))
    ?? (availableMetrics.includes("revenue") ? "revenue" : availableMetrics[0]);
}

export function preferredOverviewAnalysis(
  preferences: AnalysisPreferences,
  availablePriorities: readonly AnalysisOverviewPriority[],
) {
  if (!availablePriorities.length) return null;
  if (!hasAnalysisPreferences(preferences)) return availablePriorities[0];
  const candidates = [
    ...preferences.targets.map((target) => targetOverviewPriorities[target.kpiId]),
    ...(preferences.primaryGoal && goalOverviewPriorities[preferences.primaryGoal]
      ? [goalOverviewPriorities[preferences.primaryGoal]]
      : []),
    ...preferences.focusAreas.map((focusArea) => focusOverviewPriorities[focusArea]),
  ];
  return candidates.find((priority): priority is AnalysisOverviewPriority => (
    priority !== null && availablePriorities.includes(priority)
  )) ?? availablePriorities[0];
}

export function prioritizeOverviewSupportingInsights(
  insights: readonly AnalysisSupportingInsight[],
  preferences: AnalysisPreferences,
) {
  if (!hasAnalysisPreferences(preferences)) return insights.map((insight) => insight.text);
  return stablePrioritize(insights, (insight) => insight.topics.reduce(
    (maximum, topic) => Math.max(maximum, topicPreferenceScore(topic, preferences)),
    0,
  )).map((insight) => insight.text);
}

export function toggleAnalysisFocusArea(
  selected: readonly AnalysisFocusArea[],
  focusArea: AnalysisFocusArea,
  maximum = 2,
) {
  if (selected.includes(focusArea)) return selected.filter((item) => item !== focusArea);
  if (selected.length >= maximum) return [...selected];
  return [...selected, focusArea];
}

export function availableAnalysisTargetMetrics(
  evaluations: Readonly<Record<string, Pick<KpiEvaluation, "available" | "value"> | undefined>>,
) {
  return analysisTargetMetrics.filter((metric) => {
    const evaluation = evaluations[metric.id];
    return evaluation?.available
      && typeof evaluation.value === "number"
      && Number.isFinite(evaluation.value);
  });
}

export function parseAnalysisTargetInput(input: string, metricId: AnalysisTargetKpiId) {
  const metric = targetMetricMap.get(metricId);
  if (!metric) return null;
  const cleaned = input
    .trim()
    .replace(/\s|\u00a0/gu, "")
    .replace(/kr\.?|%|enheder?/giu, "");
  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./gu, "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/u.test(cleaned)
      ? cleaned.replace(/\./gu, "")
      : cleaned;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (metric.format === "integer" && !Number.isInteger(parsed)) return null;
  if (metric.format === "percent" && parsed > 100) return null;
  return metric.format === "percent" ? parsed / 100 : parsed;
}

export function preferredAnalysisKpiIds(preferences: AnalysisPreferences) {
  if (!hasAnalysisPreferences(preferences)) return [];
  const ids = [
    ...preferences.targets.map((target) => target.kpiId),
    ...(preferences.primaryGoal ? goalKpis[preferences.primaryGoal] : []),
    ...preferences.focusAreas.flatMap((focusArea) => focusKpis[focusArea]),
  ];
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

export function prioritizeKpiConfiguration(
  configuration: KpiConfiguration,
  preferences: AnalysisPreferences,
  availableIds: ReadonlySet<string>,
): KpiConfiguration {
  if (!hasAnalysisPreferences(preferences)) return configuration;
  const preferred = preferredAnalysisKpiIds(preferences).filter((id) => availableIds.has(id));
  const combined = [
    ...preferred,
    ...configuration.primaryKpis,
    ...configuration.secondaryKpis,
  ].filter((id, index, ids) => availableIds.has(id) && ids.indexOf(id) === index);
  const primaryCount = configuration.primaryKpis.length;
  const primaryKpis = combined.slice(0, primaryCount);
  const secondaryKpis = combined
    .slice(primaryCount)
    .filter((id) => !primaryKpis.includes(id))
    .slice(0, configuration.secondaryKpis.length);

  return { ...configuration, primaryKpis, secondaryKpis };
}

function formatTargetValue(metric: AnalysisTargetMetric, value: number) {
  if (metric.format === "currency") return formatDanishCurrency(value);
  if (metric.format === "percent") return formatDanishPercent(value);
  return formatDanishNumber(value);
}

function withoutTrailingPeriod(value: string) {
  return value.replace(/\.$/u, "");
}

function asSentence(value: string) {
  return /[.!?]$/u.test(value) ? value : `${value}.`;
}

function formatDeviation(metric: AnalysisTargetMetric, value: number) {
  if (metric.format === "percent") {
    return `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(Math.abs(value) * 100)} procentpoint`;
  }
  return formatTargetValue(metric, Math.abs(value));
}

export function buildAnalysisTargetStatuses(
  preferences: AnalysisPreferences,
  evaluations: Readonly<Record<string, Pick<KpiEvaluation, "available" | "value"> | undefined>>,
): AnalysisTargetStatus[] {
  const statuses = preferences.targets.flatMap<AnalysisTargetStatus>((target) => {
    const metric = targetMetricMap.get(target.kpiId);
    const evaluation = evaluations[target.kpiId];
    if (!metric || !evaluation?.available || typeof evaluation.value !== "number" || !Number.isFinite(evaluation.value)) {
      return [];
    }
    const currentValue = evaluation.value;
    const deviation = currentValue - target.value;
    const tolerance = metric.format === "percent" ? 0.000_000_1 : 0.000_001;
    const matched = Math.abs(deviation) <= tolerance;
    const onTrack = matched || (target.direction === "at-least" ? deviation > 0 : deviation < 0);
    const formattedCurrent = formatTargetValue(metric, currentValue);
    const formattedTarget = formatTargetValue(metric, target.value);
    const formattedDeviation = formatDeviation(metric, deviation);
    const targetNoun = target.direction === "at-most" ? "din grænse" : "dit mål";
    const text = asSentence(matched
      ? `${metric.subject} er ${withoutTrailingPeriod(formattedCurrent)} og matcher ${targetNoun} på ${formattedTarget}`
      : `${metric.subject} er ${withoutTrailingPeriod(formattedCurrent)}, hvilket er ${withoutTrailingPeriod(formattedDeviation)} ${deviation > 0 ? "over" : "under"} ${targetNoun} på ${formattedTarget}`);

    return [{
      kpiId: target.kpiId,
      label: metric.label,
      currentValue,
      targetValue: target.value,
      deviation,
      direction: target.direction,
      state: matched ? "matched" : onTrack ? "on-track" : "behind",
      formattedCurrent,
      formattedTarget,
      formattedDeviation,
      text,
    }];
  });
  const statePriority: Record<AnalysisTargetStatus["state"], number> = {
    behind: 2,
    matched: 1,
    "on-track": 0,
  };
  return stablePrioritize(statuses, (status) => statePriority[status.state]);
}

export function addTargetsToExecutiveSummary(
  sections: readonly InsightReportSection[],
  targetStatuses: readonly AnalysisTargetStatus[],
) {
  if (!targetStatuses.length) return [...sections];
  const targetSummary = `Målstatus ud fra dine egne mål: ${targetStatuses.map((status) => status.text).join(" ")}`;
  return sections.map((section) => section.key === "executive-summary"
    ? { ...section, paragraphs: [targetSummary, ...section.paragraphs] }
    : section);
}

function metricPreferenceScore(metric: InsightMetricKey | null, preferences: AnalysisPreferences) {
  if (!metric) return 0;
  let score = 0;
  preferences.targets.forEach((target, index) => {
    if (targetInsightMetrics[target.kpiId] === metric) score = Math.max(score, 300 - index);
  });
  if (preferences.primaryGoal) {
    const index = goalMetrics[preferences.primaryGoal].indexOf(metric);
    if (index >= 0) score = Math.max(score, 200 - index);
  }
  preferences.focusAreas.forEach((focusArea, focusIndex) => {
    const index = focusMetrics[focusArea].indexOf(metric);
    if (index >= 0) score = Math.max(score, 100 - focusIndex * 10 - index);
  });
  return score;
}

function dimensionPreferenceScore(dimension: InsightDimension | null, preferences: AnalysisPreferences) {
  if (dimension !== "product" && dimension !== "category") return 0;
  if (!preferences.focusAreas.includes("products") && preferences.primaryGoal !== "top-products") return 0;
  return dimension === "product" ? 140 : 110;
}

function reorderSectionByEvidence(
  section: InsightReportSection,
  orderedEvidenceIds: readonly string[],
) {
  if (section.paragraphs.length !== section.evidenceIds.length) return section;
  const order = new Map(orderedEvidenceIds.map((id, index) => [id, index]));
  if (!section.evidenceIds.every((id) => order.has(id))) return section;
  const entries = section.paragraphs.map((paragraph, index) => ({
    paragraph,
    evidenceId: section.evidenceIds[index],
    originalIndex: index,
  })).sort((left, right) => (
    (order.get(left.evidenceId) ?? left.originalIndex)
    - (order.get(right.evidenceId) ?? right.originalIndex)
  ));
  return {
    ...section,
    paragraphs: entries.map((entry) => entry.paragraph),
    evidenceIds: entries.map((entry) => entry.evidenceId),
  };
}

export function prioritizeInsightAnalysis(
  analysis: InsightAnalysis,
  preferences: AnalysisPreferences,
): InsightAnalysis {
  if (!hasAnalysisPreferences(preferences)) return analysis;
  const evidenceById = new Map(analysis.evidence.map((evidence) => [evidence.id, evidence]));
  const evidenceScore = (evidenceIds: readonly string[]) => evidenceIds.reduce((maximum, evidenceId) => {
    const evidence = evidenceById.get(evidenceId);
    return Math.max(
      maximum,
      metricPreferenceScore(evidence?.metric ?? null, preferences)
        + dimensionPreferenceScore(evidence?.dimension ?? null, preferences),
    );
  }, 0);
  const scoreMetric = (metric: InsightMetricKey, dimension: InsightDimension | null = null) => (
    metricPreferenceScore(metric, preferences) + dimensionPreferenceScore(dimension, preferences)
  );
  const snapshot = stablePrioritize(analysis.snapshot, (item) => scoreMetric(item.metric));
  const changes = stablePrioritize(analysis.changes, (item) => scoreMetric(item.metric));
  const driverAnalyses = stablePrioritize(analysis.driverAnalyses, (item) => (
    scoreMetric(item.metric, item.dimension)
  ));
  const alignedSections = analysis.report.sections.map((section) => {
    if (section.key === "central-metrics") {
      return reorderSectionByEvidence(section, snapshot.map((item) => item.evidenceId));
    }
    if (section.key === "development") {
      return reorderSectionByEvidence(section, changes.map((item) => item.evidenceId));
    }
    return section;
  });
  const sections = stablePrioritize(alignedSections, (section) => {
    if (section.key === "executive-summary") return 10_000;
    if (section.key === "data-basis") return -10_000;
    const topicScore = (reportSectionTopics[section.key] ?? []).reduce(
      (maximum, topic) => Math.max(maximum, topicPreferenceScore(topic, preferences)),
      0,
    );
    return topicScore + evidenceScore(section.evidenceIds);
  });

  return {
    ...analysis,
    snapshot,
    changes,
    driverAnalyses,
    observations: [...analysis.observations].sort((left, right) => (
      evidenceScore(right.evidenceIds) - evidenceScore(left.evidenceIds)
      || right.priority - left.priority
      || left.id.localeCompare(right.id, "da-DK")
    )),
    recommendations: [...analysis.recommendations].sort((left, right) => (
      evidenceScore(right.evidenceIds) - evidenceScore(left.evidenceIds)
      || left.id.localeCompare(right.id, "da-DK")
    )),
    report: { ...analysis.report, sections },
  };
}

function findingPreferenceScore(finding: StrategicFinding, preferences: AnalysisPreferences) {
  return metricPreferenceScore(finding.metric, preferences)
    + dimensionPreferenceScore(finding.dimension, preferences);
}

export function prioritizeStrategicAnalysis(
  strategy: StrategicAnalysis,
  preferences: AnalysisPreferences,
): StrategicAnalysis {
  if (!hasAnalysisPreferences(preferences)) return strategy;
  const sortFindings = (items: readonly StrategicFinding[]) => [...items].sort((left, right) => (
    findingPreferenceScore(right, preferences) - findingPreferenceScore(left, preferences)
    || right.priority - left.priority
    || left.id.localeCompare(right.id, "da-DK")
  ));
  const findings = sortFindings(strategy.findings);
  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const tows = [...strategy.tows].sort((left, right) => {
    const score = (ids: readonly string[]) => ids.reduce((maximum, id) => {
      const finding = findingById.get(id);
      return Math.max(maximum, finding ? findingPreferenceScore(finding, preferences) : 0);
    }, 0);
    return score(right.sourceFindingIds) - score(left.sourceFindingIds)
      || right.priority - left.priority
      || left.id.localeCompare(right.id, "da-DK");
  });
  const findingsByQuadrant = {
    strength: sortFindings(strategy.findingsByQuadrant.strength),
    weakness: sortFindings(strategy.findingsByQuadrant.weakness),
    opportunity: sortFindings(strategy.findingsByQuadrant.opportunity),
    threat: sortFindings(strategy.findingsByQuadrant.threat),
  };

  return {
    ...strategy,
    findings,
    findingsByQuadrant,
    tows,
    reportSummary: {
      quadrants: {
        strength: findingsByQuadrant.strength.slice(0, 2).map((finding) => ({
          findingId: finding.id,
          title: finding.title,
          description: finding.description,
          evidenceIds: finding.evidenceIds,
        })),
        weakness: findingsByQuadrant.weakness.slice(0, 2).map((finding) => ({
          findingId: finding.id,
          title: finding.title,
          description: finding.description,
          evidenceIds: finding.evidenceIds,
        })),
        opportunity: findingsByQuadrant.opportunity.slice(0, 2).map((finding) => ({
          findingId: finding.id,
          title: finding.title,
          description: finding.description,
          evidenceIds: finding.evidenceIds,
        })),
        threat: findingsByQuadrant.threat.slice(0, 2).map((finding) => ({
          findingId: finding.id,
          title: finding.title,
          description: finding.description,
          evidenceIds: finding.evidenceIds,
        })),
      },
      strategicFocus: tows.slice(0, 3),
    },
  };
}
