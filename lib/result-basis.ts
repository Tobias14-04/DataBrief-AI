import { isFiniteNumber, safeRatio } from "./numeric-foundation.ts";

export type ResultRow = {
  revenue: number;
  grossProfit: number | null;
  cost: number | null;
  costScope?: "total" | "variable" | null;
  variableCost?: number | null;
};

export type WorkbookCostSource = {
  total: number;
  kind?: "total" | "components" | "additional" | "variable";
};

export type CostBasis = {
  source: "workbook-total" | "workbook-components" | "workbook-additional" | "workbook-variable" | "row-cost" | "variable-only" | "unknown";
  scope: "full" | "subset";
  status: "available" | "unavailable";
  totalCosts: number | null;
  variableCosts: number | null;
  result: number | null;
  resultMargin: number | null;
  reason: string | null;
};

export function describeCostBasis(basis: CostBasis): string {
  const source = {
    "workbook-total": "samlede omkostninger fra omkostningsark",
    "workbook-components": "variable og øvrige omkostningsark",
    "workbook-additional": "variable plus øvrige omkostninger",
    "workbook-variable": "kun variable omkostninger fra omkostningsark",
    "row-cost": "registrerede rækkeomkostninger",
    "variable-only": "kun variable omkostninger",
    unknown: "ukendt omkostningskilde",
  }[basis.source];
  const scope = basis.scope === "full" ? "hele salgsgrundlaget" : "filtreret delscope";
  return `${source} · ${scope} · ${basis.status === "available" ? "tilgængelig" : "utilgængelig"}`;
}

export function hasFullRowScope(rows: readonly ResultRow[], fullRows: readonly ResultRow[]): boolean {
  if (rows.length !== fullRows.length) return false;
  const counts = new Map<ResultRow, number>();
  fullRows.forEach((row) => counts.set(row, (counts.get(row) ?? 0) + 1));
  for (const row of rows) {
    const count = counts.get(row) ?? 0;
    if (count === 0) return false;
    counts.set(row, count - 1);
  }
  return true;
}

export function resolveCostBasis(
  rows: readonly ResultRow[],
  options: { fullRows?: readonly ResultRow[]; workbook?: WorkbookCostSource | null } = {},
): CostBasis {
  const scope = options.fullRows && !hasFullRowScope(rows, options.fullRows) ? "subset" : "full";
  const workbook = options.workbook ?? null;
  const rowVariableCosts = rows.map((row) => isFiniteNumber(row.variableCost)
    ? row.variableCost
    : row.costScope === "variable" && isFiniteNumber(row.cost) ? row.cost
    : isFiniteNumber(row.grossProfit) && isFiniteNumber(row.revenue) ? row.revenue - row.grossProfit : null);
  const variableCosts = rows.length > 0 && rowVariableCosts.every(isFiniteNumber)
    ? rowVariableCosts.reduce<number>((sum, value) => sum + value!, 0)
    : null;
  const finiteVariableCosts = isFiniteNumber(variableCosts) ? variableCosts
    : scope === "full" && workbook?.kind === "variable" && isFiniteNumber(workbook.total) ? workbook.total : null;
  const source = workbook
    ? workbook.kind === "additional" ? "workbook-additional"
      : workbook.kind === "variable" ? "workbook-variable"
        : workbook.kind === "components" ? "workbook-components" : "workbook-total"
    : rows.length > 0 && rows.every((row) => isFiniteNumber(row.cost) && row.costScope !== "variable") ? "row-cost"
      : finiteVariableCosts !== null || rows.some((row) => isFiniteNumber(row.grossProfit)) ? "variable-only" : "unknown";
  const unavailable = (reason: string): CostBasis => ({
    source, scope, status: "unavailable", totalCosts: null, variableCosts: finiteVariableCosts,
    result: null, resultMargin: null, reason,
  });

  if (workbook && !isFiniteNumber(workbook.total)) {
    return unavailable("Omkostningsarkets total er ikke et endeligt tal.");
  }
  if (!rows.length) return unavailable("Der er ingen salgsrækker i det aktuelle scope.");
  if (rows.some((row) => !isFiniteNumber(row.revenue))) {
    return unavailable("Resultat kræver komplet omsætning i det aktuelle scope.");
  }
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  if (!isFiniteNumber(revenue)) return unavailable("Omsætningen gav ikke et endeligt tal.");

  if (workbook && scope === "subset") {
    return unavailable("Omkostningsarket dækker hele datagrundlaget og kan ikke fordeles på det filtrerede delscope.");
  }

  let totalCosts: number | null = null;
  if (source === "workbook-total" || source === "workbook-components") {
    totalCosts = workbook!.total;
  } else if (source === "workbook-additional") {
    if (finiteVariableCosts === null) {
      return unavailable("Øvrige omkostninger kræver komplet grundlag for variable omkostninger.");
    }
    totalCosts = finiteVariableCosts + workbook!.total;
  } else if (source === "workbook-variable") {
    return unavailable("Omkostningsarket dokumenterer kun variable omkostninger; øvrige omkostninger er ukendte.");
  } else if (source === "row-cost") {
    totalCosts = rows.reduce((sum, row) => sum + row.cost!, 0);
  } else if (source === "variable-only") {
    return unavailable("Grundlaget dokumenterer kun variable omkostninger; øvrige eller faste omkostninger er ukendte, så fuldt resultat kan ikke beregnes.");
  } else {
    return unavailable("Samlede omkostninger er ikke dokumenteret i det aktuelle scope.");
  }

  const result = revenue - totalCosts;
  if (!isFiniteNumber(totalCosts) || !isFiniteNumber(result)) {
    return unavailable("Omkostnings- eller resultatberegningen gav ikke et endeligt tal.");
  }
  return {
    source, scope, status: "available", totalCosts, variableCosts: finiteVariableCosts, result,
    resultMargin: safeRatio(result, revenue), reason: null,
  };
}
