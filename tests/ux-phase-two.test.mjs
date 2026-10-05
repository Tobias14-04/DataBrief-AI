import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name) => readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8");

test("Overblik viser prioriterede findings, begrænser sekundære KPI'er og linker til detaljer", () => {
  const dashboard = source("upload-dashboard");
  assert.match(dashboard, /secondaryKpis\.slice\(0, 3\)/u);
  assert.match(dashboard, /secondaryKpis\.slice\(3\)/u);
  assert.match(dashboard, /executiveSummary\.insights\.slice\(0, 2\)/u);
  assert.match(dashboard, /Åbn Ledelse/u);
  assert.doesNotMatch(dashboard, /<OverviewAnalysisPreviewGrid/u);
  assert.doesNotMatch(dashboard, /data-testid="budget-section"/u);
  assert.equal((dashboard.match(/<MonthlyReportCard/g) ?? []).length, 1);
});

test("Analyse viser én kort rangering og en detaljeret tabel pr. dimension", () => {
  const products = source("product-analysis-dashboard");
  const categories = source("category-analysis-dashboard");
  assert.match(products, /rankProductRows\(rows, metric, 5\)/u);
  assert.equal((products.match(/<ProductRanking/g) ?? []).length, 1);
  assert.equal((categories.match(/<CategoryRanking/g) ?? []).length, 1);
  assert.match(categories, /valueKey=\{effectiveSortKey\}/u);
  assert.match(products, /Detaljeret produkttabel/u);
  assert.match(categories, /Detaljeret kategoritabel/u);
});

test("Tomme driver- og ledelsesvisninger er kompakte og tilbyder periodehandling", () => {
  const dimensions = source("dimension-analysis-dashboard");
  const leadership = source("insights-report-dashboard");
  assert.match(dimensions, /Sammenlign seneste komplette måned/u);
  assert.match(dimensions, /!supported \|\| !driver/u);
  assert.match(leadership, /!analysis\.comparisonPeriod/u);
  assert.match(leadership, /Sammenlign seneste komplette måned/u);
  assert.match(leadership, /Print rapport/u);
});

test("Økonomi prioriterer status, budget, fordeling, effektivitet og tabel", () => {
  const economy = source("cost-intelligence-dashboard");
  const block = economy.slice(economy.indexOf("export const CostIntelligenceDashboard"));
  const sections = ["<CostKpiGrid", "<CostBudgetPanel", "<CostDistributionPanel", "<CostEfficiencyPanel", "<CostDetailTable"];
  const offsets = sections.map((section) => block.indexOf(section));
  assert.ok(offsets.every((offset) => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  assert.match(block, /<details className="group rounded-xl/u);
  assert.match(block, /cost-scope-unavailable/u);
  assert.match(block, /analysis\.costBasis\.status === "unavailable" && analysis\.reportedCosts === null/u);
});

test("Strategisk overblik viser kun interne fund og sammenhænge med indhold", () => {
  const strategy = source("strategy-dashboard");
  assert.match(strategy, /visibleQuadrants\.map/u);
  assert.match(strategy, /visibleTows\.map/u);
  assert.match(strategy, /visibleQuadrants\.length \? <CommandPanel/u);
  assert.match(strategy, /visibleTows\.length \? <CommandPanel/u);
});
