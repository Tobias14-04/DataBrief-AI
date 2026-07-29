import assert from "node:assert/strict";
import test from "node:test";

import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";

const rows = [
  {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Café latte",
    category: "Drikke",
    revenue: 100,
    units: 4,
    grossProfit: 60,
    grossMargin: 0.6,
    cost: 40,
  },
  {
    date: new Date(2026, 0, 12),
    month: "januar 2026",
    product: "Croissant",
    category: "Bagværk",
    revenue: 80,
    units: 5,
    grossProfit: 40,
    grossMargin: 0.5,
    cost: 40,
  },
  {
    date: new Date(2026, 1, 2),
    month: "februar 2026",
    product: "Café latte",
    category: "Drikke",
    revenue: 140,
    units: 6,
    grossProfit: 98,
    grossMargin: 0.7,
    cost: 42,
  },
];

test("dashboardets centrale aggregering beregner KPI'er og fordelinger i samme pipeline", () => {
  const metrics = calculateDashboardMetrics(rows);

  assert.equal(metrics.totalRevenue, 320);
  assert.equal(metrics.totalUnits, 15);
  assert.equal(metrics.totalGrossProfit, 198);
  assert.equal(metrics.totalCosts, 122);
  assert.equal(metrics.actualResult, 198);
  assert.equal(metrics.rowCount, 3);
  assert.equal(metrics.hasProductData, true);
  assert.equal(metrics.hasRevenueData, true);
  assert.equal(metrics.hasUnitsData, true);
  assert.equal(metrics.bestProduct.name, "Café latte");
  assert.deepEqual(metrics.products.map((product) => product.name), ["Café latte", "Croissant"]);
  assert.equal(metrics.bestCategory.name, "Drikke");
  assert.equal(metrics.categoryGroups.length, 2);
  assert.equal(metrics.categoryGroups[0].rowCount, 2);
  assert.equal(metrics.categoryGroups[0].grossProfitCount, 2);
  assert.equal(metrics.categoryGroups[0].costCount, 2);
  assert.equal(metrics.bestMonth.name, "januar 2026");
  assert.deepEqual(metrics.monthly.map((month) => month.revenue), [180, 140]);
  assert.deepEqual(metrics.productsByUnits.map((product) => product.name), ["Café latte", "Croissant"]);
});

test("budget og workbook-omkostninger skaleres som før ved en filtreret visning", () => {
  const feedback = {
    costs: { total: 500 },
    budget: { revenue: 1000, costs: 400 },
  };
  const fullMetrics = calculateDashboardMetrics(rows, feedback);
  const filteredMetrics = calculateDashboardMetrics(rows.slice(0, 1), feedback, {
    useWorkbookTotals: false,
    budgetScale: 0.25,
  });

  assert.equal(fullMetrics.totalCosts, 500);
  assert.equal(fullMetrics.budgetRevenue, 1000);
  assert.equal(fullMetrics.budgetCosts, 400);
  assert.equal(filteredMetrics.totalCosts, 40);
  assert.equal(filteredMetrics.budgetRevenue, 250);
  assert.equal(filteredMetrics.budgetCosts, 100);
  assert.equal(filteredMetrics.revenueVsBudget, -150);
});

test("dashboardgrupper bruger intern sammenligningsnøgle og original Unicode-label", () => {
  const variants = [
    { ...rows[0], product: "CAFÉ", category: "LØN" },
    { ...rows[0], product: "café", category: "løn" },
    { ...rows[0], product: "Café", category: "Løn" },
  ];
  const metrics = calculateDashboardMetrics(variants);

  assert.equal(metrics.categories.length, 1);
  assert.equal(metrics.categories[0].name, "Løn");
  assert.equal(metrics.categories[0].revenue, 300);
  assert.equal(metrics.costsByCategory[0].name, "Løn");
  assert.equal(metrics.bestProduct.name, "Café");
  assert.equal(metrics.bestProduct.name.includes("Cafe"), false);
});
