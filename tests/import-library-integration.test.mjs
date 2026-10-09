import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as XLSX from "xlsx";
import { parseExcelWorkbook } from "../lib/excel-workbook-parser.ts";
import { analyzeSalesSheetStructure } from "../lib/spreadsheet-fields.ts";
import { parseSalesRows, rowsToRecords } from "../lib/sales-import.ts";
import { applyDashboardFilters, toggleDashboardFilterValue } from "../lib/dashboard-filtering.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { buildCategoryAnalysis, buildCategoryCsv, buildCategoryInsights } from "../lib/category-analysis.ts";
import { buildKpiDataProfile } from "../lib/kpi-registry.ts";
import { evaluateStandardKpis, standardKpiDefinitions } from "../lib/kpi-customization.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { inferBoundaryPartialMonths, resolvePeriodComparison, summarizeComparisonMetric } from "../lib/period-comparison.ts";

const emptyFilters = () => ({ month: [], category: [], product: [], channel: [], region: [] });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
function importWorkbook(buffer) {
  const book = parseExcelWorkbook(buffer);
  const name = book.sheetNames[0];
  const rows = book.sheets[name];
  const candidate = { rows, ...analyzeSalesSheetStructure(name, rows) };
  // Same date-only selection as the browser's manual column review, not the
  // automatic month-column fallback which masked the defect in earlier tests.
  const parsed = parseSalesRows(candidate, { ...candidate.mappings, month: candidate.mappings.date });
  const supplemental = book.sheetNames.slice(1).flatMap((sheet) => {
    const source = book.sheets[sheet];
    return rowsToRecords(source, 0, source[0].map(String))
      .filter((record) => Object.values(record).some((value) => value !== "" && value !== null && value !== undefined))
      .map((record) => ({ sourceValues: { ...record, __sheet: sheet } }));
  });
  return { ...parsed, supplemental };
}
function libraryScope(allRows, filters, supplemental = []) {
  const rows = applyDashboardFilters(allRows, filters);
  const history = applyDashboardFilters(allRows, filters, "month");
  const metrics = calculateDashboardMetrics(rows, undefined, { fullRows: allRows });
  const salesProfile = buildKpiDataProfile(rows);
  const profile = buildKpiDataProfile([...rows, ...supplemental]);
  const comparisonProfile = buildKpiDataProfile(history);
  const partialMonths = inferBoundaryPartialMonths(allRows);
  const periodComparison = resolvePeriodComparison(history.map((r) => r.month), { selectedMonths: filters.month, partialMonths });
  const context = { ...metrics, hasBudget: false, salesProfile, comparisonProfile,
    customerHistoryProfile: comparisonProfile, selectedMonths: filters.month, partialMonths, periodComparison,
    revenueGrowth: summarizeComparisonMetric(history, periodComparison, (r) => r.revenue),
    inventoryFilters: filters, financialFilters: filters };
  const categories = buildCategoryAnalysis(metrics.categoryGroups, { hasGrossProfit: metrics.hasGrossProfit, hasCosts: metrics.hasCosts });
  return { rows, metrics, categories, context, profile, evaluations: evaluateStandardKpis(standardKpiDefinitions.map((d) => d.id), context, profile) };
}
function workbook(values, extraHeaders = []) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ["Dato", "Måned", "Produkt", "Kategori", "Antal", "Nettoomsætning", "Kostpris pr. stk.", "Kundenummer", "Kanal", "Region", ...extraHeaders], ...values,
  ]), "Salg");
  return XLSX.write(book, { type: "array", bookType: "xlsx", cellDates: true });
}

test("REG DATE: XLSX → manual mapping → April filter → period/profile uses slash YMD", () => {
  const parsed = importWorkbook(workbook([
    ["2026/04/16", "2026-01", "A", "Opbevaring", 17, 9741, 290, "K1", "Web", "Øst"],
    ["2026-05-01", "2026-05", "A", "Opbevaring", 1, 10000, 20, "K1", "Web", "Øst"],
    ["2026-05-31", "2026-05", "B", "Opbevaring", 1, 100, 0, "K2", "Web", "Øst"],
  ]));
  assert.equal(parsed.rows[0].month, "april 2026");
  const filters = toggleDashboardFilterValue(emptyFilters(), "month", "april 2026");
  const scope = libraryScope(parsed.rows, filters);
  assert.equal(scope.rows.length, 1);
  assert.equal(scope.metrics.totalRevenue, 9741);
  assert.equal(scope.metrics.totalUnits, 17);
  assert.equal(scope.evaluations["gross-profit"].value, 4811);
  assert.equal(scope.evaluations["slowest-period"].value, "apr. 2026");
  assert.ok(scope.context.partialMonths.includes("april 2026"));
});

test("REG LIB: imported filter state → canonical library evaluations → incomplete scope → reset", () => {
  const rows = importWorkbook(workbook([
    ["2026/04/16", "2026-01", "A", "Opbevaring", 1, 100, 0, "K1", "Web", "Øst"],
    ["2026-04-30", "2026-04", "B", "Opbevaring", 2, 200, 40, "K2", "Web", "Øst"],
    ["2026-04-01", "2026-04", "Kontorstol Atlas", "Ergonomi", 1, 300, "", "", "Web", "Øst"],
  ])).rows;
  let filters = emptyFilters();
  const ids = ["gross-profit", "gross-margin", "customer-count"];
  for (const id of ids) assert.equal(libraryScope(rows, filters).evaluations[id].available, false, id);
  filters = toggleDashboardFilterValue(filters, "category", "Opbevaring");
  const complete = libraryScope(rows, filters);
  assert.equal(complete.rows.length, 2);
  assert.equal(complete.evaluations["gross-profit"].value, 220);
  close(complete.evaluations["gross-margin"].value, 220 / 300);
  assert.equal(complete.evaluations["customer-count"].value, 2);
  filters = toggleDashboardFilterValue(filters, "category", "Opbevaring");
  filters = toggleDashboardFilterValue(filters, "product", "Kontorstol Atlas");
  for (const id of ids) {
    const evaluation = libraryScope(rows, filters).evaluations[id];
    assert.equal(evaluation.available, false, id);
    assert.equal(evaluation.value, null, `${id} must not retain the previous scope's value`);
  }
  for (const id of ids) assert.equal(libraryScope(rows, emptyFilters()).evaluations[id].value, null, id);
  assert.equal(applyDashboardFilters(rows, emptyFilters()), rows, "unchanged scope keeps reference/cache reuse");
});

test("REG LIB wiring: customizer receives only matching current-scope batches, not base availability", () => {
  const source = readFileSync(new URL("../components/upload-dashboard.tsx", import.meta.url), "utf8");
  assert.match(source, /libraryEvaluations=\{scopedLibraryEvaluations \?\? standardKpiEvaluations\}/u);
  assert.doesNotMatch(source, /libraryEvaluations=\{baseStandardKpiEvaluations\}/u);
  assert.match(source, /completeCurrentLibraryEvaluations\?\.context === currentKpiContext/u);
  assert.match(source, /completeCurrentLibraryEvaluations\.profile === currentKpiDataProfile/u);
  assert.match(source, /evaluations\[id\] = evaluateStandardKpi\(id, currentKpiContext, currentKpiDataProfile\)/u);
  assert.match(source, /libraryReady=\{!isFilterUpdatePending/u);
  assert.match(source, /!isKpiCustomizerOpen \|\| filteredRows === allRows/u);
});

test("REG LIB: customer count uses the filtered sales profile, not supplemental revenue rows", () => {
  const rows = importWorkbook(workbook([
    ["2026-04-16", "2026-04", "A", "Opbevaring", 1, 100, 0, "K1", "Web", "Øst"],
    ["2026-04-30", "2026-04", "B", "Opbevaring", 1, 200, 40, "K2", "Web", "Øst"],
    ["2026-04-01", "2026-04", "C", "Ergonomi", 1, 300, "", "", "Web", "Øst"],
  ])).rows;
  const supplemental = [{ sourceValues: { Nettoomsætning: 1000, Måned: "2026-04", __sheet: "Budget" } }];
  const complete = libraryScope(rows, { ...emptyFilters(), category: ["Opbevaring"] }, supplemental);
  assert.equal(complete.evaluations["customer-count"].value, 2);
  assert.equal(libraryScope(rows, emptyFilters(), supplemental).evaluations["customer-count"].value, null);
});

const customerIds = ["customer-count", "avg-revenue-customer", "new-customers", "returning-customers",
  "highest-gross-profit-customer", "highest-revenue-customer", "average-purchases-customer"];

test("AVAIL customer integration: all customer KPIs ignore supplemental budgets, with/without budget", () => {
  const rows = importWorkbook(workbook([
    ["2026-04-01", "2026-04", "A", "Opbevaring", 1, 100, 0, "K1", "Web", "Øst", "O1"],
    ["2026-04-01", "2026-04", "B", "Opbevaring", 1, 200, 40, "K1", "Web", "Øst", "O1"],
    ["2026-04-16", "2026-04", "A", "Opbevaring", 1, 50, 20, "K1", "Web", "Øst", "O2"],
    ["2026-04-30", "2026-04", "B", "Opbevaring", 1, 100, 10, "K2", "Web", "Øst", "O3"],
  ], ["Ordrenummer"])).rows;
  const supplemental = [
    { sourceValues: { Nettoomsætning: 1000, Måned: "2026-04", __sheet: "Budget" } },
    { sourceValues: { Dato: "2026-04-20", Nettoomsætning: 1e9, Kundenummer: "Budget-ID", Ordrenummer: "Budget-ordre", __sheet: "Budget" } },
  ];
  const withoutBudget = libraryScope(rows, emptyFilters());
  const withBudget = libraryScope(rows, emptyFilters(), supplemental);
  for (const id of customerIds) {
    assert.equal(withBudget.evaluations[id].available, true, id);
    assert.deepEqual(withBudget.evaluations[id], withoutBudget.evaluations[id], id);
  }
  assert.equal(withBudget.evaluations["customer-count"].value, 2);
  assert.equal(withBudget.evaluations["returning-customers"].value, 1);
  assert.equal(withBudget.evaluations["average-purchases-customer"].value, 1.5);
  assert.equal(withBudget.evaluations["avg-revenue-customer"].value, 225);
  assert.equal(withBudget.evaluations["new-customers"].value, 2);
  assert.equal(withBudget.evaluations["highest-revenue-customer"].value, "K1");
  assert.equal(withBudget.evaluations["highest-gross-profit-customer"].value, "K1");
});

test("AVAIL customer requirements cannot be satisfied by budget-only IDs, dates or orders", () => {
  const rows = importWorkbook(workbook([
    ["2026-04-16", "2026-04", "A", "Opbevaring", 1, 100, 0, "", "Web", "Øst"],
  ])).rows;
  const supplemental = [{ sourceValues: { Dato: "2026-04-16", Kundenummer: "Budget-ID", Ordrenummer: "Budget-ordre", Nettoomsætning: 1000, __sheet: "Budget" } }];
  const scope = libraryScope(rows, emptyFilters(), supplemental);
  for (const id of customerIds) {
    assert.equal(scope.evaluations[id].available, false, id);
    assert.equal(scope.evaluations[id].value, null, id);
  }
  const validRows = importWorkbook(workbook([
    ["2026-04-16", "2026-04", "A", "Opbevaring", 1, 100, 0, "K1", "Web", "Øst"],
  ])).rows;
  const missingOrders = libraryScope(validRows, emptyFilters(), supplemental);
  assert.equal(missingOrders.evaluations["customer-count"].value, 1);
  for (const id of ["returning-customers", "average-purchases-customer"]) {
    assert.equal(missingOrders.evaluations[id].available, false, id);
    assert.match(missingOrders.evaluations[id].reason, /Ordre-id/u);
  }
});

test("AVAIL real missing sales ID still blocks all customer KPIs and scope transitions reset it", () => {
  const parsed = importWorkbook(workbook([
    ["2026-04-01", "2026-04", "A", "Opbevaring", 1, 100, 0, "K1", "Web", "Øst", "O1"],
    ["2026-04-30", "2026-04", "B", "Ergonomi", 1, 200, "", "", "Web", "Øst", "O2"],
  ], ["Ordrenummer"]));
  const supplemental = [{ sourceValues: { Nettoomsætning: 1000, __sheet: "Budget" } }];
  for (let repeat = 0; repeat < 3; repeat++) {
    const complete = libraryScope(parsed.rows, { ...emptyFilters(), category: ["Opbevaring"] }, supplemental);
    const global = libraryScope(parsed.rows, emptyFilters(), supplemental);
    for (const id of customerIds) {
      assert.equal(complete.evaluations[id].available, true, id);
      assert.equal(global.evaluations[id].available, false, id);
      assert.equal(global.evaluations[id].value, null, id);
      assert.match(global.evaluations[id].reason, /Kunde-id mangler/u);
    }
    assert.equal(complete.categories.hasGrossMargin, true);
    assert.equal(global.categories.totalGrossProfit, null);
    assert.equal(global.categories.hasGrossMargin, false);
  }
});

test("AVAIL category component wiring uses current scope, not global availability", () => {
  const source = readFileSync(new URL("../components/upload-dashboard.tsx", import.meta.url), "utf8");
  const categoryProps = source.match(/<CategoryAnalysisDashboard[\s\S]*?\/>/u)?.[0];
  assert.ok(categoryProps);
  assert.match(categoryProps, /categories=\{metrics.categoryGroups\}/u);
  assert.match(categoryProps, /hasGrossProfit=\{metrics.hasGrossProfit\}/u);
  assert.doesNotMatch(categoryProps, /hasGrossProfit=\{baseMetrics.hasGrossProfit\}/u);
});

test("REG actual edge workbook: period import, four driver reconciliations and library scopes", {
  skip: !process.env.SENVORIQ_EDGE_CASE_FILE && "Set SENVORIQ_EDGE_CASE_FILE to the unchanged control workbook",
}, () => {
  const buffer = readFileSync(process.env.SENVORIQ_EDGE_CASE_FILE);
  const parsed = importWorkbook(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const rows = parsed.rows;
  assert.equal(rows.length, 1248);
  assert.deepEqual(parsed.rejections.details.map((r) => r.excelRow), [7, 18]);
  close(parsed.rejections.revenue, 13589.88);
  assert.equal(parsed.rejections.units, 18);
  assert.equal(rows.some((r) => r.month === "Ukendt måned"), false);
  const scope = (filters) => libraryScope(rows, filters, parsed.supplemental);
  const april = scope({ ...emptyFilters(), month: ["april 2026"] });
  close(april.metrics.totalRevenue, 447668.45);
  assert.equal(april.metrics.totalUnits, 1446);
  close(april.evaluations["gross-profit"].value, 217666.45);
  const may = scope({ ...emptyFilters(), month: ["maj 2026"] });
  close(may.metrics.totalRevenue, 472131.14);
  close(may.context.revenueGrowth.absolute, 24462.69);
  close(may.context.revenueGrowth.percentage, 24462.69 / 447668.45);
  const analysis = buildInsightAnalysis(rows, { selectedMonths: ["maj 2026"], partialMonths: may.context.partialMonths });
  for (const dimension of ["product", "category", "channel", "region"]) {
    const drivers = analysis.driverAnalyses.find((d) => d.metric === "revenue" && d.dimension === dimension);
    assert.ok(drivers, dimension);
    close(drivers.totalChange, 24462.69);
    close([...drivers.positiveDrivers, ...drivers.negativeDrivers, ...drivers.unchangedDrivers].reduce((sum, d) => sum + d.absoluteChange, 0), 24462.69);
    close(drivers.reconciliationDifference, 0);
  }
  const filters = toggleDashboardFilterValue(emptyFilters(), "category", "Opbevaring");
  const complete = scope(filters);
  assert.equal(complete.rows.length, 131);
  close(complete.metrics.totalRevenue, 306313.12);
  close(complete.metrics.variableCosts, 133897);
  close(complete.evaluations["gross-profit"].value, 172416.12);
  close(complete.evaluations["gross-margin"].value, 172416.12 / 306313.12);
  assert.equal(complete.evaluations["customer-count"].value, 114);
  assert.equal(complete.evaluations["returning-customers"].value, 8);
  close(complete.evaluations["avg-revenue-customer"].value, 306313.12 / 114);
  for (const id of customerIds) assert.equal(complete.evaluations[id].available, true, `${id}: ${complete.evaluations[id].reason}`);
  const salesOnly = libraryScope(rows, filters);
  for (const id of customerIds) assert.deepEqual(complete.evaluations[id], salesOnly.evaluations[id], id);
  close(complete.categories.totalGrossProfit, 172416.12);
  close(complete.categories.aggregateGrossMargin, 172416.12 / 306313.12);
  assert.equal(complete.categories.highestGrossMargin.name, "Opbevaring");
  close(complete.categories.rows[0].grossProfit, 172416.12);
  close(complete.categories.rows[0].grossMargin, complete.evaluations["gross-margin"].value);
  assert.doesNotMatch(JSON.stringify(buildCategoryInsights(complete.categories)), /mangler/u);
  const csv = buildCategoryCsv(complete.categories.rows, ["name", "grossProfit", "grossMargin"], ["name", "grossProfit", "grossMargin"]);
  assert.match(csv, /172416,12/u);
  const incomplete = scope({ ...emptyFilters(), product: ["Kontorstol Atlas"] });
  for (const id of ["gross-profit", "gross-margin"]) assert.equal(incomplete.evaluations[id].available, false, id);
  assert.equal(incomplete.categories.totalGrossProfit, null);
  assert.equal(incomplete.categories.hasGrossMargin, false);
  for (const id of ["gross-profit", "gross-margin", ...customerIds]) assert.equal(scope(emptyFilters()).evaluations[id].value, null, id);
});
