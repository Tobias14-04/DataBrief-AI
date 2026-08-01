import { buildExcelCompatibleCsv, displayLabel, normalizeForComparison } from "./data-labels.ts";

export type CategoryMetricKey =
  | "revenue"
  | "revenueShare"
  | "grossProfit"
  | "grossMargin"
  | "cost"
  | "costShare";

export type CategoryColumnKey = "name" | CategoryMetricKey;
export type CategorySortDirection = "asc" | "desc";

export type CategoryMetricInput = {
  name: string;
  revenue: number;
  grossProfit: number;
  cost: number;
  rowCount?: number;
  grossProfitCount?: number;
  costCount?: number;
};

export type CategoryAnalysisRow = {
  name: string;
  revenue: number;
  revenueShare: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  cost: number | null;
  costShare: number | null;
  rowCount: number;
};

export const CATEGORY_METRIC_LABELS: Record<CategoryMetricKey, string> = {
  revenue: "Omsætning",
  revenueShare: "Andel",
  grossProfit: "Dækningsbidrag",
  grossMargin: "Dækningsgrad",
  cost: "Omkostninger",
  costShare: "Omkostningsandel",
};

export const CATEGORY_COLUMN_LABELS: Record<CategoryColumnKey, string> = {
  name: "Kategori",
  ...CATEGORY_METRIC_LABELS,
};

export const CATEGORY_COLUMN_ORDER = [
  "name",
  "revenue",
  "revenueShare",
  "grossProfit",
  "grossMargin",
  "cost",
  "costShare",
] as const satisfies ReadonlyArray<CategoryColumnKey>;

export const CATEGORY_PRIMARY_COLUMNS = [
  "name",
  "revenue",
  "revenueShare",
] as const satisfies ReadonlyArray<CategoryColumnKey>;

export const CATEGORY_OPTIONAL_COLUMNS = [
  "grossProfit",
  "grossMargin",
  "cost",
  "costShare",
] as const satisfies ReadonlyArray<CategoryColumnKey>;

const categoryColumnSet = new Set<string>(CATEGORY_COLUMN_ORDER);
const danishCategoryCollator = new Intl.Collator("da-DK", {
  numeric: true,
  sensitivity: "base",
});
const danishCsvNumber = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 8,
  useGrouping: false,
});

export const CATEGORY_GROSS_MARGIN_TIE_TOLERANCE = 0.0005;
export const CATEGORY_UNIFORM_GROSS_MARGIN_SPREAD = 0.005;
export const CATEGORY_SHARE_TIE_TOLERANCE = 1e-12;

function finiteOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function highestBy(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  key: CategoryMetricKey,
) {
  return rows.reduce<CategoryAnalysisRow | null>((highest, row) => {
    const value = row[key];
    if (value === null) return highest;
    if (!highest) return row;
    const highestValue = highest[key];
    return highestValue === null || value > highestValue ? row : highest;
  }, null);
}

function lowestBy(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  key: CategoryMetricKey,
) {
  return rows.reduce<CategoryAnalysisRow | null>((lowest, row) => {
    const value = row[key];
    if (value === null) return lowest;
    if (!lowest) return row;
    const lowestValue = lowest[key];
    return lowestValue === null || value < lowestValue ? row : lowest;
  }, null);
}

function metricTieTolerance(key: CategoryMetricKey) {
  if (key === "grossMargin") return CATEGORY_GROSS_MARGIN_TIE_TOLERANCE;
  if (key === "revenueShare" || key === "costShare") {
    return CATEGORY_SHARE_TIE_TOLERANCE;
  }
  return 0;
}

export function getCategoryMetricLeaders(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  key: CategoryMetricKey,
  tolerance = metricTieTolerance(key),
) {
  let highestValue: number | null = null;
  for (const row of rows) {
    const value = row[key];
    if (value === null) continue;
    if (highestValue === null || value > highestValue) highestValue = value;
  }
  if (highestValue === null) return [];

  return rows
    .filter((row) => {
      const value = row[key];
      if (value === null) return false;
      return tolerance > 0
        ? Math.abs(highestValue - value) < tolerance
        : value === highestValue;
    })
    .sort((left, right) => (
      compareNullableCategoryNumbers(left.revenue, right.revenue, "desc")
      || danishCategoryCollator.compare(left.name, right.name)
    ));
}

export function categoryPercentagesAreEquivalent(
  left: number | null,
  right: number | null,
  tolerance = CATEGORY_GROSS_MARGIN_TIE_TOLERANCE,
) {
  return left !== null
    && right !== null
    && Math.abs(left - right) < tolerance;
}

export function buildCategoryAnalysis(
  categories: ReadonlyArray<CategoryMetricInput>,
  options: {
    hasGrossProfit?: boolean;
    hasCosts?: boolean;
  } = {},
) {
  const hasGrossProfit = options.hasGrossProfit
    ?? categories.some((category) => (category.grossProfitCount ?? 1) > 0);
  const hasCosts = options.hasCosts
    ?? categories.some((category) => (category.costCount ?? 1) > 0);
  const normalized = categories
    .map((category) => {
      const name = displayLabel(category.name, "");
      const revenue = finiteOrNull(category.revenue) ?? 0;
      const rowCount = Math.max(0, Math.trunc(category.rowCount ?? 0));
      const grossProfitCount = Math.max(
        0,
        Math.trunc(category.grossProfitCount ?? (rowCount ? 0 : 1)),
      );
      const costCount = Math.max(
        0,
        Math.trunc(category.costCount ?? (rowCount ? 0 : 1)),
      );
      const grossProfitAvailable = hasGrossProfit
        && grossProfitCount > 0
        && (rowCount === 0 || grossProfitCount === rowCount);
      const costAvailable = hasCosts
        && costCount > 0
        && (rowCount === 0 || costCount === rowCount);
      return {
        name,
        revenue,
        grossProfit: grossProfitAvailable
          ? finiteOrNull(category.grossProfit)
          : null,
        cost: costAvailable ? finiteOrNull(category.cost) : null,
        rowCount,
      };
    })
    .filter((category) => category.name);
  const totalRevenue = normalized.reduce((sum, category) => sum + category.revenue, 0);
  const totalCosts = normalized.reduce((sum, category) => sum + (category.cost ?? 0), 0);
  const totalGrossProfit = normalized.reduce(
    (sum, category) => sum + (category.grossProfit ?? 0),
    0,
  );
  const hasCompleteCostCoverage = normalized.length > 0
    && normalized.every((category) => category.cost !== null);
  const rows: CategoryAnalysisRow[] = normalized.map((category) => ({
    ...category,
    revenueShare: totalRevenue !== 0 ? category.revenue / totalRevenue : null,
    grossMargin: category.grossProfit !== null && category.revenue > 0
      ? category.grossProfit / category.revenue
      : null,
    costShare: hasCompleteCostCoverage && category.cost !== null && totalCosts !== 0
      ? category.cost / totalCosts
      : null,
  }));
  const grossMarginRows = rows.filter((row) => row.grossMargin !== null);
  const grossMarginValues = grossMarginRows.map((row) => row.grossMargin as number);
  const highestGrossMarginValue = grossMarginValues.length
    ? Math.max(...grossMarginValues)
    : null;
  const lowestGrossMarginValue = grossMarginValues.length
    ? Math.min(...grossMarginValues)
    : null;
  const grossMarginVariation = highestGrossMarginValue !== null
    && lowestGrossMarginValue !== null
    ? highestGrossMarginValue - lowestGrossMarginValue
    : null;
  const comparableGrossMarginRevenue = grossMarginRows.reduce(
    (sum, row) => sum + row.revenue,
    0,
  );
  const comparableGrossProfit = grossMarginRows.reduce(
    (sum, row) => sum + (row.grossProfit ?? 0),
    0,
  );
  const aggregateGrossMargin = comparableGrossMarginRevenue > 0
    ? comparableGrossProfit / comparableGrossMarginRevenue
    : null;
  const largestRevenueShareLeaders = getCategoryMetricLeaders(rows, "revenueShare");
  const highestGrossMarginLeaders = getCategoryMetricLeaders(rows, "grossMargin");
  const largestCostShareLeaders = getCategoryMetricLeaders(rows, "costShare");

  return {
    rows,
    totalRevenue,
    totalCosts,
    totalGrossProfit,
    hasCategories: rows.length > 0,
    hasGrossProfit,
    hasCosts,
    hasCompleteCostCoverage,
    aggregateGrossMargin,
    grossMarginVariation,
    grossMarginCategoryCount: grossMarginRows.length,
    isGrossMarginUniform: grossMarginRows.length > 1
      && grossMarginVariation !== null
      && grossMarginVariation < CATEGORY_UNIFORM_GROSS_MARGIN_SPREAD,
    largestCategory: highestBy(rows, "revenue"),
    largestRevenueShare: largestRevenueShareLeaders[0] ?? null,
    largestRevenueShareLeaders,
    highestGrossMargin: highestGrossMarginLeaders[0] ?? null,
    highestGrossMarginLeaders,
    lowestGrossMargin: grossMarginRows.length > 1
      ? lowestBy(rows, "grossMargin")
      : null,
    largestCostShare: largestCostShareLeaders[0] ?? null,
    largestCostShareLeaders,
  };
}

export type CategoryAnalysis = ReturnType<typeof buildCategoryAnalysis>;

export function buildCategoryInsights(analysis: CategoryAnalysis) {
  const insights: string[] = [];
  const revenueLeader = analysis.largestRevenueShare;
  const marginLeader = analysis.highestGrossMargin;

  if (revenueLeader?.revenueShare !== null && revenueLeader && analysis.rows.length > 1) {
    const topTwoShare = sortCategoryRows(analysis.rows, "revenueShare", "desc")
      .slice(0, 2)
      .reduce((sum, row) => sum + (row.revenueShare ?? 0), 0);
    if (topTwoShare >= 0.6) {
      insights.push(
        `De to største kategorier samler ${formatInsightPercent(topTwoShare)} af omsætningen.`,
      );
    }
  }

  if (
    revenueLeader?.grossMargin !== null
    && revenueLeader
    && marginLeader?.grossMargin !== null
    && marginLeader
    && marginLeader.name !== revenueLeader.name
    && marginLeader.grossMargin > revenueLeader.grossMargin
  ) {
    const difference = marginLeader.grossMargin - revenueLeader.grossMargin;
    insights.push(
      `${marginLeader.name} har ${formatInsightPercentagePoints(difference)} højere dækningsgrad end den største kategori, ${revenueLeader.name}.`,
    );
  }

  if (insights.length < 2) {
    const costLeader = analysis.largestCostShare;
    if (
      costLeader?.costShare !== null
      && costLeader
      && costLeader.revenueShare !== null
      && costLeader.costShare - costLeader.revenueShare >= 0.05
    ) {
      insights.push(
        `${costLeader.name} står for en større del af omkostningerne end af omsætningen.`,
      );
    }
  }

  return insights.slice(0, 2);
}

function formatInsightPercent(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatInsightPercentagePoints(value: number) {
  return `${new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: 1,
  }).format(value * 100)} procentpoint`;
}

export function compareNullableCategoryNumbers(
  left: number | null,
  right: number | null,
  direction: CategorySortDirection,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = left === right ? 0 : left < right ? -1 : 1;
  return direction === "asc" ? comparison : -comparison;
}

export function sortCategoryRows(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  key: CategoryMetricKey,
  direction: CategorySortDirection,
) {
  return [...rows].sort((left, right) => (
    compareNullableCategoryNumbers(left[key], right[key], direction)
    || (key === "revenue"
      ? 0
      : compareNullableCategoryNumbers(left.revenue, right.revenue, "desc"))
    || danishCategoryCollator.compare(left.name, right.name)
  ));
}

export function filterCategoryRows(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  query: string,
) {
  const normalizedQuery = normalizeForComparison(query);
  if (!normalizedQuery) return [...rows];
  return rows.filter((row) => (
    normalizeForComparison(row.name).includes(normalizedQuery)
  ));
}

export function getAvailableCategoryColumns(
  analysis: Pick<CategoryAnalysis, "hasCategories" | "hasGrossProfit" | "hasCosts">,
) {
  return CATEGORY_COLUMN_ORDER.filter((key) => {
    if (key === "name" || key === "revenue" || key === "revenueShare") {
      return analysis.hasCategories;
    }
    if (key === "grossProfit" || key === "grossMargin") return analysis.hasGrossProfit;
    return analysis.hasCosts;
  });
}

export function isCategoryColumnKey(value: unknown): value is CategoryColumnKey {
  return typeof value === "string" && categoryColumnSet.has(value);
}

export function normalizeCategoryColumnSelection(
  selectedColumns: Iterable<CategoryColumnKey>,
  availableColumns: Iterable<CategoryColumnKey>,
) {
  const selected = new Set(selectedColumns);
  const available = new Set(availableColumns);
  CATEGORY_PRIMARY_COLUMNS.forEach((key) => {
    if (available.has(key)) selected.add(key);
  });
  return CATEGORY_COLUMN_ORDER.filter((key) => (
    available.has(key) && selected.has(key)
  ));
}

export function parseCategoryColumnSelection(
  serializedValue: string | null | undefined,
  availableColumns: Iterable<CategoryColumnKey>,
) {
  const available = [...availableColumns];
  if (!serializedValue) return available;
  try {
    const parsed: unknown = JSON.parse(serializedValue);
    if (!Array.isArray(parsed)) return available;
    return normalizeCategoryColumnSelection(
      parsed.filter(isCategoryColumnKey),
      available,
    );
  } catch {
    return available;
  }
}

export function serializeCategoryColumnSelection(
  selectedColumns: Iterable<CategoryColumnKey>,
  availableColumns: Iterable<CategoryColumnKey>,
) {
  return JSON.stringify(normalizeCategoryColumnSelection(
    selectedColumns,
    availableColumns,
  ));
}

function formatCategoryCsvValue(
  row: CategoryAnalysisRow,
  key: CategoryColumnKey,
) {
  if (key === "name") return row.name;
  const value = row[key];
  if (value === null) return "";
  const normalizedValue = key === "revenueShare"
    || key === "grossMargin"
    || key === "costShare"
    ? value * 100
    : value;
  return danishCsvNumber.format(normalizedValue);
}

export function buildCategoryCsv(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  selectedColumns: Iterable<CategoryColumnKey>,
  availableColumns: Iterable<CategoryColumnKey>,
) {
  const visibleColumns = normalizeCategoryColumnSelection(
    selectedColumns,
    availableColumns,
  );
  const headers = visibleColumns.map((key) => CATEGORY_COLUMN_LABELS[key]);
  const csvRows = rows.map((row) => (
    visibleColumns.map((key) => formatCategoryCsvValue(row, key))
  ));
  return buildExcelCompatibleCsv([headers, ...csvRows]);
}
