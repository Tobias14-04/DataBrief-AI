import assert from "node:assert/strict";
import test from "node:test";

import { buildMonthlyReport } from "../lib/dashboard-insights.ts";
import { calculateDashboardMetrics, documentedMonthlyCost, documentedMonthlyCostLabel } from "../lib/dashboard-metrics.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildManagementReport } from "../lib/management-report.ts";
import { createEmptyAnalysisPreferences } from "../lib/analysis-preferences.ts";

const budget = { revenue: 113_325_710.98, costs: 0 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0001, `${actual} ≠ ${expected}`);

function row(month, revenue, overrides = {}) {
  return {
    date: new Date(month === "december 2025" ? 2025 : 2026, month === "december 2025" ? 11 : 0, 15),
    month, product: "A", category: "A", channel: "Online", region: "Nord",
    revenue, units: 1, grossProfit: revenue - 40, grossMargin: null,
    cost: 40, costScope: "variable", variableCost: 40, ...overrides,
  };
}

function verifyBudgetAcrossViews(fullRows, scopedRows, scopeBudget) {
  const dashboard = calculateDashboardMetrics(scopedRows, { budget: scopeBudget }, { fullRows });
  const month = buildMonthlyReport({
    month: "december 2025", revenue: dashboard.totalRevenue, rowCount: dashboard.rowCount,
    costBasis: dashboard.costBasis,
    budget: { deviation: dashboard.revenueVsBudget, status: dashboard.budgetStatus },
  });
  const analysis = buildInsightAnalysis(scopedRows, {
    budget: { revenue: dashboard.budgetRevenue, basis: "proportional" },
  });
  const evidence = analysis.evidence.find((item) => item.type === "budget" && item.metric === "revenue");
  assert.ok(evidence);
  near(evidence.previousValue, dashboard.budgetRevenue);
  near(evidence.absoluteChange, dashboard.revenueVsBudget);
  assert.equal(month.metrics.find((item) => item.key === "budgetStatus")?.value, dashboard.budgetStatus);
  const assessment = buildManagementReport(analysis, createEmptyAnalysisPreferences(), [])
    .find((section) => section.key === "assessment");
  assert.ok(assessment?.paragraphs.join(" ").includes(dashboard.budgetStatus === "Over budgettet" ? "over budgettet" : "under budgettet"));
  return dashboard;
}

test("BUDGET: samme scope og status i dashboard, månedsrapport, indsigter og ledelsesrapport", () => {
  const fullRows = [
    row("december 2025", 120, { product: "A", category: "Mad", channel: "Online", region: "Nord" }),
    row("december 2025", 20, { product: "B", category: "Mad", channel: "Butik", region: "Syd" }),
    row("januar 2026", 30, { product: "A", category: "Mad", channel: "Online", region: "Nord" }),
    row("januar 2026", 10, { product: "C", category: "Drikke", channel: "Butik", region: "Syd" }),
  ];
  const smallBudget = { revenue: 160, costs: 0 };
  const selections = {
    "alle perioder": fullRows,
    "én måned": fullRows.filter((item) => item.month === "december 2025"),
    "sammenligningsperiode": fullRows.filter((item) => item.month === "januar 2026"),
    kategori: fullRows.filter((item) => item.category === "Mad"),
    produkt: fullRows.filter((item) => item.product === "A"),
    kanal: fullRows.filter((item) => item.channel === "Online"),
    region: fullRows.filter((item) => item.region === "Nord"),
    kombineret: fullRows.filter((item) => item.month === "december 2025" && item.product === "A" && item.channel === "Online" && item.region === "Nord"),
  };
  for (const [name, scopedRows] of Object.entries(selections)) {
    const metrics = verifyBudgetAcrossViews(fullRows, scopedRows, smallBudget);
    near(metrics.budgetRevenue, 160 * scopedRows.length / fullRows.length);
    near(metrics.revenueVsBudget, metrics.totalRevenue - metrics.budgetRevenue);
    assert.equal(metrics.budgetStatus, metrics.revenueVsBudget > 0 ? "Over budgettet" : "Under budgettet", name);
    const report = buildMonthlyReport({
      month: "december 2025", revenue: metrics.totalRevenue, rowCount: metrics.rowCount,
      costBasis: metrics.costBasis,
      budget: { deviation: metrics.revenueVsBudget, status: metrics.budgetStatus },
    });
    assert.equal(report.metrics.find((item) => item.key === "budgetStatus")?.value, metrics.budgetStatus, name);
  }
});

test("BUDGET: 50k-facit for hele filen og december følger samme rækkeproportion", () => {
  const decemberRevenue = 7_449_497.89;
  const annualRevenue = 111_650_946.78;
  const december = Array.from({ length: 3_110 }, () => row("december 2025", decemberRevenue / 3_110));
  const rest = Array.from({ length: 46_890 }, () => row("januar 2026", (annualRevenue - decemberRevenue) / 46_890));
  const fullRows = [...december, ...rest];
  const full = calculateDashboardMetrics(fullRows, { budget }, { fullRows });
  near(full.revenueVsBudget, -1_674_764.20);
  assert.equal(full.budgetStatus, "Under budgettet");
  const scoped = calculateDashboardMetrics(december, { budget }, { fullRows });
  near(scoped.totalRevenue, decemberRevenue);
  near(scoped.budgetRevenue, 7_048_859.222956);
  near(scoped.revenueVsBudget, 400_638.667044);
  assert.equal(scoped.budgetStatus, "Over budgettet");
});

test("COST: variable-only månedstal vises som variable omkostninger uden fuldt resultat", () => {
  const rows = [row("december 2025", 100, { variableCost: 40 }), row("januar 2026", 200, { variableCost: 70 })];
  const full = calculateDashboardMetrics(rows);
  assert.equal(full.costBasis.source, "variable-only");
  assert.equal(documentedMonthlyCostLabel(full.costBasis), "Variable omkostninger");
  assert.deepEqual(full.monthly.map((month) => documentedMonthlyCost(month, full.costBasis)), [40, 70]);
  assert.equal(full.actualResult, null);
  assert.equal(full.costBasis.resultMargin, null);
  const scoped = calculateDashboardMetrics(rows.slice(0, 1), undefined, { fullRows: rows });
  assert.equal(scoped.costBasis.scope, "subset");
  assert.equal(documentedMonthlyCost(scoped.monthly[0], scoped.costBasis), 40);
  assert.equal(scoped.actualResult, null);
});

test("COST: total row-cost bevares, og ukendt grundlag forbliver utilgængeligt", () => {
  const totalRow = row("december 2025", 100, { cost: 35, costScope: "total", variableCost: null, grossProfit: null });
  const total = calculateDashboardMetrics([totalRow]);
  assert.equal(total.costBasis.source, "row-cost");
  assert.equal(documentedMonthlyCostLabel(total.costBasis), "Omkostninger");
  assert.equal(documentedMonthlyCost(total.monthly[0], total.costBasis), 35);
  assert.equal(total.actualResult, 65);
  const unknown = calculateDashboardMetrics([row("december 2025", 100, { cost: null, variableCost: null, grossProfit: null })]);
  assert.equal(unknown.costBasis.source, "unknown");
  assert.equal(documentedMonthlyCost(unknown.monthly[0], unknown.costBasis), null);
  assert.equal(unknown.actualResult, null);
});
