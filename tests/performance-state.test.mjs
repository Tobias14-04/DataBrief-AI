import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as XLSX from "xlsx";

import { parseExcelWorkbook } from "../lib/excel-workbook-parser.ts";

const source = (name) => readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), "utf8");

test("dense Excel-parsing bevarer ark, tomme celler, datoer og tal", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Dato", "Produkt", "Omsætning"],
    [new Date(2025, 0, 1), "A", 100],
    [new Date(2025, 1, 1), "", 0],
    [new Date(2025, 2, 1), "C", -20],
  ]), "Salg");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["Kategori", "Budget"], ["A", 120], ["B", ""],
  ]), "Budget");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellDates: true });
  const parsed = parseExcelWorkbook(buffer);
  const sparse = XLSX.read(buffer, { type: "array", cellDates: true });
  assert.deepEqual(parsed.sheetNames, sparse.SheetNames);
  for (const sheetName of sparse.SheetNames) {
    assert.deepEqual(parsed.sheets[sheetName], XLSX.utils.sheet_to_json(sparse.Sheets[sheetName], {
      header: 1, defval: "", raw: true,
    }));
  }
});

test("filtertoolbar viser kun det beregnede scope, mens menuen kan vise uafsluttede valg", () => {
  const dashboard = source("upload-dashboard");
  const toolbar = source("dashboard-control-bar");
  assert.match(dashboard, /displayFilters=\{deferredFilters\}/u);
  assert.match(dashboard, /filters=\{deferredFilters\}/u);
  assert.match(toolbar, /Object\.entries\(displayFilters\)/u);
  assert.match(toolbar, /displayValues=\{displayFilters\[field\]\}/u);
  assert.match(toolbar, /values=\{draftFilters\[field\]\}/u);
  assert.match(toolbar, /Opdaterer visningen/u);
});

test("uændret scope genbruger aggregeringer og KPI-dialogen evaluerer kun valgte preview-KPI'er", () => {
  const dashboard = source("upload-dashboard");
  const customizer = source("kpi-customizer");
  assert.match(dashboard, /filteredRows === allRows\s*\? baseMetrics/u);
  assert.match(dashboard, /comparisonSourceRows === allRows \? baseSalesKpiDataProfile/u);
  assert.match(dashboard, /filteredRows === allRows \? baseKpiDataProfile/u);
  assert.match(dashboard, /evaluateKpiOnDemand=\{evaluateKpiOnDemand\}/u);
  assert.match(customizer, /evaluations\[definition\.id\] \?\? evaluateKpiOnDemand\(definition\.id\)/u);
  assert.doesNotMatch(dashboard, /isKpiCustomizerOpen\s*\?\s*standardKpiDefinitions/u);
});
