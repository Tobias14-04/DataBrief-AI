import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExcelCompatibleCsv,
  chooseRepresentativeLabel,
  comparableLabel,
  displayLabel,
  normalizeForComparison,
  UTF8_BOM,
} from "../lib/data-labels.ts";
import { demoOperatingCostDefinitions } from "../lib/demo-dataset.ts";

const unicodeLabels = [
  "Løn",
  "Råvarer",
  "Månedsløn",
  "Ændring",
  "København",
  "Café",
  "München",
];

test("synlige datalabels bevarer danske og europæiske Unicode-tegn", () => {
  assert.deepEqual(unicodeLabels.map((label) => displayLabel(label)), unicodeLabels);
  assert.deepEqual(
    unicodeLabels.map((label) => comparableLabel(label).label),
    unicodeLabels,
  );
  assert.equal(displayLabel("Cafe\u0301"), "Café");
});

test("sammenligningsnøgler translittereres uden at ændre den synlige label", () => {
  assert.equal(normalizeForComparison("Løn"), "lon");
  assert.equal(normalizeForComparison("Råvarer"), "ravarer");
  assert.equal(normalizeForComparison("Ændring"), "aendring");
  assert.equal(normalizeForComparison("Café"), "cafe");
  assert.equal(normalizeForComparison("München"), "munchen");
  assert.equal(normalizeForComparison("LØN"), normalizeForComparison("løn"));
});

test("den mest repræsentative originale label vælges ved gruppering", () => {
  const variants = ["LØN", "løn", "Løn"];
  const label = variants.reduce(chooseRepresentativeLabel);

  assert.equal(label, "Løn");
  assert.equal(chooseRepresentativeLabel("Lon", "Løn"), "Løn");
  assert.equal(chooseRepresentativeLabel("Munchen", "München"), "München");
});

test("Excel-kompatibel CSV bruger UTF-8 BOM og bevarer Unicode-labels", () => {
  const csv = buildExcelCompatibleCsv([
    ["Kategori", "By"],
    ["Løn", "København"],
    ["Råvarer", "München"],
    ["Café", "Ændring"],
  ]);

  assert.equal(csv.startsWith(UTF8_BOM), true);
  unicodeLabels
    .filter((label) => ["Løn", "Råvarer", "Ændring", "København", "Café", "München"].includes(label))
    .forEach((label) => assert.equal(csv.includes(label), true));
  assert.equal(csv.includes("Lon"), false);
});

test("Omkostninger-demodata bruger de originale danske kategorilabels", () => {
  const labels = demoOperatingCostDefinitions.map((definition) => definition.category);

  assert.equal(labels[0], "Løn");
  assert.equal(labels[1], "Råvarer");
  assert.equal(labels.includes("Lon"), false);
  assert.equal(labels.includes("Raavarer"), false);
});
