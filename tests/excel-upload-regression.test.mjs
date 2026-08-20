import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as XLSX from "xlsx";

import { parseExcelWorkbook } from "../lib/excel-workbook-parser.ts";
import { INVALID_EXCEL_ERROR_MESSAGE } from "../lib/excel-worker-types.ts";

const uploadSource = readFileSync(
  new URL("../components/upload-dashboard.tsx", import.meta.url),
  "utf8",
);
const workerSource = readFileSync(
  new URL("../workers/excel-parser.worker.ts", import.meta.url),
  "utf8",
);
const parserSource = readFileSync(
  new URL("../lib/excel-workbook-parser.ts", import.meta.url),
  "utf8",
);

function createWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { Dato: "2026-06-01", Produkt: "Café latte", Kategori: "Drikke", Omsætning: 1_250 },
    ]),
    "Salgsdata",
  );
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

test("en gyldig xlsx parses til de oprindelige ark og værdier", () => {
  const parsed = parseExcelWorkbook(createWorkbookBuffer());

  assert.deepEqual(parsed.sheetNames, ["Salgsdata"]);
  assert.deepEqual(parsed.sheets.Salgsdata[0], ["Dato", "Produkt", "Kategori", "Omsætning"]);
  assert.equal(parsed.sheets.Salgsdata[1][1], "Café latte");
  assert.equal(parsed.sheets.Salgsdata[1][2], "Drikke");
  assert.equal(parsed.sheets.Salgsdata[1][3], 1_250);
});

test("demodata kan parses direkte fra en buffer uden et browser-File", () => {
  const parsed = parseExcelWorkbook(createWorkbookBuffer());
  assert.equal(parsed.sheets.Salgsdata.length, 2);

  const demoFunction = uploadSource.match(
    /async function loadDemoDataset\(\) \{[\s\S]*?\n  \}/u,
  )?.[0];
  assert.ok(demoFunction);
  assert.doesNotMatch(demoFunction, /new File/u);
  assert.match(demoFunction, /readBuffer: \(\) => Promise\.resolve\(workbookData\)/u);
});

test("falske og beskadigede xlsx-data afvises af den faktiske parser", () => {
  const fakeWorkbook = new TextEncoder().encode("Dato,Omsætning\n2026-06-01,1250").buffer;
  const damagedZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]).buffer;

  assert.throws(() => parseExcelWorkbook(fakeWorkbook));
  assert.throws(() => parseExcelWorkbook(damagedZip));
  assert.match(parserSource, /XLSX\.read\(buffer/u);
  assert.doesNotMatch(workerSource, /signature|request\.buffer\.byteLength/u);
});

test("worker-parseren er isoleret fra appens delte xlsx-runtime", () => {
  assert.match(parserSource, /from "xlsx\/xlsx\.js"/u);
  assert.match(workerSource, /parseExcelWorkbook\(request\.buffer\)/u);
  assert.match(uploadSource, /errorMessage: INVALID_EXCEL_ERROR_MESSAGE/u);
  assert.match(workerSource, /message: request\.errorMessage/u);
  assert.equal(INVALID_EXCEL_ERROR_MESSAGE.startsWith("Filen kunne ikke læses"), true);
});

test("et nyt importforsøg rydder gammel fejl, mens annullering bevarer datasættet", () => {
  const processFunction = uploadSource.match(
    /async function processWorkbook\([\s\S]*?\n  async function handleFileChange/u,
  )?.[0];
  assert.ok(processFunction);
  assert.ok(processFunction.indexOf("setError(\"\")") < processFunction.indexOf("try {"));
  assert.match(uploadSource, /if \(!file \|\| isLoading\) \{\s*return;/u);
  assert.match(uploadSource, /if \(!hadWorkbook\) \{\s*clearImportedWorkbook\(\);/u);
});
