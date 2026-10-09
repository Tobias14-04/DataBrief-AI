import { isFiniteNumber, parseNumericValue, safeRatio } from "./numeric-foundation.ts";
import { buildSalesColumnMappings, detectSalesHeaderRow, normalizeColumnHeader } from "./spreadsheet-fields.ts";
import { rowsToRecords } from "./sales-import.ts";
import type { ParsedWorkbookRows } from "./excel-worker-types.ts";

export const BUDGET_MODEL_LABEL = "Fordelt samlet budget";
export const BUDGET_MODEL_EXPLANATION = "Budgettet er fordelt efter salgsrækkernes andel af det samlede datagrundlag.";
export type BudgetValueStatus = "available" | "missing" | "invalid" | "incomplete" | "not-accepted";
export type WorkbookBudget = {
  revenue: number | null;
  costs: number | null;
  sheetName?: string;
  model?: "row-proportional";
  accepted?: boolean;
  hasPeriodColumn?: boolean;
  revenueStatus?: BudgetValueStatus;
  costsStatus?: BudgetValueStatus;
  byCategory?: Array<{ name: string; revenue: number; units: number; grossProfit: number; cost: number }>;
};

function documentedTotal(values: unknown[], costs = false) {
  if (!values.length || values.every((v) => v === undefined || v === null || v === "")) return { value: null, status: "missing" as const };
  const parsed = values.map(parseNumericValue);
  if (parsed.some((v) => v === null)) return {
    value: null, status: values.some((v) => v === undefined || v === null || v === "") ? "incomplete" as const : "invalid" as const,
  };
  // Preserve the existing absolute-value policy for negative cost budgets.
  const value = parsed.reduce<number>((sum, v) => sum + (costs ? Math.abs(v!) : v!), 0);
  return isFiniteNumber(value) ? { value, status: "available" as const } : { value: null, status: "invalid" as const };
}

export function parseWorkbookBudget(workbook: ParsedWorkbookRows): WorkbookBudget | undefined {
  const sheetName = workbook.sheetNames.find((name) => normalizeColumnHeader(name).includes("budget"));
  if (!sheetName) return undefined;
  const rows = workbook.sheets[sheetName] ?? [];
  const headerIndex = detectSalesHeaderRow(rows).index;
  // Keep empty header positions: dropping them shifts source cells.
  const headers = (rows[headerIndex] ?? []).map((v) => String(v ?? "").trim());
  const mappings = buildSalesColumnMappings(headers);
  const records = rowsToRecords(rows, headerIndex, headers).filter((row) => Object.values(row).some((v) => v !== "" && v !== null && v !== undefined));
  const revenueHeader = mappings.netRevenue ?? mappings.grossRevenue ?? mappings.revenue;
  // A total mixed with detail rows is ambiguous. Do not guess which rows to
  // exclude or add the total again; keep sales analysis and disable this budget.
  const isTotal = (row: Record<string, unknown>) => Object.entries(row).some(([header, value]) => (
    header !== revenueHeader && header !== mappings.cost
    && /^(total|sum|ialt|subtotal|grandtotal|samletbudget)$/u.test(normalizeColumnHeader(String(value ?? "")))
  ));
  const mixedTotals = records.some(isTotal) && records.some((row) => !isTotal(row));
  const unavailable = { value: null, status: "invalid" as const };
  const revenue = mixedTotals ? unavailable : documentedTotal(revenueHeader ? records.map((row) => row[revenueHeader]) : []);
  const costs = mixedTotals ? unavailable : documentedTotal(mappings.cost ? records.map((row) => row[mappings.cost!]) : [], true);
  const hasPeriodColumn = Boolean(mappings.month || mappings.date || headers.some((h) => /^(aar|year|kvartal|quarter)$/u.test(normalizeColumnHeader(h))));
  return { sheetName, model: "row-proportional", accepted: !hasPeriodColumn, hasPeriodColumn,
    revenue: revenue.value, costs: costs.value, revenueStatus: revenue.status, costsStatus: costs.status, byCategory: [] };
}

export function selectWorkbookBudgetModel(budget: WorkbookBudget | undefined, accepted: boolean) {
  return budget ? { ...budget, accepted, model: "row-proportional" as const } : undefined;
}

export function resolveBudgetBasis(budget: WorkbookBudget | undefined, actual: number, scopeRows: number, totalRows: number) {
  const accepted = budget?.accepted !== false;
  const scale = totalRows > 0 ? scopeRows / totalRows : null;
  const allocate = (value: number | null | undefined) => {
    if (!accepted || scopeRows === 0 || scale === null || !isFiniteNumber(value)) return null;
    const allocated = value * scale;
    return isFiniteNumber(allocated) ? allocated : null;
  };
  const revenue = allocate(budget?.revenue);
  const costs = allocate(budget?.costs);
  const result = revenue !== null && costs !== null && isFiniteNumber(revenue - costs) ? revenue - costs : null;
  const deviation = revenue !== null && isFiniteNumber(actual - revenue) ? actual - revenue : null;
  const status = deviation === null ? null : deviation === 0 ? "På budget" as const : deviation > 0 ? "Over budgettet" as const : "Under budgettet" as const;
  const reason = !accepted ? "Månedsbudgetter understøttes ikke. Den samlede rækkeproportionale budgetmodel er ikke accepteret."
    : scopeRows === 0 ? "Ingen accepterede salgsrækker i det aktuelle scope."
      : revenue === null ? "Omsætningsbudget er ikke komplet dokumenteret." : null;
  return { sourcePresent: Boolean(budget), model: "row-proportional" as const, label: BUDGET_MODEL_LABEL, explanation: BUDGET_MODEL_EXPLANATION,
    revenue, costs, result, deviation, status, reason, scale,
    revenueStatus: revenue !== null ? "available" as const : !accepted ? "not-accepted" as const : budget?.revenueStatus ?? "missing",
    costsStatus: costs !== null ? "available" as const : !accepted ? "not-accepted" as const : budget?.costsStatus ?? "missing",
    deviationPercent: safeRatio(deviation, revenue), attainment: safeRatio(actual, revenue),
  };
}
