import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import {
  buildCostIntelligence,
  buildCostInsightSummary,
  calculateCostBudgetVariance,
  resolveRegisteredCost,
  safeRatio,
} from "../lib/cost-intelligence.ts";

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
