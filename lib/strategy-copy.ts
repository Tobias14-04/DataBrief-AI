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
