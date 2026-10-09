import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseSalesRows } from "../lib/sales-import.ts";
import { analyzeSalesSheetStructure } from "../lib/spreadsheet-fields.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { dimensionIdentity, dimensionFilterOptions, dimensionFilterLabel, missingDimensionKey, missingDimensionLabels } from "../lib/dimension-identity.ts";
import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { buildKpiDataProfile, evaluateRegisteredKpi, relevantKpiCategories, standardKpiDefinitions } from "../lib/kpi-registry.ts";
import { parseWorkbookBudget, selectWorkbookBudgetModel, resolveBudgetBasis, BUDGET_MODEL_EXPLANATION } from "../lib/budget-basis.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildMonthlyReport } from "../lib/dashboard-insights.ts";
import { buildManagementReport } from "../lib/management-report.ts";
import { createEmptyAnalysisPreferences } from "../lib/analysis-preferences.ts";
import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { buildProductAnalysis } from "../lib/product-analysis.ts";
import { buildCategoryAnalysis } from "../lib/category-analysis.ts";

const empty = () => ({ month: [], category: [], product: [], channel: [], region: [] });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);
function imported(values, headers = ["Dato", "Produkt", "Kategori", "Antal", "Nettoomsætning", "Kostpris pr. stk.", "Kundenummer", "Ordrenummer", "Kanal", "Region"]) {
  const rows = [headers, ...values];
  return parseSalesRows({ rows, ...analyzeSalesSheetStructure("Salg", rows) });
}
function budget(records, headers = ["Nettoomsætning", "Omkostninger"]) {
  return parseWorkbookBudget({ sheetNames: ["Budget"], sheets: { Budget: [headers, ...records] } });
}
function scope(rows, workbookBudget, filters = empty()) {
  const selected = applyDashboardFilters(rows, filters);
  const metrics = calculateDashboardMetrics(selected, { budget: workbookBudget }, { fullRows: rows });
  const salesProfile = buildKpiDataProfile(selected);
  const context = { ...metrics, hasBudget: metrics.budgetRevenue !== null, salesProfile, customerHistoryProfile: buildKpiDataProfile(rows), selectedMonths: filters.month };
  return { metrics, selected, evaluate: (id, profile = salesProfile) => evaluateRegisteredKpi(id, context, profile) };
}
function finiteTree(value) {
  if (typeof value === "number") assert.ok(Number.isFinite(value));
  else if (value && typeof value === "object") Object.values(value).forEach(finiteTree);
}
const sale = (product = "A", category = "Mad", amount = 100, date = "2026-01-15") => [date, product, category, 2, amount, 20, "K1", "O1", "Web", "Nord"];

for (const [label, p, c] of [["produkt", "", "Mad"], ["kategori", "A", ""], ["begge", "", ""]]) {
  test(`P0 CLASS: ${label} mangler; økonomi, rådata og provenance bevares`, () => {
    const source = sale(p, c);
    const parsed = imported([source]);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rejections.count, 0);
    assert.equal(parsed.classification.count, 1);
    const r = parsed.rows[0];
    assert.equal(r.product, p); assert.equal(r.category, c);
    assert.equal(r.excelRow, 2); assert.equal(r.sourceValues.Produkt, p);
    assert.equal(r.sourceValues.Kundenummer, "K1"); assert.equal(r.sourceValues.Ordrenummer, "O1");
    const s = scope(parsed.rows);
    assert.equal(s.metrics.variableCosts, 40); assert.equal(s.metrics.totalGrossProfit, 60);
    assert.equal(s.metrics.grossMargin, 0.6);
    assert.equal(s.evaluate("customer-count").value, 1);
    assert.equal(s.evaluate("average-purchases-customer").value, 1);
    if (!p) { assert.equal(s.evaluate("product-count").available, false); assert.equal(s.evaluate("best-product").value, null); }
    finiteTree(s.metrics);
  });
}
test("P0 CLASS: produkt-/kategorikolonner er valgfrie; ugyldige økonomiske felter afvises stadig", () => {
  const p = imported([["2026-01-15", 2, 100, 20], ["2026-01-15", "", 200, 20]], ["Dato", "Antal", "Nettoomsætning", "Kostpris pr. stk."]);
  assert.equal(p.rows.length, 1); assert.equal(p.classification.count, 1);
  assert.equal(p.rejections.count, 1); assert.match(p.rejections.details[0].reasons.join(" "), /Antal/);
  assert.equal(p.rejections.revenue, 200); assert.equal(p.rejections.details[0].excelRow, 3);
});
test("P0 CLASS: reel kategori med samme navn har særskilt identitet, filter og driver", () => {
  const rows = imported([sale("A", "", 20), sale("B", "Ikke kategoriseret", 100),
    sale("A", "", 50, "2026-02-15"), sale("B", "Ikke kategoriseret", 90, "2026-02-15")]).rows;
  const metrics = calculateDashboardMetrics(rows);
  const categories = buildCategoryAnalysis(metrics.categoryGroups);
  assert.equal(categories.rows.length, 2);
  assert.notEqual(categories.rows[0].id, categories.rows[1].id);
  assert.notEqual(dimensionIdentity("", "category").key, dimensionIdentity("Ikke kategoriseret", "category").key);
  const missing = scope(rows, undefined, { ...empty(), category: [missingDimensionKey("category")] });
  assert.equal(missing.selected.length, 2); assert.equal(missing.metrics.totalRevenue, 70);
  assert.equal(scope(rows, undefined, { ...empty(), category: ["Ikke kategoriseret"] }).metrics.totalRevenue, 190);
  const choices = dimensionFilterOptions(rows.map((r) => r.category), "category");
  assert.deepEqual(new Set(choices), new Set([missingDimensionKey("category"), "Ikke kategoriseret"]));
  assert.equal(dimensionFilterLabel("Ikke kategoriseret", "category"), "Ikke kategoriseret (registreret)");
  for (const choice of choices) assert.equal(scope(rows, undefined, { ...empty(), category: [choice] }).selected.length, 2);
  assert.equal(scope(rows).metrics.totalRevenue, 260);
  const analysis = buildInsightAnalysis(rows, { selectedMonths: ["februar 2026"], partialMonths: [] });
  const driver = analysis.driverAnalyses.find((d) => d.dimension === "category" && d.metric === "revenue");
  const members = [...driver.positiveDrivers, ...driver.negativeDrivers];
  assert.equal(members.length, 2); assert.equal(members.reduce((sum, m) => sum + m.absoluteChange, 0), 20);
});
test("P0 CLASS: manglende produktgruppe tæller ikke som produkt og vinder ikke summary/ranking", () => {
  const rows = imported([sale("", "Mad", 1000), sale("B", "Mad", 100)]).rows;
  const s = scope(rows); const products = buildProductAnalysis(s.metrics.products);
  assert.equal(products.rows.length, 2); assert.equal(products.highestRevenue, null);
  assert.equal(products.mostUnits, null); assert.equal(products.highestAveragePrice, null);
  assert.equal(s.evaluate("product-count").value, 1); assert.equal(s.evaluate("best-product").value, null);
  assert.equal(s.evaluate("average-revenue-product").value, null);
  const incomplete = sale("", "Mad"); incomplete[5] = "";
  const m = calculateDashboardMetrics(imported([sale(), incomplete]).rows);
  assert.equal(m.totalGrossProfit, null); assert.equal(m.grossMargin, null);
});
for (const dimension of ["product", "category", "channel", "region"]) {
  test(`P0 CLASS: ${dimension} blankgruppe afstemmer og kan filtreres`, () => {
    const i = { product: 1, category: 2, channel: 8, region: 9 }[dimension];
    const values = [sale("A", "Mad", 100), sale("B", "Drik", 20), sale("A", "Mad", 90, "2026-02-15"), sale("B", "Drik", 50, "2026-02-15")];
    values[1][i] = ""; values[3][i] = "";
    const rows = imported(values).rows;
    const selected = scope(rows, undefined, { ...empty(), [dimension]: [missingDimensionKey(dimension)] });
    assert.equal(selected.selected.length, 2); assert.equal(selected.metrics.totalRevenue, 70);
    const a = buildInsightAnalysis(rows, { selectedMonths: ["februar 2026"], partialMonths: [] });
    const d = a.driverAnalyses.find((x) => x.dimension === dimension && x.metric === "revenue");
    const members = [...d.positiveDrivers, ...d.negativeDrivers, ...d.unchangedDrivers];
    assert.equal(members.find((m) => m.dimensionValue === missingDimensionLabels[dimension]).absoluteChange, 30);
    assert.equal(d.totalChange, 20); assert.equal(d.reconciliationDifference, 0);
    assert.equal(members.reduce((sum, m) => sum + m.absoluteChange, 0), 20);
    finiteTree(a);
  });
}
for (const [actual, b, deviation, status, pct] of [[0, 0, 0, "På budget", null], [10000, 0, 10000, "Over budgettet", null],
  [10000, 20000, -10000, "Under budgettet", -0.5], [10000, -5000, 15000, "Over budgettet", -3]]) {
  test(`P0 BUDGET: A=${actual}, B=${b} har samme beløb/status uden NaN`, () => {
    const wb = budget([[b, 0]]); assert.equal(wb.revenue, b); assert.equal(wb.costs, 0);
    const rows = imported([sale("A", "Mad", actual)]).rows;
    const s = scope(rows, wb);
    assert.equal(s.metrics.budgetRevenue, b); assert.equal(s.metrics.revenueVsBudget, deviation);
    assert.equal(s.metrics.budgetStatus, status); assert.equal(s.metrics.budgetBasis.deviationPercent, pct);
    assert.equal(s.evaluate("budget-revenue").value, b); assert.equal(s.evaluate("budget-costs").value, 0);
    assert.equal(s.evaluate("revenue-vs-budget").value, deviation);
    assert.equal(s.evaluate("budget-variance-percent").value, pct);
    assert.equal(s.evaluate("budget-attainment").value, b === 0 ? null : actual / b);
    const report = buildMonthlyReport({ month: "januar 2026", revenue: actual, rowCount: 1,
      budget: { deviation, status }, budgetBasis: s.metrics.budgetBasis });
    assert.equal(report.metrics.find((m) => m.key === "budgetStatus").value, status);
    const a = buildInsightAnalysis(rows, { budget: { revenue: b, costs: 0, basis: "proportional" } });
    assert.equal(a.evidence.find((e) => e.type === "budget" && e.metric === "revenue").absoluteChange, deviation);
    assert.ok(a.evidence.find((e) => e.type === "budget").supportingFacts.includes(BUDGET_MODEL_EXPLANATION));
    finiteTree(s.metrics); finiteTree(a);
  });
}
test("P0 BUDGET: manglende/ugyldigt/ufuldstændigt budget bliver ikke 0 eller rå-profil-fallback", () => {
  for (const [values, status] of [[["", ""], "missing"], [["ukendt", 0], "invalid"]]) {
    const wb = budget([values]); assert.equal(wb.revenueStatus, status);
    const s = scope(imported([sale()]).rows, wb);
    assert.equal(s.metrics.budgetRevenue, null); assert.equal(s.metrics.revenueVsBudget, null);
    const fakeRaw = buildKpiDataProfile([{ sourceValues: { "Budget omsætning": 12345, Omsætning: 100 } }]);
    assert.equal(s.evaluate("budget-revenue", fakeRaw).value, null);
    assert.equal(buildMonthlyReport({ month: "januar 2026", revenue: 100, rowCount: 1, budgetBasis: s.metrics.budgetBasis }).metrics.find((m) => m.key === "budgetStatus").value, "Budget ikke dokumenteret");
  }
  const partial = budget([[100, 20], ["", 30]]);
  assert.equal(partial.revenue, null); assert.equal(partial.revenueStatus, "incomplete"); assert.equal(partial.costs, 50);
  const revenueOnly = budget([[100, ""]]);
  const s = scope(imported([sale()]).rows, revenueOnly);
  assert.equal(s.metrics.budgetRevenue, 100); assert.equal(s.metrics.budgetCosts, null); assert.equal(s.metrics.budgetResult, null);
  assert.equal(s.evaluate("budget-revenue").value, 100); assert.equal(s.evaluate("budget-result").value, null);
  const costOnly = scope(imported([sale()]).rows, budget([["", 0]]));
  assert.equal(costOnly.evaluate("budget-costs").value, 0); assert.equal(costOnly.evaluate("budget-result").value, null);
  assert.equal(budget([[0, -10]]).costs, 10, "negative cost-budget policy unchanged");
});
test("P0 BUDGET: dokumenteret nulomkostningsbudget bevares i Økonomi", () => {
  const rows = imported([sale()]).rows.map((r) => ({ ...r, cost: 0, costScope: "total", variableCost: null }));
  const s = scope(rows, budget([[100, 0]]));
  const a = buildCostIntelligence(rows, { costBasis: s.metrics.costBasis, budgetCosts: s.metrics.budgetCosts, budgetBasis: "proportional" });
  assert.equal(a.budget.budget, 0); assert.equal(a.budget.variance, 0); assert.equal(a.budget.variancePercent, null);
});
test("P0 BUDGET: alle scopes bruger accepterede salgsrækkers andel, ikke omsætning eller månedsbudget", () => {
  const values = [sale("A", "Mad", 100), sale("B", "Drik", 900), sale("A", "Mad", 50, "2026-02-15"), sale("", "", 500, "2026-02-15")];
  values[1][8] = "Butik"; values[1][9] = "Syd";
  const rows = imported(values).rows; const wb = budget([[1000, 400]]);
  for (const filters of [empty(), { ...empty(), month: ["januar 2026"] }, { ...empty(), category: ["Mad"] },
    { ...empty(), product: ["A"] }, { ...empty(), channel: ["Web"] }, { ...empty(), region: ["Syd"] },
    { ...empty(), month: ["januar 2026"], product: ["A"], channel: ["Web"] }, { ...empty(), product: [missingDimensionKey("product")] }]) {
    const s = scope(rows, wb, filters);
    assert.equal(s.metrics.budgetRevenue, 1000 * s.selected.length / 4);
    assert.equal(s.metrics.budgetCosts, 400 * s.selected.length / 4);
    assert.equal(s.evaluate("budget-revenue").value, s.metrics.budgetRevenue);
    const a = buildInsightAnalysis(s.selected, { budget: { revenue: s.metrics.budgetRevenue, basis: "proportional" } });
    near(a.evidence.find((e) => e.type === "budget" && e.metric === "revenue").previousValue, s.metrics.budgetRevenue);
    const report = buildManagementReport(a, createEmptyAnalysisPreferences(), []);
    assert.ok(report.some((r) => JSON.stringify(r).includes("budget")));
  }
  assert.equal(resolveBudgetBasis(wb, 0, 0, 4).revenue, null);
});
test("P0 BUDGET: periodeark kræver accept; afslag har ingen silent fallback eller ændret salg", () => {
  const wb = budget([["2026-01", 100, 0], ["2026-02", 900, 0]], ["Måned", "Nettoomsætning", "Omkostninger"]);
  assert.equal(wb.hasPeriodColumn, true); assert.equal(wb.accepted, false);
  const rows = imported([sale(), sale("A", "Mad", 200, "2026-02-15")]).rows;
  for (const chosen of [wb, selectWorkbookBudgetModel(wb, false)]) {
    const s = scope(rows, chosen, { ...empty(), month: ["januar 2026"] });
    assert.equal(s.metrics.totalRevenue, 100); assert.equal(s.metrics.budgetRevenue, null);
    assert.match(s.metrics.budgetBasis.reason, /ikke accepteret/);
    assert.equal(s.evaluate("budget-revenue").value, null);
    const unavailable = s.evaluate("budget-revenue");
    assert.equal(unavailable.dataSourceDetected, true);
    assert.ok(relevantKpiCategories(standardKpiDefinitions, { "budget-revenue": unavailable }).includes("Budget"));
  }
  const s = scope(rows, selectWorkbookBudgetModel(wb, true), { ...empty(), month: ["januar 2026"] });
  assert.equal(s.metrics.budgetRevenue, 500, "not original January budget 100");
});
test("P0 BUDGET: total sammen med detailrækker dobbeltregnes ikke og får ingen implicit model", () => {
  const wb = budget([["2026-01", 100, 0], ["2026-02", 900, 0], ["Total", 1000, 0]], ["Måned", "Nettoomsætning", "Omkostninger"]);
  assert.equal(wb.revenue, null); assert.equal(wb.costs, null);
  assert.equal(wb.revenueStatus, "invalid");
  const s = scope(imported([sale()]).rows, selectWorkbookBudgetModel(wb, true));
  assert.equal(s.metrics.budgetRevenue, null); assert.equal(s.metrics.totalRevenue, 100);
});
test("P0 wiring: budgetvalg er eksplicit og alle visninger får canonical budgetmodel", () => {
  const ui = readFileSync(new URL("../components/upload-dashboard.tsx", import.meta.url), "utf8");
  assert.match(ui, /canOpenDashboard && !analysis.budget\?\.hasPeriodColumn/);
  assert.match(ui, /Jeg accepterer samlet rækkeproportional fordeling/);
  assert.match(ui, /Fortsæt uden budgetanalyse/);
  assert.match(ui, /budgetCosts: metrics.budgetCosts/);
  assert.doesNotMatch(ui, /budgetBasis: isFiltered|basis: isFiltered|budget\?\.costs \?/);
});
