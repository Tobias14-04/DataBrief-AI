import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import {
  applyDashboardFilters,
  reconcileDashboardFilterDraft,
  rowMatchesDashboardFilters,
  toggleDashboardFilterValue,
} from "../lib/dashboard-filtering.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";

const rows = [
  { month: "maj 2026", product: "Café latte", category: "Drikke", channel: "Online", region: "København" },
  { month: "maj 2026", product: "Croissant", category: "Bagværk", channel: "Café", region: "København" },
  { month: "juni 2026", product: "Café latte", category: "Drikke", channel: "Café", region: "Nordsjælland" },
  { month: "juni 2026", product: "Juice", category: "Drikke", channel: "Online", region: "København" },
];

const emptyFilters = {
  month: [],
  product: [],
  category: [],
  channel: [],
  region: [],
};

test("en visning uden aktive filtre genbruger de eksisterende rækker", () => {
  assert.equal(applyDashboardFilters(rows, emptyFilters), rows);
});

test("hurtige multivalg bevarer alle valgte kategorier", () => {
  const withBakery = toggleDashboardFilterValue(emptyFilters, "category", "Bagværk");
  const withDrinks = toggleDashboardFilterValue(withBakery, "category", "Drikke");
  const withSandwiches = toggleDashboardFilterValue(withDrinks, "category", "Sandwich");

  assert.deepEqual(withSandwiches.category, ["Bagværk", "Drikke", "Sandwich"]);
});

test("en forældet dashboardopdatering overskriver ikke nyere filtervalg", () => {
  const firstSelection = toggleDashboardFilterValue(emptyFilters, "category", "Bagværk");
  const latestDraft = toggleDashboardFilterValue(firstSelection, "category", "Drikke");
  const reconciled = reconcileDashboardFilterDraft(firstSelection, latestDraft, true);

  assert.equal(reconciled.filters, latestDraft);
  assert.equal(reconciled.hasPendingDraft, true);
  assert.deepEqual(reconciled.filters.category, ["Bagværk", "Drikke"]);
});

test("den seneste anvendte filterstate afslutter den ventende opdatering", () => {
  const latestDraft = {
    ...emptyFilters,
    category: ["Bagværk", "Drikke", "Sandwich"],
  };
  const reconciled = reconcileDashboardFilterDraft(latestDraft, latestDraft, true);

  assert.equal(reconciled.filters, latestDraft);
  assert.equal(reconciled.hasPendingDraft, false);
});

test("dashboardfiltre anvender flere felter på den samme rækkevisning", () => {
  const filtered = applyDashboardFilters(rows, {
    ...emptyFilters,
    category: ["Drikke"],
    channel: ["Online"],
  });

  assert.deepEqual(filtered.map((row) => row.product), ["Café latte", "Juice"]);
});

test("flere valg i samme filter behandles som enten-eller", () => {
  const filtered = applyDashboardFilters(rows, {
    ...emptyFilters,
    product: ["Café latte", "Croissant"],
  });

  assert.equal(filtered.length, 3);
});

test("månedsrapporten kan ignorere månedsfilteret uden at ignorere øvrige filtre", () => {
  const filters = {
    ...emptyFilters,
    month: ["maj 2026"],
    category: ["Drikke"],
    region: ["Nordsjælland"],
  };

  assert.equal(rowMatchesDashboardFilters(rows[2], filters, "month"), true);
  assert.equal(rowMatchesDashboardFilters(rows[0], filters, "month"), false);
});

test("filtre matcher Unicode-labels via intern nøgle uden at ændre den synlige værdi", () => {
  const unicodeRows = [
    { month: "juli 2026", product: "Månedsløn", category: "Løn", channel: "Café", region: "København" },
    { month: "juli 2026", product: "MÅNEDSLØN", category: "løn", channel: "CAFÉ", region: "KØBENHAVN" },
    { month: "juli 2026", product: "Råvarer", category: "Råvarer", channel: "Butik", region: "München" },
  ];
  const filtered = applyDashboardFilters(unicodeRows, {
    ...emptyFilters,
    product: ["månedsløn"],
    category: ["LØN"],
    channel: ["cafe"],
    region: ["Kobenhavn"],
  });

  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].category, "Løn");
  assert.equal(filtered[0].region, "København");

  const selected = toggleDashboardFilterValue(emptyFilters, "category", "Løn");
  const deselected = toggleDashboardFilterValue(selected, "category", "LØN");
  assert.deepEqual(deselected.category, []);
});

test("fil 07-lignende filterklik med 7.500 rækker genbruger den kompakte beregningspipeline", () => {
  const largeRows = Array.from({ length: 7_500 }, (_, index) => {
    const monthIndex = index % 24;
    return {
      date: new Date(2024 + Math.floor(monthIndex / 12), monthIndex % 12, 1),
      month: `${(monthIndex % 12) + 1}/${2024 + Math.floor(monthIndex / 12)}`,
      product: `Produkt ${index % 80}`,
      category: `Kategori ${index % 12}`,
      channel: index % 2 ? "Online" : "Butik",
      region: `Region ${index % 5}`,
      revenue: 100 + (index % 17),
      units: 1 + (index % 5),
      grossProfit: null,
      grossMargin: null,
      cost: 40 + (index % 11),
    };
  });
  const startedAt = performance.now();
  const filtered = applyDashboardFilters(largeRows, {
    ...emptyFilters,
    category: ["Kategori 3", "Kategori 7"],
    channel: ["Online"],
  });
  const metrics = calculateDashboardMetrics(filtered, undefined, { useWorkbookTotals: false });
  const costs = buildCostIntelligence(filtered, { totalCosts: metrics.totalCosts });
  const duration = performance.now() - startedAt;

  assert.equal(filtered.length, 1_250);
  assert.equal(metrics.rowCount, 1_250);
  assert.equal(costs.rowCount, 1_250);
  assert.ok(duration < 1_000, `Filter + metrics + omkostningsanalyse tog ${duration.toFixed(1)} ms`);
});
