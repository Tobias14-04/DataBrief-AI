import { formatDanishMonth, monthSortKey } from "./dashboard-insights.ts";
import {
  chooseRepresentativeLabel,
  comparableLabel,
} from "./data-labels.ts";
import { addGrossMarginRow, createGrossMarginBasis, resolveGrossMargin, type GrossMarginBasis } from "./gross-margin.ts";
import { isFiniteNumber } from "./numeric-foundation.ts";
import { resolveCostBasis, type WorkbookCostSource } from "./result-basis.ts";

export type DashboardMetricRow = {
  date: Date | null;
  month: string;
  product: string;
  category: string;
  revenue: number;
  units: number;
  grossProfit: number | null;
  grossMargin: number | null;
  cost: number | null;
  costScope?: "total" | "variable" | null;
  variableCost?: number | null;
};

type GroupedValue = {
  name: string;
  revenue: number;
  units: number;
  grossProfit: number;
  cost: number;
  grossMargin?: number;
  grossMarginCount?: number;
  weightedGrossMargin?: number;
  revenueCount?: number;
  rowCount?: number;
  grossProfitCount?: number;
  costCount?: number;
};

type MonthValue = GroupedValue & {
  sortKey: number;
};

type DashboardMetricFeedback = {
  costs?: WorkbookCostSource;
  budget?: { revenue: number; costs: number };
};

export function calculateDashboardMetrics(
  rows: DashboardMetricRow[],
  feedback?: DashboardMetricFeedback,
  options: { fullRows?: readonly DashboardMetricRow[]; budgetScale?: number } = {},
) {
  type GroupAccumulator = GroupedValue & {
    marginBasis: GrossMarginBasis;
  };

  const products = new Map<string, GroupAccumulator>();
  const categories = new Map<string, GroupAccumulator>();
  const months = new Map<string, MonthValue>();
  let totalRevenue = 0;
  let totalUnits = 0;
  let totalGrossProfit = 0;
  const marginBasis = createGrossMarginBasis();
  let hasGrossProfit = false;
  let hasGrossMargin = false;
  let hasProductData = false;
  let hasRevenueData = false;
  let hasUnitsData = false;

  function addGroup(groups: Map<string, GroupAccumulator>, rawKey: string, row: DashboardMetricRow) {
    const identity = comparableLabel(rawKey);
    const current = groups.get(identity.key) ?? {
      name: identity.label,
      revenue: 0,
      units: 0,
      grossProfit: 0,
      cost: 0,
      marginBasis: createGrossMarginBasis(),
      rowCount: 0,
      grossProfitCount: 0,
      costCount: 0,
    };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.revenue += isFiniteNumber(row.revenue) ? row.revenue : 0;
    current.units += row.units;
    current.grossProfit += isFiniteNumber(row.grossProfit) ? row.grossProfit : 0;
    current.cost += isFiniteNumber(row.cost) ? row.cost : 0;
    current.rowCount = (current.rowCount ?? 0) + 1;
    if (isFiniteNumber(row.grossProfit)) {
      current.grossProfitCount = (current.grossProfitCount ?? 0) + 1;
    }
    if (isFiniteNumber(row.cost)) {
      current.costCount = (current.costCount ?? 0) + 1;
    }
    addGrossMarginRow(current.marginBasis, row);
    groups.set(identity.key, current);
  }

  rows.forEach((row, index) => {
    totalRevenue += isFiniteNumber(row.revenue) ? row.revenue : 0;
    totalUnits += row.units;
    totalGrossProfit += isFiniteNumber(row.grossProfit) ? row.grossProfit : 0;
    if (isFiniteNumber(row.grossProfit)) hasGrossProfit = true;
    addGrossMarginRow(marginBasis, row);
    if (isFiniteNumber(row.grossMargin)) {
      hasGrossMargin = true;
    }
    if (row.product.trim()) hasProductData = true;
    if (Number.isFinite(row.revenue)) hasRevenueData = true;
    if (Number.isFinite(row.units)) hasUnitsData = true;

    addGroup(products, row.product, row);
    addGroup(categories, row.category, row);

    const parsedMonthSortKey = row.date
      ? new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime()
      : monthSortKey(row.month);
    const sortKey = parsedMonthSortKey ?? index;
    const displayMonth = formatDanishMonth(row.month || row.date || "Ukendt måned");
    const monthKey = parsedMonthSortKey !== null ? String(parsedMonthSortKey) : displayMonth;
    const currentMonth = months.get(monthKey) ?? {
      name: displayMonth,
      revenue: 0,
      units: 0,
      grossProfit: 0,
      cost: 0,
      sortKey,
    };
    currentMonth.revenue += row.revenue;
    currentMonth.units += row.units;
    currentMonth.grossProfit += row.grossProfit ?? 0;
    currentMonth.cost += row.cost ?? 0;
    months.set(monthKey, currentMonth);
  });

  const finalizeGroups = (groups: Map<string, GroupAccumulator>) =>
    Array.from(groups.values()).map(({ marginBasis: groupBasis, ...group }) => ({
      ...group,
      grossMargin: resolveGrossMargin(groupBasis).value ?? undefined,
      grossMarginCount: groupBasis.marginCount,
      weightedGrossMargin: groupBasis.weightedMargin,
      revenueCount: groupBasis.revenueCount,
    }));

  const grossMarginResult = resolveGrossMargin(marginBasis);
  const costBasis = resolveCostBasis(rows, { fullRows: options.fullRows, workbook: feedback?.costs });
  const totalCosts = costBasis.totalCosts;
  const actualResult = costBasis.result;
  const productValues = finalizeGroups(products);
  const categoryValues = finalizeGroups(categories).sort((a, b) => b.revenue - a.revenue);
  const productsByRevenue = [...productValues].sort((a, b) => b.revenue - a.revenue);
  const productsByUnits = [...productValues].sort((a, b) => b.units - a.units);
  const grossProfitByCategory = categoryValues
    .filter((category) => category.grossProfit !== 0)
    .sort((a, b) => b.grossProfit - a.grossProfit);
  const grossMarginByCategory = categoryValues
    .filter((category) => category.grossMargin !== undefined)
    .sort((a, b) => (b.grossMargin ?? 0) - (a.grossMargin ?? 0));
  const costsByCategory = categoryValues
    .filter((category) => category.cost !== 0)
    .sort((a, b) => b.cost - a.cost);
  const monthly = Array.from(months.values()).sort((a, b) => a.sortKey - b.sortKey);
  const monthsByRevenue = [...monthly].sort((a, b) => b.revenue - a.revenue);
  const budgetScale = options.budgetScale ?? 1;
  const budgetRevenue = (feedback?.budget?.revenue ?? 0) * budgetScale;
  const budgetCosts = (feedback?.budget?.costs ?? 0) * budgetScale;

  return {
    totalRevenue,
    totalUnits,
    totalGrossProfit,
    grossMargin: grossMarginResult.value,
    grossMarginReason: grossMarginResult.reason,
    grossMarginSource: grossMarginResult.source,
    hasGrossProfit,
    hasGrossMargin,
    hasCosts: costBasis.status === "available",
    costBasis,
    totalCosts,
    variableCosts: costBasis.variableCosts,
    actualResult,
    budgetRevenue,
    budgetCosts,
    budgetResult: budgetRevenue - budgetCosts,
    revenueVsBudget: feedback?.budget ? totalRevenue - budgetRevenue : 0,
    bestProduct: productsByRevenue[0],
    products: productsByRevenue,
    hasProductData,
    hasRevenueData,
    hasUnitsData,
    bestCategory: categoryValues[0],
    bestMonth: monthsByRevenue[0],
    monthly,
    productsByUnits: productsByUnits.slice(0, 8),
    categoryGroups: categoryValues,
    categories: categoryValues.slice(0, 8),
    grossProfitByCategory: grossProfitByCategory.slice(0, 8),
    grossMarginByCategory: grossMarginByCategory.slice(0, 8),
    costsByCategory: costsByCategory.slice(0, 8),
    rowCount: rows.length,
  };
}
