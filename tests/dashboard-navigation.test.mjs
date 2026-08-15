import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardViews,
  getDashboardView,
  resolveDashboardView,
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
    "dataset",
  ]);
});

test("indsigter samler analyse og rapport i ét navigationselement", () => {
  const insights = getDashboardView("insights");

  assert.equal(insights.label, "Indsigter");
  assert.equal(insights.title, "Indsigter & rapporter");
  assert.equal(dashboardViews.some((view) => view.id === "reports"), false);
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

test("det tidligere rapport-id åbner den samlede indsigtsside", () => {
  assert.equal(resolveDashboardView("reports"), "insights");
  assert.equal(getDashboardView("reports").id, "insights");
});
