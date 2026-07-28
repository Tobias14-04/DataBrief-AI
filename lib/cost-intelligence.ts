import { formatDanishMonth, monthSortKey } from "./dashboard-insights.ts";

export const COST_BUDGET_THRESHOLDS = {
  materialOverrun: 0.08,
} as const;

export const COST_CHANGE_MINIMUM_BASE_SHARE = 0.005;
export const PROFITABILITY_MINIMUM_REVENUE_SHARE = 0.005;
export const PROFITABILITY_MINIMUM_ROWS = 2;

export type CostIntelligenceRow = {
  date: Date | null;
  month: string;
  product: string;
  category: string;
  revenue: number;
  units: number;
  grossProfit: number | null;
  cost: number | null;
};

export type CostDistributionInput = {
  name: string;
  cost: number;
};

export type CostBudgetStatus = "favorable" | "watch" | "critical";

export type CostPeriod = {
  name: string;
  sortKey: number;
  revenue: number;
  cost: number;
  result: number;
  grossProfit: number;
  units: number;
  rowCount: number;
  costShare: number | null;
  previousCost: number | null;
};

export type CostDistributionItem = {
  name: string;
  cost: number;
  share: number;
};

export type CostChangeDriver = {
  name: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number | null;
  movementShare: number;
};

export type ProfitabilityItem = {
  name: string;
  revenue: number;
  cost: number;
  contribution: number;
  margin: number | null;
  units: number;
  rowCount: number;
};

export type CostDetailRow = CostDistributionItem & {
  current: number;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
};

type DimensionAccumulator = {
  name: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  units: number;
  rowCount: number;
};

type PeriodAccumulator = Omit<CostPeriod, "result" | "costShare" | "previousCost"> & {
  categories: Map<string, DimensionAccumulator>;
  products: Map<string, DimensionAccumulator>;
};

export type CostIntelligenceOptions = {
  totalCosts?: number | null;
  distribution?: CostDistributionInput[];
  budgetCosts?: number | null;
};

function finiteOrZero(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function resolveRegisteredCost(row: CostIntelligenceRow) {
  if (typeof row.grossProfit === "number" && Number.isFinite(row.grossProfit) && Number.isFinite(row.revenue)) {
    return row.revenue - row.grossProfit;
  }
  if (typeof row.cost === "number" && Number.isFinite(row.cost)) {
    return row.cost;
  }
  return null;
}

export function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

export function calculateCostBudgetVariance(actual: number, budget: number) {
  const variance = actual - budget;
  const variancePercent = safeRatio(variance, budget);
  const status: CostBudgetStatus = variance <= 0
    ? "favorable"
    : variancePercent !== null && variancePercent <= COST_BUDGET_THRESHOLDS.materialOverrun
      ? "watch"
      : "critical";

  return { actual, budget, variance, variancePercent, status };
}

function addDimension(
  dimensions: Map<string, DimensionAccumulator>,
  rawName: string,
  values: Pick<DimensionAccumulator, "revenue" | "cost" | "grossProfit" | "units">,
) {
  const name = rawName.trim() || "Ukategoriseret";
  const current = dimensions.get(name) ?? {
    name,
    revenue: 0,
    cost: 0,
    grossProfit: 0,
    units: 0,
    rowCount: 0,
  };
  current.revenue += values.revenue;
  current.cost += values.cost;
  current.grossProfit += values.grossProfit;
  current.units += values.units;
  current.rowCount += 1;
  dimensions.set(name, current);
}

function periodIdentity(row: CostIntelligenceRow, index: number) {
  const parsedSortKey = row.date && !Number.isNaN(row.date.getTime())
    ? new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime()
    : monthSortKey(row.month);
  const name = formatDanishMonth(row.month || row.date || "Ukendt måned");
  return {
    key: parsedSortKey === null ? name || `Ukendt-${index}` : String(parsedSortKey),
    name,
    sortKey: parsedSortKey ?? index,
  };
}

function dimensionValues(dimensions: Map<string, DimensionAccumulator>) {
  return Array.from(dimensions.values());
}

function reliableChangePercent(current: number, previous: number, comparisonTotal: number) {
  const minimumBase = Math.max(1, Math.abs(comparisonTotal) * COST_CHANGE_MINIMUM_BASE_SHARE);
  return Math.abs(previous) >= minimumBase ? safeRatio(current - previous, Math.abs(previous)) : null;
}

function buildChangeDrivers(
  current: Map<string, DimensionAccumulator>,
  previous: Map<string, DimensionAccumulator>,
  comparisonTotal: number,
) {
  const names = new Set([...current.keys(), ...previous.keys()]);
  const changes = Array.from(names, (name) => {
    const currentCost = current.get(name)?.cost ?? 0;
    const previousCost = previous.get(name)?.cost ?? 0;
    return {
      name,
      current: currentCost,
      previous: previousCost,
      change: currentCost - previousCost,
      changePercent: reliableChangePercent(currentCost, previousCost, comparisonTotal),
      movementShare: 0,
    };
  }).filter((item) => item.change !== 0);

  const totalMovement = changes.reduce((sum, item) => sum + Math.abs(item.change), 0);
  return changes
    .map((item) => ({
      ...item,
      movementShare: totalMovement ? Math.abs(item.change) / totalMovement : 0,
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

function buildProfitability(
  dimensions: Map<string, DimensionAccumulator>,
  totalRevenue: number,
) {
  const minimumRevenue = Math.max(1, Math.abs(totalRevenue) * PROFITABILITY_MINIMUM_REVENUE_SHARE);
  return dimensionValues(dimensions)
    .filter((item) => item.rowCount >= PROFITABILITY_MINIMUM_ROWS && Math.abs(item.revenue) >= minimumRevenue)
    .map<ProfitabilityItem>((item) => ({
      name: item.name,
      revenue: item.revenue,
      cost: item.cost,
      contribution: item.revenue - item.cost,
      margin: safeRatio(item.revenue - item.cost, item.revenue),
      units: item.units,
      rowCount: item.rowCount,
    }))
    .sort((a, b) => {
      const marginA = a.margin ?? Number.POSITIVE_INFINITY;
      const marginB = b.margin ?? Number.POSITIVE_INFINITY;
      return marginA - marginB || a.contribution - b.contribution;
    });
}

export function buildCostIntelligence(
  rows: CostIntelligenceRow[],
  options: CostIntelligenceOptions = {},
) {
  const categories = new Map<string, DimensionAccumulator>();
  const products = new Map<string, DimensionAccumulator>();
  const periods = new Map<string, PeriodAccumulator>();
  let trackedCosts = 0;
  let totalRevenue = 0;
  let totalUnits = 0;
  let totalGrossProfit = 0;
  let hasRowCosts = false;
  let hasRevenue = false;
  let hasUnits = false;
  let hasGrossProfit = false;

  rows.forEach((row, index) => {
    const revenue = finiteOrZero(row.revenue);
    const units = finiteOrZero(row.units);
    const grossProfit = finiteOrZero(row.grossProfit);
    const resolvedCost = resolveRegisteredCost(row);
    const cost = resolvedCost ?? 0;
    const identity = periodIdentity(row, index);
    const period = periods.get(identity.key) ?? {
      name: identity.name,
      sortKey: identity.sortKey,
      revenue: 0,
      cost: 0,
      grossProfit: 0,
      units: 0,
      rowCount: 0,
      categories: new Map<string, DimensionAccumulator>(),
      products: new Map<string, DimensionAccumulator>(),
    };

    hasRevenue ||= Number.isFinite(row.revenue);
    hasUnits ||= Number.isFinite(row.units);
    hasGrossProfit ||= typeof row.grossProfit === "number" && Number.isFinite(row.grossProfit);
    hasRowCosts ||= resolvedCost !== null;
    trackedCosts += cost;
    totalRevenue += revenue;
    totalUnits += units;
    totalGrossProfit += grossProfit;

    period.revenue += revenue;
    period.cost += cost;
    period.grossProfit += grossProfit;
    period.units += units;
    period.rowCount += 1;

    const dimensionValuesForRow = { revenue, cost, grossProfit, units };
    addDimension(categories, row.category, dimensionValuesForRow);
    addDimension(products, row.product, dimensionValuesForRow);
    addDimension(period.categories, row.category, dimensionValuesForRow);
    addDimension(period.products, row.product, dimensionValuesForRow);
    periods.set(identity.key, period);
  });

  const periodAccumulators = Array.from(periods.values()).sort((a, b) => a.sortKey - b.sortKey);
  const periodSeries: CostPeriod[] = periodAccumulators.map((period, index) => ({
    name: period.name,
    sortKey: period.sortKey,
    revenue: period.revenue,
    cost: period.cost,
    result: period.revenue - period.cost,
    grossProfit: period.grossProfit,
    units: period.units,
    rowCount: period.rowCount,
    costShare: hasRevenue ? safeRatio(period.cost, period.revenue) : null,
    previousCost: index > 0 ? periodAccumulators[index - 1]?.cost ?? null : null,
  }));

  const providedTotal = typeof options.totalCosts === "number" && Number.isFinite(options.totalCosts)
    ? options.totalCosts
    : null;
  const totalCosts = providedTotal ?? trackedCosts;
  const actualResult = hasRevenue ? totalRevenue - totalCosts : null;
  const costShare = hasRevenue ? safeRatio(totalCosts, totalRevenue) : null;
  const providedDistribution = (options.distribution ?? [])
    .filter((item) => item.name.trim() && Number.isFinite(item.cost) && item.cost !== 0)
    .map((item) => ({ name: item.name.trim(), cost: item.cost }));
  const rawDistribution = providedDistribution.length
    ? providedDistribution
    : dimensionValues(categories)
        .filter((item) => item.cost !== 0)
        .map((item) => ({ name: item.name, cost: item.cost }));
  const distributionTotal = rawDistribution.reduce((sum, item) => sum + item.cost, 0);
  const distribution: CostDistributionItem[] = rawDistribution
    .map((item) => ({
      ...item,
      share: safeRatio(item.cost, distributionTotal) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.cost) - Math.abs(a.cost));

  const latestAccumulator = periodAccumulators.at(-1) ?? null;
  const previousAccumulator = periodAccumulators.at(-2) ?? null;
  const latestCostShare = latestAccumulator && hasRevenue
    ? safeRatio(latestAccumulator.cost, latestAccumulator.revenue)
    : null;
  const previousCostShare = previousAccumulator && hasRevenue
    ? safeRatio(previousAccumulator.cost, previousAccumulator.revenue)
    : null;
  const comparison = latestAccumulator && previousAccumulator
    ? {
        currentPeriod: latestAccumulator.name,
        previousPeriod: previousAccumulator.name,
        currentCost: latestAccumulator.cost,
        previousCost: previousAccumulator.cost,
        costChange: latestAccumulator.cost - previousAccumulator.cost,
        costChangePercent: safeRatio(latestAccumulator.cost - previousAccumulator.cost, Math.abs(previousAccumulator.cost)),
        currentRevenue: latestAccumulator.revenue,
        previousRevenue: previousAccumulator.revenue,
        revenueChangePercent: hasRevenue
          ? safeRatio(latestAccumulator.revenue - previousAccumulator.revenue, Math.abs(previousAccumulator.revenue))
          : null,
        costShareChange: latestCostShare !== null && previousCostShare !== null
          ? latestCostShare - previousCostShare
          : null,
      }
    : null;

  const useCategoryChanges = Boolean(latestAccumulator && latestAccumulator.categories.size > 1);
  const currentChangeDimension = latestAccumulator
    ? (useCategoryChanges ? latestAccumulator.categories : latestAccumulator.products)
    : new Map<string, DimensionAccumulator>();
  const previousChangeDimension = previousAccumulator
    ? (useCategoryChanges ? previousAccumulator.categories : previousAccumulator.products)
    : new Map<string, DimensionAccumulator>();
  const changeDrivers = comparison
    ? buildChangeDrivers(currentChangeDimension, previousChangeDimension, comparison.previousCost)
    : [];

  const hasProductDimension = products.size > 1 && !products.has("Ukategoriseret");
  const profitabilityDimension = hasProductDimension ? "product" : "category";
  const profitability = buildProfitability(
    hasProductDimension ? products : categories,
    totalRevenue,
  );

  const budgetCosts = typeof options.budgetCosts === "number"
    && Number.isFinite(options.budgetCosts)
    && options.budgetCosts > 0
    ? options.budgetCosts
    : null;
  const budget = budgetCosts === null ? null : calculateCostBudgetVariance(totalCosts, budgetCosts);

  const detailSource = providedDistribution.length
    ? distribution.map((item) => ({
        ...item,
        current: item.cost,
        previous: null,
        change: null,
        changePercent: null,
      }))
    : comparison && latestAccumulator && previousAccumulator
      ? Array.from(new Set([
          ...latestAccumulator.categories.keys(),
          ...previousAccumulator.categories.keys(),
        ]))
          .map<CostDetailRow>((name) => {
            const current = latestAccumulator.categories.get(name)?.cost ?? 0;
            const previous = previousAccumulator.categories.get(name)?.cost ?? 0;
            const change = current - previous;
            return {
              name,
              cost: current,
              share: safeRatio(current, latestAccumulator.cost) ?? 0,
              current,
              previous,
              change,
              changePercent: reliableChangePercent(current, previous, comparison.previousCost),
            };
          })
          .sort((a, b) => Math.abs(b.current) - Math.abs(a.current))
      : distribution.map((item) => ({
          ...item,
          current: item.cost,
          previous: null,
          change: null,
          changePercent: null,
        }));

  const efficiency = {
    costPerUnit: hasUnits ? safeRatio(totalCosts, totalUnits) : null,
    resultPerUnit: hasUnits && actualResult !== null ? safeRatio(actualResult, totalUnits) : null,
    revenuePerCostKrone: hasRevenue ? safeRatio(totalRevenue, totalCosts) : null,
    costShare,
  };

  return {
    rowCount: rows.length,
    hasRowCosts,
    hasRevenue,
    hasUnits,
    hasGrossProfit,
    totalRevenue,
    totalUnits,
    totalGrossProfit,
    trackedCosts,
    totalCosts,
    actualResult,
    costShare,
    periods: periodSeries,
    distribution,
    distributionSource: providedDistribution.length ? "workbook" as const : "rows" as const,
    comparison,
    changeDimension: useCategoryChanges ? "category" as const : "product" as const,
    changeDrivers,
    budget,
    efficiency,
    profitabilityDimension,
    profitability,
    profitabilityMinimumRevenue: Math.max(1, Math.abs(totalRevenue) * PROFITABILITY_MINIMUM_REVENUE_SHARE),
    detailRows: detailSource,
    hasCostTimeline: hasRowCosts && periodSeries.length > 0,
    hasComparison: Boolean(comparison),
    costCoverageRatio: totalCosts ? safeRatio(trackedCosts, totalCosts) : null,
  };
}

export type CostIntelligence = ReturnType<typeof buildCostIntelligence>;
