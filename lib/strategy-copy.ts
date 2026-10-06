import type { StrategicFinding, TowsRecommendation } from "./strategy-engine";

const metricNames: Record<string, string> = {
  revenue: "omsætning",
  units: "solgte enheder",
  averagePrice: "gennemsnitspris",
  grossProfit: "dækningsbidrag",
  grossMargin: "dækningsgrad",
  cost: "omkostninger",
  result: "resultat",
  costShare: "omkostninger i % af omsætning",
};

function shortSubject(finding: StrategicFinding) {
  if (finding.dimensionValue && finding.title.startsWith("Høj omsætningskoncentration i ")) {
    return `omsætningskoncentrationen i ${finding.dimensionValue}`;
  }
  if (finding.dimensionValue && finding.title.startsWith("Høj omkostningskoncentration i ")) {
    return `omkostningskoncentrationen i ${finding.dimensionValue}`;
  }
  const metric = finding.metric ? metricNames[finding.metric] : null;
  if (metric && finding.title.toLocaleLowerCase("da-DK").includes("budget")) {
    return `budgetafvigelsen for ${metric}`;
  }
  if (metric && finding.dimensionValue) return `${metric} i ${finding.dimensionValue}`;
  if (metric) return `udviklingen i ${metric}`;
  return finding.title.charAt(0).toLocaleLowerCase("da-DK") + finding.title.slice(1);
}

function shortPairLabel(finding: StrategicFinding) {
  const metric = finding.metric ? metricNames[finding.metric] : null;
  if (metric && finding.title.toLocaleLowerCase("da-DK").includes("budget")) {
    return `${metric.charAt(0).toLocaleUpperCase("da-DK")}${metric.slice(1)} mod budget`;
  }
  if (finding.dimensionValue) return finding.dimensionValue;
  if (metric) return metric.charAt(0).toLocaleUpperCase("da-DK") + metric.slice(1);
  return finding.title;
}

export function briefStrategicPairTitle(
  proposal: TowsRecommendation,
  findingById: ReadonlyMap<string, StrategicFinding>,
) {
  const [left, right] = proposal.sourceFindingIds.map((id) => findingById.get(id));
  if (!left || !right) return proposal.title;
  const first = shortPairLabel(left);
  const second = shortPairLabel(right);
  return first === second ? proposal.title : `${first} · ${second}`;
}

export function briefStrategicFocusSummary(
  proposal: TowsRecommendation,
  findingById: ReadonlyMap<string, StrategicFinding>,
) {
  const targetId = proposal.sourceFindingIds[proposal.type === "wo" ? 0 : 1];
  const target = findingById.get(targetId);
  if (!target) return briefStrategicFocus(proposal, findingById);
  return `${proposal.type === "st" || proposal.type === "wt" ? "Følg" : "Undersøg"} ${shortSubject(target)}.`;
}

// Only identical displayed recommendations are combined. Their source references
// remain available on the retained item; similar but distinct advice stays separate.
export function uniqueDisplayedStrategicFocus(
  proposals: readonly TowsRecommendation[],
  findingById: ReadonlyMap<string, StrategicFinding>,
) {
  const byText = new Map<string, TowsRecommendation>();
  for (const proposal of proposals) {
    const text = briefStrategicFocusSummary(proposal, findingById);
    const targetId = proposal.sourceFindingIds[proposal.type === "wo" ? 0 : 1];
    const target = findingById.get(targetId);
    const key = JSON.stringify([text, target?.scopeLabel, target?.scopeFilters]);
    const existing = byText.get(key);
    if (existing) {
      byText.set(key, {
        ...existing,
        sourceFindingIds: [...new Set([...existing.sourceFindingIds, ...proposal.sourceFindingIds])],
        evidenceIds: [...new Set([...existing.evidenceIds, ...proposal.evidenceIds])],
      });
    } else {
      byText.set(key, { ...proposal });
    }
  }
  return [...byText.values()];
}

export function uniqueScopeLabels(labels: readonly string[]) {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  // A comparison already names its current month; avoid repeating that month alone.
  return unique.filter((label) => !unique.some((other) => other !== label && other.includes("→") && other.endsWith(label)));
}

export function descriptionWithoutRepeatedScope(description: string, scopeLabel: string) {
  const ending = ` i ${scopeLabel}.`;
  return description.endsWith(ending) ? `${description.slice(0, -ending.length)}.` : description;
}

export function visibleScopeFilters(scopeLabel: string, filters: readonly string[]) {
  return filters.filter((filter) => !/^[a-zæøå]+\s+\d{4}$/iu.test(filter.trim()) || !scopeLabel.includes(filter.trim()));
}

export function briefStrategicFocus(
  proposal: TowsRecommendation,
  findingById: ReadonlyMap<string, StrategicFinding>,
) {
  const [left, right] = proposal.sourceFindingIds.map((id) => findingById.get(id));
  if (!left || !right) return proposal.text;

  const first = shortSubject(left);
  const second = shortSubject(right);
  switch (proposal.type) {
    case "so":
      return `Sammenlign ${first} med ${second}.`;
    case "st":
      return `Følg ${second} sammen med ${first}.`;
    case "wo":
      return `Undersøg ${first} i lyset af ${second}.`;
    case "wt":
      return `Følg ${first} og ${second} samlet.`;
  }
}
