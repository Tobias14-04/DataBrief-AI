import assert from "node:assert/strict";
import test from "node:test";

import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { buildMonthlyReport } from "../lib/dashboard-insights.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildKpiDataProfile, evaluateStandardKpi } from "../lib/kpi-customization.ts";
import { resolveCostBasis } from "../lib/result-basis.ts";

function row(overrides = {}) {
  return {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Produkt",
    category: "Kategori",
    channel: "Online",
    region: "Danmark",
    revenue: 100,
    units: 1,
    grossProfit: 60,
    grossMargin: 0.6,
    cost: 40,
    ...overrides,
  };
}

const noFilter = { month: [], product: [], category: [], channel: [], region: [] };

test("RES: redundant filter bevarer workbook-resultat, kilde og resultatgrad", () => {
  const rows = [row(), row({ revenue: 200, grossProfit: 120, cost: 80 })];
  const workbook = { costs: { total: 70, kind: "total" } };
  const baseline = calculateDashboardMetrics(rows, workbook, { fullRows: rows });
  const filtered = applyDashboardFilters(rows, { ...noFilter, channel: ["Online"] });
  const redundant = calculateDashboardMetrics(filtered, workbook, { fullRows: rows });

  assert.notEqual(filtered, rows);
  assert.equal(redundant.actualResult, 230);
  assert.equal(redundant.actualResult, baseline.actualResult);
  assert.deepEqual(redundant.costBasis, baseline.costBasis);
  assert.equal(redundant.costBasis.resultMargin, 230 / 300);
});

test("RES: global omkostning uden fordelingsnøgle gør delscope utilgængeligt", () => {
  const rows = [row({ product: "A" }), row({ product: "B", revenue: 200, cost: 80 })];
  const subset = applyDashboardFilters(rows, { ...noFilter, product: ["A"] });
  const metrics = calculateDashboardMetrics(subset, { costs: { total: 90 } }, { fullRows: rows });

  assert.equal(metrics.totalCosts, null);
  assert.equal(metrics.actualResult, null);
  assert.equal(metrics.costBasis.resultMargin, null);
  assert.equal(metrics.costBasis.source, "workbook-total");
  assert.equal(metrics.costBasis.scope, "subset");
  assert.equal(metrics.costBasis.status, "unavailable");
  assert.match(metrics.costBasis.reason, /kan ikke fordeles/u);
});

test("RES: dokumenteret VO plus øvrige omkostninger giver fuldt resultat", () => {
  const rows = [row({ revenue: 100, grossProfit: 60, cost: null })];
  const basis = resolveCostBasis(rows, { workbook: { total: 10, kind: "additional" } });
  assert.equal(basis.totalCosts, 50);
  assert.equal(basis.result, 50);
  assert.equal(basis.resultMargin, 0.5);
  assert.equal(basis.source, "workbook-additional");
  const unknownVariableCosts = resolveCostBasis([row({ grossProfit: null, cost: 40 })], {
    workbook: { total: 10, kind: "additional" },
  });
  assert.equal(unknownVariableCosts.result, null);
  const separateSheets = resolveCostBasis([row({ revenue: 100, grossProfit: null, cost: null })], {
    workbook: { total: 50, kind: "components" },
  });
  assert.equal(separateSheets.result, 50);
  assert.equal(separateSheets.source, "workbook-components");
});

test("RES: totalomkostning overstyrer VO uden dobbeltregning", () => {
  const rows = [row({ revenue: 100, grossProfit: 60, cost: 40 })];
  const basis = resolveCostBasis(rows, { workbook: { total: 70, kind: "total" } });
  assert.equal(basis.totalCosts, 70);
  assert.equal(basis.result, 30);
  assert.equal(basis.resultMargin, 0.3);
});

test("RES: ukendt C er ikke dokumenteret C=0; DB alene giver ikke fuldt resultat", () => {
  const unknown = resolveCostBasis([row({ grossProfit: null, cost: null })]);
  const variableOnly = resolveCostBasis([row({ grossProfit: 60, cost: null })]);
  const zero = resolveCostBasis([row({ grossProfit: null, cost: 0 })]);
  assert.equal(unknown.totalCosts, null);
  assert.equal(unknown.result, null);
  assert.equal(variableOnly.totalCosts, null);
  assert.match(variableOnly.reason, /kun variable omkostninger/u);
  assert.equal(zero.totalCosts, 0);
  assert.equal(zero.result, 100);
  assert.equal(zero.status, "available");
  const invalidWorkbook = resolveCostBasis([row({ cost: 0 })], { workbook: { total: Number.NaN } });
  assert.equal(invalidWorkbook.totalCosts, null);
  assert.equal(invalidWorkbook.source, "workbook-total");
  const variableWorkbook = resolveCostBasis([row()], { workbook: { total: 40, kind: "variable" } });
  assert.equal(variableWorkbook.result, null);
  assert.equal(variableWorkbook.source, "workbook-variable");
});

test("RES: negative omkostningskorrektioner bevarer fortegn", () => {
  const rows = [row({ revenue: 100, cost: 40 }), row({ revenue: 0, cost: -10, grossProfit: null })];
  const basis = resolveCostBasis(rows);
  assert.equal(basis.totalCosts, 30);
  assert.equal(basis.result, 70);
  assert.equal(basis.resultMargin, 0.7);
  const correctedWorkbook = resolveCostBasis(rows, { workbook: { total: -10, kind: "total" } });
  assert.equal(correctedWorkbook.totalCosts, -10);
  assert.equal(correctedWorkbook.result, 110);
});

test("RES: snapshot, månedsrapport og omkostningsgraf deler kilde, scope og status", () => {
  const rows = [row({ product: "A" }), row({ product: "B", revenue: 200, cost: 80 })];
  const subset = [rows[0]];
  const metrics = calculateDashboardMetrics(subset, { costs: { total: 90 } }, { fullRows: rows });
  const insight = buildInsightAnalysis(subset, { costSource: metrics.costBasis });
  const report = buildMonthlyReport({
    month: "januar 2026", revenue: metrics.totalRevenue, rowCount: subset.length,
    costBasis: metrics.costBasis,
  });
  const costGraph = buildCostIntelligence(subset, { costBasis: metrics.costBasis });

  assert.deepEqual(insight.dataBasis.costSource, metrics.costBasis);
  assert.deepEqual(report.costBasis, metrics.costBasis);
  assert.deepEqual(costGraph.costBasis, metrics.costBasis);
  assert.equal(insight.snapshot.some((item) => item.metric === "result" || item.metric === "cost"), false);
  assert.equal(report.metrics.find((item) => item.key === "result")?.value, "Utilgængeligt");
  assert.equal(costGraph.totalCosts, null);
  assert.equal(costGraph.actualResult, null);
  assert.equal(costGraph.hasCostTimeline, false);
  assert.equal(costGraph.periods[0].cost, null);
});

test("RES: KPI-bibliotekets resultatgrad bruger samme resultat og afviser utilgængeligt scope", () => {
  const rows = [row()];
  const profile = buildKpiDataProfile([{ sourceValues: { Omsætning: 100, Omkostninger: 40 } }]);
  const available = calculateDashboardMetrics(rows, undefined, { fullRows: rows });
  const margin = evaluateStandardKpi("profit-margin", { ...available, hasBudget: false }, profile);
  assert.equal(available.actualResult, 60);
  assert.equal(margin.value, available.costBasis.resultMargin);

  const fullRows = [row({ product: "A", cost: 40 }), row({ product: "B", revenue: 200, cost: 80 })];
  const subset = applyDashboardFilters(fullRows, { ...noFilter, product: ["A"] });
  const filtered = calculateDashboardMetrics(subset, undefined, { fullRows });
  const filteredMargin = evaluateStandardKpi("profit-margin", { ...filtered, hasBudget: false }, profile);
  assert.equal(filtered.actualResult, 60);
  assert.equal(filtered.costBasis.scope, "subset");
  assert.equal(filteredMargin.value, 0.6);

  const unavailable = calculateDashboardMetrics(rows, { costs: { total: 70 } }, { fullRows: [row(), row()] });
  const unavailableMargin = evaluateStandardKpi("profit-margin", { ...unavailable, hasBudget: false }, profile);
  assert.equal(unavailableMargin.available, false);
  assert.equal(unavailableMargin.value, null);
  assert.match(unavailableMargin.reason, /kan ikke fordeles/u);
});
