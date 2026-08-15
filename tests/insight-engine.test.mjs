import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";

function row(overrides = {}) {
  return {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Produkt A",
    category: "Kategori A",
    channel: "Online",
    region: "København",
    revenue: 100,
    units: 2,
    grossProfit: null,
    grossMargin: null,
    cost: 40,
    ...overrides,
  };
}

function nextMonth(overrides = {}) {
  return row({
    date: new Date(2026, 1, 5),
    month: "februar 2026",
    ...overrides,
  });
}

function monthRow(monthIndex, overrides = {}) {
  return row({
    date: new Date(2026, monthIndex, 5),
    month: new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" }).format(
      new Date(2026, monthIndex, 1),
    ),
    ...overrides,
  });
}

function driverAnalysis(analysis, metric, dimension) {
  const result = analysis.driverAnalyses.find(
    (item) => item.metric === metric && item.dimension === dimension,
  );
  assert.ok(result, `Mangler ${metric}-drivere for ${dimension}`);
  return result;
}

function snapshotMetric(analysis, metric) {
  return analysis.snapshot.find((item) => item.metric === metric);
}

function assertFiniteTree(value, path = "analysis") {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} skal være et endeligt tal`);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteTree(item, `${path}[${index}]`));
    return;
  }
  Object.entries(value).forEach(([key, item]) => assertFiniteTree(item, `${path}.${key}`));
}

test("A: én kategori identificeres som hele omsætningsstigningen", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Cola", category: "Drikke", revenue: 100 }),
    row({ product: "Salat", category: "Salat", revenue: 100 }),
    nextMonth({ product: "Cola", category: "Drikke", revenue: 180 }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 100 }),
  ]);
  const drivers = driverAnalysis(analysis, "revenue", "category");

  assert.equal(drivers.previousValue, 200);
  assert.equal(drivers.currentValue, 280);
  assert.equal(drivers.totalChange, 80);
  assert.deepEqual(drivers.positiveDrivers.map((item) => item.dimensionValue), ["Drikke"]);
  assert.equal(drivers.positiveDrivers[0].absoluteChange, 80);
  assert.equal(drivers.positiveDrivers[0].contribution, 1);
  assert.equal(drivers.positiveDrivers[0].movementShare, 1);
  assert.deepEqual(drivers.negativeDrivers, []);
});

test("B: positive og negative drivere vises samtidigt og summerer til totalændringen", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Cola", category: "Drikke", revenue: 100 }),
    row({ product: "Salat", category: "Salat", revenue: 100 }),
    row({ product: "Croissant", category: "Bagværk", revenue: 100 }),
    nextMonth({ product: "Cola", category: "Drikke", revenue: 160 }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 70 }),
    nextMonth({ product: "Croissant", category: "Bagværk", revenue: 110 }),
  ]);
  const drivers = driverAnalysis(analysis, "revenue", "category");

  assert.equal(drivers.totalChange, 40);
  assert.deepEqual(
    drivers.positiveDrivers.map((item) => [item.dimensionValue, item.absoluteChange]),
    [["Drikke", 60], ["Bagværk", 10]],
  );
  assert.deepEqual(
    drivers.negativeDrivers.map((item) => [item.dimensionValue, item.absoluteChange]),
    [["Salat", -30]],
  );
  assert.equal(drivers.positiveDrivers[0].contribution, 1.5);
  assert.equal(drivers.positiveDrivers[1].contribution, 0.25);
  assert.equal(drivers.negativeDrivers[0].contribution, -0.75);
  assert.ok(Math.abs(drivers.positiveDrivers[0].movementShare - 0.6) < 1e-12);
  assert.equal(
    [...drivers.positiveDrivers, ...drivers.negativeDrivers]
      .reduce((sum, item) => sum + item.absoluteChange, 0),
    drivers.totalChange,
  );
});

test("C: stor procentændring på lille baseline undertrykkes og rangeres efter absolut betydning", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Lille", category: "Lille", revenue: 100 }),
    row({ product: "Stor", category: "Stor", revenue: 2_000_000 }),
    nextMonth({ product: "Lille", category: "Lille", revenue: 500 }),
    nextMonth({ product: "Stor", category: "Stor", revenue: 2_400_000 }),
  ]);
  const drivers = driverAnalysis(analysis, "revenue", "category");
  const small = drivers.positiveDrivers.find((item) => item.dimensionValue === "Lille");

  assert.equal(drivers.positiveDrivers[0].dimensionValue, "Stor");
  assert.equal(drivers.positiveDrivers[0].absoluteChange, 400_000);
  assert.equal(drivers.positiveDrivers[0].percentageChange, 0.2);
  assert.equal(small?.absoluteChange, 400);
  assert.equal(small?.percentageChange, null);
});

test("D: division med nul giver null-procenter og aldrig NaN eller Infinity", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "A", category: "A", revenue: 0, units: 0, cost: 0 }),
    row({ product: "B", category: "B", revenue: 0, units: 0, cost: 0 }),
    nextMonth({ product: "A", category: "A", revenue: 10, units: 0, cost: 0 }),
    nextMonth({ product: "B", category: "B", revenue: 0, units: 0, cost: 0 }),
  ]);
  const drivers = driverAnalysis(analysis, "revenue", "category");

  assert.equal(drivers.positiveDrivers[0].percentageChange, null);
  assert.equal(snapshotMetric(analysis, "averagePrice"), undefined);
  assertFiniteTree(analysis);
  assert.doesNotMatch(JSON.stringify(analysis), /NaN|Infinity|undefined/u);
});

test("E: uden en tidligere periode bevares snapshot uden falsk sammenligning", () => {
  const analysis = buildInsightAnalysis([
    row({ revenue: 626_120, units: 279, cost: 208_129 }),
  ], { sourceName: "Salgsdata" });

  assert.equal(analysis.currentPeriod?.label, "januar 2026");
  assert.equal(analysis.comparisonPeriod, null);
  assert.equal(analysis.dataBasis.hasComparison, false);
  assert.equal(analysis.changes.length, 0);
  assert.equal(analysis.driverAnalyses.length, 0);
  assert.ok(analysis.snapshot.length > 0);
  assert.match(
    analysis.report.sections.find((section) => section.key === "executive-summary")?.paragraphs.join(" ") ?? "",
    /ingen tidligere sammenlignelig periode/u,
  );
});

test("F: manglende omkostningsdata skjuler omkostning, resultat og omkostningsandel", () => {
  const analysis = buildInsightAnalysis([
    row({ grossProfit: null, grossMargin: null, cost: null }),
    nextMonth({ revenue: 120, grossProfit: null, grossMargin: null, cost: null }),
  ]);
  const metrics = analysis.snapshot.map((item) => item.metric);
  const costSection = analysis.report.sections.find((section) => section.key === "costs-profitability");

  assert.equal(metrics.includes("cost"), false);
  assert.equal(metrics.includes("result"), false);
  assert.equal(metrics.includes("costShare"), false);
  assert.equal(analysis.driverAnalyses.some((item) => item.metric === "cost" || item.metric === "result"), false);
  assert.equal(costSection?.available, false);
  assert.deepEqual(costSection?.paragraphs, []);
});

test("G: uden kategori falder driveranalysen tilbage til produkt, kanal og region", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Café", category: "Ukategoriseret", channel: "Online", region: "København", revenue: 100 }),
    row({ product: "Råvarer", category: "", channel: "Butik", region: "München", revenue: 100 }),
    nextMonth({ product: "Café", category: "Ukategoriseret", channel: "Online", region: "København", revenue: 160 }),
    nextMonth({ product: "Råvarer", category: "", channel: "Butik", region: "München", revenue: 90 }),
  ]);
  const revenueDimensions = analysis.driverAnalyses
    .filter((item) => item.metric === "revenue")
    .map((item) => item.dimension);

  assert.equal(revenueDimensions.includes("category"), false);
  assert.equal(revenueDimensions.includes("product"), true);
  assert.equal(revenueDimensions.includes("channel"), true);
  assert.equal(revenueDimensions.includes("region"), true);
  assert.equal(
    driverAnalysis(analysis, "revenue", "region").positiveDrivers[0].dimensionValue,
    "København",
  );
});

test("H: uden budget oprettes hverken budgetevidence eller budgetpåstande", () => {
  const analysis = buildInsightAnalysis([
    row({ category: "Drikke" }),
    row({ category: "Salat" }),
    nextMonth({ category: "Drikke", revenue: 120 }),
    nextMonth({ category: "Salat", revenue: 90 }),
  ]);

  assert.equal(analysis.dataBasis.budgetBasis, null);
  assert.equal(analysis.evidence.some((item) => item.type === "budget"), false);
  assert.doesNotMatch(JSON.stringify(analysis.report), /budget/u);
});

test("H2: en registreret omkostningsfordeling bevarer Løn som dokumenteret omkostningspost", () => {
  const analysis = buildInsightAnalysis([
    row({ cost: null, grossProfit: null }),
    nextMonth({ cost: null, grossProfit: null }),
  ], {
    costDistribution: [
      { name: "LØN", cost: 70_000 },
      { name: "Løn", cost: 565 },
      { name: "Råvarer", cost: 57_735 },
    ],
  });
  const distributionEvidence = analysis.evidence.find((item) => item.type === "distribution");
  const costSection = analysis.report.sections.find((section) => section.key === "costs-profitability");

  assert.equal(distributionEvidence?.dimensionValue, "Løn");
  assert.equal(distributionEvidence?.currentValue, 70_565);
  assert.match(analysis.observations.map((item) => item.text).join(" "), /Løn/u);
  assert.equal(costSection?.available, true);
  assert.match(costSection?.paragraphs.join(" ") ?? "", /Løn/u);
  assert.doesNotMatch(JSON.stringify(analysis), /\bLon\b/u);
});

test("I: 7.500 rækker analyseres deterministisk under den eksisterende ét-sekundsgrænse", () => {
  const rows = Array.from({ length: 7_500 }, (_, index) => {
    const monthIndex = index % 24;
    return row({
      date: new Date(2024 + Math.floor(monthIndex / 12), monthIndex % 12, 1),
      month: `${(monthIndex % 12) + 1}/${2024 + Math.floor(monthIndex / 12)}`,
      product: `Produkt ${index % 80}`,
      category: `Kategori ${index % 12}`,
      channel: index % 2 ? "Online" : "Butik",
      region: `Region ${index % 5}`,
      revenue: 100 + (index % 17),
      units: 1 + (index % 5),
      cost: 40 + (index % 11),
    });
  });
  const startedAt = performance.now();
  const first = buildInsightAnalysis(rows, { sourceName: "Fil 07" });
  const duration = performance.now() - startedAt;
  const second = buildInsightAnalysis(rows, { sourceName: "Fil 07" });

  assert.equal(first.dataBasis.totalRowCount, 7_500);
  assert.equal(first.dataBasis.periodCount, 24);
  assert.deepEqual(second, first);
  assert.ok(duration < 1_000, `Insight-pipelinen tog ${duration.toFixed(1)} ms`);
});

test("J: synlige evidence- og driverlabels bevarer danske og europæiske tegn", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "CAFÉ", category: "LØN", channel: "ÆNDRING", region: "KØBENHAVN", revenue: 100 }),
    row({ product: "RÅVARER", category: "Råvarer", channel: "MÜNCHEN", region: "München", revenue: 100 }),
    nextMonth({ product: "Café", category: "Løn", channel: "Ændring", region: "København", revenue: 160 }),
    nextMonth({ product: "Råvarer", category: "Råvarer", channel: "München", region: "München", revenue: 90 }),
  ]);
  const labels = analysis.driverAnalyses
    .flatMap((item) => [...item.positiveDrivers, ...item.negativeDrivers])
    .map((item) => item.dimensionValue);

  ["Løn", "Råvarer", "Ændring", "København", "Café", "München"].forEach((label) => {
    assert.equal(labels.includes(label), true, `Den synlige label ${label} mangler`);
  });
  assert.equal(labels.includes("Lon"), false);
  assert.equal(labels.includes("Cafe"), false);
});

test("K: insightmotoren analyserer præcist det allerede filtrerede input", () => {
  const rows = [
    row({ product: "Kaffe", category: "Drikke", region: "København", revenue: 100 }),
    row({ product: "Salat", category: "Salat", region: "København", revenue: 50 }),
    row({ product: "Skjult", category: "Aarhus-kategori", region: "Aarhus", revenue: 10_000 }),
    nextMonth({ product: "Kaffe", category: "Drikke", region: "København", revenue: 150 }),
    nextMonth({ product: "Salat", category: "Salat", region: "København", revenue: 60 }),
    nextMonth({ product: "Skjult", category: "Aarhus-kategori", region: "Aarhus", revenue: 20_000 }),
  ];
  const filteredRows = applyDashboardFilters(rows, {
    month: [],
    product: [],
    category: [],
    channel: [],
    region: ["København"],
  });
  const analysis = buildInsightAnalysis(filteredRows, {
    sourceName: "Salgsdata",
    totalRowCount: rows.length,
    activeFilterLabels: ["København"],
  });
  const drivers = driverAnalysis(analysis, "revenue", "category");

  assert.equal(filteredRows.length, 4);
  assert.equal(analysis.dataBasis.totalRowCount, 6);
  assert.equal(snapshotMetric(analysis, "revenue")?.value, 360);
  assert.equal(drivers.totalChange, 60);
  assert.equal(analysis.dataBasis.activeFilterLabels[0], "København");
  assert.doesNotMatch(JSON.stringify(analysis), /Aarhus|Skjult/u);
});

test("K2: en valgt måned viser månedens snapshot og sammenligner med den foregående periode", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Kaffe", category: "Drikke", revenue: 100 }),
    row({ product: "Salat", category: "Salat", revenue: 50 }),
    nextMonth({ product: "Kaffe", category: "Drikke", revenue: 150 }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 60 }),
  ], { selectedMonth: "februar 2026" });

  assert.equal(snapshotMetric(analysis, "revenue")?.value, 210);
  assert.equal(analysis.dataBasis.rowCount, 2);
  assert.equal(analysis.currentPeriod?.label, "februar 2026");
  assert.equal(analysis.comparisonPeriod?.label, "januar 2026");
  assert.equal(analysis.changes.find((item) => item.metric === "revenue")?.absoluteChange, 60);
});

test("K3: en valgt måned uden match falder ikke tilbage til en anden periodes tal", () => {
  const analysis = buildInsightAnalysis([
    row({ revenue: 100 }),
    nextMonth({ revenue: 150 }),
  ], { selectedMonth: "marts 2026" });

  assert.equal(analysis.snapshot.length, 0);
  assert.equal(analysis.currentPeriod, null);
  assert.equal(analysis.dataBasis.rowCount, 0);
  assert.equal(analysis.dataBasis.hasComparison, false);
});

test("L: rapport, observationer og anbefalinger kan spores 1:1 til eksisterende evidence", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Cola", category: "Drikke", revenue: 100 }),
    row({ product: "Salat", category: "Salat", revenue: 100 }),
    nextMonth({ product: "Cola", category: "Drikke", revenue: 160 }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 80 }),
  ]);
  const evidenceById = new Map(analysis.evidence.map((item) => [item.id, item]));
  const referencedIds = [
    ...analysis.report.sections.flatMap((section) => section.evidenceIds),
    ...analysis.observations.flatMap((item) => item.evidenceIds),
    ...analysis.recommendations.flatMap((item) => item.evidenceIds),
  ];

  referencedIds.forEach((id) => {
    assert.equal(evidenceById.has(id), true, `Rapporten refererer ukendt evidence-id: ${id}`);
  });
  analysis.snapshot.forEach((item) => {
    const evidence = evidenceById.get(item.evidenceId);
    assert.equal(evidence?.currentValue, item.value);
  });
  analysis.changes.forEach((item) => {
    const evidence = evidenceById.get(item.evidenceId);
    assert.equal(evidence?.currentValue, item.value);
    assert.equal(evidence?.previousValue, item.previousValue);
    assert.equal(evidence?.absoluteChange, item.absoluteChange);
  });
  const centralMetrics = analysis.report.sections.find((section) => section.key === "central-metrics");
  assert.deepEqual(
    centralMetrics?.paragraphs,
    analysis.snapshot.map((item) => `${item.label}: ${item.formattedValue}.`),
  );
});

test("M: serialiseret UI-data er endelig, deterministisk og uden kausale påstande", () => {
  const input = [
    row({ product: "Cola", category: "Drikke", revenue: 100, units: 0 }),
    row({ product: "Salat", category: "Salat", revenue: 0, units: 0 }),
    nextMonth({ product: "Cola", category: "Drikke", revenue: 180, units: 0 }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 0, units: 0 }),
  ];
  const first = buildInsightAnalysis(input);
  const second = buildInsightAnalysis(input);
  const serialized = JSON.stringify(first);
  const prose = JSON.stringify({
    observations: first.observations,
    recommendations: first.recommendations,
    report: first.report,
  });

  assert.deepEqual(second, first);
  assertFiniteTree(first);
  assert.doesNotMatch(serialized, /NaN|Infinity|undefined/u);
  assert.doesNotMatch(prose, /(?:på grund af|skyldes|forårsaget af)/iu);
  assert.match(
    first.observations.map((item) => item.text).join(" "),
    /Dataene viser, hvor ændringen opstod, men ikke den bagvedliggende forretningsmæssige årsag\./u,
  );
});

test("uparsebare og manglende perioder påvirker snapshot, men ikke den seneste kronologiske sammenligning", () => {
  const input = [
    row({ revenue: 100 }),
    nextMonth({ revenue: 200 }),
    row({ date: null, month: "Ukendt periode", revenue: 50 }),
    row({ date: null, month: "", revenue: 25 }),
  ];
  const allPeriods = buildInsightAnalysis(input);
  const selectedUnknown = buildInsightAnalysis(input, { selectedMonth: "Ukendt periode" });

  assert.equal(snapshotMetric(allPeriods, "revenue")?.value, 375);
  assert.equal(allPeriods.dataBasis.rowCount, 4);
  assert.equal(allPeriods.currentPeriod?.label, "februar 2026");
  assert.equal(allPeriods.comparisonPeriod?.label, "januar 2026");

  assert.equal(selectedUnknown.currentPeriod?.label, "Ukendt periode");
  assert.equal(snapshotMetric(selectedUnknown, "revenue")?.value, 50);
  assert.equal(selectedUnknown.comparisonPeriod, null);
  assert.equal(selectedUnknown.dataBasis.hasComparison, false);
  assert.deepEqual(selectedUnknown.changes, []);
  assert.deepEqual(selectedUnknown.driverAnalyses, []);
});

test("evidence-id'er er unikke for dimensionslabels, der kun adskiller sig med plus og minus", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Produkt plus", category: "A+B", revenue: 100 }),
    row({ product: "Produkt minus", category: "A-B", revenue: 100 }),
    nextMonth({ product: "Produkt plus", category: "A+B", revenue: 150 }),
    nextMonth({ product: "Produkt minus", category: "A-B", revenue: 80 }),
  ]);
  const drivers = driverAnalysis(analysis, "revenue", "category");
  const driverIds = [...drivers.positiveDrivers, ...drivers.negativeDrivers]
    .map((item) => item.evidenceId);
  const allEvidenceIds = analysis.evidence.map((item) => item.id);

  assert.equal(driverIds.length, 2);
  assert.equal(new Set(driverIds).size, driverIds.length);
  assert.equal(new Set(allEvidenceIds).size, allEvidenceIds.length);
});

test("all-period reliability tæller hver række én gang", () => {
  const input = [
    row({ product: "Januar", category: "Januar" }),
    ...Array.from({ length: 8 }, (_, index) => nextMonth({
      product: `Februar ${index + 1}`,
      category: `Februar ${index + 1}`,
      revenue: 100 + index,
    })),
  ];
  const analysis = buildInsightAnalysis(input);

  assert.equal(analysis.dataBasis.scopeMode, "all-filtered-periods");
  assert.equal(analysis.dataBasis.rowCount, 9);
  assert.equal(analysis.dataBasis.totalRowCount, 9);
  assert.equal(analysis.reliability, "medium");
});

test("autoritativ faktisk omkostning styrer snapshot og budget uden at fabrikere periodedrivere", () => {
  const analysis = buildInsightAnalysis([
    row({ product: "Cola", category: "Drikke", revenue: 100, cost: 30, grossProfit: null }),
    row({ product: "Salat", category: "Salat", revenue: 100, cost: 40, grossProfit: null }),
    nextMonth({ product: "Cola", category: "Drikke", revenue: 120, cost: 50, grossProfit: null }),
    nextMonth({ product: "Salat", category: "Salat", revenue: 80, cost: 20, grossProfit: null }),
  ], {
    actualCost: 500,
    actualCostBasis: "registered",
    budget: { costs: 450, basis: "registered" },
    costDistribution: [
      { name: "Løn", cost: 300 },
      { name: "Råvarer", cost: 200 },
    ],
  });
  const cost = snapshotMetric(analysis, "cost");
  const result = snapshotMetric(analysis, "result");
  const costShare = snapshotMetric(analysis, "costShare");
  const budgetCost = analysis.evidence.find(
    (item) => item.type === "budget" && item.metric === "cost",
  );
  const costSection = analysis.report.sections.find(
    (section) => section.key === "costs-profitability",
  );

  assert.equal(analysis.dataBasis.costBasis, "registered");
  assert.equal(cost?.value, 500);
  assert.equal(result?.value, -100);
  assert.equal(costShare?.value, 1.25);
  assert.equal(budgetCost?.currentValue, 500);
  assert.equal(budgetCost?.previousValue, 450);
  assert.equal(budgetCost?.absoluteChange, 50);
  assert.equal(costSection?.available, true);
  assert.match(costSection?.paragraphs.join(" ") ?? "", /500.*kr\./u);
  assert.equal(
    analysis.changes.some((item) => ["cost", "result", "costShare"].includes(item.metric)),
    false,
  );
  assert.equal(
    analysis.driverAnalyses.some((item) => item.metric === "cost" || item.metric === "result"),
    false,
  );
});

test("to sammenhængende valgte måneder sammenlignes med et lige langt umiddelbart foregående interval", () => {
  const analysis = buildInsightAnalysis([
    monthRow(0, { product: "Cola", category: "Drikke", revenue: 100 }),
    monthRow(0, { product: "Salat", category: "Salat", revenue: 100 }),
    monthRow(1, { product: "Cola", category: "Drikke", revenue: 100 }),
    monthRow(1, { product: "Salat", category: "Salat", revenue: 100 }),
    monthRow(2, { product: "Cola", category: "Drikke", revenue: 140 }),
    monthRow(2, { product: "Salat", category: "Salat", revenue: 80 }),
    monthRow(3, { product: "Cola", category: "Drikke", revenue: 160 }),
    monthRow(3, { product: "Salat", category: "Salat", revenue: 70 }),
  ], { selectedMonths: ["marts 2026", "april 2026"] });
  const revenueChange = analysis.changes.find((item) => item.metric === "revenue");
  const drivers = driverAnalysis(analysis, "revenue", "category");

  assert.equal(analysis.currentPeriod?.label, "marts 2026 – april 2026");
  assert.equal(analysis.currentPeriod?.rowCount, 4);
  assert.equal(analysis.comparisonPeriod?.label, "januar 2026 – februar 2026");
  assert.equal(analysis.comparisonPeriod?.rowCount, 4);
  assert.equal(analysis.dataBasis.hasComparison, true);
  assert.equal(snapshotMetric(analysis, "revenue")?.value, 450);
  assert.equal(revenueChange?.previousValue, 400);
  assert.equal(revenueChange?.value, 450);
  assert.equal(revenueChange?.absoluteChange, 50);
  assert.equal(drivers.previousValue, 400);
  assert.equal(drivers.currentValue, 450);
  assert.equal(drivers.totalChange, 50);
  assert.deepEqual(
    drivers.positiveDrivers.map((item) => [item.dimensionValue, item.absoluteChange]),
    [["Drikke", 100]],
  );
  assert.deepEqual(
    drivers.negativeDrivers.map((item) => [item.dimensionValue, item.absoluteChange]),
    [["Salat", -50]],
  );
});

test("ikke-sammenhængende valgte måneder aggregeres uden falsk sammenligning", () => {
  const analysis = buildInsightAnalysis([
    monthRow(0, { product: "Cola", category: "Drikke", revenue: 100 }),
    monthRow(0, { product: "Salat", category: "Salat", revenue: 50 }),
    monthRow(1, { product: "Cola", category: "Drikke", revenue: 1_000 }),
    monthRow(1, { product: "Salat", category: "Salat", revenue: 1_000 }),
    monthRow(2, { product: "Cola", category: "Drikke", revenue: 300 }),
    monthRow(2, { product: "Salat", category: "Salat", revenue: 20 }),
  ], { selectedMonths: ["januar 2026", "marts 2026"] });

  assert.equal(snapshotMetric(analysis, "revenue")?.value, 470);
  assert.equal(analysis.currentPeriod?.rowCount, 4);
  assert.equal(analysis.comparisonPeriod, null);
  assert.equal(analysis.dataBasis.hasComparison, false);
  assert.deepEqual(analysis.changes, []);
  assert.deepEqual(analysis.driverAnalyses, []);
});

test("et valgt interval uden et komplet lige langt tidligere interval skjuler sammenligningen", () => {
  const analysis = buildInsightAnalysis([
    monthRow(1, { product: "Cola", category: "Drikke", revenue: 100 }),
    monthRow(1, { product: "Salat", category: "Salat", revenue: 100 }),
    monthRow(2, { product: "Cola", category: "Drikke", revenue: 120 }),
    monthRow(2, { product: "Salat", category: "Salat", revenue: 100 }),
    monthRow(3, { product: "Cola", category: "Drikke", revenue: 130 }),
    monthRow(3, { product: "Salat", category: "Salat", revenue: 90 }),
  ], { selectedMonths: ["marts 2026", "april 2026"] });

  assert.equal(snapshotMetric(analysis, "revenue")?.value, 440);
  assert.equal(analysis.currentPeriod?.label, "marts 2026 – april 2026");
  assert.equal(analysis.comparisonPeriod, null);
  assert.equal(analysis.dataBasis.hasComparison, false);
  assert.deepEqual(analysis.changes, []);
  assert.deepEqual(analysis.driverAnalyses, []);
});
