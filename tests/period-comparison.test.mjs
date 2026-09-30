import assert from "node:assert/strict";
import test from "node:test";

import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildKpiDataProfile, evaluateStandardKpi } from "../lib/kpi-customization.ts";
import {
  growthChange,
  inferBoundaryPartialMonths,
  latestAvailablePeriodComparison,
  resolvePeriodComparison,
  summarizeComparisonMetric,
} from "../lib/period-comparison.ts";

const months = ["januar 2026", "februar 2026", "marts 2026", "april 2026"];

test("UX: genvej finder seneste gyldige komplette måned uden at ændre vækstregler", () => {
  assert.equal(latestAvailablePeriodComparison(months)?.label, "marts 2026 → april 2026");
  assert.equal(latestAvailablePeriodComparison(months, ["april 2026"])?.label, "februar 2026 → marts 2026");
  assert.equal(latestAvailablePeriodComparison(["januar 2026", "marts 2026"]), null);
});
function row(index, revenue, overrides = {}) {
  return {
    date: new Date(2026, index, 1), month: months[index], product: "A", category: "A",
    channel: "Online", region: "Nord", revenue, units: revenue / 10,
    grossProfit: revenue / 2, grossMargin: null, cost: revenue / 4,
    sourceValues: { Dato: `2026-0${index + 1}-01`, Nettoomsætning: revenue },
    ...overrides,
  };
}

test("GROW: 100 → 200 → 180 bruger marts mod februar i resolver, Indsigter, omkostninger og KPI'er", () => {
  const rows = [row(0, 100), row(1, 200), row(2, 180)];
  const period = resolvePeriodComparison(rows.map((item) => item.month));
  assert.equal(period.label, "februar 2026 → marts 2026");
  const growth = summarizeComparisonMetric(rows, period, (item) => item.revenue);
  assert.equal(growth.percentage, -0.1);
  const insight = buildInsightAnalysis(rows);
  assert.equal(insight.changes.find((change) => change.metric === "revenue").percentageChange, -0.1);
  assert.equal(insight.changes.find((change) => change.metric === "units").percentageChange, -0.1);
  assert.equal(insight.changes.find((change) => change.metric === "grossProfit").percentageChange, -0.1);
  assert.equal(insight.changes.find((change) => change.metric === "revenue").comparisonLabel, period.label);
  assert.match(insight.report.sections.find((section) => section.key === "executive-summary").paragraphs.join(" "), /februar 2026.*marts 2026/u);
  const costs = buildCostIntelligence(rows);
  assert.equal(costs.comparison.revenueChangePercent, -0.1);
  assert.equal(costs.comparison.costChangePercent, -0.1);
  assert.equal(`${costs.comparison.previousPeriod} → ${costs.comparison.currentPeriod}`, period.label);
  const profile = buildKpiDataProfile(rows);
  const context = { revenueGrowth: growth, periodComparison: period };
  for (const id of ["revenue-growth", "month-over-month-growth"]) {
    const kpi = evaluateStandardKpi(id, context, profile);
    assert.equal(kpi.value, -0.1);
    assert.equal(kpi.detail, period.label);
  }
});

test("GROW: januar → marts kræver eksplicit sammenligningsvalg", () => {
  const standard = resolvePeriodComparison([months[0], months[2]]);
  assert.equal(standard.status, "unavailable");
  const explicit = resolvePeriodComparison([months[0], months[2]], {
    selectedMonths: [months[2]], comparisonMonths: [months[0]],
  });
  assert.equal(explicit.label, "januar 2026 → marts 2026");
  assert.equal(summarizeComparisonMetric([row(0, 100), row(2, 180)], explicit, (item) => item.revenue).percentage, 0.8);
});

test("GROW: valgt marts–april sammenlignes med januar–februar", () => {
  const rows = [row(0, 100), row(1, 200), row(2, 180), row(3, 220)];
  const period = resolvePeriodComparison(months, { selectedMonths: [months[3], months[2]] });
  assert.equal(period.label, "januar 2026 – februar 2026 → marts 2026 – april 2026");
  assert.equal(summarizeComparisonMetric(rows, period, (item) => item.revenue).percentage, 1 / 3);
  const insight = buildInsightAnalysis(rows, { selectedMonths: [months[3], months[2]] });
  assert.equal(insight.changes.find((change) => change.metric === "revenue").comparisonLabel, period.label);
  const costs = buildCostIntelligence(rows, { selectedMonths: [months[3], months[2]] });
  assert.equal(costs.comparison.costChangePercent, 1 / 3);
  assert.equal(`${costs.comparison.previousPeriod} → ${costs.comparison.currentPeriod}`, period.label);
});

test("GROW: samme produktfilter anvendes på begge perioder, også når måneden er filtreret væk fra snapshot", () => {
  const rows = [
    row(0, 100, { product: "A" }), row(0, 1000, { product: "B" }),
    row(1, 200, { product: "A" }), row(1, 1000, { product: "B" }),
    row(2, 180, { product: "A" }), row(2, 1000, { product: "B" }),
  ];
  const filters = { month: [months[2]], product: ["A"], category: [], channel: [], region: [] };
  const comparisonRows = applyDashboardFilters(rows, filters, "month");
  const snapshotRows = applyDashboardFilters(rows, filters);
  const insight = buildInsightAnalysis(comparisonRows, { selectedMonths: filters.month });
  assert.equal(insight.changes.find((change) => change.metric === "revenue").percentageChange, -0.1);
  const costs = buildCostIntelligence(snapshotRows, {
    comparisonRows, selectedMonths: filters.month,
  });
  assert.equal(costs.totalRevenue, 180);
  assert.equal(costs.comparison.revenueChangePercent, -0.1);
  assert.equal(costs.comparison.currentPeriod, "marts 2026");
  assert.equal(costs.comparison.previousPeriod, "februar 2026");
});

test("GROW: ikke-sammenhængende valg og manglende kalendermåned giver ingen implicit vækst", () => {
  const gap = [row(0, 100), row(2, 180)];
  assert.equal(buildInsightAnalysis(gap).changes.length, 0);
  assert.equal(buildCostIntelligence(gap).comparison, null);
  const scattered = resolvePeriodComparison(months, { selectedMonths: [months[0], months[2]] });
  assert.equal(scattered.status, "unavailable");
  assert.match(scattered.reason, /Ikke-sammenhængende/u);
  assert.equal(buildInsightAnalysis([row(0, 100), row(1, 200), row(2, 180)], { selectedMonths: [months[0], months[2]] }).changes.length, 0);
});

test("GROW: baseline 0 viser absolut ændring, men ingen procent; negativ baseline er ensartet", () => {
  assert.deepEqual(growthChange(20, 0), { absolute: 20, percentage: null });
  assert.deepEqual(growthChange(-50, -100), { absolute: 50, percentage: 0.5 });
  const rows = [row(0, 0), row(1, 20)];
  const insight = buildInsightAnalysis(rows);
  const change = insight.changes.find((item) => item.metric === "revenue");
  assert.equal(change.absoluteChange, 20);
  assert.equal(change.percentageChange, null);
  assert.equal(buildCostIntelligence(rows).comparison.revenueChangePercent, null);
  const period = resolvePeriodComparison(rows.map((item) => item.month));
  const kpi = evaluateStandardKpi("revenue-growth", {
    periodComparison: period,
    revenueGrowth: summarizeComparisonMetric(rows, period, (item) => item.revenue),
  }, buildKpiDataProfile(rows));
  assert.equal(kpi.available, false);
  assert.match(kpi.reason, /Absolut ændring: 20/u);
  const negative = [row(0, -100, { cost: -40 }), row(1, -50, { cost: -20 })];
  assert.equal(buildInsightAnalysis(negative).changes.find((item) => item.metric === "revenue").percentageChange, 0.5);
  assert.equal(buildCostIntelligence(negative).comparison.costChangePercent, 0.5);
});

test("GROW: kendt delmåned sammenlignes ikke stiltiende med hel måned", () => {
  const rows = [row(0, 100, { date: new Date(2026, 0, 1) }), row(1, 200, { date: new Date(2026, 1, 12) })];
  const partial = inferBoundaryPartialMonths(rows);
  assert.deepEqual(partial, [months[1]]);
  const period = resolvePeriodComparison(months.slice(0, 2), { partialMonths: partial });
  assert.equal(period.status, "unavailable");
  assert.match(period.reason, /delmåned/u);
  assert.equal(buildInsightAnalysis(rows, { partialMonths: partial }).changes.length, 0);
  assert.equal(buildCostIntelligence(rows, { partialMonths: partial }).comparison, null);
});

test("GROW: ekstreme tal serialiserer aldrig NaN eller Infinity", () => {
  assert.deepEqual(growthChange(1e308, -1e308), { absolute: null, percentage: null });
  const period = resolvePeriodComparison(months.slice(0, 2));
  assert.equal(summarizeComparisonMetric([row(0, 1e308), row(0, 1e308), row(1, 1e308)], period, (item) => item.revenue), null);
});
