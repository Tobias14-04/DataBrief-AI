import { formatDanishMonth, monthSortKey } from "./dashboard-insights.ts";
import {
  chooseRepresentativeLabel,
  comparableLabel,
} from "./data-labels.ts";

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
};

type GroupedValue = {
  name: string;
  revenue: number;
  units: number;
  grossProfit: number;
  cost: number;
  grossMargin?: number;
};

type MonthValue = GroupedValue & {
  sortKey: number;
};

type DashboardMetricFeedback = {
  costs?: { total: number };
  budget?: { revenue: number; costs: number };
};

export function calculateDashboardMetrics(
  rows: DashboardMetricRow[],
  feedback?: DashboardMetricFeedback,
  options: { useWorkbookTotals?: boolean; budgetScale?: number } = {},
) {
  type GroupAccumulator = GroupedValue & {
    grossMarginTotal: number;
    grossMarginCount: number;
  };

  const products = new Map<string, GroupAccumulator>();
  const categories = new Map<string, GroupAccumulator>();
  const months = new Map<string, MonthValue>();
  let totalRevenue = 0;
  let totalUnits = 0;
  let totalGrossProfit = 0;
  let grossMarginTotal = 0;
  let grossMarginCount = 0;
  let rowCosts = 0;
  let hasGrossProfit = false;
  let hasGrossMargin = false;
  let hasRowCosts = false;

  function addGroup(groups: Map<string, GroupAccumulator>, rawKey: string, row: DashboardMetricRow) {
    const identity = comparableLabel(rawKey);
    const current = groups.get(identity.key) ?? {
      name: identity.label,
      revenue: 0,
      units: 0,
      grossProfit: 0,
      cost: 0,
      grossMarginTotal: 0,
      grossMarginCount: 0,
    };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.revenue += row.revenue;
    current.units += row.units;
    current.grossProfit += row.grossProfit ?? 0;
    current.cost += row.grossProfit !== null ? row.revenue - row.grossProfit : (row.cost ?? 0);
    if (row.grossMargin !== null) {
      current.grossMarginTotal += row.grossMargin;
      current.grossMarginCount += 1;
    }
    groups.set(identity.key, current);
  }

  rows.forEach((row, index) => {
    totalRevenue += row.revenue;
    totalUnits += row.units;
    totalGrossProfit += row.grossProfit ?? 0;
    if (row.grossProfit !== null) hasGrossProfit = true;
    if (row.grossMargin !== null) {
      hasGrossMargin = true;
      grossMarginTotal += row.grossMargin;
      grossMarginCount += 1;
    }
    if (row.cost !== null || row.grossProfit !== null) hasRowCosts = true;
    rowCosts += row.grossProfit !== null ? row.revenue - row.grossProfit : (row.cost ?? 0);

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
    Array.from(groups.values()).map(({ grossMarginTotal: marginTotal, grossMarginCount: marginCount, ...group }) => ({
      ...group,
      grossMargin: marginCount ? marginTotal / marginCount : undefined,
    }));

  const weightedGrossMargin = totalRevenue ? totalGrossProfit / totalRevenue : 0;
  const averageGrossMargin = grossMarginTotal / Math.max(grossMarginCount, 1);
  const totalCosts = options.useWorkbookTotals !== false && feedback?.costs ? feedback.costs.total : rowCosts;
  const actualResult = totalRevenue - totalCosts;
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
    grossMargin: hasGrossProfit ? weightedGrossMargin : averageGrossMargin,
    hasGrossProfit,
    hasGrossMargin,
    hasCosts: Boolean((options.useWorkbookTotals !== false && feedback?.costs) || hasRowCosts),
    totalCosts,
    actualResult,
    budgetRevenue,
    budgetCosts,
    budgetResult: budgetRevenue - budgetCosts,
    revenueVsBudget: feedback?.budget ? totalRevenue - budgetRevenue : 0,
    bestProduct: productsByRevenue[0],
    bestCategory: categoryValues[0],
    bestMonth: monthsByRevenue[0],
    monthly,
    productsByUnits: productsByUnits.slice(0, 8),
    categories: categoryValues.slice(0, 8),
    grossProfitByCategory: grossProfitByCategory.slice(0, 8),
    grossMarginByCategory: grossMarginByCategory.slice(0, 8),
    costsByCategory: costsByCategory.slice(0, 8),
    rowCount: rows.length,
  };
}
