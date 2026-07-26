import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDashboardFilters,
  rowMatchesDashboardFilters,
  toggleDashboardFilterValue,
} from "../lib/dashboard-filtering.ts";

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
