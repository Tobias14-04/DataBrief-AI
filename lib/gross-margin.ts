import { isFiniteNumber, safeRatio } from "./numeric-foundation.ts";

export type GrossMarginBasis = {
  rowCount: number;
  revenue: number;
  revenueCount: number;
  grossProfit: number;
  grossProfitCount: number;
  weightedMargin: number;
  marginCount: number;
};

export type GrossMarginResult = {
  value: number | null;
  source: "gross-profit" | "weighted-margin" | null;
  reason: string | null;
};

export function createGrossMarginBasis(): GrossMarginBasis {
  return {
    rowCount: 0,
    revenue: 0,
    revenueCount: 0,
    grossProfit: 0,
    grossProfitCount: 0,
    weightedMargin: 0,
    marginCount: 0,
  };
}

export function addGrossMarginRow(
  basis: GrossMarginBasis,
  row: { revenue: number | null | undefined; grossProfit?: number | null; grossMargin?: number | null },
): void {
  basis.rowCount += 1;
  if (isFiniteNumber(row.revenue)) {
    basis.revenue += row.revenue;
    basis.revenueCount += 1;
  }
  if (isFiniteNumber(row.grossProfit)) {
    basis.grossProfit += row.grossProfit;
    basis.grossProfitCount += 1;
  }
  if (isFiniteNumber(row.grossMargin) && isFiniteNumber(row.revenue)) {
    basis.weightedMargin += row.grossMargin * row.revenue;
    basis.marginCount += 1;
  }
}

export function resolveGrossProfit(basis: Pick<GrossMarginBasis, "rowCount" | "grossProfitCount" | "grossProfit">) {
  const complete = basis.rowCount > 0 && basis.grossProfitCount === basis.rowCount && isFiniteNumber(basis.grossProfit);
  return {
    value: complete ? basis.grossProfit : null,
    reason: complete ? null : "Dækningsbidrag kræver dokumenteret DB eller variabelt kostgrundlag for alle rækker i den aktuelle visning.",
  };
}

export function resolveGrossMargin(basis: GrossMarginBasis): GrossMarginResult {
  if (basis.rowCount === 0 || basis.revenueCount !== basis.rowCount || !isFiniteNumber(basis.revenue)) {
    return { value: null, source: null, reason: "Dækningsgrad kræver komplet omsætning i den aktuelle visning." };
  }
  if (basis.revenue === 0) {
    return { value: null, source: null, reason: "Dækningsgrad kan ikke beregnes ved samlet omsætning på 0." };
  }
  const hasCompleteGrossProfit = basis.grossProfitCount === basis.rowCount;
  const hasCompleteMargin = basis.marginCount === basis.rowCount;
  if (hasCompleteGrossProfit) {
    const value = safeRatio(basis.grossProfit, basis.revenue);
    return value === null
      ? { value: null, source: null, reason: "Dækningsgrad kan ikke beregnes ud fra de registrerede tal." }
      : { value, source: "gross-profit", reason: null };
  }
  if (hasCompleteMargin) {
    const value = safeRatio(basis.weightedMargin, basis.revenue);
    return value === null
      ? { value: null, source: null, reason: "Dækningsgrad kan ikke beregnes ud fra de registrerede tal." }
      : { value, source: "weighted-margin", reason: null };
  }
  return { value: null, source: null, reason: "Dækningsgrad kræver komplet dækningsbidrag eller dækningsgrad for alle rækker." };
}
