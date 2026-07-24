import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardViews,
  getDashboardView,
} from "../lib/dashboard-navigation.ts";

test("dashboardnavigationen har unikke funktionelle visninger", () => {
  const ids = dashboardViews.map((view) => view.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [
    "overview",
    "analysis",
    "products",
    "categories",
    "costs",
    "insights",
    "reports",
    "dataset",
  ]);
});

test("hver visning har dansk titel og en kort forklaring", () => {
  dashboardViews.forEach((view) => {
    assert.ok(view.label.length > 0);
    assert.ok(view.title.length > 0);
    assert.ok(view.description.length > 10);
    assert.equal(getDashboardView(view.id).id, view.id);
  });
});

test("ukendt view falder sikkert tilbage til overblik", () => {
  assert.equal(getDashboardView("missing"), dashboardViews[0]);
});
