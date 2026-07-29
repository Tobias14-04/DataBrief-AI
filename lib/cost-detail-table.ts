import {
  calculateCostBudgetVariance,
  type CostDetailRow,
} from "./cost-intelligence.ts";
import { formatDanishCurrency } from "./dashboard-insights.ts";
import { buildExcelCompatibleCsv } from "./data-labels.ts";

export const COST_DETAIL_COLUMN_ORDER = [
  "name",
  "current",
  "previous",
  "change",
  "changePercent",
  "budget",
  "budgetVariance",
  "share",
] as const;

export type CostDetailColumnKey = typeof COST_DETAIL_COLUMN_ORDER[number];
export type CostDetailSortDirection = "asc" | "desc";

export const COST_DETAIL_PRIMARY_COLUMNS = [
  "name",
  "current",
  "share",
] as const satisfies ReadonlyArray<CostDetailColumnKey>;

export const COST_DETAIL_OPTIONAL_COLUMNS = [
  "previous",
  "change",
  "changePercent",
  "budget",
  "budgetVariance",
] as const satisfies ReadonlyArray<CostDetailColumnKey>;

export type CostDetailColumnDefinition = {
  key: CostDetailColumnKey;
  label: string;
  numeric: boolean;
  helpText?: string;
};

export const COST_DETAIL_COLUMN_DEFINITIONS: Record<
  CostDetailColumnKey,
  CostDetailColumnDefinition
> = {
  name: {
    key: "name",
    label: "Omkostningskategori",
    numeric: false,
  },
  current: {
    key: "current",
    label: "Aktuel periode",
    numeric: true,
  },
  previous: {
    key: "previous",
    label: "Forrige periode",
    numeric: true,
  },
  change: {
    key: "change",
    label: "Ændring i kr.",
    numeric: true,
  },
  changePercent: {
    key: "changePercent",
    label: "Ændring i %",
    numeric: true,
  },
  budget: {
    key: "budget",
    label: "Budget",
    numeric: true,
  },
  budgetVariance: {
    key: "budgetVariance",
    label: "Budgetafvigelse",
    numeric: true,
    helpText: "Afvigelsen viser forskellen mellem faktisk forbrug og budget. Under budget er gunstigt.",
  },
  share: {
    key: "share",
    label: "Andel",
    numeric: true,
  },
};

type CostDetailRowWithBudget = CostDetailRow & {
  budget?: number | null;
  budgetVariance?: number | null;
};

const columnKeySet = new Set<string>(COST_DETAIL_COLUMN_ORDER);
const primaryColumnSet = new Set<CostDetailColumnKey>(COST_DETAIL_PRIMARY_COLUMNS);
const danishLabelCollator = new Intl.Collator("da-DK", {
  numeric: true,
  sensitivity: "base",
});
const danishCsvNumber = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type BudgetVariancePresentationTone = "positive" | "warning" | "critical" | "neutral";

export function buildBudgetVariancePresentation(actual: number, budget: number) {
  if (!Number.isFinite(actual) || !Number.isFinite(budget)) return null;
  const result = calculateCostBudgetVariance(actual, budget);

  if (result.variance === 0) {
    return {
      value: result.variance,
      label: "På budget",
      tone: "neutral" as BudgetVariancePresentationTone,
    };
  }

  return {
    value: result.variance,
    label: `${formatDanishCurrency(Math.abs(result.variance))} ${result.variance < 0 ? "under budget" : "over budget"}`,
    tone: result.status === "critical"
      ? "critical" as BudgetVariancePresentationTone
      : result.status === "watch"
        ? "warning" as BudgetVariancePresentationTone
        : "positive" as BudgetVariancePresentationTone,
  };
}

export function isCostDetailColumnKey(value: unknown): value is CostDetailColumnKey {
  return typeof value === "string" && columnKeySet.has(value);
}

export function isPrimaryCostDetailColumn(key: CostDetailColumnKey) {
  return primaryColumnSet.has(key);
}

function getNumericColumnValue(
  row: CostDetailRow,
  key: Exclude<CostDetailColumnKey, "name">,
) {
  const budgetAwareRow = row as CostDetailRowWithBudget;
  const value = key === "budget"
    ? budgetAwareRow.budget
    : key === "budgetVariance"
      ? budgetAwareRow.budgetVariance
      : row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getCostDetailColumnValue(
  row: CostDetailRow,
  key: CostDetailColumnKey,
) {
  return key === "name" ? row.name : getNumericColumnValue(row, key);
}

export function getAvailableCostDetailColumns(
  rows: ReadonlyArray<CostDetailRow>,
): CostDetailColumnKey[] {
  return COST_DETAIL_COLUMN_ORDER.filter((key) => (
    isPrimaryCostDetailColumn(key)
    || rows.some((row) => getCostDetailColumnValue(row, key) !== null)
  ));
}

export function normalizeCostDetailColumnSelection(
  selectedColumns: Iterable<CostDetailColumnKey>,
  availableColumns: Iterable<CostDetailColumnKey> = COST_DETAIL_COLUMN_ORDER,
): CostDetailColumnKey[] {
  const selected = new Set(selectedColumns);
  const available = new Set(availableColumns);
  COST_DETAIL_PRIMARY_COLUMNS.forEach((key) => {
    selected.add(key);
    available.add(key);
  });

  return COST_DETAIL_COLUMN_ORDER.filter((key) => (
    available.has(key) && selected.has(key)
  ));
}

export function serializeCostDetailColumnSelection(
  selectedColumns: Iterable<CostDetailColumnKey>,
) {
  return JSON.stringify(normalizeCostDetailColumnSelection(selectedColumns));
}

export function parseCostDetailColumnSelection(
  serializedValue: string | null | undefined,
  availableColumns: Iterable<CostDetailColumnKey> = COST_DETAIL_COLUMN_ORDER,
): CostDetailColumnKey[] {
  if (!serializedValue) {
    return normalizeCostDetailColumnSelection([], availableColumns);
  }

  try {
    const parsedValue: unknown = JSON.parse(serializedValue);
    if (!Array.isArray(parsedValue)) {
      return normalizeCostDetailColumnSelection([], availableColumns);
    }
    return normalizeCostDetailColumnSelection(
      parsedValue.filter(isCostDetailColumnKey),
      availableColumns,
    );
  } catch {
    return normalizeCostDetailColumnSelection([], availableColumns);
  }
}

export function compareNullableCostDetailNumbers(
  left: number | null,
  right: number | null,
  direction: CostDetailSortDirection,
) {
  const finiteLeft = typeof left === "number" && Number.isFinite(left) ? left : null;
  const finiteRight = typeof right === "number" && Number.isFinite(right) ? right : null;

  if (finiteLeft === null && finiteRight === null) return 0;
  if (finiteLeft === null) return 1;
  if (finiteRight === null) return -1;
  const comparison = finiteLeft === finiteRight ? 0 : finiteLeft < finiteRight ? -1 : 1;
  return direction === "asc" ? comparison : -comparison;
}

export function compareCostDetailRows(
  left: CostDetailRow,
  right: CostDetailRow,
  key: CostDetailColumnKey,
  direction: CostDetailSortDirection,
) {
  if (key === "name") {
    const comparison = danishLabelCollator.compare(left.name, right.name);
    return direction === "asc" ? comparison : -comparison;
  }

  const comparison = compareNullableCostDetailNumbers(
    getNumericColumnValue(left, key),
    getNumericColumnValue(right, key),
    direction,
  );
  return comparison || danishLabelCollator.compare(left.name, right.name);
}

export function sortCostDetailRows(
  rows: ReadonlyArray<CostDetailRow>,
  key: CostDetailColumnKey,
  direction: CostDetailSortDirection,
) {
  return [...rows].sort((left, right) => (
    compareCostDetailRows(left, right, key, direction)
  ));
}

function formatCsvCell(row: CostDetailRow, key: CostDetailColumnKey) {
  const value = getCostDetailColumnValue(row, key);
  if (key === "name") return String(value ?? "");
  if (value === null || typeof value !== "number") return "";
  const normalizedValue = key === "share" || key === "changePercent"
    ? value * 100
    : value;
  return danishCsvNumber.format(normalizedValue);
}

export function buildCostDetailCsv(
  rows: ReadonlyArray<CostDetailRow>,
  selectedColumns: Iterable<CostDetailColumnKey>,
  availableColumns: Iterable<CostDetailColumnKey> = getAvailableCostDetailColumns(rows),
) {
  const visibleColumns = normalizeCostDetailColumnSelection(
    selectedColumns,
    availableColumns,
  );
  const headers = visibleColumns.map((key) => COST_DETAIL_COLUMN_DEFINITIONS[key].label);
  const csvRows = rows.map((row) => (
    visibleColumns.map((key) => formatCsvCell(row, key))
  ));
  return buildExcelCompatibleCsv([headers, ...csvRows]);
}
