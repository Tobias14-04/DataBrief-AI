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
  return preferences.targets.flatMap((target) => {
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
  if (dimension !== "product") return 0;
  return preferences.focusAreas.includes("products") || preferences.primaryGoal === "top-products" ? 120 : 0;
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

  return {
    ...analysis,
    observations: [...analysis.observations].sort((left, right) => (
      evidenceScore(right.evidenceIds) - evidenceScore(left.evidenceIds)
      || right.priority - left.priority
      || left.id.localeCompare(right.id, "da-DK")
    )),
    recommendations: [...analysis.recommendations].sort((left, right) => (
      evidenceScore(right.evidenceIds) - evidenceScore(left.evidenceIds)
      || left.id.localeCompare(right.id, "da-DK")
    )),
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
