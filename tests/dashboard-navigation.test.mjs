import assert from "node:assert/strict";
import test from "node:test";

import {
  dashboardLocationSearch,
  dashboardViews,
  getDashboardView,
  mainDashboardView,
  parseDashboardLocation,
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
    "channels",
    "regions",
    "costs",
    "insights",
    "dataset",
  ]);
});

test("Ledelse samler Indsigter, Rapport og Strategi i ét navigationselement", () => {
  const insights = getDashboardView("insights");

  assert.equal(insights.label, "Ledelse");
  assert.equal(insights.title, "Ledelse");
  assert.equal(dashboardViews.some((view) => view.id === "reports"), false);
});

test("kun fire hovedområder og ét sekundært dataområde er navigationsmål", () => {
  assert.deepEqual(["overview", "analysis", "costs", "insights", "dataset"].map((view) => getDashboardView(view).label),
    ["Overblik", "Analyse", "Økonomi", "Ledelse", "Data / opsætning"]);
  for (const view of ["analysis", "products", "categories", "channels", "regions"]) {
    assert.equal(mainDashboardView(view), "analysis");
  }
});

test("URL-state runder alle hovedvisninger og tabs af uden at miste andre query-parametre", () => {
  const cases = [
    ["overview", "insights", "?view=overview", "overview"],
    ["analysis", "insights", "?view=analysis", "analysis"],
    ["products", "insights", "?view=analysis&tab=products", "products"],
    ["categories", "insights", "?view=analysis&tab=categories", "categories"],
    ["channels", "insights", "?view=analysis&tab=channels", "channels"],
    ["regions", "insights", "?view=analysis&tab=regions", "regions"],
    ["costs", "insights", "?view=economy", "costs"],
    ["insights", "insights", "?view=management", "insights"],
    ["insights", "report", "?view=management&tab=report", "insights"],
    ["insights", "strategy", "?view=management&tab=strategy", "insights"],
    ["dataset", "insights", "?view=data", "dataset"],
  ];
  for (const [view, tab, search, resolved] of cases) {
    assert.equal(dashboardLocationSearch(view, tab), search);
    assert.deepEqual(parseDashboardLocation(search), { view: resolved, managementTab: tab });
  }
  assert.equal(dashboardLocationSearch("products", "insights", "?campaign=demo&tab=report"), "?campaign=demo&tab=products&view=analysis");
  assert.deepEqual(parseDashboardLocation("?view=management&tab=invalid"), { view: "insights", managementTab: "insights" });
  assert.deepEqual(parseDashboardLocation("?view=analysis&tab=invalid"), { view: "analysis", managementTab: "insights" });
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
