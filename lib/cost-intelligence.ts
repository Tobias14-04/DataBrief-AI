import {
  formatDanishCurrency,
  formatDanishCurrencyPrecise,
  formatDanishMonth,
  formatDanishPercent,
  monthSortKey,
} from "./dashboard-insights.ts";
import {
  chooseRepresentativeLabel,
  comparableLabel,
  normalizeForComparison,
} from "./data-labels.ts";

export const COST_BUDGET_THRESHOLDS = {
  materialOverrun: 0.08,
} as const;

export const COST_CHANGE_MINIMUM_BASE_SHARE = 0.005;
export const PROFITABILITY_MINIMUM_REVENUE_SHARE = 0.005;
export const PROFITABILITY_MINIMUM_ROWS = 2;
export const PROFITABILITY_RATE_LABEL = "Resultatgrad";
export const PROFITABILITY_VALUE_LABEL = "Resultat";

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
  budget: number | null;
  budgetVariance: number | null;
};

export type CostComparison = {
  currentPeriod: string;
  previousPeriod: string;
  currentCost: number;
  previousCost: number;
  costChange: number;
  costChangePercent: number | null;
  currentRevenue: number;
  previousRevenue: number;
  revenueChangePercent: number | null;
  costShareChange: number | null;
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
  budgetDistribution?: CostDistributionInput[];
  budgetBasis?: "registered" | "proportional";
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
  const utilization = safeRatio(actual, budget);
  const remaining = budget - actual;
  const status: CostBudgetStatus = variance <= 0
    ? "favorable"
    : variancePercent !== null && variancePercent <= COST_BUDGET_THRESHOLDS.materialOverrun
      ? "watch"
      : "critical";

  return { actual, budget, variance, variancePercent, utilization, remaining, status };
}

function addDimension(
  dimensions: Map<string, DimensionAccumulator>,
  rawName: string,
  values: Pick<DimensionAccumulator, "revenue" | "cost" | "grossProfit" | "units">,
) {
  const identity = comparableLabel(rawName);
  const current = dimensions.get(identity.key) ?? {
    name: identity.label,
    revenue: 0,
    cost: 0,
    grossProfit: 0,
    units: 0,
    rowCount: 0,
  };
  current.name = chooseRepresentativeLabel(current.name, identity.label);
  current.revenue += values.revenue;
  current.cost += values.cost;
  current.grossProfit += values.grossProfit;
  current.units += values.units;
  current.rowCount += 1;
  dimensions.set(identity.key, current);
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
  const changes = Array.from(names, (key) => {
    const currentGroup = current.get(key);
    const previousGroup = previous.get(key);
    const currentCost = currentGroup?.cost ?? 0;
    const previousCost = previousGroup?.cost ?? 0;
    const name = currentGroup && previousGroup
      ? chooseRepresentativeLabel(currentGroup.name, previousGroup.name)
      : currentGroup?.name ?? previousGroup?.name ?? key;
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

function groupDistributionInputs(items: CostDistributionInput[], includeZero = false) {
  const groups = new Map<string, CostDistributionInput>();
  items.forEach((item) => {
    if (!item.name.trim() || !Number.isFinite(item.cost) || (!includeZero && item.cost === 0)) return;
    const identity = comparableLabel(item.name);
    const current = groups.get(identity.key) ?? {
      name: identity.label,
      cost: 0,
    };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.cost += item.cost;
    groups.set(identity.key, current);
  });
  return groups;
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
  const providedDistributionGroups = groupDistributionInputs(options.distribution ?? []);
  const providedDistribution = Array.from(providedDistributionGroups.values());
  const budgetDistributionGroups = groupDistributionInputs(options.budgetDistribution ?? [], true);
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
  const comparison: CostComparison | null = hasRowCosts && latestAccumulator && previousAccumulator
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

  const hasProductDimension = products.size > 1
    && !products.has(normalizeForComparison("Ukategoriseret"));
  const profitabilityDimension = hasProductDimension ? "product" : "category";
  const profitability = hasRowCosts
    ? buildProfitability(
        hasProductDimension ? products : categories,
        totalRevenue,
      )
    : [];

  const budgetCosts = typeof options.budgetCosts === "number"
    && Number.isFinite(options.budgetCosts)
    && options.budgetCosts > 0
    ? options.budgetCosts
    : null;
  const budget = budgetCosts === null ? null : calculateCostBudgetVariance(totalCosts, budgetCosts);
  const detailBudget = (name: string, current: number) => {
    const budgetItem = budgetDistributionGroups.get(normalizeForComparison(name));
    const categoryBudget = budgetItem?.cost ?? null;
    return {
      budget: categoryBudget,
      budgetVariance: categoryBudget === null ? null : current - categoryBudget,
    };
  };

  const detailSource = providedDistribution.length
    ? distribution.map((item) => ({
        ...item,
        current: item.cost,
        previous: null,
        change: null,
        changePercent: null,
        ...detailBudget(item.name, item.cost),
      }))
    : comparison && latestAccumulator && previousAccumulator
      ? Array.from(new Set([
          ...latestAccumulator.categories.keys(),
          ...previousAccumulator.categories.keys(),
        ]))
          .map<CostDetailRow>((key) => {
            const currentGroup = latestAccumulator.categories.get(key);
            const previousGroup = previousAccumulator.categories.get(key);
            const name = currentGroup && previousGroup
              ? chooseRepresentativeLabel(currentGroup.name, previousGroup.name)
              : currentGroup?.name ?? previousGroup?.name ?? key;
            const current = currentGroup?.cost ?? 0;
            const previous = previousGroup?.cost ?? 0;
            const change = current - previous;
            return {
              name,
              cost: current,
              share: safeRatio(current, latestAccumulator.cost) ?? 0,
              current,
              previous,
              change,
              changePercent: reliableChangePercent(current, previous, comparison.previousCost),
              ...detailBudget(name, current),
            };
          })
          .sort((a, b) => Math.abs(b.current) - Math.abs(a.current))
      : distribution.map((item) => ({
          ...item,
          current: item.cost,
          previous: null,
          change: null,
          changePercent: null,
          ...detailBudget(item.name, item.cost),
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
    budgetBasis: options.budgetBasis ?? "registered" as const,
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

function signedCurrency(value: number) {
  if (value === 0) return formatDanishCurrency(0);
  return `${value > 0 ? "+" : "−"}${formatDanishCurrency(Math.abs(value))}`;
}

function signedPercent(value: number | null) {
  if (value === null) return "Ikke retvisende";
  if (value === 0) return formatDanishPercent(0);
  return `${value > 0 ? "+" : "−"}${formatDanishPercent(Math.abs(value))}`;
}

function movementText(subject: string, value: number, unchangedForm: "uændret" | "uændrede") {
  if (value === 0) return `${subject} var ${unchangedForm}`;
  return value > 0
    ? `${subject} steg ${formatDanishPercent(value)}`
    : `${subject} faldt ${formatDanishPercent(Math.abs(value))}`;
}

function roundedPercentTenths(value: number) {
  const rounded = Math.round(Math.abs(value) * 1_000 + Number.EPSILON) * (value < 0 ? -1 : 1);
  return rounded === 0 ? 0 : rounded;
}

function formatPercentagePoints(tenths: number) {
  return `${new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(tenths) / 10)} procentpoint`;
}

export function buildCostComparisonPresentation(comparison: CostComparison) {
  const costChangeTenths = comparison.costChangePercent === null
    ? null
    : roundedPercentTenths(comparison.costChangePercent);
  const revenueChangeTenths = comparison.revenueChangePercent === null
    ? null
    : roundedPercentTenths(comparison.revenueChangePercent);
  const percentagePointDifferenceTenths = costChangeTenths !== null
    && revenueChangeTenths !== null
    ? costChangeTenths - revenueChangeTenths
    : null;
  const percentagePointDifference = percentagePointDifferenceTenths === null
    ? null
    : percentagePointDifferenceTenths / 1_000;
  const roundedCostChange = costChangeTenths === null ? null : costChangeTenths / 1_000;
  const roundedRevenueChange = revenueChangeTenths === null ? null : revenueChangeTenths / 1_000;
  const costMovement = comparison.costChangePercent === null
    ? `Omkostningsændringen var ${signedCurrency(comparison.costChange)}, men procentændringen kan ikke beregnes`
    : movementText("Omkostningerne", roundedCostChange ?? 0, "uændrede");
  const revenueMovement = comparison.revenueChangePercent === null
    ? "omsætningsændringen kan ikke beregnes i procent"
    : movementText("omsætningen", roundedRevenueChange ?? 0, "uændret");

  let differenceText: string;
  if (
    percentagePointDifferenceTenths === null
    || costChangeTenths === null
    || revenueChangeTenths === null
  ) {
    differenceText = "Forskellen i udvikling kan ikke beregnes, fordi en tidligere periode har 0 som sammenligningsgrundlag.";
  } else if (percentagePointDifferenceTenths === 0) {
    differenceText = costChangeTenths > 0 && revenueChangeTenths > 0
      ? "Omkostninger og omsætning steg med samme procentvise hastighed."
      : costChangeTenths < 0 && revenueChangeTenths < 0
        ? "Omkostninger og omsætning faldt med samme procentvise hastighed."
        : "Omkostninger og omsætning var uændrede.";
  } else if (costChangeTenths > 0 && revenueChangeTenths > 0) {
    differenceText = `Omkostningerne steg ${formatPercentagePoints(percentagePointDifferenceTenths)} ${percentagePointDifferenceTenths > 0 ? "hurtigere" : "langsommere"} end omsætningen.`;
  } else if (costChangeTenths < 0 && revenueChangeTenths < 0) {
    differenceText = `Omkostningerne faldt ${formatPercentagePoints(percentagePointDifferenceTenths)} ${percentagePointDifferenceTenths < 0 ? "mere" : "mindre"} end omsætningen.`;
  } else {
    differenceText = `Omkostningernes procentvise udvikling var ${formatPercentagePoints(percentagePointDifferenceTenths)} ${percentagePointDifferenceTenths > 0 ? "højere" : "lavere"} end omsætningens.`;
  }

  return {
    periodLabel: `${comparison.previousPeriod} → ${comparison.currentPeriod}`,
    costChangeLabel: signedPercent(comparison.costChangePercent),
    revenueChangeLabel: signedPercent(comparison.revenueChangePercent),
    percentagePointDifference,
    differenceText,
    summary: `${costMovement}, mens ${revenueMovement}. ${differenceText}`,
  };
}

export function buildCostInsightSummary(analysis: CostIntelligence) {
  const insights: Array<{ priority: number; text: string }> = [];
  const topDriver = analysis.distribution[0];
  const largestAbsoluteChange = analysis.changeDrivers[0];
  const largestPercentageChange = [...analysis.changeDrivers]
    .filter((item) => item.changePercent !== null)
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0))[0];
  if (topDriver) {
    insights.push({
      priority: 100,
      text: `${topDriver.name} er den største omkostningsdriver med ${formatDanishCurrency(topDriver.cost)} og udgør ${formatDanishPercent(topDriver.share)} af de samlede registrerede omkostninger.`,
    });
  }
  if (largestAbsoluteChange) {
    const direction = largestAbsoluteChange.change > 0 ? "stigning" : "fald";
    insights.push({
      priority: 85,
      text: `${largestAbsoluteChange.name} står for den største absolutte omkostnings${direction} på ${formatDanishCurrency(Math.abs(largestAbsoluteChange.change))}.`,
    });
  }
  if (largestPercentageChange?.changePercent !== null && largestPercentageChange?.changePercent !== undefined) {
    const direction = largestPercentageChange.changePercent > 0 ? "stigning" : "nedgang";
    insights.push({
      priority: 75,
      text: `${largestPercentageChange.name} har den største pålidelige procentvise ${direction} på ${formatDanishPercent(Math.abs(largestPercentageChange.changePercent))}.`,
    });
  }
  if (analysis.budget) {
    const direction = analysis.budget.variance === 0
      ? "præcis på"
      : analysis.budget.variance < 0
        ? "under"
        : "over";
    const amount = analysis.budget.variance === 0
      ? ""
      : `${formatDanishCurrency(Math.abs(analysis.budget.variance))} `;
    insights.push({
      priority: analysis.budget.variance > 0 ? 95 : 82,
      text: `Omkostningerne ligger ${amount}${direction} omkostningsbudgettet.`,
    });
  }
  if (analysis.comparison) {
    const comparison = buildCostComparisonPresentation(analysis.comparison);
    insights.push({
      priority: 90,
      text: `Fra ${analysis.comparison.previousPeriod} til ${analysis.comparison.currentPeriod}: ${comparison.summary}`,
    });
  }
  if (analysis.costShare !== null) {
    insights.push({
      priority: 60,
      text: `Der anvendes ${formatDanishCurrencyPrecise(analysis.costShare)} i registrerede omkostninger pr. omsætningskrone.`,
    });
  }
  const lowest = analysis.profitability[0];
  if (lowest && lowest.margin !== null) {
    insights.push({
      priority: 70,
      text: `${lowest.name} har den laveste robuste rentabilitet i analysen med en resultatgrad på ${formatDanishPercent(lowest.margin)}.`,
    });
  }

  const leadingIncrease = analysis.changeDrivers.find((item) => item.change > 0);
  let recommendation: string | null = null;
  if (
    leadingIncrease
    && leadingIncrease.movementShare >= 0.1
    && analysis.comparison?.costChange
    && analysis.comparison.costChange > 0
  ) {
    recommendation = `Undersøg ${leadingIncrease.name} først, da området står for ${formatDanishPercent(leadingIncrease.movementShare)} af den samlede absolutte omkostningsbevægelse.`;
  } else if (analysis.budget && analysis.budget.variance > 0 && topDriver) {
    recommendation = `Start budgetopfølgningen med ${topDriver.name}, som er den største registrerede omkostningsdriver.`;
  } else if (lowest && lowest.margin !== null) {
    recommendation = `Gennemgå pris og registrerede omkostninger for ${lowest.name}, som har den laveste robuste resultatgrad i den aktuelle visning.`;
  }

  return {
    insights: insights
      .sort((left, right) => right.priority - left.priority)
      .map((insight) => insight.text)
      .slice(0, 7),
    recommendation,
  };
}

export function buildCostInsightDisclosure(
  insights: ReadonlyArray<string>,
  expanded: boolean,
  previewLimit = 4,
) {
  const safePreviewLimit = Math.max(1, Math.floor(previewLimit));
  const primaryInsights = insights.slice(0, safePreviewLimit);
  const additionalInsights = insights.slice(safePreviewLimit);
  const hasToggle = additionalInsights.length > 0;

  return {
    primaryInsights,
    additionalInsights,
    hasToggle,
    expanded: hasToggle && expanded,
    buttonLabel: hasToggle
      ? expanded ? "Vis færre" : `Vis alle ${insights.length} indsigter`
      : null,
  };
}
