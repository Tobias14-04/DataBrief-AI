import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBudgetVariancePresentation,
  buildCostDetailCsv,
  compareNullableCostDetailNumbers,
  COST_DETAIL_PRIMARY_COLUMNS,
  getAvailableCostDetailColumns,
  parseCostDetailColumnSelection,
  serializeCostDetailColumnSelection,
  sortCostDetailRows,
} from "../lib/cost-detail-table.ts";

function detailRow(overrides = {}) {
  return {
    name: "Løn",
    cost: 1_234.5,
    share: 0.57,
    current: 1_234.5,
    previous: null,
    change: null,
    changePercent: null,
    ...overrides,
  };
}

test("primære kolonner er altid aktive, og sessionsværdier roundtripper sikkert", () => {
  assert.deepEqual(
    parseCostDetailColumnSelection(null),
    [...COST_DETAIL_PRIMARY_COLUMNS],
  );
  assert.deepEqual(
    parseCostDetailColumnSelection("ikke-json"),
    [...COST_DETAIL_PRIMARY_COLUMNS],
  );
  assert.deepEqual(
    parseCostDetailColumnSelection(JSON.stringify(["budget", "change", "ukendt", "change"])),
    ["name", "current", "change", "budget", "share"],
  );

  const serialized = serializeCostDetailColumnSelection(["budgetVariance", "previous"]);
  assert.equal(
    serialized,
    JSON.stringify(["name", "current", "previous", "budgetVariance", "share"]),
  );
  assert.deepEqual(
    parseCostDetailColumnSelection(serialized, ["name", "current", "previous", "share"]),
    ["name", "current", "previous", "share"],
  );
});

test("valgfrie kolonner er kun tilgængelige, når rækkerne har et endeligt tal", () => {
  const primaryOnly = getAvailableCostDetailColumns([
    detailRow({ budget: Number.NaN, budgetVariance: undefined }),
  ]);
  assert.deepEqual(primaryOnly, ["name", "current", "share"]);

  const allColumns = getAvailableCostDetailColumns([
    detailRow({
      previous: 1_000,
      change: 234.5,
      changePercent: 0.2345,
      budget: 1_300,
      budgetVariance: -65.5,
    }),
  ]);
  assert.deepEqual(allColumns, [
    "name",
    "current",
    "previous",
    "change",
    "changePercent",
    "budget",
    "budgetVariance",
    "share",
  ]);
});

test("null og ikke-endelige tal sorteres sidst i begge retninger", () => {
  assert.equal(compareNullableCostDetailNumbers(null, 1, "asc"), 1);
  assert.equal(compareNullableCostDetailNumbers(null, 1, "desc"), 1);
  assert.equal(compareNullableCostDetailNumbers(Number.NaN, 1, "asc"), 1);

  const numericKeys = [
    "current",
    "share",
    "previous",
    "change",
    "changePercent",
    "budget",
    "budgetVariance",
  ];
  for (const key of numericKeys) {
    const low = detailRow({ name: "Lav", [key]: 1 });
    const high = detailRow({ name: "Høj", [key]: 2 });
    const missing = detailRow({ name: "Mangler", [key]: null });

    assert.deepEqual(
      sortCostDetailRows([missing, high, low], key, "asc").map((row) => row.name),
      ["Lav", "Høj", "Mangler"],
      `${key} stigende`,
    );
    assert.deepEqual(
      sortCostDetailRows([missing, low, high], key, "desc").map((row) => row.name),
      ["Høj", "Lav", "Mangler"],
      `${key} faldende`,
    );
  }
});

test("CSV indeholder kun valgte og tilgængelige kolonner i dansk UTF-8-format", () => {
  const csv = buildCostDetailCsv([
    detailRow({
      name: "Løn",
      current: 1_234.5,
      share: 0.57,
      change: -10.25,
      budget: 1_300,
    }),
    detailRow({
      name: "Café München",
      current: 200,
      share: 0.43,
      change: null,
      budget: null,
    }),
  ], ["change", "budget", "previous"]);

  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(
    csv,
    /^﻿"Omkostningskategori";"Aktuel periode";"Ændring i kr\.";"Budget";"Andel"\r\n/u,
  );
  assert.match(csv, /"Løn";"1\.234,50";"-10,25";"1\.300,00";"57,00"/u);
  assert.match(csv, /"Café München";"200,00";"";"";"43,00"/u);
  assert.equal(csv.includes("Forrige periode"), false);
  assert.equal(csv.includes("undefined"), false);
  assert.equal(csv.includes("NaN"), false);
});

test("budgetafvigelser forklares som under, over eller præcis på budget med eksisterende alvorstærskler", () => {
  const underBudget = buildBudgetVariancePresentation(7_883, 10_000);
  const overBudget = buildBudgetVariancePresentation(10_500, 10_000);
  const criticalOverrun = buildBudgetVariancePresentation(10_801, 10_000);
  const exactBudget = buildBudgetVariancePresentation(10_000, 10_000);

  assert.deepEqual(underBudget, {
    value: -2_117,
    label: "2.117 kr. under budget",
    tone: "positive",
  });
  assert.deepEqual(overBudget, {
    value: 500,
    label: "500 kr. over budget",
    tone: "warning",
  });
  assert.deepEqual(criticalOverrun, {
    value: 801,
    label: "801 kr. over budget",
    tone: "critical",
  });
  assert.deepEqual(exactBudget, {
    value: 0,
    label: "På budget",
    tone: "neutral",
  });
});

test("CSV bevarer budgetafvigelsen som et numerisk Excel-felt og bruger ikke UI-teksten", () => {
  const csv = buildCostDetailCsv([
    detailRow({
      name: "Løn",
      current: 7_883,
      budget: 10_000,
      budgetVariance: -2_117,
    }),
  ], ["budget", "budgetVariance"]);

  assert.match(csv, /"Budget";"Budgetafvigelse";"Andel"\r\n/u);
  assert.match(csv, /"Løn";"7\.883,00";"10\.000,00";"-2\.117,00";"57,00"/u);
  assert.equal(csv.includes("under budget"), false);
  assert.equal(csv.includes("over budget"), false);
});
