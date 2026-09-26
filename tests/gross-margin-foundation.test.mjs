import assert from "node:assert/strict";
import test from "node:test";

import { buildCategoryAnalysis, getAvailableCategoryColumns } from "../lib/category-analysis.ts";
import { calculateDashboardMetrics } from "../lib/dashboard-metrics.ts";
import { addGrossMarginRow, createGrossMarginBasis, resolveGrossMargin } from "../lib/gross-margin.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildKpiDataProfile, evaluateStandardKpi } from "../lib/kpi-customization.ts";
import { parseNumericValue, parsePercentageValue, safeRatio } from "../lib/numeric-foundation.ts";

function salesRow(overrides = {}) {
  return {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Produkt",
    category: "Kategori",
    channel: "Online",
    region: "Danmark",
    revenue: 100,
    units: 1,
    grossProfit: null,
    grossMargin: null,
    cost: null,
    ...overrides,
  };
}

function getViews(rows) {
  const dashboard = calculateDashboardMetrics(rows);
  const category = buildCategoryAnalysis(dashboard.categoryGroups, {
    hasGrossProfit: dashboard.hasGrossProfit,
    hasCosts: dashboard.hasCosts,
  });
  const insights = buildInsightAnalysis(rows);
  const profile = buildKpiDataProfile(rows.map((row) => ({
    sourceValues: {
      Omsætning: row.revenue,
      Dækningsbidrag: row.grossProfit,
      Dækningsgrad: row.grossMargin,
    },
  })));
  const library = evaluateStandardKpi("gross-margin", {
    ...dashboard,
    hasBudget: false,
  }, profile);
  return {
    dashboard,
    category,
    insights: insights.snapshot.find((item) => item.metric === "grossMargin")?.value ?? null,
    report: insights.report.sections.find((section) => section.key === "central-metrics"),
    library,
  };
}

test("100/900-fixturen giver omsætningsvægtet 82 % på tværs af DG-visninger", () => {
  const views = getViews([
    salesRow({ revenue: 100, grossMargin: 0.1 }),
    salesRow({ revenue: 900, grossMargin: 0.9 }),
  ]);
  assert.equal(views.dashboard.grossMargin, 0.82);
  assert.equal(views.category.aggregateGrossMargin, 0.82);
  assert.equal(views.category.rows[0].grossMargin, 0.82);
  assert.equal(views.insights, 0.82);
  assert.match(JSON.stringify(views.report), /82\s*%/u);
  assert.equal(views.library.value, 0.82);
  assert.equal(views.library.available, true);
  assert.equal(views.dashboard.grossMarginSource, "weighted-margin");
  assert.equal(getAvailableCategoryColumns(views.category).includes("grossMargin"), true);
});

test("komplet DB har forrang frem for registrerede DG-værdier", () => {
  const views = getViews([
    salesRow({ revenue: 100, grossProfit: 10, grossMargin: 0.9 }),
    salesRow({ revenue: 900, grossProfit: 810, grossMargin: 0.1 }),
  ]);
  assert.equal(views.dashboard.grossMarginSource, "gross-profit");
  assert.equal(views.dashboard.grossMargin, 0.82);
  assert.equal(views.category.aggregateGrossMargin, 0.82);
  assert.equal(views.insights, 0.82);
  assert.equal(views.library.value, 0.82);
});

test("delvist DB-grundlag bruger kun komplet DG-fallback; ellers er DG utilgængelig", () => {
  const fallback = getViews([
    salesRow({ revenue: 100, grossProfit: 10, grossMargin: 0.1 }),
    salesRow({ revenue: 900, grossMargin: 0.9 }),
  ]);
  assert.equal(fallback.dashboard.grossMargin, 0.82);
  assert.equal(fallback.dashboard.grossMarginSource, "weighted-margin");
  assert.equal(fallback.category.aggregateGrossMargin, 0.82);
  assert.equal(fallback.insights, 0.82);
  assert.equal(fallback.library.value, 0.82);

  const unavailable = getViews([
    salesRow({ revenue: 100, grossProfit: 10, grossMargin: 0.1 }),
    salesRow({ revenue: 900 }),
  ]);
  assert.equal(unavailable.dashboard.grossMargin, null);
  assert.match(unavailable.dashboard.grossMarginReason, /komplet/i);
  assert.equal(unavailable.category.aggregateGrossMargin, null);
  assert.equal(unavailable.insights, null);
  assert.equal(unavailable.library.available, false);
  assert.equal(unavailable.library.value, null);
});

test("0/0 er utilgængelig, men legitim DG på 0 bevares", () => {
  const zeroDenominator = getViews([salesRow({ revenue: 0, grossProfit: 0, grossMargin: 0 })]);
  assert.equal(zeroDenominator.dashboard.grossMargin, null);
  assert.match(zeroDenominator.dashboard.grossMarginReason, /omsætning på 0/i);
  assert.equal(zeroDenominator.category.aggregateGrossMargin, null);
  assert.equal(zeroDenominator.insights, null);
  assert.equal(zeroDenominator.library.available, false);

  const zeroMargin = getViews([salesRow({ revenue: 100, grossProfit: 0, grossMargin: 0 })]);
  assert.equal(zeroMargin.dashboard.grossMargin, 0);
  assert.equal(zeroMargin.category.aggregateGrossMargin, 0);
  assert.equal(zeroMargin.insights, 0);
  assert.equal(zeroMargin.library.value, 0);
});

test("returnering og negative værdier følger samme summerede DB-definition", () => {
  const views = getViews([
    salesRow({ revenue: 100, grossProfit: 60 }),
    salesRow({ revenue: -20, grossProfit: -10 }),
  ]);
  assert.equal(views.dashboard.grossMargin, 0.625);
  assert.equal(views.category.aggregateGrossMargin, 0.625);
  assert.equal(views.insights, 0.625);
  assert.equal(views.library.value, 0.625);
});

test("procentstrenge og sikre divisioner normaliseres uden at miste 0", () => {
  assert.equal(parsePercentageValue("−5%"), -0.05);
  assert.equal(parsePercentageValue("-5 %"), -0.05);
  assert.equal(parsePercentageValue("0,5%"), 0.005);
  assert.equal(parsePercentageValue("1%"), 0.01);
  assert.equal(parsePercentageValue("5%"), 0.05);
  assert.equal(parsePercentageValue(0), 0);
  assert.equal(parseNumericValue("0"), 0);
  assert.equal(safeRatio(0, 100), 0);
  assert.equal(safeRatio(0, 0), null);
  assert.equal(safeRatio(1e308, 0.1), null);
  const basis = createGrossMarginBasis();
  addGrossMarginRow(basis, { revenue: 0, grossProfit: 0 });
  assert.equal(resolveGrossMargin(basis).value, null);
});

test("KPI-profilen parser tekstprocenter ensartet og afviser ikke-endelige resultater", () => {
  const profile = buildKpiDataProfile([
    { sourceValues: { Omsætning: 100, Dækningsgrad: "-5%" } },
    { sourceValues: { Omsætning: 100, Dækningsgrad: "0,5%" } },
    { sourceValues: { Omsætning: 100, Dækningsgrad: "1%" } },
    { sourceValues: { Omsætning: 100, Dækningsgrad: "5%" } },
  ]);
  assert.deepEqual(profile.numericValues.grossMargin, [-0.05, 0.005, 0.01, 0.05]);

  const extremeProfile = buildKpiDataProfile([{
    sourceValues: { Omsætning: 1e308, Antal: 0.1 },
  }]);
  const extreme = evaluateStandardKpi("avg-revenue-unit", {
    ...calculateDashboardMetrics([salesRow({ revenue: 1e308, units: 0.1 })]),
    hasBudget: false,
  }, extremeProfile);
  assert.equal(extreme.available, false);
  assert.equal(extreme.value, null);
});
