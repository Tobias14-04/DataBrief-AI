import { formatDanishCurrency, formatDanishNumber, formatDanishPercent } from "./dashboard-insights.ts";
import { resolveCompanyFocus, type AnalysisPreferences, type AnalysisTargetStatus } from "./analysis-preferences.ts";
import type { InsightAnalysis, InsightEvidence, InsightMetricChange, InsightMetricKey } from "./insight-engine.ts";

export type ManagementReportSection = {
  key: "executive-summary" | "development" | "drivers" | "assessment" | "recommended-focus" | "data-basis";
  title: string;
  paragraphs: string[];
  evidenceIds: string[];
  scope: string;
};

const focusMetrics: Record<string, readonly InsightMetricKey[]> = {
  sales: ["revenue", "units"], profitability: ["result", "grossProfit", "grossMargin"],
  costs: ["cost", "costShare"], products: ["revenue", "grossProfit"],
  trends: ["revenue", "result"], changes: ["revenue", "result"],
};

function unique(ids: readonly string[]) { return [...new Set(ids)]; }

function evidenceQuality(evidence: InsightEvidence | undefined) {
  return evidence?.reliability === "high" ? 1 : evidence?.reliability === "medium" ? 0.8 : 0.6;
}

function changePriority(change: InsightMetricChange, evidence: InsightEvidence | undefined, focus: string | null) {
  // Ranking only; the KPI and its growth calculation remain the engine's own values.
  const scale = ["grossMargin", "costShare"].includes(change.metric) ? 100 : 1;
  const magnitude = Math.abs(change.absoluteChange) * scale;
  return magnitude * evidenceQuality(evidence) * (focusMetrics[focus ?? ""]?.includes(change.metric) ? 1.1 : 1);
}

function changeSentence(change: InsightMetricChange) {
  const direction = change.absoluteChange > 0 ? "steg" : change.absoluteChange < 0 ? "faldt" : "var uændret";
  const amount = ["grossMargin", "costShare"].includes(change.metric)
    ? `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(Math.abs(change.absoluteChange * 100))} procentpoint`
    : change.metric === "units" ? formatDanishNumber(Math.abs(change.absoluteChange))
      : formatDanishCurrency(Math.abs(change.absoluteChange));
  return `${change.label} ${direction}${change.absoluteChange === 0 ? "" : ` med ${amount}`}${change.percentageChange !== null ? ` (${formatDanishPercent(change.percentageChange)})` : ""}.`;
}

export function buildManagementReport(
  analysis: InsightAnalysis,
  preferences: AnalysisPreferences,
  targetStatuses: readonly AnalysisTargetStatus[],
): ManagementReportSection[] {
  const evidence = new Map(analysis.evidence.map((item) => [item.id, item]));
  const focus = resolveCompanyFocus(preferences);
  const periodScope = analysis.dataBasis.scopeLabel;
  const filters = analysis.dataBasis.activeFilterLabels.length
    ? `Aktive filtre: ${analysis.dataBasis.activeFilterLabels.join(", ")}` : "Ingen aktive filtre";
  const comparisonScope = analysis.currentPeriod && analysis.comparisonPeriod
    ? `${analysis.comparisonPeriod.label} → ${analysis.currentPeriod.label} · ${filters}` : null;
  const snapshot = new Map(analysis.snapshot.map((item) => [item.metric, item]));
  const changes = comparisonScope ? [...analysis.changes].sort((left, right) =>
    changePriority(right, evidence.get(right.evidenceId), focus?.area ?? null)
    - changePriority(left, evidence.get(left.evidenceId), focus?.area ?? null)) : [];
  const topChanges = changes.filter((item) => item.absoluteChange !== 0).slice(0, 3);
  const revenue = snapshot.get("revenue");
  const margin = snapshot.get("grossMargin");
  const result = snapshot.get("result");
  const headline = [
    revenue ? `Omsætningen var ${revenue.formattedValue}` : null,
    margin ? `dækningsgraden ${margin.formattedValue}` : null,
    result ? `resultatet ${result.formattedValue}` : null,
  ].filter(Boolean).join(", ");
  const revenueDrivers = comparisonScope ? analysis.driverAnalyses.filter((item) => item.metric === "revenue") : [];
  const preferredDimension = focus?.area === "products" ? "product" : "category";
  const primaryDrivers = revenueDrivers.find((item) => item.dimension === preferredDimension && item.hasKnownMembers)
    ?? revenueDrivers.find((item) => item.hasKnownMembers) ?? revenueDrivers[0];
  const drivers = primaryDrivers
    ? [...primaryDrivers.positiveDrivers, ...primaryDrivers.negativeDrivers]
      .filter((item) => item.absoluteChange !== 0)
      .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))
      .slice(0, 2) : [];
  const driverText = (driver: (typeof drivers)[number]) =>
    `${primaryDrivers!.dimensionLabel} ${driver.dimensionValue}: ${driver.absoluteChange > 0 ? "+" : "−"}${formatDanishCurrency(Math.abs(driver.absoluteChange))} i registreret omsætningsbidrag${driver.movementShare !== null ? `, ${formatDanishPercent(driver.movementShare)} af den absolutte bevægelse` : ""}.`;
  const recommendations = analysis.recommendations
    .filter((item) => item.evidenceIds.length > 0 && item.evidenceIds.every((id) => evidence.has(id)))
    .sort((left, right) => {
      const score = (ids: readonly string[]) => ids.reduce((total, id) => {
        const fact = evidence.get(id);
        return total + Math.abs(fact?.absoluteChange ?? fact?.currentValue ?? 0)
          * evidenceQuality(fact) * (focusMetrics[focus?.area ?? ""]?.includes(fact?.metric ?? "revenue") ? 1.1 : 1);
      }, 0);
      return score(right.evidenceIds) - score(left.evidenceIds);
    }).slice(0, 3);
  const sections: ManagementReportSection[] = [];
  const summary = [
    headline ? `${headline.charAt(0).toUpperCase()}${headline.slice(1)} i ${periodScope}.` : `Analysen dækker ${periodScope}.`,
    comparisonScope
      ? topChanges[0] ? `Vigtigste dokumenterede bevægelse: ${changeSentence(topChanges[0])}` : "Ingen dokumenteret ændring i de sammenlignelige perioder."
      : "Der findes ingen tidligere sammenlignelig periode; rapporten viser kun et øjebliksbillede.",
    drivers[0] ? `Største registrerede driver: ${driverText(drivers[0])}` : null,
    recommendations[0] ? `Prioriteret fokus: ${recommendations[0].text}` : null,
  ].filter((item): item is string => Boolean(item));
  if (targetStatuses.length) summary.push(`Målstatus: ${targetStatuses[0].text}`);
  sections.push({ key: "executive-summary", title: "Ledelsesresumé", paragraphs: summary,
    evidenceIds: unique([revenue?.evidenceId, margin?.evidenceId, result?.evidenceId, topChanges[0]?.evidenceId, drivers[0]?.evidenceId, ...(recommendations[0]?.evidenceIds ?? [])].filter((id): id is string => Boolean(id))),
    scope: `${periodScope} · ${filters}` });
  if (topChanges.length && comparisonScope) sections.push({ key: "development", title: "Vigtigste udvikling",
    paragraphs: topChanges.map(changeSentence), evidenceIds: topChanges.map((item) => item.evidenceId), scope: comparisonScope });
  if (drivers.length && primaryDrivers) sections.push({ key: "drivers", title: "Hvor ændringen er registreret",
    paragraphs: [...drivers.map(driverText), "Bidragene viser registreringsstedet, ikke den bagvedliggende årsag."],
    evidenceIds: drivers.map((item) => item.evidenceId), scope: `${primaryDrivers.comparisonPeriod} · ${filters}` });
  const observations = analysis.observations.filter((item) =>
    item.tone !== "neutral" && !item.id.startsWith("observation-budget")
    && item.id !== "observation-driver" && item.evidenceIds.every((id) =>
      evidence.has(id) && !["change", "driver", "budget"].includes(evidence.get(id)!.type)));
  const assessments = observations.slice(0, 2).map((item) => item.text);
  const budgetFacts = analysis.evidence.filter((item) => item.type === "budget");
  if (budgetFacts.length) {
    const budgetObservation = analysis.observations.find((item) => item.id.startsWith("observation-budget"));
    const fact = budgetFacts[0];
    const difference = fact.absoluteChange ?? 0;
    assessments.push(budgetObservation
      ? `Budgetstatus: ${budgetObservation.text}`
      : `Budgetstatus: ${fact.title} ${difference === 0 ? "er på budget" : `afviger med ${formatDanishCurrency(Math.abs(difference))} ${difference > 0 ? "over" : "under"} budgettet`}${analysis.dataBasis.budgetBasis === "proportional" ? " på proportionelt fordelt grundlag" : ""}.`);
  }
  if (assessments.length) sections.push({ key: "assessment", title: "Status og opmærksomhedspunkter",
    paragraphs: assessments, evidenceIds: unique([...observations.slice(0, 2).flatMap((item) => item.evidenceIds), ...budgetFacts.map((item) => item.id)]),
    scope: comparisonScope ?? `${periodScope} · ${filters}` });
  if (recommendations.length) sections.push({ key: "recommended-focus", title: "Anbefalet fokus",
    paragraphs: recommendations.map((item) => item.text), evidenceIds: unique(recommendations.flatMap((item) => item.evidenceIds)),
    scope: comparisonScope ?? `${periodScope} · ${filters}` });
  const dataFacts = analysis.evidence.find((item) => item.type === "data-basis");
  const limitations = dataFacts?.supportingFacts.filter((fact) => /utilgængelig|uden en gyldig periode|omkostningsgrundlag|Resultatgrundlag/u.test(fact)) ?? [];
  sections.push({ key: "data-basis", title: "Datagrundlag og begrænsninger",
    paragraphs: [`${formatDanishNumber(analysis.dataBasis.rowCount)} af ${formatDanishNumber(analysis.dataBasis.totalRowCount)} rækker fra ${analysis.dataBasis.sourceName}.`,
      `Analysegrundlag: ${analysis.reliability === "high" ? "højt" : analysis.reliability === "medium" ? "middel" : "begrænset"}.`,
      ...(focus ? [`Prioriteringen tager højde for virksomhedens valgte fokus: ${focus.label}.`] : []), ...limitations],
    evidenceIds: dataFacts ? [dataFacts.id] : [], scope: `${periodScope} · ${filters}` });
  return sections;
}
