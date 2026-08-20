import {
  formatDanishCurrency,
  formatDanishNumber,
  formatDanishPercent,
} from "./dashboard-insights.ts";
import { normalizeForComparison } from "./data-labels.ts";
import type {
  InsightAnalysis,
  InsightDimension,
  InsightDriver,
  InsightDriverAnalysis,
  InsightEvidence,
  InsightMetricChange,
  InsightMetricKey,
  InsightReliability,
} from "./insight-engine.ts";

export type StrategicQuadrant = "strength" | "weakness" | "opportunity" | "threat";
export type TowsType = "so" | "st" | "wo" | "wt";

export type StrategicFinding = {
  id: string;
  quadrant: StrategicQuadrant;
  title: string;
  description: string;
  evidenceIds: string[];
  metric: InsightMetricKey | null;
  dimension: InsightDimension | null;
  dimensionValue: string | null;
  value: number | null;
  comparisonValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  percentagePointChange: number | null;
  economicImpact: number;
  confidence: InsightReliability;
  reliability: InsightReliability;
  priority: number;
  sampleSize: number;
  supportingFacts: string[];
};

export type TowsRecommendation = {
  id: string;
  type: TowsType;
  title: string;
  text: string;
  sourceFindingIds: string[];
  evidenceIds: string[];
  priority: number;
};

export type StrategicReportSummary = {
  quadrants: Record<StrategicQuadrant, Array<{
    findingId: string;
    title: string;
    description: string;
    evidenceIds: string[];
  }>>;
  strategicFocus: TowsRecommendation[];
};

export type StrategicAnalysis = {
  findings: StrategicFinding[];
  findingsByQuadrant: Record<StrategicQuadrant, StrategicFinding[]>;
  tows: TowsRecommendation[];
  reportSummary: StrategicReportSummary;
  externalContextNotice: string;
  dataBasis: InsightAnalysis["dataBasis"] & {
    reliability: InsightReliability;
    evidenceCount: number;
    strategyScopeMode: "latest-comparison" | "latest-period" | "selected-period" | "all-filtered-periods";
  };
};

const QUADRANTS: StrategicQuadrant[] = ["strength", "weakness", "opportunity", "threat"];
const MAX_FINDINGS_PER_QUADRANT = 5;
const MAX_TOWS_PER_TYPE = 2;
const MINIMUM_ECONOMIC_SHARE = 0.005;
const LOW_INTERNAL_SHARE = 0.35;
const HIGH_CONCENTRATION_SHARE = 0.5;
const MINIMUM_MARGIN_ADVANTAGE = 0.02;

const metricLabels: Record<InsightMetricKey, string> = {
  revenue: "omsætning",
  units: "solgte enheder",
  averagePrice: "gennemsnitspris",
  grossProfit: "dækningsbidrag",
  grossMargin: "dækningsgrad",
  cost: "omkostninger",
  result: "resultat",
  costShare: "omkostningsandel",
};

const reliabilityRank: Record<InsightReliability, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeRatio(numerator: number, denominator: number) {
  if (!finite(numerator) || !finite(denominator) || denominator === 0) return null;
  const value = numerator / denominator;
  return finite(value) ? value : null;
}

function stableId(...parts: string[]) {
  return parts.map((part) => {
    const value = part.normalize("NFC");
    return `${value.length}.${encodeURIComponent(value)}`;
  }).join(":");
}

function lowerFirst(value: string) {
  return value
    ? `${value.charAt(0).toLocaleLowerCase("da-DK")}${value.slice(1).replace(/[.!?]+$/u, "")}`
    : value;
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

function metricAtSentenceEnd(metric: InsightMetricKey, value: number) {
  return formatMetric(metric, value).replace(/\.$/u, "");
}

function changeVerb(change: number) {
  return change > 0 ? "steg" : change < 0 ? "faldt" : "var uændret";
}

function changeMagnitude(change: InsightMetricChange) {
  if (change.percentagePointChange !== null) {
    return `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 })
      .format(Math.abs(change.percentagePointChange) * 100)} procentpoint`;
  }
  if (change.percentageChange !== null) return formatDanishPercent(Math.abs(change.percentageChange));
  return formatMetric(change.metric, Math.abs(change.absoluteChange));
}

function strongerReliability(left: InsightReliability, right: InsightReliability) {
  return reliabilityRank[left] <= reliabilityRank[right] ? left : right;
}

function relevant(impact: number, baseline: number) {
  return finite(impact)
    && impact > 0
    && impact >= Math.max(1, Math.abs(baseline) * MINIMUM_ECONOMIC_SHARE);
}

function evidenceFacts(evidenceById: ReadonlyMap<string, InsightEvidence>, ids: readonly string[]) {
  return Array.from(new Set(ids.flatMap((id) => evidenceById.get(id)?.supportingFacts ?? []))).slice(0, 6);
}

function changeImpact(change: InsightMetricChange, changes: readonly InsightMetricChange[]) {
  const companion = (metric: InsightMetricKey) => changes.find((item) => item.metric === metric);
  if (change.metric === "grossMargin" || change.metric === "costShare") {
    const revenue = companion("revenue");
    return Math.abs(change.absoluteChange) * Math.max(
      Math.abs(revenue?.value ?? 0),
      Math.abs(revenue?.previousValue ?? 0),
      1,
    );
  }
  if (change.metric === "units") {
    const averagePrice = companion("averagePrice");
    return Math.abs(change.absoluteChange) * Math.max(Math.abs(averagePrice?.value ?? 0), 1);
  }
  if (change.metric === "averagePrice") {
    const units = companion("units");
    return Math.abs(change.absoluteChange) * Math.max(Math.abs(units?.value ?? 0), 1);
  }
  return Math.abs(change.absoluteChange);
}

function changeBaseline(change: InsightMetricChange, changes: readonly InsightMetricChange[]) {
  const revenue = changes.find((item) => item.metric === "revenue");
  if (change.metric === "grossMargin" || change.metric === "costShare") {
    return Math.max(Math.abs(revenue?.value ?? 0), Math.abs(revenue?.previousValue ?? 0), 1);
  }
  if (change.metric === "units" || change.metric === "averagePrice") {
    return revenue
      ? Math.max(Math.abs(revenue.value), Math.abs(revenue.previousValue), 1)
      : Math.max(Math.abs(change.value), Math.abs(change.previousValue), 1);
  }
  return Math.max(Math.abs(change.value), Math.abs(change.previousValue), 1);
}

function findingPriority(impact: number, confidence: InsightReliability, strategicRelevance: number) {
  const reliabilityWeight = confidence === "high" ? 1 : confidence === "medium" ? 0.85 : 0.6;
  return impact * reliabilityWeight + strategicRelevance / 1_000;
}

type FindingInput = Omit<StrategicFinding, "priority" | "reliability" | "supportingFacts"> & {
  strategicRelevance: number;
  supportingFacts?: string[];
};

function createFinding(input: FindingInput): StrategicFinding | null {
  if (input.confidence === "low" || !finite(input.sampleSize) || input.sampleSize < 2) return null;
  if (!finite(input.economicImpact) || input.economicImpact <= 0) return null;
  if (!input.evidenceIds.length) return null;
  const numericValues = [
    input.value,
    input.comparisonValue,
    input.absoluteChange,
    input.percentageChange,
    input.percentagePointChange,
  ];
  if (numericValues.some((value) => value !== null && !finite(value))) return null;
  const { strategicRelevance, supportingFacts, ...finding } = input;
  return {
    ...finding,
    evidenceIds: Array.from(new Set(input.evidenceIds)),
    reliability: input.confidence,
    priority: findingPriority(input.economicImpact, input.confidence, strategicRelevance),
    supportingFacts: Array.from(new Set(supportingFacts ?? [])).slice(0, 6),
  };
}

function compareFindings(left: StrategicFinding, right: StrategicFinding) {
  return right.economicImpact - left.economicImpact
    || reliabilityRank[right.confidence] - reliabilityRank[left.confidence]
    || right.priority - left.priority
    || left.id.localeCompare(right.id, "da-DK");
}

function uniqueFindings(items: StrategicFinding[]) {
  const seenClaims = new Set<string>();
  return items.filter((item) => {
    const claimKey = normalizeForComparison(`${item.title}|${item.description}`);
    if (seenClaims.has(claimKey)) return false;
    seenClaims.add(claimKey);
    return true;
  });
}

function sharesEvidence(left: StrategicFinding, right: StrategicFinding) {
  const leftEvidence = new Set(left.evidenceIds);
  return right.evidenceIds.some((evidenceId) => leftEvidence.has(evidenceId));
}

function sharesLineage(
  left: StrategicFinding,
  right: StrategicFinding,
  evidenceById: ReadonlyMap<string, InsightEvidence>,
) {
  if (sharesEvidence(left, right)) return true;
  if (!left.metric || left.metric !== right.metric) return false;
  const evidenceTypes = (finding: StrategicFinding) => new Set(
    finding.evidenceIds.map((id) => evidenceById.get(id)?.type).filter(Boolean),
  );
  const leftTypes = evidenceTypes(left);
  const rightTypes = evidenceTypes(right);
  return (leftTypes.has("change") && rightTypes.has("driver"))
    || (leftTypes.has("driver") && rightTypes.has("change"));
}

function driverImpact(
  driver: InsightDriver,
  analysis: InsightDriverAnalysis,
  allAnalyses: readonly InsightDriverAnalysis[],
) {
  if (analysis.metric === "units") {
    const revenueAnalysis = allAnalyses.find((item) => (
      item.metric === "revenue" && item.dimension === analysis.dimension
    ));
    const revenueDriver = revenueAnalysis
      ? [...revenueAnalysis.positiveDrivers, ...revenueAnalysis.negativeDrivers]
          .find((item) => normalizeForComparison(item.dimensionValue) === normalizeForComparison(driver.dimensionValue))
      : null;
    const averagePrice = revenueDriver && driver.currentValue !== 0
      ? safeRatio(revenueDriver.currentValue, driver.currentValue)
      : null;
    return Math.abs(driver.absoluteChange) * Math.max(Math.abs(averagePrice ?? 0), 1);
  }
  return Math.abs(driver.absoluteChange);
}

function driverIsFavorable(metric: InsightMetricKey, absoluteChange: number) {
  if (metric === "cost") return absoluteChange < 0;
  return absoluteChange > 0;
}

const driverMovementLabels: Record<InsightMetricKey, { higher: string; lower: string }> = {
  revenue: { higher: "højere omsætning", lower: "lavere omsætning" },
  units: { higher: "større salgsvolumen", lower: "lavere salgsvolumen" },
  averagePrice: { higher: "højere gennemsnitspris", lower: "lavere gennemsnitspris" },
  grossProfit: { higher: "højere dækningsbidrag", lower: "lavere dækningsbidrag" },
  grossMargin: { higher: "højere dækningsgrad", lower: "lavere dækningsgrad" },
  cost: { higher: "højere omkostninger", lower: "lavere omkostninger" },
  result: { higher: "højere resultat", lower: "lavere resultat" },
  costShare: { higher: "højere omkostningsandel", lower: "lavere omkostningsandel" },
};

function driverMovementTitle(metric: InsightMetricKey, dimensionValue: string, absoluteChange: number) {
  const movement = absoluteChange > 0
    ? driverMovementLabels[metric].higher
    : driverMovementLabels[metric].lower;
  return `${dimensionValue} bidrog til ${movement}`;
}

function changeTitle(metric: InsightMetricKey, favorable: boolean) {
  const favorableTitles: Record<InsightMetricKey, string> = {
    revenue: "Stigende omsætning",
    units: "Stigende salgsvolumen",
    averagePrice: "Stigende gennemsnitspris",
    grossProfit: "Stigende dækningsbidrag",
    grossMargin: "Forbedret dækningsgrad",
    cost: "Lavere omkostninger",
    result: "Stigende resultat",
    costShare: "Lavere omkostningsandel",
  };
  const adverseTitles: Record<InsightMetricKey, string> = {
    revenue: "Faldende omsætning",
    units: "Faldende salgsvolumen",
    averagePrice: "Faldende gennemsnitspris",
    grossProfit: "Faldende dækningsbidrag",
    grossMargin: "Pres på dækningsgraden",
    cost: "Stigende omkostninger",
    result: "Faldende resultat",
    costShare: "Stigende omkostningsandel",
  };
  return (favorable ? favorableTitles : adverseTitles)[metric];
}

function strategicChangeMetrics(metric: InsightMetricKey) {
  return metric !== "averagePrice";
}

function buildTows(
  findingsByQuadrant: Record<StrategicQuadrant, StrategicFinding[]>,
  evidenceById: ReadonlyMap<string, InsightEvidence>,
) {
  const configurations: Array<{
    type: TowsType;
    left: StrategicQuadrant;
    right: StrategicQuadrant;
    title: string;
    text: (left: StrategicFinding, right: StrategicFinding) => string;
  }> = [
    {
      type: "so",
      left: "strength",
      right: "opportunity",
      title: "Styrke og mulighed i sammenhæng",
      text: (strength, opportunity) => `Undersøg, om ${lowerFirst(opportunity.title)} kan udvikles med afsæt i ${lowerFirst(strength.title)}.`,
    },
    {
      type: "st",
      left: "strength",
      right: "threat",
      title: "Styrke med tilknyttet risiko",
      text: (strength, threat) => `Følg udviklingen i ${lowerFirst(threat.title)} tæt, og vurder den i sammenhæng med ${lowerFirst(strength.title)}.`,
    },
    {
      type: "wo",
      left: "weakness",
      right: "opportunity",
      title: "Mulighed over for svaghed",
      text: (weakness, opportunity) => `Undersøg, om ${lowerFirst(opportunity.title)} kan belyse ${lowerFirst(weakness.title)}.`,
    },
    {
      type: "wt",
      left: "weakness",
      right: "threat",
      title: "Kombineret intern eksponering",
      text: (weakness, threat) => `Prioritér analyse af ${lowerFirst(weakness.title)} sammen med ${lowerFirst(threat.title)}, så den kombinerede interne eksponering kan vurderes.`,
    },
  ];
  const proposals: TowsRecommendation[] = [];
  const seenEvidencePairs = new Set<string>();
  const seenTitlePairs = new Set<string>();

  for (const configuration of configurations) {
    const combinations = findingsByQuadrant[configuration.left].flatMap((left) => (
      findingsByQuadrant[configuration.right]
        .filter((right) => !sharesLineage(left, right, evidenceById))
        .map((right) => ({
          left,
          right,
          sameSubject: Boolean(
            left.dimensionValue
            && right.dimensionValue
            && normalizeForComparison(left.dimensionValue) === normalizeForComparison(right.dimensionValue),
          ),
        }))
    ));
    combinations.sort((left, right) => (
      Number(right.sameSubject) - Number(left.sameSubject)
      || (right.left.economicImpact + right.right.economicImpact)
        - (left.left.economicImpact + left.right.economicImpact)
      || left.left.id.localeCompare(right.left.id, "da-DK")
      || left.right.id.localeCompare(right.right.id, "da-DK")
    ));

    let addedForType = 0;
    for (const combination of combinations) {
      if (addedForType >= MAX_TOWS_PER_TYPE) break;
      const sourceFindingIds = [combination.left.id, combination.right.id];
      const evidenceIds = Array.from(new Set([
        ...combination.left.evidenceIds,
        ...combination.right.evidenceIds,
      ]));
      const evidencePairKey = [...evidenceIds].sort().join("|");
      const titlePairKey = [combination.left.title, combination.right.title]
        .map(normalizeForComparison)
        .sort()
        .join("|");
      if (seenEvidencePairs.has(evidencePairKey) || seenTitlePairs.has(titlePairKey)) continue;
      seenEvidencePairs.add(evidencePairKey);
      seenTitlePairs.add(titlePairKey);
      proposals.push({
        id: stableId("tows", configuration.type, ...sourceFindingIds),
        type: configuration.type,
        title: configuration.title,
        text: configuration.text(combination.left, combination.right),
        sourceFindingIds,
        evidenceIds,
        priority: combination.left.priority + combination.right.priority + (combination.sameSubject ? 1 : 0),
      });
      addedForType += 1;
    }
  }
  const seenTexts = new Set<string>();
  return proposals
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id, "da-DK"))
    .filter((proposal) => {
      const textKey = normalizeForComparison(proposal.text);
      if (seenTexts.has(textKey)) return false;
      seenTexts.add(textKey);
      return true;
    });
}

export function buildStrategicAnalysis(analysis: InsightAnalysis): StrategicAnalysis {
  const evidenceById = new Map(analysis.evidence.map((item) => [item.id, item]));
  const usesLatestPeriodScope = analysis.dataBasis.scopeMode === "all-filtered-periods"
    && Boolean(analysis.currentPeriod)
    && Boolean(
      analysis.currentPeriod
      && (
        analysis.dataBasis.periodCount > 1
        || analysis.currentPeriod.rowCount !== analysis.dataBasis.rowCount
      )
    );
  const usesLatestComparisonScope = usesLatestPeriodScope
    && analysis.dataBasis.hasComparison
    && Boolean(analysis.comparisonPeriod);
  const candidates: Record<StrategicQuadrant, StrategicFinding[]> = {
    strength: [],
    weakness: [],
    opportunity: [],
    threat: [],
  };
  const candidateIds = new Set<string>();

  function add(input: FindingInput) {
    if (!input.evidenceIds.every((id) => evidenceById.has(id))) return;
    const finding = createFinding({
      ...input,
      supportingFacts: input.supportingFacts?.length
        ? input.supportingFacts
        : evidenceFacts(evidenceById, input.evidenceIds),
    });
    if (!finding || candidateIds.has(finding.id)) return;
    candidateIds.add(finding.id);
    candidates[finding.quadrant].push(finding);
  }

  for (const change of analysis.changes) {
    if (!strategicChangeMetrics(change.metric) || change.absoluteChange === 0) continue;
    const evidence = evidenceById.get(change.evidenceId);
    if (!evidence || change.reliability === "low") continue;
    const impact = changeImpact(change, analysis.changes);
    const baseline = changeBaseline(change, analysis.changes);
    if (!relevant(impact, baseline)) continue;
    const favorable = change.tone === "positive";
    const quadrant: StrategicQuadrant = favorable ? "strength" : "weakness";
    const title = changeTitle(change.metric, favorable);
    const description = `${change.label} ${changeVerb(change.absoluteChange)} ${changeMagnitude(change)} i ${change.comparisonLabel}.`;
    add({
      id: stableId("strategy", quadrant, change.evidenceId),
      quadrant,
      title,
      description,
      evidenceIds: [change.evidenceId],
      metric: change.metric,
      dimension: null,
      dimensionValue: null,
      value: change.value,
      comparisonValue: change.previousValue,
      absoluteChange: change.absoluteChange,
      percentageChange: change.percentageChange,
      percentagePointChange: change.percentagePointChange,
      economicImpact: impact,
      confidence: change.reliability,
      sampleSize: evidence.sampleSize,
      strategicRelevance: change.metric === "result" || change.metric === "grossMargin" ? 5 : 4,
    });

    if (!favorable && ["revenue", "units", "grossProfit", "grossMargin", "cost", "result", "costShare"].includes(change.metric)) {
      add({
        id: stableId("strategy", "threat", change.evidenceId),
        quadrant: "threat",
        title: change.metric === "grossMargin" ? "Dokumenteret marginpres" : `${title} øger den interne eksponering`,
        description: `${description} Følg udviklingen, hvis mønsteret fortsætter i de registrerede perioder.`,
        evidenceIds: [change.evidenceId],
        metric: change.metric,
        dimension: null,
        dimensionValue: null,
        value: change.value,
        comparisonValue: change.previousValue,
        absoluteChange: change.absoluteChange,
        percentageChange: change.percentageChange,
        percentagePointChange: change.percentagePointChange,
        economicImpact: impact,
        confidence: change.reliability,
        sampleSize: evidence.sampleSize,
        strategicRelevance: 4,
      });
    }
  }

  const revenueChange = analysis.changes.find((item) => item.metric === "revenue");
  const costChange = analysis.changes.find((item) => item.metric === "cost");
  if (
    revenueChange?.percentageChange !== null
    && revenueChange?.percentageChange !== undefined
    && costChange?.percentageChange !== null
    && costChange?.percentageChange !== undefined
    && costChange.percentageChange - revenueChange.percentageChange >= 0.005
  ) {
    const evidenceIds = [costChange.evidenceId, revenueChange.evidenceId];
    const confidence = strongerReliability(costChange.reliability, revenueChange.reliability);
    const impact = Math.max(changeImpact(costChange, analysis.changes), changeImpact(revenueChange, analysis.changes));
    const difference = costChange.percentageChange - revenueChange.percentageChange;
    const sampleSize = Math.min(
      evidenceById.get(costChange.evidenceId)?.sampleSize ?? 0,
      evidenceById.get(revenueChange.evidenceId)?.sampleSize ?? 0,
    );
    add({
      id: stableId("strategy", "threat", "cost-outpaces-revenue", ...evidenceIds),
      quadrant: "threat",
      title: "Omkostninger udvikler sig hurtigere end omsætningen",
      description: `Omkostningsudviklingen lå ${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(difference * 100)} procentpoint over omsætningsudviklingen. Følg relationen i de næste registrerede perioder.`,
      evidenceIds,
      metric: "cost",
      dimension: null,
      dimensionValue: null,
      value: costChange.value,
      comparisonValue: costChange.previousValue,
      absoluteChange: costChange.absoluteChange,
      percentageChange: costChange.percentageChange,
      percentagePointChange: null,
      economicImpact: impact,
      confidence,
      sampleSize,
      strategicRelevance: 6,
    });
  }

  for (const driverAnalysis of analysis.driverAnalyses) {
    const analysisEvidence = evidenceById.get(driverAnalysis.evidenceId);
    for (const driver of [...driverAnalysis.positiveDrivers, ...driverAnalysis.negativeDrivers]) {
      const evidence = evidenceById.get(driver.evidenceId);
      if (!evidence || driver.reliability === "low") continue;
      const impact = driverImpact(driver, driverAnalysis, analysis.driverAnalyses);
      const baselineAnalysis = driverAnalysis.metric === "units"
        ? analysis.driverAnalyses.find((item) => (
            item.metric === "revenue" && item.dimension === driverAnalysis.dimension
          )) ?? driverAnalysis
        : driverAnalysis;
      const baseline = Math.max(
        Math.abs(baselineAnalysis?.currentValue ?? 0),
        Math.abs(baselineAnalysis?.previousValue ?? 0),
        1,
      );
      if (!relevant(impact, baseline)) continue;
      const favorable = driverIsFavorable(driverAnalysis.metric, driver.absoluteChange);
      const quadrant: StrategicQuadrant = favorable ? "strength" : "weakness";
      const numericDirection = driver.absoluteChange > 0 ? "positivt" : "negativt";
      add({
        id: stableId("strategy", quadrant, driver.evidenceId),
        quadrant,
        title: driverMovementTitle(
          driverAnalysis.metric,
          driver.dimensionValue,
          driver.absoluteChange,
        ),
        description: `${driver.dimensionValue} havde et registreret ${numericDirection} bidrag til ændringen i ${metricLabels[driverAnalysis.metric]} på ${signedMetric(driverAnalysis.metric, driver.absoluteChange)} i ${driverAnalysis.comparisonPeriod}.`,
        evidenceIds: [driver.evidenceId, ...(analysisEvidence ? [analysisEvidence.id] : [])],
        metric: driverAnalysis.metric,
        dimension: driverAnalysis.dimension,
        dimensionValue: driver.dimensionValue,
        value: driver.currentValue,
        comparisonValue: driver.previousValue,
        absoluteChange: driver.absoluteChange,
        percentageChange: driver.percentageChange,
        percentagePointChange: null,
        economicImpact: impact,
        confidence: driver.reliability,
        sampleSize: driver.sampleSize,
        strategicRelevance: driver.movementShare >= 0.25 ? 5 : 3,
      });

      const currentShare = safeRatio(driver.currentValue, driverAnalysis.currentValue);
      if (
        favorable
        && driverAnalysis.metric !== "cost"
        && driver.absoluteChange > 0
        && driver.percentageChange !== null
        && currentShare !== null
        && currentShare > 0
        && currentShare <= LOW_INTERNAL_SHARE
      ) {
        add({
          id: stableId("strategy", "opportunity", driver.evidenceId),
          quadrant: "opportunity",
          title: `Dokumenteret fremgang i ${driver.dimensionValue}`,
          description: `${driver.dimensionValue} står for ${formatDanishPercent(currentShare)} af den aktuelle ${metricLabels[driverAnalysis.metric]} og havde et positivt registreret bidrag på ${signedMetric(driverAnalysis.metric, driver.absoluteChange).replace(/\.$/u, "")}. Det kan være relevant at undersøge potentialet nærmere.`,
          evidenceIds: [driver.evidenceId, ...(analysisEvidence ? [analysisEvidence.id] : [])],
          metric: driverAnalysis.metric,
          dimension: driverAnalysis.dimension,
          dimensionValue: driver.dimensionValue,
          value: driver.currentValue,
          comparisonValue: driver.previousValue,
          absoluteChange: driver.absoluteChange,
          percentageChange: driver.percentageChange,
          percentagePointChange: null,
          economicImpact: impact,
          confidence: driver.reliability,
          sampleSize: driver.sampleSize,
          strategicRelevance: 5,
        });
      }

    }
  }

  const revenueAnalyses = analysis.driverAnalyses.filter((item) => item.metric === "revenue");
  for (const revenueAnalysis of revenueAnalyses) {
    const grossProfitAnalysis = analysis.driverAnalyses.find((item) => (
      item.metric === "grossProfit" && item.dimension === revenueAnalysis.dimension
    ));
    if (!grossProfitAnalysis) continue;
    const grossProfitDrivers = new Map(
      [...grossProfitAnalysis.positiveDrivers, ...grossProfitAnalysis.negativeDrivers]
        .map((driver) => [normalizeForComparison(driver.dimensionValue), driver]),
    );
    const overallMargin = safeRatio(grossProfitAnalysis.currentValue, revenueAnalysis.currentValue);
    if (overallMargin === null) continue;
    for (const revenueDriver of [...revenueAnalysis.positiveDrivers, ...revenueAnalysis.negativeDrivers]) {
      const grossProfitDriver = grossProfitDrivers.get(normalizeForComparison(revenueDriver.dimensionValue));
      if (!grossProfitDriver || revenueDriver.percentageChange === null) continue;
      const currentMargin = safeRatio(grossProfitDriver.currentValue, revenueDriver.currentValue);
      const previousMargin = safeRatio(grossProfitDriver.previousValue, revenueDriver.previousValue);
      const currentShare = safeRatio(revenueDriver.currentValue, revenueAnalysis.currentValue);
      if (
        currentMargin === null
        || currentShare === null
        || currentShare <= 0
        || currentShare > LOW_INTERNAL_SHARE
        || currentMargin - overallMargin < MINIMUM_MARGIN_ADVANTAGE
        || revenueDriver.absoluteChange <= 0
        || grossProfitDriver.absoluteChange <= 0
      ) continue;
      const confidence = strongerReliability(revenueDriver.reliability, grossProfitDriver.reliability);
      const evidenceIds = [
        revenueDriver.evidenceId,
        grossProfitDriver.evidenceId,
        revenueAnalysis.evidenceId,
        grossProfitAnalysis.evidenceId,
      ];
      add({
        id: stableId("strategy", "opportunity", "margin-share", revenueDriver.evidenceId, grossProfitDriver.evidenceId),
        quadrant: "opportunity",
        title: `${revenueDriver.dimensionValue} kombinerer rentabilitet med en mindre intern andel`,
        description: `${revenueDriver.dimensionValue} havde en beregnet dækningsgrad på ${formatDanishPercent(currentMargin)} mod ${formatDanishPercent(overallMargin)} samlet og stod for ${formatDanishPercent(currentShare)} af omsætningen. Det kan være relevant at undersøge potentialet nærmere.`,
        evidenceIds,
        metric: "grossMargin",
        dimension: revenueAnalysis.dimension,
        dimensionValue: revenueDriver.dimensionValue,
        value: currentMargin,
        comparisonValue: previousMargin,
        absoluteChange: previousMargin === null ? null : currentMargin - previousMargin,
        percentageChange: null,
        percentagePointChange: previousMargin === null ? null : currentMargin - previousMargin,
        economicImpact: Math.abs(revenueDriver.currentValue) * Math.max(currentMargin - overallMargin, 0.01),
        confidence,
        sampleSize: Math.min(revenueDriver.sampleSize, grossProfitDriver.sampleSize),
        strategicRelevance: 8,
        supportingFacts: [
          `${revenueDriver.dimensionValue}: ${formatDanishPercent(currentMargin)} beregnet dækningsgrad.`,
          `Samlet dækningsgrad i samme driveranalyse: ${formatDanishPercent(overallMargin)}.`,
          `Intern omsætningsandel: ${formatDanishPercent(currentShare)}.`,
        ],
      });
    }
  }

  for (const evidence of analysis.evidence) {
    if (evidence.type === "budget"
      && !usesLatestPeriodScope
      && evidence.metric
      && finite(evidence.currentValue)
      && finite(evidence.previousValue)
      && finite(evidence.absoluteChange)
      && relevant(
        Math.abs(evidence.absoluteChange),
        Math.max(Math.abs(evidence.currentValue), Math.abs(evidence.previousValue), 1),
      )) {
      const favorable = evidence.metric === "cost" ? evidence.absoluteChange < 0 : evidence.absoluteChange > 0;
      const quadrant: StrategicQuadrant = favorable ? "strength" : "weakness";
      const relation = evidence.absoluteChange > 0 ? "over" : "under";
      const label = metricLabels[evidence.metric];
      add({
        id: stableId("strategy", quadrant, evidence.id),
        quadrant,
        title: `${evidence.title} er ${favorable ? "gunstig" : "ugunstig"}`,
        description: `${label.charAt(0).toLocaleUpperCase("da-DK")}${label.slice(1)} ligger ${formatMetric(evidence.metric, Math.abs(evidence.absoluteChange))} ${relation} budgettet i den aktuelle visning.`,
        evidenceIds: [evidence.id],
        metric: evidence.metric,
        dimension: null,
        dimensionValue: null,
        value: evidence.currentValue,
        comparisonValue: evidence.previousValue,
        absoluteChange: evidence.absoluteChange,
        percentageChange: null,
        percentagePointChange: null,
        economicImpact: Math.abs(evidence.absoluteChange),
        confidence: evidence.reliability,
        sampleSize: evidence.sampleSize,
        strategicRelevance: 5,
      });
      if (!favorable) {
        add({
          id: stableId("strategy", "threat", evidence.id),
          quadrant: "threat",
          title: `Ugunstig budgetafvigelse for ${label}`,
          description: `${label.charAt(0).toLocaleUpperCase("da-DK")}${label.slice(1)} afviger ugunstigt fra budgettet med ${metricAtSentenceEnd(evidence.metric, Math.abs(evidence.absoluteChange))}. Følg afvigelsen i den næste registrerede opfølgning.`,
          evidenceIds: [evidence.id],
          metric: evidence.metric,
          dimension: null,
          dimensionValue: null,
          value: evidence.currentValue,
          comparisonValue: evidence.previousValue,
          absoluteChange: evidence.absoluteChange,
          percentageChange: null,
          percentagePointChange: null,
          economicImpact: Math.abs(evidence.absoluteChange),
          confidence: evidence.reliability,
          sampleSize: evidence.sampleSize,
          strategicRelevance: 6,
        });
      }
    }

    if (
      evidence.type === "distribution"
      && evidence.metric === "cost"
      && !usesLatestPeriodScope
      && evidence.dimensionValue
      && finite(evidence.currentValue)
      && finite(evidence.contribution)
      && evidence.contribution >= HIGH_CONCENTRATION_SHARE
      && evidence.currentValue >= 1
      && evidence.currentValue / evidence.contribution >= 1
    ) {
      add({
        id: stableId("strategy", "threat", "cost-concentration", evidence.id),
        quadrant: "threat",
        title: `Høj omkostningskoncentration i ${evidence.dimensionValue}`,
        description: `${evidence.dimensionValue} udgør ${formatDanishPercent(evidence.contribution)} af den registrerede omkostningsfordeling. Vurder udviklingen i den koncentrerede omkostningspost særskilt.`,
        evidenceIds: [evidence.id],
        metric: "cost",
        dimension: evidence.dimension ?? null,
        dimensionValue: evidence.dimensionValue,
        value: evidence.currentValue,
        comparisonValue: null,
        absoluteChange: null,
        percentageChange: null,
        percentagePointChange: null,
        economicImpact: Math.abs(evidence.currentValue),
        confidence: evidence.reliability,
        sampleSize: evidence.sampleSize,
        strategicRelevance: 6,
      });
    }

    if (
      evidence.type === "distribution"
      && evidence.metric === "revenue"
      && evidence.dimensionValue
      && finite(evidence.currentValue)
      && finite(evidence.contribution)
      && evidence.contribution >= HIGH_CONCENTRATION_SHARE
      && evidence.currentValue >= 1
      && evidence.currentValue / evidence.contribution >= 1
    ) {
      add({
        id: stableId("strategy", "threat", "revenue-concentration", evidence.id),
        quadrant: "threat",
        title: `Høj omsætningskoncentration i ${evidence.dimensionValue}`,
        description: `${evidence.dimensionValue} står for ${formatDanishPercent(evidence.contribution)} af omsætningen i den analyserede periode. Den registrerede koncentration gør den samlede performance mere følsom over for ændringer i ${evidence.dimensionValue}.`,
        evidenceIds: [evidence.id],
        metric: "revenue",
        dimension: evidence.dimension ?? null,
        dimensionValue: evidence.dimensionValue,
        value: evidence.currentValue,
        comparisonValue: null,
        absoluteChange: null,
        percentageChange: null,
        percentagePointChange: null,
        economicImpact: Math.abs(evidence.currentValue),
        confidence: evidence.reliability,
        sampleSize: evidence.sampleSize,
        strategicRelevance: 7,
      });
    }
  }

  const findingsByQuadrant = Object.fromEntries(QUADRANTS.map((quadrant) => [
    quadrant,
    uniqueFindings(candidates[quadrant].sort(compareFindings)).slice(0, MAX_FINDINGS_PER_QUADRANT),
  ])) as Record<StrategicQuadrant, StrategicFinding[]>;
  const findings = QUADRANTS.flatMap((quadrant) => findingsByQuadrant[quadrant]);
  const tows = buildTows(findingsByQuadrant, evidenceById);
  const reportSummary: StrategicReportSummary = {
    quadrants: Object.fromEntries(QUADRANTS.map((quadrant) => [
      quadrant,
      findingsByQuadrant[quadrant].slice(0, 2).map((finding) => ({
        findingId: finding.id,
        title: finding.title,
        description: finding.description,
        evidenceIds: [...finding.evidenceIds],
      })),
    ])) as StrategicReportSummary["quadrants"],
    strategicFocus: tows.slice(0, 3),
  };
  const dataBasis = usesLatestPeriodScope && analysis.currentPeriod
    ? {
        ...analysis.dataBasis,
        scopeMode: "selected-period" as const,
        scopeLabel: usesLatestComparisonScope && analysis.comparisonPeriod
          ? `${analysis.comparisonPeriod.label} → ${analysis.currentPeriod.label}`
          : analysis.currentPeriod.label,
        rowCount: analysis.currentPeriod.rowCount
          + (usesLatestComparisonScope ? analysis.comparisonPeriod?.rowCount ?? 0 : 0),
        periodCount: usesLatestComparisonScope ? 2 : 1,
        activeFilterLabels: [...analysis.dataBasis.activeFilterLabels],
        reliability: analysis.reliability,
        evidenceCount: analysis.evidence.length,
        strategyScopeMode: usesLatestComparisonScope ? "latest-comparison" as const : "latest-period" as const,
      }
    : {
        ...analysis.dataBasis,
        activeFilterLabels: [...analysis.dataBasis.activeFilterLabels],
        reliability: analysis.reliability,
        evidenceCount: analysis.evidence.length,
        strategyScopeMode: analysis.dataBasis.scopeMode,
      };

  return {
    findings,
    findingsByQuadrant,
    tows,
    reportSummary,
    externalContextNotice: "Muligheder og risici er udledt af det registrerede datagrundlag. Eksterne markedsforhold indgår ikke, medmindre de findes i datasættet.",
    dataBasis,
  };
}

