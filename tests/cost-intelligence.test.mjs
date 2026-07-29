import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  buildCostComparisonPresentation,
  buildCostIntelligence,
  buildCostInsightSummary,
  calculateCostBudgetVariance,
  PROFITABILITY_RATE_LABEL,
  resolveRegisteredCost,
  safeRatio,
} from "../lib/cost-intelligence.ts";
import {
  formatDanishCompactCurrency,
  formatDanishCurrencyPrecise,
  formatDanishPercentPrecise,
} from "../lib/dashboard-insights.ts";

function row(overrides = {}) {
  return {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Produkt A",
    category: "Kategori A",
    revenue: 200,
    units: 4,
    grossProfit: null,
    cost: 80,
    ...overrides,
  };
}

const comparisonRows = [
  row({ product: "Produkt A", category: "Løn", revenue: 200, cost: 80 }),
  row({ product: "Produkt B", category: "Marketing", revenue: 100, cost: 20 }),
  row({
    date: new Date(2026, 1, 5),
    month: "februar 2026",
    product: "Produkt A",
    category: "Løn",
    revenue: 240,
    units: 5,
    cost: 110,
  }),
  row({
    date: new Date(2026, 1, 6),
    month: "februar 2026",
    product: "Produkt B",
    category: "Marketing",
    revenue: 120,
    units: 3,
    cost: 15,
  }),
];

test("demodata med budget og omkostningskategorier bruger registrerede workbook-summer", () => {
  const analysis = buildCostIntelligence(comparisonRows, {
    totalCosts: 180,
    distribution: [
      { name: "Løn", cost: 120 },
      { name: "Marketing", cost: 60 },
    ],
    budgetCosts: 170,
  });

  assert.equal(analysis.totalCosts, 180);
  assert.equal(analysis.totalRevenue, 660);
  assert.equal(analysis.actualResult, 480);
  assert.equal(analysis.costShare, 180 / 660);
  assert.equal(analysis.distributionSource, "workbook");
  assert.equal(analysis.distribution[0].name, "Løn");
  assert.equal(analysis.budget?.variance, 10);
});

test("fil 07-lignende datasæt med 7.500 rækker aggregeres i en kompakt pipeline", () => {
  const rows = Array.from({ length: 7_500 }, (_, index) => {
    const month = index % 24;
    return row({
      date: new Date(2024 + Math.floor(month / 12), month % 12, 1),
      month: `${(month % 12) + 1}/${2024 + Math.floor(month / 12)}`,
      product: `Produkt ${index % 80}`,
      category: `Kategori ${index % 12}`,
      revenue: 100 + (index % 17),
      units: 1 + (index % 5),
      cost: 40 + (index % 11),
    });
  });
  const startedAt = performance.now();
  const analysis = buildCostIntelligence(rows);
  const duration = performance.now() - startedAt;

  assert.equal(analysis.rowCount, 7_500);
  assert.equal(analysis.periods.length, 24);
  assert.equal(analysis.distribution.length, 12);
  assert.ok(duration < 1_000, `Aggregeringen tog ${duration.toFixed(1)} ms`);
});

test("omkostninger uden budget skjuler budgetanalysen på dataniveau", () => {
  const analysis = buildCostIntelligence(comparisonRows);
  assert.equal(analysis.budget, null);
  assert.equal(analysis.hasCostTimeline, true);
});

test("omkostningsbudget uden navngivne kategorier bevares uden opdigtet fordeling", () => {
  const analysis = buildCostIntelligence([
    row({ category: "", cost: 90 }),
  ], { budgetCosts: 100 });

  assert.equal(analysis.budget?.status, "favorable");
  assert.deepEqual(analysis.distribution.map((item) => item.name), ["Ukategoriseret"]);
});

test("omsætning og omkostninger giver korrekt andel og resultat", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: 250, cost: 100 }),
    row({ revenue: 150, cost: 50 }),
  ]);

  assert.equal(analysis.totalRevenue, 400);
  assert.equal(analysis.totalCosts, 150);
  assert.equal(analysis.costShare, 0.375);
  assert.equal(analysis.actualResult, 250);
});

test("manglende omsætning giver ingen resultat- eller andelsberegning", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: Number.NaN, cost: 80 }),
  ]);

  assert.equal(analysis.hasRevenue, false);
  assert.equal(analysis.costShare, null);
  assert.equal(analysis.actualResult, null);
  assert.equal(analysis.efficiency.revenuePerCostKrone, null);
});

test("manglende antal giver ingen enhedsbaserede nøgletal", () => {
  const analysis = buildCostIntelligence([
    row({ units: Number.NaN, revenue: 200, cost: 80 }),
  ]);

  assert.equal(analysis.hasUnits, false);
  assert.equal(analysis.efficiency.costPerUnit, null);
  assert.equal(analysis.efficiency.resultPerUnit, null);
});

test("én måned viser ingen konstrueret sammenligningsperiode", () => {
  const analysis = buildCostIntelligence([
    row(),
    row({ product: "Produkt B", category: "Kategori B" }),
  ]);

  assert.equal(analysis.periods.length, 1);
  assert.equal(analysis.comparison, null);
  assert.equal(analysis.changeDrivers.length, 0);
  assert.equal(analysis.hasComparison, false);
});

test("mange måneder sorteres kronologisk og får forskudt, faktisk sammenligning", () => {
  const rows = Array.from({ length: 36 }, (_, index) => row({
    date: new Date(2023 + Math.floor(index / 12), index % 12, 1),
    month: `${(index % 12) + 1}/${2023 + Math.floor(index / 12)}`,
    revenue: 200 + index,
    cost: 80 + index,
  }));
  const analysis = buildCostIntelligence(rows);

  assert.equal(analysis.periods.length, 36);
  assert.ok(analysis.periods[0].sortKey < analysis.periods.at(-1).sortKey);
  assert.equal(analysis.periods.at(-1).previousCost, analysis.periods.at(-2).cost);
});

test("negative og tomme værdier skaber ikke NaN eller Infinity", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: -100, units: 0, cost: -20 }),
    row({ revenue: Number.NaN, units: Number.NaN, cost: null, grossProfit: null }),
  ], { budgetCosts: 0 });

  function inspect(value) {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const nested of Object.values(value)) inspect(nested);
  }

  inspect(analysis);
  assert.equal(analysis.budget, null);
  assert.equal(safeRatio(1, 0), null);
});

test("decimaltal fra dansk formatering bevarer præcisionen i beregningerne", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: 1_234.56, units: 10.5, cost: 456.78 }),
  ]);

  assert.equal(analysis.totalRevenue, 1_234.56);
  assert.equal(analysis.totalCosts, 456.78);
  assert.equal(analysis.efficiency.costPerUnit, 456.78 / 10.5);
});

test("budgetstatus, sammenligningsændringer og små procentgrundlag er robuste", () => {
  const favorable = calculateCostBudgetVariance(95, 100);
  const watch = calculateCostBudgetVariance(107, 100);
  const critical = calculateCostBudgetVariance(109, 100);
  const analysis = buildCostIntelligence([
    row({ category: "Stor", cost: 100 }),
    row({ category: "Lille", cost: 0.01 }),
    row({
      date: new Date(2026, 1, 1),
      month: "februar 2026",
      category: "Stor",
      cost: 130,
    }),
    row({
      date: new Date(2026, 1, 1),
      month: "februar 2026",
      category: "Lille",
      cost: 3,
    }),
  ]);

  assert.equal(favorable.status, "favorable");
  assert.equal(watch.status, "watch");
  assert.equal(critical.status, "critical");
  assert.ok(Math.abs((analysis.comparison?.costChange ?? 0) - 32.99) < 1e-9);
  assert.equal(analysis.changeDrivers[0].name, "Stor");
  assert.equal(analysis.changeDrivers.find((item) => item.name === "Lille")?.changePercent, null);
});

test("dækningsbidrag bruges som dokumenteret fallback for registreret omkostning", () => {
  const input = row({ revenue: 200, grossProfit: 125, cost: null });
  const analysis = buildCostIntelligence([input]);

  assert.equal(resolveRegisteredCost(input), 75);
  assert.equal(analysis.totalCosts, 75);
  assert.equal(analysis.totalGrossProfit, 125);
  assert.equal(analysis.hasGrossProfit, true);
});

test("Omkostninger-sidens KPI, fordeling, insights og tabel viser Løn med ø", () => {
  const analysis = buildCostIntelligence([
    row({ category: "LØN", product: "Månedsløn", cost: 70 }),
    row({ category: "løn", product: "MÅNEDSLØN", cost: 30 }),
    row({ category: "Råvarer", product: "Café", cost: 10 }),
    row({
      date: new Date(2026, 1, 5),
      month: "februar 2026",
      category: "Løn",
      product: "Månedsløn",
      cost: 120,
    }),
  ], {
    totalCosts: 240,
    distribution: [
      { name: "Lon", cost: 20 },
      { name: "LØN", cost: 80 },
      { name: "løn", cost: 120 },
      { name: "Løn", cost: 20 },
    ],
  });
  const summary = buildCostInsightSummary(analysis);

  assert.equal(analysis.distribution.length, 1);
  assert.equal(analysis.distribution[0].name, "Løn");
  assert.equal(analysis.distribution[0].cost, 240);
  assert.equal(analysis.detailRows[0].name, "Løn");
  assert.equal(analysis.changeDrivers[0].name, "Månedsløn");
  assert.equal(analysis.profitability[0].name, "Månedsløn");
  assert.equal(summary.insights[0].startsWith("Løn er den største omkostningsdriver"), true);
  assert.equal(summary.insights.some((insight) => insight.includes("Lon")), false);
});

test("57 procent omkostningsandel giver 0,57 kr. pr. omsætningskrone i indsigtsteksten", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: 1_000, units: 10, cost: 570 }),
  ]);
  const summary = buildCostInsightSummary(analysis);
  const costShareInsight = summary.insights.find((insight) => insight.includes("pr. omsætningskrone"));

  assert.equal(analysis.costShare, 0.57);
  assert.equal(
    costShareInsight,
    `Der anvendes ${formatDanishCurrencyPrecise(0.57)} i registrerede omkostninger pr. omsætningskrone.`,
  );
  assert.doesNotMatch(costShareInsight ?? "", /Der anvendes 1(?:,00)?(?:\u00a0| )kr\./);
});

test("effektivitets-KPI'er beregnes med fuld præcision og formateres med danske decimaler", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: 4_954, units: 100, cost: 2_824 }),
  ]);

  assert.equal(analysis.efficiency.costPerUnit, 2_824 / 100);
  assert.equal(analysis.efficiency.resultPerUnit, (4_954 - 2_824) / 100);
  assert.equal(analysis.efficiency.revenuePerCostKrone, 4_954 / 2_824);
  assert.equal(analysis.efficiency.costShare, 2_824 / 4_954);
  assert.equal(formatDanishCurrencyPrecise(analysis.efficiency.costPerUnit), "28,24 kr.");
  assert.equal(formatDanishCurrencyPrecise(analysis.efficiency.resultPerUnit), "21,30 kr.");
  assert.equal(formatDanishCurrencyPrecise(analysis.efficiency.revenuePerCostKrone), "1,75 kr.");
  assert.equal(formatDanishPercentPrecise(analysis.efficiency.costShare), "57,0 %");
  assert.equal(formatDanishCompactCurrency(18_827), "19 t.kr.");
});

test("rentabilitet bruger Resultatgrad og resultat divideret med omsætning", () => {
  const analysis = buildCostIntelligence([
    row({ product: "Café", revenue: 100, cost: 40 }),
    row({ product: "Café", revenue: 100, cost: 40 }),
  ]);
  const profitability = analysis.profitability[0];

  assert.equal(PROFITABILITY_RATE_LABEL, "Resultatgrad");
  assert.equal(profitability.contribution, profitability.revenue - profitability.cost);
  assert.equal(profitability.margin, profitability.contribution / profitability.revenue);
  assert.equal(profitability.margin, 0.6);
});

test("ændringspræsentationen sammenholder 7,2 og 7,3 procent med 0,1 procentpoint", () => {
  const presentation = buildCostComparisonPresentation({
    currentPeriod: "juni 2026",
    previousPeriod: "maj 2026",
    currentCost: 107.2,
    previousCost: 100,
    costChange: 7.2,
    costChangePercent: 0.072,
    currentRevenue: 107.3,
    previousRevenue: 100,
    revenueChangePercent: 0.073,
    costShareChange: null,
  });

  assert.equal(presentation.periodLabel, "maj 2026 → juni 2026");
  assert.equal(presentation.costChangeLabel, "+7,2 %");
  assert.equal(presentation.revenueChangeLabel, "+7,3 %");
  assert.ok(Math.abs((presentation.percentagePointDifference ?? 0) - (-0.001)) < 1e-12);
  assert.equal(
    presentation.differenceText,
    "Omkostningerne steg 0,1 procentpoint langsommere end omsætningen.",
  );
});

test("ændringspræsentationen håndterer fald, uændret udvikling og nulgrundlag", () => {
  const falling = buildCostComparisonPresentation({
    currentPeriod: "juni 2026",
    previousPeriod: "maj 2026",
    currentCost: 90,
    previousCost: 100,
    costChange: -10,
    costChangePercent: -0.1,
    currentRevenue: 95,
    previousRevenue: 100,
    revenueChangePercent: -0.05,
    costShareChange: null,
  });
  const unchanged = buildCostComparisonPresentation({
    currentPeriod: "juni 2026",
    previousPeriod: "maj 2026",
    currentCost: 100,
    previousCost: 100,
    costChange: 0,
    costChangePercent: 0,
    currentRevenue: 100,
    previousRevenue: 100,
    revenueChangePercent: 0,
    costShareChange: 0,
  });
  const zeroBasis = buildCostComparisonPresentation({
    currentPeriod: "juni 2026",
    previousPeriod: "maj 2026",
    currentCost: 10,
    previousCost: 0,
    costChange: 10,
    costChangePercent: null,
    currentRevenue: 20,
    previousRevenue: 0,
    revenueChangePercent: null,
    costShareChange: null,
  });

  assert.equal(
    falling.differenceText,
    "Omkostningerne faldt 5,0 procentpoint mere end omsætningen.",
  );
  assert.match(unchanged.summary, /Omkostningerne udviklede sig ikke, mens omsætningen udviklede sig ikke/);
  assert.equal(
    unchanged.differenceText,
    "Omkostninger og omsætning udviklede sig med samme procentvise hastighed.",
  );
  assert.equal(zeroBasis.costChangeLabel, "Ikke retvisende");
  assert.equal(zeroBasis.revenueChangeLabel, "Ikke retvisende");
  assert.equal(zeroBasis.percentagePointDifference, null);
  assert.match(zeroBasis.differenceText, /0 som sammenligningsgrundlag/);
  assert.doesNotMatch(zeroBasis.summary, /NaN|Infinity/);
});

test("budgetanalyse beregner afvigelse, udnyttelse, resterende beløb og statusgrænser", () => {
  const underBudget = calculateCostBudgetVariance(97.1, 100);
  const exactBudget = calculateCostBudgetVariance(100, 100);
  const watchBoundary = calculateCostBudgetVariance(108, 100);
  const overBoundary = calculateCostBudgetVariance(108.01, 100);

  assert.ok(Math.abs(underBudget.variance - (-2.9)) < 1e-12);
  assert.ok(Math.abs((underBudget.variancePercent ?? 0) - (-0.029)) < 1e-12);
  assert.equal(underBudget.utilization, 0.971);
  assert.ok(Math.abs(underBudget.remaining - 2.9) < 1e-12);
  assert.equal(underBudget.status, "favorable");
  assert.equal(exactBudget.remaining, 0);
  assert.equal(exactBudget.status, "favorable");
  assert.equal(watchBoundary.variancePercent, 0.08);
  assert.equal(watchBoundary.status, "watch");
  assert.equal(overBoundary.status, "critical");
});

test("nul omkostninger giver ingen opdigtet omsætning pr. omkostningskrone", () => {
  const analysis = buildCostIntelligence([
    row({ revenue: 1_000, units: 10, cost: 0 }),
  ]);

  assert.equal(analysis.totalCosts, 0);
  assert.equal(analysis.costShare, 0);
  assert.equal(analysis.efficiency.costPerUnit, 0);
  assert.equal(analysis.efficiency.resultPerUnit, 100);
  assert.equal(analysis.efficiency.revenuePerCostKrone, null);
  assert.equal(analysis.distribution.length, 0);
});

test("registrerede kategoribudgetter tilføjer budget og afvigelse til detaljerne", () => {
  const analysis = buildCostIntelligence([
    row({ category: "Løn", cost: 70 }),
    row({ category: "Råvarer", cost: 30 }),
  ], {
    budgetCosts: 105,
    budgetDistribution: [
      { name: "LØN", cost: 80 },
      { name: "Råvarer", cost: 25 },
    ],
  });
  const salary = analysis.detailRows.find((item) => item.name === "Løn");
  const materials = analysis.detailRows.find((item) => item.name === "Råvarer");

  assert.equal(salary?.budget, 80);
  assert.equal(salary?.budgetVariance, -10);
  assert.equal(materials?.budget, 25);
  assert.equal(materials?.budgetVariance, 5);
});

test("ekstern fordeling uden rækkeomkostninger fabrikkerer ikke sammenligning eller rentabilitet", () => {
  const analysis = buildCostIntelligence([
    row({ cost: null, grossProfit: null }),
    row({
      date: new Date(2026, 1, 5),
      month: "februar 2026",
      product: "Produkt B",
      category: "Kategori B",
      cost: null,
      grossProfit: null,
    }),
  ], {
    totalCosts: 180,
    distribution: [
      { name: "Løn", cost: 120 },
      { name: "Marketing", cost: 60 },
    ],
  });

  assert.equal(analysis.hasRowCosts, false);
  assert.equal(analysis.hasComparison, false);
  assert.equal(analysis.comparison, null);
  assert.deepEqual(analysis.changeDrivers, []);
  assert.deepEqual(analysis.profitability, []);
  assert.equal(analysis.hasCostTimeline, false);
});
