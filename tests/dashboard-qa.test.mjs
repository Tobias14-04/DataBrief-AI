import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonthlyReport,
  formatDanishMonth,
  formatMetricTooltip,
  getAdaptiveMarginChartMode,
  monthSortKey,
} from "../lib/dashboard-insights.ts";
import {
  analyzeSalesSheetStructure,
  buildSalesColumnMappings,
  findSalesColumnMatches,
  getMissingRequiredSalesFields,
  normalizeColumnHeader,
} from "../lib/spreadsheet-fields.ts";

const perfectHeaders = ["Dato", "Måned", "Produkt", "Kategori", "Antal", "Nettoomsætning", "Dækningsbidrag"];

test("01: en perfekt demofil registreres sikkert med 180 rækker", () => {
  const rows = [perfectHeaders, ...Array.from({ length: 180 }, () => ["2026-01-05", "januar 2026", "Latte", "Drikke", 2, 90, 55])];
  const result = analyzeSalesSheetStructure("Salgsdata", rows);

  assert.equal(result.confidence, 100);
  assert.deepEqual(result.missingFields, []);
  assert.equal(rows.length - result.headerIndex - 1, 180);
});

test("02: kolonnernes rækkefølge er ligegyldig, og Produktnavn registreres som Produkt", () => {
  const headers = ["Nettoomsætning", "Kategori", "Produktnavn", "Antal", "Dato"];
  const mappings = buildSalesColumnMappings(headers);

  assert.equal(mappings.product, "Produktnavn");
  assert.equal(mappings.date, "Dato");
  assert.equal(mappings.netRevenue, "Nettoomsætning");
  assert.deepEqual(getMissingRequiredSalesFields(mappings), []);
});

test("03: overskrifter på række 5 findes efter titel- og informationsrækker", () => {
  const rows = [
    ["Salgsrapport"],
    ["Periode", "2026"],
    [],
    ["Udarbejdet til ledelsen"],
    perfectHeaders,
    ["2026-01-05", "januar 2026", "Latte", "Drikke", 2, 90, 55],
  ];

  assert.equal(analyzeSalesSheetStructure("Rapport", rows).headerIndex, 4);
});

test("04: alternative kolonnenavne registreres uden aggressivt omsætningsvalg", () => {
  const headers = ["Salgsdag", "Vare", "Varegruppe", "Stk.", "Salg", "Beløb", "Område"];
  const mappings = buildSalesColumnMappings(headers);

  assert.equal(mappings.date, "Salgsdag");
  assert.equal(mappings.product, "Vare");
  assert.equal(mappings.category, "Varegruppe");
  assert.equal(mappings.units, "Stk.");
  assert.equal(mappings.region, "Område");
  assert.deepEqual(findSalesColumnMatches(headers, "revenue"), ["Salg", "Beløb"]);
});

test("kolonnenavne normaliseres på tværs af mellemrum, tegn og danske bogstaver", () => {
  assert.equal(normalizeColumnHeader("  Produkt-navn... "), normalizeColumnHeader("Produkt navn"));
  assert.equal(normalizeColumnHeader("SALGS_DAG"), normalizeColumnHeader("Salgs dag"));
  assert.equal(normalizeColumnHeader("Område"), "omrade");
});

test("samme kildekolonne tildeles ikke automatisk til flere felter", () => {
  const mappings = buildSalesColumnMappings(["Dato", "Produkt", "Kategori", "Antal", "Salg"]);
  const mappedColumns = Object.values(mappings);
  assert.equal(new Set(mappedColumns).size, mappedColumns.length);
});

test("05: manglende kategori opdages uden at opfinde et match", () => {
  const result = analyzeSalesSheetStructure("Salgsdata", [["Dato", "Produkt", "Antal", "Omsætning"]]);

  assert.equal(result.mappings.category, undefined);
  assert.match(result.missingFields.join(" "), /Kategori/);
  assert.ok(result.confidence < 100);
});

test("06: et komplet salgsark rangerer over forside-, budget- og noteark", () => {
  const sheets = [
    analyzeSalesSheetStructure("Forside", [["Rapportoversigt"]]),
    analyzeSalesSheetStructure("Budget", [["Budget omsætning", "Budget omkostninger"]]),
    analyzeSalesSheetStructure("Noter", [["Kommentar"]]),
    analyzeSalesSheetStructure("Salg 2026", [perfectHeaders, ["2026-01-05", "januar 2026", "Latte", "Drikke", 2, 90, 55]]),
  ];
  const best = [...sheets].sort((a, b) => b.score - a.score)[0];

  assert.equal(best.confidence, 100);
  assert.deepEqual(best.missingFields, []);
});

test("07: en fixture med 7.500 rækker bevarer rækkeantal og sikker struktur", () => {
  const rows = [perfectHeaders, ...Array.from({ length: 7_500 }, (_, index) => [
    `2024-${String((index % 12) + 1).padStart(2, "0")}-01`,
    `2024-${String((index % 12) + 1).padStart(2, "0")}`,
    `Produkt ${index % 20}`,
    `Kategori ${index % 5}`,
    1,
    100,
    60,
  ])];
  const result = analyzeSalesSheetStructure("Salgsdata", rows);

  assert.equal(rows.length - result.headerIndex - 1, 7_500);
  assert.equal(result.confidence, 100);
});

test("danske månedsnavne formateres centralt og sorteres kronologisk", () => {
  assert.equal(formatDanishMonth("2024-05"), "maj 2024");
  assert.equal(formatDanishMonth("jun. 2026"), "juni 2026");
  assert.equal(formatDanishMonth("2026-03-22"), "marts 2026");
  assert.ok((monthSortKey("maj 2024") ?? 0) < (monthSortKey("juni 2024") ?? 0));
});

test("diagramtooltips viser danske labels og dansk formatering", () => {
  assert.deepEqual(formatMetricTooltip(47_288, "revenue"), ["47.288 kr.", "Omsætning"]);
  assert.deepEqual(formatMetricTooltip(1_015, "units"), ["1.015", "Solgte enheder"]);
  assert.deepEqual(formatMetricTooltip(0.649, "grossMargin"), ["64,9 %", "Dækningsgrad"]);
});

test("månedsrapporten følger de viste værdier for dækningsbidrag", () => {
  const report = buildMonthlyReport({ month: "2026-05", revenue: 39_655, grossProfit: 24_113, rowCount: 31 });
  assert.deepEqual(report.metrics.map((metric) => metric.key), ["revenue", "grossProfit", "rows"]);
  assert.match(report.summary, /maj 2026.*39\.655.*24\.113.*31 medtagne rækker/);
});

test("månedsrapporten kan vise enheder, rækker og korrekt ental", () => {
  const report = buildMonthlyReport({ month: "marts 2026", revenue: 50_015, units: 1, rowCount: 1 });
  assert.deepEqual(report.metrics.map((metric) => metric.key), ["revenue", "units", "rows"]);
  assert.match(report.summary, /1 solgt enhed.*1 medtaget række/);
});

test("månedsrapporten kan nøjes med omsætning og mange medtagne rækker", () => {
  const report = buildMonthlyReport({ month: "april 2026", revenue: 43_120, rowCount: 7_500 });
  assert.deepEqual(report.metrics.map((metric) => metric.key), ["revenue", "rows"]);
  assert.match(report.summary, /7\.500 medtagne rækker/);
  assert.doesNotMatch(report.summary, /undefined|null|NaN/);
});

test("månedsrapporten bruger dækningsgrad, når dækningsbidrag mangler", () => {
  const report = buildMonthlyReport({ month: "juni 2026", revenue: 62_682, grossMargin: 0.649, rowCount: 30 });
  assert.deepEqual(report.metrics.map((metric) => metric.key), ["revenue", "grossMargin", "rows"]);
  assert.match(report.summary, /dækningsgraden 64,9/);
});

test("månedsrapporten beskriver en vist budgetstatus", () => {
  const report = buildMonthlyReport({
    month: "2026-06",
    revenue: 62_682,
    grossProfit: 31_537,
    rowCount: 30,
    budget: { deviation: 5_630, status: "Over budgettet" },
  });
  assert.deepEqual(report.metrics.map((metric) => metric.key), ["revenue", "grossProfit", "budgetStatus"]);
  assert.match(report.summary, /5\.630.*over det fordelte månedsbudget/);
});

test("den adaptive indtjeningsgraf prioriterer DB, derefter DG og ellers tom tilstand", () => {
  assert.equal(getAdaptiveMarginChartMode(true, true), "grossProfit");
  assert.equal(getAdaptiveMarginChartMode(true, false), "grossProfit");
  assert.equal(getAdaptiveMarginChartMode(false, true), "grossMargin");
  assert.equal(getAdaptiveMarginChartMode(false, false), "empty");
});
