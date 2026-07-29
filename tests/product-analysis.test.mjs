import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import test from "node:test";

import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import {
  formatDanishCurrencyPrecise,
  formatDanishPercentPrecise,
} from "../lib/dashboard-insights.ts";
import {
  buildProductAnalysis,
  buildProductInsight,
  filterProductRows,
  getAvailableProductTableColumns,
  parseProductTableColumnSelection,
  rankProductRows,
  serializeProductTableColumnSelection,
  sortProductRows,
} from "../lib/product-analysis.ts";

const products = [
  { name: "Café latte", revenue: 240, units: 12 },
  { name: "Morgenmenu", revenue: 300, units: 5 },
  { name: "München-brød", revenue: 60, units: 3 },
];

test("gennemsnitspris og omsætningsandel følger de dokumenterede definitioner", () => {
  const analysis = buildProductAnalysis(products);
  const morningMenu = analysis.rows.find((row) => row.name === "Morgenmenu");
  const cafeLatte = analysis.rows.find((row) => row.name === "Café latte");

  assert.equal(analysis.totalRevenue, 600);
  assert.equal(morningMenu.averagePrice, 60);
  assert.equal(morningMenu.share, 0.5);
  assert.equal(cafeLatte.averagePrice, 20);
  assert.equal(cafeLatte.share, 0.4);
  assert.equal(analysis.highestRevenue.name, "Morgenmenu");
  assert.equal(analysis.mostUnits.name, "Café latte");
  assert.equal(analysis.highestAveragePrice.name, "Morgenmenu");
  assert.equal(formatDanishCurrencyPrecise(96).replaceAll("\u00a0", " "), "96,00 kr.");
  assert.equal(formatDanishPercentPrecise(0.156).replaceAll("\u00a0", " "), "15,6 %");
});

test("rangering virker for omsætning, enheder, gennemsnitspris og andel", () => {
  const rows = buildProductAnalysis(products).rows;

  assert.deepEqual(
    rankProductRows(rows, "revenue").map((row) => row.name),
    ["Morgenmenu", "Café latte", "München-brød"],
  );
  assert.deepEqual(
    rankProductRows(rows, "units").map((row) => row.name),
    ["Café latte", "Morgenmenu", "München-brød"],
  );
  assert.deepEqual(
    rankProductRows(rows, "averagePrice").map((row) => row.name),
    ["Morgenmenu", "Café latte", "München-brød"],
  );
  assert.deepEqual(
    rankProductRows(rows, "share").map((row) => row.name),
    ["Morgenmenu", "Café latte", "München-brød"],
  );
});

test("produktsøgning er Unicode-tolerant uden at ændre den synlige label", () => {
  const rows = buildProductAnalysis(products).rows;

  assert.deepEqual(
    filterProductRows(rows, "cafe").map((row) => row.name),
    ["Café latte"],
  );
  assert.deepEqual(
    filterProductRows(rows, "munchen").map((row) => row.name),
    ["München-brød"],
  );
  assert.equal(filterProductRows(rows, "cafe")[0].name, "Café latte");
});

test("tabelsortering håndterer retning, danske navne og manglende værdier", () => {
  const rows = buildProductAnalysis([
    ...products,
    { name: "Årstid", revenue: 90, units: 0 },
  ]).rows;

  assert.deepEqual(
    sortProductRows(rows, "name", "asc").map((row) => row.name),
    ["Café latte", "Morgenmenu", "München-brød", "Årstid"],
  );
  assert.equal(sortProductRows(rows, "revenue", "asc")[0].name, "München-brød");
  assert.equal(sortProductRows(rows, "revenue", "desc")[0].name, "Morgenmenu");
  assert.equal(sortProductRows(rows, "averagePrice", "asc").at(-1).name, "Årstid");
  assert.equal(sortProductRows(rows, "averagePrice", "desc").at(-1).name, "Årstid");
});

test("0 enheder udelukkes fra gennemsnitspris uden at fjerne omsætning og andel", () => {
  const analysis = buildProductAnalysis([
    { name: "Råvarer", revenue: 100, units: 0 },
    { name: "Ændring", revenue: 300, units: 3 },
  ]);
  const zeroUnitProduct = analysis.rows.find((row) => row.name === "Råvarer");

  assert.equal(zeroUnitProduct.averagePrice, null);
  assert.equal(zeroUnitProduct.share, 0.25);
  assert.deepEqual(
    rankProductRows(analysis.rows, "averagePrice").map((row) => row.name),
    ["Ændring"],
  );
});

test("manglende antal bevarer omsætning og andel og giver en neutral indsigt", () => {
  const analysis = buildProductAnalysis(
    [
      { name: "København", revenue: 400, units: null },
      { name: "Café", revenue: 100, units: null },
    ],
    { hasRevenue: true, hasUnits: false },
  );

  assert.equal(analysis.highestRevenue.name, "København");
  assert.equal(analysis.rows[0].share, 0.8);
  assert.equal(analysis.rows[0].units, null);
  assert.equal(analysis.highestAveragePrice, null);
  assert.equal(analysis.mostUnits, null);
  assert.match(buildProductInsight(analysis), /Enhedsbaseret sammenligning er ikke tilgængelig/u);
  assert.deepEqual(getAvailableProductTableColumns(analysis), ["name", "revenue", "share"]);
});

test("kolonnevalg normaliseres og kan gemmes sikkert i en browsersession", () => {
  const available = ["name", "revenue", "units", "averagePrice", "share"];
  const serialized = serializeProductTableColumnSelection(
    ["name", "revenue", "averagePrice"],
    available,
  );

  assert.deepEqual(
    parseProductTableColumnSelection(serialized, available),
    ["name", "revenue", "averagePrice"],
  );
  assert.deepEqual(
    parseProductTableColumnSelection(JSON.stringify(["units"]), available),
    ["name", "revenue", "units"],
  );
  assert.deepEqual(
    parseProductTableColumnSelection("ugyldig json", available),
    available,
  );
});

test("aktive dashboardfiltre styrer alle produktværdier gennem den centrale aggregering", () => {
  const rows = [
    {
      date: new Date(2026, 0, 1),
      month: "januar 2026",
      product: "Café latte",
      category: "Drikke",
      channel: "Café",
      region: "København",
      revenue: 100,
      units: 4,
      grossProfit: null,
      grossMargin: null,
      cost: null,
    },
    {
      date: new Date(2026, 0, 2),
      month: "januar 2026",
      product: "Croissant",
      category: "Bagværk",
      channel: "Café",
      region: "København",
      revenue: 80,
      units: 5,
      grossProfit: null,
      grossMargin: null,
      cost: null,
    },
    {
      date: new Date(2026, 1, 2),
      month: "februar 2026",
      product: "Café latte",
      category: "Drikke",
      channel: "Online",
      region: "München",
      revenue: 140,
      units: 6,
      grossProfit: null,
      grossMargin: null,
      cost: null,
    },
  ];
  const filtered = applyDashboardFilters(rows, {
    month: [],
    product: [],
    category: ["Drikke"],
    channel: [],
    region: [],
  });
  const metrics = calculateDashboardMetrics(filtered);
  const analysis = buildProductAnalysis(metrics.products, {
    hasRevenue: metrics.hasRevenueData,
    hasUnits: metrics.hasUnitsData,
  });

  assert.equal(metrics.rowCount, 2);
  assert.equal(analysis.rows.length, 1);
  assert.equal(analysis.rows[0].name, "Café latte");
  assert.equal(analysis.rows[0].revenue, 240);
  assert.equal(analysis.rows[0].units, 10);
  assert.equal(analysis.rows[0].averagePrice, 24);
  assert.equal(analysis.rows[0].share, 1);
});

test("produktvisningen genbruger 7.500-rækkers aggregeringen uden et nyt fuldt row-scan", () => {
  const rows = Array.from({ length: 7_500 }, (_, index) => ({
    date: new Date(2026, index % 6, 1),
    month: `${(index % 6) + 1}/2026`,
    product: `Produkt ${index % 80}`,
    category: `Kategori ${index % 12}`,
    revenue: 100 + (index % 17),
    units: 1 + (index % 5),
    grossProfit: null,
    grossMargin: null,
    cost: null,
  }));
  const startedAt = performance.now();
  const metrics = calculateDashboardMetrics(rows);
  const analysis = buildProductAnalysis(metrics.products, {
    hasRevenue: metrics.hasRevenueData,
    hasUnits: metrics.hasUnitsData,
  });
  const ranking = rankProductRows(analysis.rows, "averagePrice", 10);
  const duration = performance.now() - startedAt;

  assert.equal(metrics.rowCount, 7_500);
  assert.equal(analysis.rows.length, 80);
  assert.equal(ranking.length, 10);
  assert.ok(duration < 1_000, `Aggregering og produktanalyse tog ${duration.toFixed(1)} ms`);
});

test("produktkomponenten har tilgængelig søgning, sortering og kontrolleret tabelhøjde", () => {
  const source = readFileSync(
    new URL("../components/product-analysis-dashboard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /type="search"/u);
  assert.match(source, /aria-sort=/u);
  assert.match(source, /Sortér efter/u);
  assert.match(source, /focus-visible:ring-2/u);
  assert.match(source, /window\.sessionStorage/u);
  assert.match(source, /max-h-\[420px\]/u);
  assert.match(source, /overscroll-contain/u);
  assert.match(source, /Rangér efter/u);
});
