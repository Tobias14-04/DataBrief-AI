import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCategoryAnalysis,
  buildCategoryCsv,
  buildCategoryInsights,
  filterCategoryRows,
  getAvailableCategoryColumns,
  parseCategoryColumnSelection,
  serializeCategoryColumnSelection,
  sortCategoryRows,
} from "../lib/category-analysis.ts";
import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";

const categories = [
  {
    name: "Drikke",
    revenue: 600,
    grossProfit: 360,
    cost: 240,
    rowCount: 6,
    grossProfitCount: 6,
    costCount: 6,
  },
  {
    name: "Bagværk",
    revenue: 300,
    grossProfit: 210,
    cost: 90,
    rowCount: 3,
    grossProfitCount: 3,
    costCount: 3,
  },
  {
    name: "Månedsløn",
    revenue: 100,
    grossProfit: 40,
    cost: 60,
    rowCount: 2,
    grossProfitCount: 2,
    costCount: 2,
  },
];

test("omsætnings- og omkostningsandele summerer til 100 procent", () => {
  const analysis = buildCategoryAnalysis(categories);
  const revenueShare = analysis.rows.reduce((sum, row) => sum + row.revenueShare, 0);
  const costShare = analysis.rows.reduce((sum, row) => sum + row.costShare, 0);

  assert.ok(Math.abs(revenueShare - 1) < 1e-12);
  assert.ok(Math.abs(costShare - 1) < 1e-12);
  assert.equal(analysis.totalRevenue, 1_000);
  assert.equal(analysis.totalCosts, 390);
});

test("dækningsgrad beregnes på aggregeret dækningsbidrag divideret med omsætning", () => {
  const rows = [
    {
      date: new Date(2026, 0, 1),
      month: "januar 2026",
      product: "A",
      category: "Café",
      revenue: 100,
      units: 1,
      grossProfit: 90,
      grossMargin: 0.9,
      cost: 10,
    },
    {
      date: new Date(2026, 0, 2),
      month: "januar 2026",
      product: "B",
      category: "Café",
      revenue: 900,
      units: 9,
      grossProfit: 90,
      grossMargin: 0.1,
      cost: 810,
    },
  ];
  const metrics = calculateDashboardMetrics(rows);
  const analysis = buildCategoryAnalysis(metrics.categoryGroups, {
    hasGrossProfit: metrics.hasGrossProfit,
    hasCosts: metrics.hasCosts,
  });

  assert.equal(analysis.rows[0].grossProfit, 180);
  assert.equal(analysis.rows[0].grossMargin, 0.18);
  assert.notEqual(analysis.rows[0].grossMargin, 0.5);
});

test("alle seks nøgletal kan styre kategorirangeringen", () => {
  const rows = buildCategoryAnalysis(categories).rows;

  assert.equal(sortCategoryRows(rows, "revenue", "desc")[0].name, "Drikke");
  assert.equal(sortCategoryRows(rows, "revenueShare", "desc")[0].name, "Drikke");
  assert.equal(sortCategoryRows(rows, "grossProfit", "desc")[0].name, "Drikke");
  assert.equal(sortCategoryRows(rows, "grossMargin", "desc")[0].name, "Bagværk");
  assert.equal(sortCategoryRows(rows, "cost", "desc")[0].name, "Drikke");
  assert.equal(sortCategoryRows(rows, "costShare", "desc")[0].name, "Drikke");
  assert.equal(sortCategoryRows(rows, "grossMargin", "asc")[0].name, "Månedsløn");
});

test("kategorisøgning matcher Unicode uden at ændre den synlige label", () => {
  const rows = buildCategoryAnalysis([
    ...categories,
    {
      name: "München",
      revenue: 50,
      grossProfit: 20,
      cost: 30,
      grossProfitCount: 1,
      costCount: 1,
    },
  ]).rows;

  assert.equal(filterCategoryRows(rows, "manedslon")[0].name, "Månedsløn");
  assert.equal(filterCategoryRows(rows, "munchen")[0].name, "München");
});

test("0 omsætning og manglende datagrundlag giver ingen misvisende procentsats", () => {
  const analysis = buildCategoryAnalysis(
    [
      {
        name: "Råvarer",
        revenue: 0,
        grossProfit: 50,
        cost: 0,
        grossProfitCount: 1,
        costCount: 0,
      },
    ],
    { hasGrossProfit: true, hasCosts: false },
  );

  assert.equal(analysis.rows[0].revenueShare, null);
  assert.equal(analysis.rows[0].grossMargin, null);
  assert.equal(analysis.rows[0].cost, null);
  assert.equal(analysis.rows[0].costShare, null);
  assert.deepEqual(
    getAvailableCategoryColumns(analysis),
    ["name", "revenue", "revenueShare", "grossProfit", "grossMargin"],
  );
});

test("manglende dækningsbidrag og omkostninger skjuler kun de berørte analyser", () => {
  const analysis = buildCategoryAnalysis(
    categories,
    { hasGrossProfit: false, hasCosts: false },
  );

  assert.equal(analysis.highestGrossMargin, null);
  assert.equal(analysis.largestCostShare, null);
  assert.equal(analysis.rows[0].grossProfit, null);
  assert.equal(analysis.rows[0].cost, null);
  assert.deepEqual(
    getAvailableCategoryColumns(analysis),
    ["name", "revenue", "revenueShare"],
  );
});

test("ufuldstændige kategoriaggregater får ikke en misvisende dækningsgrad", () => {
  const analysis = buildCategoryAnalysis(
    [
      {
        name: "Café",
        revenue: 1_000,
        grossProfit: 100,
        cost: 900,
        rowCount: 10,
        grossProfitCount: 4,
        costCount: 4,
      },
    ],
    { hasGrossProfit: true, hasCosts: true },
  );

  assert.equal(analysis.rows[0].grossProfit, null);
  assert.equal(analysis.rows[0].grossMargin, null);
  assert.equal(analysis.rows[0].cost, null);
  assert.equal(analysis.rows[0].costShare, null);
});

test("delvis omkostningsdækning opfinder ikke en 100-procents fordeling", () => {
  const analysis = buildCategoryAnalysis(
    [
      {
        name: "Drikke",
        revenue: 600,
        grossProfit: 0,
        cost: 240,
        rowCount: 6,
        grossProfitCount: 0,
        costCount: 6,
      },
      {
        name: "Bagværk",
        revenue: 400,
        grossProfit: 0,
        cost: 0,
        rowCount: 4,
        grossProfitCount: 0,
        costCount: 2,
      },
    ],
    { hasGrossProfit: false, hasCosts: true },
  );

  assert.equal(analysis.hasCompleteCostCoverage, false);
  assert.equal(analysis.rows[0].cost, 240);
  assert.equal(analysis.rows[0].costShare, null);
  assert.equal(analysis.rows[1].cost, null);
  assert.equal(analysis.largestCostShare, null);
});

test("kategoriindsigter beskriver koncentration og rentabilitetsforskel med faktiske data", () => {
  const insights = buildCategoryInsights(buildCategoryAnalysis(categories));

  assert.equal(insights.length, 2);
  assert.match(insights[0], /De to største kategorier samler 90\s?% af omsætningen/u);
  assert.match(insights[1], /Bagværk har 10 procentpoint højere dækningsgrad end den største kategori, Drikke/u);
});

test("CSV bevarer fulde numeriske værdier og bruger ikke forkortede displayenheder", () => {
  const analysis = buildCategoryAnalysis([
    {
      name: "Café",
      revenue: 42_672,
      grossProfit: 25_603.2,
      cost: 17_068.8,
      grossProfitCount: 1,
      costCount: 1,
    },
  ]);
  const columns = getAvailableCategoryColumns(analysis);
  const csv = buildCategoryCsv(analysis.rows, columns, columns);

  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"42672"/u);
  assert.match(csv, /"60"/u);
  assert.doesNotMatch(csv, /t\.kr\.|mio\. kr\./u);
});

test("kolonnevalg gemmes sikkert og obligatoriske kolonner bevares", () => {
  const available = [
    "name",
    "revenue",
    "revenueShare",
    "grossProfit",
    "grossMargin",
    "cost",
    "costShare",
  ];
  const serialized = serializeCategoryColumnSelection(
    ["name", "revenue", "revenueShare", "grossMargin"],
    available,
  );

  assert.deepEqual(
    parseCategoryColumnSelection(serialized, available),
    ["name", "revenue", "revenueShare", "grossMargin"],
  );
  assert.deepEqual(
    parseCategoryColumnSelection(JSON.stringify(["cost"]), available),
    ["name", "revenue", "revenueShare", "cost"],
  );
});

test("periode-, kategori- og produktfiltre rammer samme centrale kategorigrupper", () => {
  const sourceRows = [
    {
      date: new Date(2026, 0, 1),
      month: "januar 2026",
      product: "Café latte",
      category: "Drikke",
      channel: "Café",
      region: "København",
      revenue: 100,
      units: 4,
      grossProfit: 60,
      grossMargin: 0.6,
      cost: 40,
    },
    {
      date: new Date(2026, 1, 1),
      month: "februar 2026",
      product: "Café latte",
      category: "Drikke",
      channel: "Online",
      region: "København",
      revenue: 140,
      units: 6,
      grossProfit: 70,
      grossMargin: 0.5,
      cost: 70,
    },
    {
      date: new Date(2026, 1, 2),
      month: "februar 2026",
      product: "Croissant",
      category: "Bagværk",
      channel: "Café",
      region: "København",
      revenue: 80,
      units: 5,
      grossProfit: 48,
      grossMargin: 0.6,
      cost: 32,
    },
  ];
  const filtered = applyDashboardFilters(sourceRows, {
    month: ["februar 2026"],
    product: ["Café latte"],
    category: ["Drikke"],
    channel: [],
    region: [],
  });
  const metrics = calculateDashboardMetrics(filtered);
  const analysis = buildCategoryAnalysis(metrics.categoryGroups, {
    hasGrossProfit: metrics.hasGrossProfit,
    hasCosts: metrics.hasCosts,
  });

  assert.equal(metrics.rowCount, 1);
  assert.equal(analysis.rows.length, 1);
  assert.equal(analysis.rows[0].revenue, 140);
  assert.equal(analysis.rows[0].grossMargin, 0.5);
});

test("fil 07-lignende kategorianalyse arbejder på grupperne efter ét 7.500-rækkers gennemløb", () => {
  const rows = Array.from({ length: 7_500 }, (_, index) => ({
    date: new Date(2026, index % 6, 1),
    month: `${(index % 6) + 1}/2026`,
    product: `Produkt ${index % 80}`,
    category: `Kategori ${index % 12}`,
    revenue: 100 + (index % 17),
    units: 1 + (index % 5),
    grossProfit: 50 + (index % 13),
    grossMargin: null,
    cost: null,
  }));
  const startedAt = performance.now();
  const metrics = calculateDashboardMetrics(rows);
  const analysis = buildCategoryAnalysis(metrics.categoryGroups, {
    hasGrossProfit: metrics.hasGrossProfit,
    hasCosts: metrics.hasCosts,
  });
  const sorted = sortCategoryRows(analysis.rows, "grossMargin", "desc");
  const duration = performance.now() - startedAt;

  assert.equal(metrics.rowCount, 7_500);
  assert.equal(analysis.rows.length, 12);
  assert.equal(sorted.length, 12);
  assert.ok(duration < 1_000, `Aggregering og kategorianalyse tog ${duration.toFixed(1)} ms`);
});

test("kategorikomponenten har fælles kontrol, tilgængelig sortering og responsiv tabel", () => {
  const source = readFileSync(
    new URL("../components/category-analysis-dashboard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Vis beløb som/u);
  assert.match(source, /Rangér efter/u);
  assert.match(source, /window\.localStorage/u);
  assert.match(source, /type="search"/u);
  assert.match(source, /aria-sort=/u);
  assert.match(source, /focus-visible:ring-2/u);
  assert.match(source, /Tilpas kolonner/u);
  assert.match(source, /Eksportér CSV/u);
  assert.match(source, /max-h-\[420px\]/u);
  assert.match(source, /min-w-\[980px\]/u);
});
