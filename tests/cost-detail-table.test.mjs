import assert from "node:assert/strict";
import test from "node:test";

import {
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
