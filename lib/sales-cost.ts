import { isFiniteNumber } from "./numeric-foundation.ts";
import { isVariableRowCostHeader } from "./spreadsheet-fields.ts";

export type SalesCostScope = "total" | "variable" | null;

export function deriveSaleRowCosts(input: {
  revenue: number;
  units: number;
  unitCost: number | null;
  rowCost: number | null;
  rowCostHeader?: string;
  grossProfit: number | null;
}) {
  const explicitVariableRowCost = input.rowCost !== null && isVariableRowCostHeader(input.rowCostHeader);
  const multipliedUnitCost = input.unitCost === null ? null : input.units * input.unitCost;
  const unitVariableCost = isFiniteNumber(multipliedUnitCost) ? multipliedUnitCost : null;
  const grossProfitVariableCost = input.grossProfit === null ? null : input.revenue - input.grossProfit;
  const variableCost = explicitVariableRowCost ? input.rowCost
    : unitVariableCost ?? (isFiniteNumber(grossProfitVariableCost) ? grossProfitVariableCost : null);
  const derivedGrossProfit = input.grossProfit ?? (variableCost === null ? null : input.revenue - variableCost);
  return {
    cost: input.rowCost ?? unitVariableCost,
    costScope: input.rowCost !== null ? explicitVariableRowCost ? "variable" as const : "total" as const
      : unitVariableCost !== null ? "variable" as const : null,
    variableCost,
    grossProfit: isFiniteNumber(derivedGrossProfit) ? derivedGrossProfit : null,
  };
}
