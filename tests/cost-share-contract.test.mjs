import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryAnalysis, buildCategoryCsv, CATEGORY_METRIC_LABELS,
  parseCategoryColumnSelection, serializeCategoryColumnSelection, sortCategoryRows,
} from "../lib/category-analysis.ts";
import { buildCostIntelligence } from "../lib/cost-intelligence.ts";
import { buildCostDetailCsv, parseCostDetailColumnSelection, sortCostDetailRows } from "../lib/cost-detail-table.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { COST_DISTRIBUTION_SHARE_LABEL, COST_TO_REVENUE_LABEL } from "../lib/cost-share.ts";

function row(revenue, cost, category = "A") {
  return {
    date: new Date(2026, 0, 1), month: "januar 2026", product: category,
    category, channel: "Online", region: "Nord", revenue, units: 1,
    grossProfit: null, grossMargin: null, cost,
  };
}

test("COST: global andel bruger omsætning; kategori, sortering og CSV bruger samlede omkostninger", () => {
  const rows = [row(600, 150, "A"), row(400, 50, "B")];
  const global = buildCostIntelligence(rows);
  const insight = buildInsightAnalysis(rows);
  const category = buildCategoryAnalysis([
    { name: "A", revenue: 600, grossProfit: 0, cost: 150, costCount: 1 },
    { name: "B", revenue: 400, grossProfit: 0, cost: 50, costCount: 1 },
  ]);

  assert.equal(global.costShare, 0.2);
  assert.equal(insight.snapshot.find((item) => item.metric === "costShare").value, 0.2);
  assert.equal(insight.snapshot.find((item) => item.metric === "costShare").label, COST_TO_REVENUE_LABEL);
  assert.equal(category.rows[0].costDistributionShare, 0.75);
  assert.equal(category.rows[1].costDistributionShare, 0.25);
  assert.equal(CATEGORY_METRIC_LABELS.costDistributionShare, COST_DISTRIBUTION_SHARE_LABEL);
  assert.equal(sortCategoryRows(category.rows, "costDistributionShare", "desc")[0].name, "A");
  const csv = buildCategoryCsv(category.rows, ["costDistributionShare"], ["name", "revenue", "revenueShare", "costDistributionShare"]);
  assert.match(csv, /"Andel af samlede omkostninger"/u);
  assert.match(csv, /"A";"600";"60";"75"/u);
});

test("COST: gamle gemte costShare/share-kolonner migreres uden at miste valget", () => {
  const available = ["name", "revenue", "revenueShare", "costDistributionShare"];
  const selected = parseCategoryColumnSelection(JSON.stringify(["name", "costShare"]), available);
  assert.deepEqual(selected, available);
  assert.equal(serializeCategoryColumnSelection(selected, available).includes("costShare"), false);
  const costColumns = parseCostDetailColumnSelection(JSON.stringify(["name", "share"]));
  assert.ok(costColumns.includes("costDistributionShare"));
  assert.equal(costColumns.includes("share"), false);
  assert.ok(parseCostDetailColumnSelection(JSON.stringify(["costShare"])).includes("costDistributionShare"));
});

test("COST: ufordelt rest får egen række og sænker ikke nævneren", () => {
  const analysis = buildCostIntelligence([row(1_000, 150)], {
    totalCosts: 200, distribution: [{ name: "Løn", cost: 150 }],
  });
  const wage = analysis.distribution.find((item) => item.name === "Løn");
  const remainder = analysis.distribution.find((item) => item.name === "Ufordelte omkostninger");
  assert.equal(analysis.costShare, 0.2);
  assert.equal(wage.share, 0.75);
  assert.equal(remainder.cost, 50);
  assert.equal(remainder.share, 0.25);
  assert.equal(analysis.distribution.reduce((sum, item) => sum + item.share, 0), 1);
  assert.equal(sortCostDetailRows(analysis.detailRows, "costDistributionShare", "desc")[0].name, "Løn");
  const csv = buildCostDetailCsv(analysis.detailRows, ["costDistributionShare"]);
  assert.match(csv, /"Andel af samlede omkostninger"/u);
  assert.match(csv, /"Løn";"150,00";"75,00"/u);
  const overallocated = buildCostIntelligence([row(1_000, 250)], {
    totalCosts: 200, distribution: [{ name: "Drift", cost: 250 }],
  });
  assert.equal(overallocated.distribution.find((item) => item.name === "Ufordelte omkostninger").cost, -50);
  assert.equal(overallocated.distribution.find((item) => item.name === "Ufordelte omkostninger").share, -0.25);
  const unnamedCategory = buildCategoryAnalysis([
    { name: "A", revenue: 800, grossProfit: 0, cost: 150, costCount: 1 },
    { name: "", revenue: 200, grossProfit: 0, cost: 50, costCount: 1 },
  ]);
  assert.equal(unnamedCategory.rows.find((item) => item.name === "A").costDistributionShare, 0.75);
  assert.equal(unnamedCategory.rows.find((item) => item.name === "Ukategoriseret").costDistributionShare, 0.25);
});

test("COST: negative korrektioner bevarer fortegn; nettotal 0 giver null frem for NaN eller 0", () => {
  const signed = buildCostIntelligence([row(1_000, 200)], {
    totalCosts: 200,
    distribution: [{ name: "Drift", cost: 250 }, { name: "Korrektion", cost: -50 }],
  });
  assert.equal(signed.distribution.find((item) => item.name === "Drift").share, 1.25);
  assert.equal(signed.distribution.find((item) => item.name === "Korrektion").share, -0.25);
  assert.equal(signed.distribution.reduce((sum, item) => sum + item.share, 0), 1);
  const categorySigned = buildCategoryAnalysis([
    { name: "Drift", revenue: 800, grossProfit: 0, cost: 250, costCount: 1 },
    { name: "Korrektion", revenue: 200, grossProfit: 0, cost: -50, costCount: 1 },
  ]);
  assert.deepEqual(categorySigned.rows.map((item) => item.costDistributionShare), [1.25, -0.25]);

  const zero = buildCostIntelligence([row(1_000, 0)], {
    totalCosts: 0,
    distribution: [{ name: "Drift", cost: 50 }, { name: "Korrektion", cost: -50 }],
  });
  assert.equal(zero.costShare, 0);
  assert.deepEqual(zero.distribution.map((item) => item.share), [null, null]);
  const categoryZero = buildCategoryAnalysis([
    { name: "Drift", revenue: 800, grossProfit: 0, cost: 50, costCount: 1 },
    { name: "Korrektion", revenue: 200, grossProfit: 0, cost: -50, costCount: 1 },
  ]);
  assert.deepEqual(categoryZero.rows.map((item) => item.costDistributionShare), [null, null]);
  const csv = buildCostDetailCsv(zero.detailRows, ["costDistributionShare"]);
  assert.equal(csv.includes("NaN"), false);
  assert.equal(csv.includes("Infinity"), false);
  assert.match(csv, /"Drift";"50,00";""/u);
});

test("COST: insight-fordeling bruger dokumenteret total inklusive korrektioner og ufordelt rest", () => {
  const rows = [row(1_000, null)];
  const costSource = {
    source: "workbook-total", scope: "full", status: "available", totalCosts: 200,
    result: 800, resultMargin: 0.8, reason: null,
  };
  const analysis = buildInsightAnalysis(rows, {
    costSource,
    costDistribution: [{ name: "Drift", cost: 250 }, { name: "Korrektion", cost: -50 }],
  });
  const evidence = analysis.evidence.find((item) => item.type === "distribution");
  assert.equal(evidence?.contribution, 1.25);
  assert.match(analysis.observations.map((item) => item.text).join(" "), /125.*samlede omkostninger/u);

  const unallocated = buildInsightAnalysis(rows, {
    costSource,
    costDistribution: [{ name: "Drift", cost: 150 }],
  });
  assert.equal(unallocated.evidence.find((item) => item.type === "distribution")?.contribution, 0.75);
});
