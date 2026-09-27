import assert from "node:assert/strict";
import test from "node:test";

import * as XLSX from "xlsx";

import { buildCategoryAnalysis, buildCategoryCsv } from "../lib/category-analysis.ts";
import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { buildMonthlyReport } from "../lib/dashboard-insights.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { parseExcelWorkbook } from "../lib/excel-workbook-parser.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildKpiDataProfile, evaluateRegisteredKpi } from "../lib/kpi-registry.ts";
import { deriveSaleRowCosts } from "../lib/sales-cost.ts";
import { buildSalesColumnMappings } from "../lib/spreadsheet-fields.ts";

function importFixture(sourceRows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sourceRows), "Salg");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const [headers, ...values] = parseExcelWorkbook(buffer).sheets.Salg;
  const mapping = buildSalesColumnMappings(headers);
  const rows = values.map((cells, index) => {
    const sourceValues = Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
    const revenue = Number(sourceValues.Omsætning);
    const units = Number(sourceValues.Antal);
    const economics = deriveSaleRowCosts({
      revenue,
      units,
      unitCost: mapping.unitCost ? Number(sourceValues[mapping.unitCost]) : null,
      rowCost: mapping.cost ? Number(sourceValues[mapping.cost]) : null,
      rowCostHeader: mapping.cost,
      grossProfit: null,
    });
    return {
      date: new Date(2026, 0, index + 1), month: "januar 2026",
      product: String(sourceValues.Produkt), category: String(sourceValues.Kategori),
      channel: "Online", region: "Danmark", revenue, units, grossMargin: null,
      ...economics, sourceValues,
    };
  });
  return { mapping, rows };
}

test("COST-MAP: Antal × Kostpris pr. stk. er variabel rækkeomkostning, ikke summen af enhedspriser", () => {
  const { mapping, rows } = importFixture([
    { Produkt: "A", Kategori: "A", Antal: 5_000, Omsætning: 250_000, "Kostpris pr. stk.": 12.52 },
    { Produkt: "B", Kategori: "B", Antal: 3_404, Omsætning: 160_000, "Kostpris pr. stk.": 22.2 },
    { Produkt: "C", Kategori: "C", Antal: 1, Omsætning: 4_249, "Kostpris pr. stk.": 2_882.92 },
  ]);
  assert.equal(mapping.unitCost, "Kostpris pr. stk.");
  assert.equal(mapping.cost, undefined);
  assert.equal(rows.reduce((sum, row) => sum + row.sourceValues["Kostpris pr. stk."], 0), 2_917.64);
  const metrics = calculateDashboardMetrics(rows);
  assert.ok(Math.abs(metrics.variableCosts - 141_051.72) < 1e-8);
  assert.ok(Math.abs(metrics.totalGrossProfit - 273_197.28) < 1e-8);
  assert.ok(Math.abs(metrics.grossMargin - 0.65950016) < 1e-8);
  assert.equal(metrics.costBasis.source, "variable-only");
  assert.equal(metrics.costBasis.status, "unavailable");
  assert.equal(metrics.totalCosts, null);
  assert.equal(metrics.actualResult, null);
  assert.equal(metrics.costBasis.resultMargin, null);

  const costs = buildCostIntelligence(rows, { costBasis: metrics.costBasis });
  assert.ok(Math.abs(costs.reportedCosts - 141_051.72) < 1e-8);
  assert.ok(Math.abs(costs.costShare - 0.34049984) < 1e-8);
  assert.equal(costs.actualResult, null);
  assert.deepEqual(costs.costBasis, metrics.costBasis);
  assert.equal(costs.distribution.reduce((sum, group) => sum + group.cost, 0), 141_051.72);
  const categories = buildCategoryAnalysis(metrics.categoryGroups, { hasGrossProfit: true, hasCosts: true });
  assert.ok(Math.abs(categories.totalCosts - 141_051.72) < 1e-8);
  assert.ok(Math.abs(categories.aggregateGrossMargin - metrics.grossMargin) < 1e-8);
  const categoryCsv = buildCategoryCsv(categories.rows, ["name", "cost", "costDistributionShare"],
    ["name", "cost", "costDistributionShare"], {
      name: "Kategori", revenue: "Omsætning", revenueShare: "Andel", grossProfit: "Dækningsbidrag",
      grossMargin: "Dækningsgrad", cost: "Variable omkostninger",
      costDistributionShare: "Andel af variable omkostninger",
    });
  assert.match(categoryCsv, /"Variable omkostninger";"Andel af variable omkostninger"/u);

  const insights = buildInsightAnalysis(rows, { costSource: metrics.costBasis });
  assert.equal(insights.snapshot.find((item) => item.metric === "result"), undefined);
  assert.deepEqual(insights.dataBasis.costSource, metrics.costBasis);
  assert.equal(insights.snapshot.find((item) => item.metric === "cost")?.label, "Variable omkostninger");
  assert.ok(Math.abs(insights.snapshot.find((item) => item.metric === "costShare").value - costs.costShare) < 1e-8);
  const report = buildMonthlyReport({
    month: "januar 2026", revenue: metrics.totalRevenue, rowCount: rows.length,
    grossProfit: metrics.totalGrossProfit, costBasis: metrics.costBasis,
  });
  assert.equal(report.metrics.find((item) => item.key === "variableCost")?.label, "Variable omkostninger");
  assert.equal(report.metrics.find((item) => item.key === "result")?.value, "Utilgængeligt");
  assert.deepEqual(report.costBasis, metrics.costBasis);

  const profile = buildKpiDataProfile(rows);
  const context = { ...metrics, hasBudget: false };
  assert.ok(Math.abs(evaluateRegisteredKpi("variable-costs", context, profile).value - 141_051.72) < 1e-8);
  assert.ok(Math.abs(evaluateRegisteredKpi("gross-profit", context, profile).value - 273_197.28) < 1e-8);
  assert.ok(Math.abs(evaluateRegisteredKpi("gross-margin", context, profile).value - metrics.grossMargin) < 1e-8);
  assert.equal(evaluateRegisteredKpi("result", context, profile).available, false);
  assert.equal(evaluateRegisteredKpi("profit-margin", context, profile).available, false);
  const withDocumentedOtherCosts = calculateDashboardMetrics(rows, { costs: { total: 10_000, kind: "additional" } });
  assert.ok(Math.abs(withDocumentedOtherCosts.totalCosts - 151_051.72) < 1e-8);
  assert.ok(Math.abs(withDocumentedOtherCosts.actualResult - 263_197.28) < 1e-8);
});

test("COST-MAP: Vareforbrug og COGS er samlede variable rækkebeløb, ikke enhedspriser", () => {
  for (const header of ["Vareforbrug", "COGS"]) {
    const { mapping, rows } = importFixture([
      { Produkt: "A", Kategori: "A", Antal: 10, Omsætning: 100, [header]: 40 },
    ]);
    assert.equal(mapping.cost, header);
    assert.equal(mapping.unitCost, undefined);
    assert.equal(rows[0].cost, 40);
    assert.equal(rows[0].variableCost, 40);
    assert.equal(rows[0].grossProfit, 60);
    assert.equal(calculateDashboardMetrics(rows).actualResult, null);
    const profile = buildKpiDataProfile(rows);
    assert.equal(evaluateRegisteredKpi("variable-costs", { ...calculateDashboardMetrics(rows), hasBudget: false }, profile).value, 40);
  }
});

test("COST-MAP: eksplicit rækkebeløb vinder over Antal × enhedspris uden dobbeltregning", () => {
  for (const [header, scope, expectedResult] of [["Vareforbrug", "variable", null], ["total cost", "total", 50]]) {
    const { rows } = importFixture([
      { Produkt: "A", Kategori: "A", Antal: 10, Omsætning: 100, "Kostpris pr. stk.": 4, [header]: 50 },
    ]);
    assert.equal(rows[0].cost, 50);
    assert.equal(rows[0].costScope, scope);
    assert.equal(rows[0].variableCost, scope === "variable" ? 50 : 40);
    const metrics = calculateDashboardMetrics(rows);
    assert.equal(metrics.actualResult, expectedResult);
    assert.equal(buildKpiDataProfile(rows).numericValues.variableCost[0], scope === "variable" ? 50 : 40);
  }
});

test("COST-MAP: dokumenteret nul og negative korrektioner bevarer fortegn og finite værdier", () => {
  const { rows } = importFixture([
    { Produkt: "A", Kategori: "A", Antal: 1, Omsætning: 100, "Kostpris pr. stk.": 0 },
    { Produkt: "B", Kategori: "B", Antal: 1, Omsætning: 0, "Kostpris pr. stk.": -10 },
  ]);
  const metrics = calculateDashboardMetrics(rows);
  assert.equal(metrics.variableCosts, -10);
  assert.equal(metrics.totalGrossProfit, 110);
  assert.equal(metrics.actualResult, null);
  assert.equal(buildCostIntelligence(rows, { costBasis: metrics.costBasis }).costShare, -0.1);
});
