import assert from "node:assert/strict";
import test from "node:test";
import { parseBusinessDate, businessDayKey } from "../lib/business-date.ts";
import { parseSalesRows } from "../lib/sales-import.ts";
import { buildSalesColumnMappings } from "../lib/spreadsheet-fields.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { monthSortKey } from "../lib/dashboard-insights.ts";
import { buildKpiDataProfile, evaluateRegisteredKpi } from "../lib/kpi-registry.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { buildCategoryAnalysis } from "../lib/category-analysis.ts";
import { buildManagementReport } from "../lib/management-report.ts";
import { buildStrategicAnalysis } from "../lib/strategy-engine.ts";
import { createEmptyAnalysisPreferences } from "../lib/analysis-preferences.ts";
import { MAX_REJECTION_DETAILS } from "../lib/import-rejections.ts";
import { inferBoundaryPartialMonths } from "../lib/period-comparison.ts";

const headers = ["Dato", "Produkt", "Kategori", "Antal", "Nettoomsætning", "Kostpris pr. stk.", "Kundenummer", "Kundenavn", "Ordrenummer"];
const sale = (cost = 40, date = "14-02-2026", id = "K1", name = "Samme navn") => [date, "A", "Kategori", 1, 100, cost, id, name, "O1"];
function imported(values, prefix = []) {
  return parseSalesRows({ rows: [...prefix, headers, ...values], headerIndex: prefix.length, headers, mappings: buildSalesColumnMappings(headers) });
}
function views(rows) {
  const metrics = calculateDashboardMetrics(rows);
  const profile = buildKpiDataProfile(rows);
  const insights = buildInsightAnalysis(rows, { costSource: metrics.costBasis });
  return { metrics, profile, insights, cost: buildCostIntelligence(rows, { costBasis: metrics.costBasis }),
    category: buildCategoryAnalysis(metrics.categoryGroups, { hasGrossProfit: metrics.hasGrossProfit, hasCosts: metrics.hasCosts }),
    evaluate: (id) => evaluateRegisteredKpi(id, { ...metrics, hasBudget: false, salesProfile: profile }, profile) };
}

test("EDGE DB: komplet kostgrundlag giver samme DB/DG i alle views", () => {
  const v = views(imported([sale(40), sale(0)]).rows);
  assert.equal(v.metrics.totalGrossProfit, 160);
  assert.equal(v.metrics.grossMargin, 0.8);
  assert.equal(v.category.totalGrossProfit, 160);
  assert.equal(v.cost.totalGrossProfit, 160);
  assert.equal(v.evaluate("gross-profit").value, 160);
  assert.equal(v.evaluate("gross-margin").value, 0.8);
  assert.equal(v.insights.snapshot.find((x) => x.metric === "grossProfit").value, 160);
  assert.equal(v.metrics.actualResult, null);
});

for (const missingCount of [1, 3]) test(`EDGE DB: ${missingCount} manglende kostværdier giver null frem for delsum`, () => {
  // Missing coverage <5% also used to pass the insight engine's 95% guard.
  const rows = imported([...Array.from({ length: 100 }, () => sale()), ...Array.from({ length: missingCount }, () => sale(""))]).rows;
  const v = views(rows);
  assert.equal(v.metrics.totalRevenue, rows.length * 100);
  assert.equal(v.metrics.totalUnits, rows.length);
  assert.equal(v.metrics.totalGrossProfit, null);
  assert.equal(v.metrics.hasGrossProfit, false);
  assert.equal(v.metrics.grossMargin, null);
  assert.equal(v.metrics.monthly[0].grossProfit, null);
  assert.equal(v.metrics.products[0].grossProfit, null);
  assert.equal(v.category.totalGrossProfit, null);
  assert.equal(v.cost.totalGrossProfit, null);
  assert.equal(v.cost.periods[0].grossProfit, null);
  for (const id of ["gross-profit", "gross-profit-unit", "gross-margin", "result", "profit-margin"]) {
    assert.equal(v.evaluate(id).available, false, id);
    assert.equal(v.evaluate(id).value, null, id);
  }
  assert.equal(v.insights.snapshot.some((x) => ["grossProfit", "grossMargin", "result"].includes(x.metric)), false);
});

test("EDGE DB: completeness følger det filtrerede scope og nulomkostning er gyldig", () => {
  const rows = imported([sale(""), ["15-02-2026", "B", "Kategori", 1, 100, 0, "K2", "Samme navn", "O2"]]).rows;
  const v = views(rows.filter((r) => r.product === "B"));
  assert.equal(v.metrics.totalGrossProfit, 100);
  assert.equal(v.metrics.grossMargin, 1);
  assert.equal(v.evaluate("gross-profit").value, 100);
  assert.equal(views(rows.filter((r) => r.product === "A")).evaluate("gross-profit").value, null);
  const separateCategories = rows.map((r) => ({ ...r, category: r.product }));
  const categories = buildCategoryAnalysis(calculateDashboardMetrics(separateCategories).categoryGroups);
  assert.equal(categories.totalGrossProfit, null);
  assert.equal(categories.rows.find((r) => r.name === "A").grossProfit, null);
  assert.equal(categories.rows.find((r) => r.name === "B").grossProfit, 100);
});

test("EDGE DB: rapport/strategi bruger ikke ufuldstændigt DB som evidens", () => {
  const values = [1, 2].flatMap((m) => [...Array.from({ length: 100 }, (_, i) => sale(40, `14-0${m}-2026`, `K${i}`)), sale("", `14-0${m}-2026`)]);
  const v = views(imported(values).rows);
  const unsupported = new Set(["grossProfit", "grossMargin", "result"]);
  assert.equal(v.insights.changes.some((x) => unsupported.has(x.metric)), false);
  assert.equal(v.insights.driverAnalyses.some((x) => unsupported.has(x.metric)), false);
  assert.equal(v.insights.evidence.some((x) => unsupported.has(x.metric)), false);
  const report = buildManagementReport(v.insights, createEmptyAnalysisPreferences(), []);
  const strategy = buildStrategicAnalysis(v.insights);
  assert.doesNotMatch(JSON.stringify(report), /Dækningsbidrag.*kr\./u);
  for (const findings of Object.values(strategy.findingsByQuadrant)) {
    assert.equal(findings.some((x) => x.evidenceIds.some((id) => v.insights.evidence.find((e) => e.id === id && unsupported.has(e.metric)))), false);
  }
  assert.equal(v.insights.snapshot.find((x) => x.metric === "revenue").value, 20_200);
});

for (const date of ["14-02-2026", "14/02/2026", "14.02.2026", "2026-02-14", "2026/02/14", "14-02-26", new Date(2026, 1, 14), 46067, 46067.9]) {
  test(`EDGE DATE: ${String(date)} periodiseres ens i import, filtre og KPI`, () => {
    assert.equal(businessDayKey(date), "2026-02-14");
    const v = views(imported([sale(40, date)]).rows);
    assert.equal(v.metrics.monthly[0].name, "februar 2026");
    assert.equal(monthSortKey(v.metrics.monthly[0].name), new Date(2026, 1, 1).getTime());
    assert.equal(monthSortKey(v.evaluate("slowest-period").value), new Date(2026, 1, 1).getTime());
    assert.equal(v.insights.snapshot.find((x) => x.metric === "revenue").value, 100);
  });
}

test("EDGE DATE: ugyldige og ikke-kontraktlige datoer gættes ikke", () => {
  for (const date of ["31-02-2026", "2026-02-31", "2026/02/31", "2026/04-16", "2026-04/16", "02/14/2026", "14/02-2026", "01/02/03/04", "46067", "Feb 14", "ukendt", 60, NaN, Infinity]) {
    assert.equal(parseBusinessDate(date), null, String(date));
    assert.equal(businessDayKey(date), null, String(date));
  }
  assert.equal(monthSortKey("2026-02-31"), null);
  // Explicit Danish DMY contract removes the MM/DD interpretation.
  assert.equal(businessDayKey("02/03/2026"), "2026-03-02");
});

test("EDGE DATE: gyldig transaktionsdato styrer perioden ved modstridende månedskolonne", () => {
  const cols = [...headers, "Måned"];
  const rows = parseSalesRows({ rows: [cols, [...sale(), "2026-01"]], headerIndex: 0, headers: cols, mappings: buildSalesColumnMappings(cols) }).rows;
  assert.equal(rows[0].month, "februar 2026");
  assert.equal(calculateDashboardMetrics(rows).monthly[0].name, "februar 2026");
  assert.equal(monthSortKey(views(rows).evaluate("slowest-period").value), new Date(2026, 1, 1).getTime());
});

test("EDGE DATE: månedsskifte, årsskifte, Excel-tid og delmåneder bevares", () => {
  const rows = imported([sale(40, "31-12-2025"), sale(40, "01-01-2026"), sale(40, "28-02-2026"), sale(40, "01-03-2026")]).rows;
  assert.deepEqual(calculateDashboardMetrics(rows).monthly.map((x) => x.name), ["december 2025", "januar 2026", "februar 2026", "marts 2026"]);
  assert.deepEqual(inferBoundaryPartialMonths(imported([sale(40, "14-02-2026")]).rows), ["februar 2026"]);
  assert.equal(businessDayKey("2026-02-14T12:00:00Z"), "2026-02-14");
});

test("EDGE CUST: antal kunder kræver kunde-id på alle køb i samme scope", () => {
  const values = [sale(), sale(40, "15-02-2026", "K1"), sale(40, "16-02-2026", "K2"), sale(40, "17-02-2026", "")];
  const rows = imported(values).rows;
  const complete = views(rows.slice(0, 3));
  assert.equal(complete.evaluate("customer-count").value, 2);
  const incomplete = views(rows);
  assert.equal(incomplete.evaluate("customer-count").value, null);
  assert.match(incomplete.evaluate("customer-count").reason, /Kunde-id mangler/u);
  for (const id of ["customer-count", "avg-revenue-customer", "highest-revenue-customer", "highest-gross-profit-customer", "new-customers", "returning-customers", "average-purchases-customer"]) {
    assert.equal(incomplete.evaluate(id).available, false, id);
  }
  assert.equal(views(rows.filter((r) => r.sourceValues.Kundenummer)).evaluate("customer-count").value, 2);
  assert.equal(views(imported([sale(40, "14-02-2026", "0")]).rows).evaluate("customer-count").value, 1);
});

test("EDGE IMPORT: valide salg uden klassifikation medtages med Excel-rækkenumre", () => {
  const good = sale();
  const missingProduct = [...sale()]; missingProduct[1] = ""; missingProduct[3] = 4; missingProduct[4] = 2379.24;
  const missingCategory = [...sale()]; missingCategory[2] = ""; missingCategory[3] = 14; missingCategory[4] = 11210.64;
  const parsed = imported([good, missingProduct, missingCategory], [["Titel"], []]);
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(parsed.skippedRows, []);
  assert.equal(parsed.rejections.count, 0);
  assert.equal(parsed.classification.count, 2);
  assert.deepEqual(parsed.classification.details.map((row) => row.excelRow), [5, 6]);
  assert.ok(Math.abs(calculateDashboardMetrics(parsed.rows).totalRevenue - 13689.88) < 1e-8);
});

test("EDGE IMPORT: ukendte beløb opfindes ikke og store advarsler har begrænset detaljeliste", () => {
  const missing = [...sale()]; missing[1] = ""; missing[3] = ""; missing[4] = "ukendt";
  const parsed = imported([missing]);
  assert.equal(parsed.rejections.revenue, null);
  assert.equal(parsed.rejections.units, null);
  assert.equal(parsed.rejections.revenueCount, 0);
  const many = imported(Array.from({ length: 5000 }, () => { const v = sale(); v[1] = ""; return v; }));
  assert.equal(many.rejections.count, 0);
  assert.equal(many.rows.length, 5000);
  assert.equal(calculateDashboardMetrics(many.rows).totalRevenue, 500_000);
  assert.equal(many.classification.details.length, MAX_REJECTION_DETAILS);
  assert.equal(many.classification.product, 5000);
  assert.equal(many.classification.details[0].excelRow, 2);
});
