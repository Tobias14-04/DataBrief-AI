import assert from "node:assert/strict";
import test from "node:test";

import {
  importProcessingReducer,
  importProcessingSteps,
  importStatusLabel,
  initialImportProcessingState,
  isImportProcessing,
} from "../lib/import-processing.ts";

test("importflowet beskriver kun faktiske behandlingstrin i den rigtige rækkefølge", () => {
  assert.deepEqual(
    importProcessingSteps.map((step) => step.status),
    [
      "reading",
      "detectingSheets",
      "detectingHeaders",
      "matchingColumns",
      "validating",
      "calculating",
      "buildingDashboard",
    ],
  );
  assert.equal(importStatusLabel("matchingColumns"), "Tilknytter kolonner");
});

test("en ny import går fra læsning til et færdigt dashboard", () => {
  const started = importProcessingReducer(initialImportProcessingState, {
    type: "start",
    requestId: 1,
    fileName: "salg.xlsx",
  });
  const parsing = importProcessingReducer(started, {
    type: "progress",
    requestId: 1,
    status: "detectingSheets",
  });
  const completed = importProcessingReducer(parsing, {
    type: "complete",
    requestId: 1,
    needsReview: false,
  });

  assert.equal(started.status, "reading");
  assert.equal(parsing.status, "detectingSheets");
  assert.equal(completed.status, "success");
  assert.equal(isImportProcessing(completed.status), false);
});

test("usikre kolonner afslutter importen i kolonnekontrol", () => {
  const started = importProcessingReducer(initialImportProcessingState, {
    type: "start",
    requestId: 2,
    fileName: "rapport.xlsx",
  });
  const completed = importProcessingReducer(started, {
    type: "complete",
    requestId: 2,
    needsReview: true,
  });

  assert.equal(completed.status, "needsReview");
  assert.equal(isImportProcessing(completed.status), false);
});

test("sene beskeder fra en tidligere import ignoreres", () => {
  const current = importProcessingReducer(initialImportProcessingState, {
    type: "start",
    requestId: 4,
    fileName: "ny.xlsx",
  });
  const stale = importProcessingReducer(current, {
    type: "progress",
    requestId: 3,
    status: "buildingDashboard",
  });

  assert.strictEqual(stale, current);
  assert.equal(stale.status, "reading");
});

test("en fejl afslutter behandlingen og bevarer en brugbar fejlbesked", () => {
  const started = importProcessingReducer(initialImportProcessingState, {
    type: "start",
    requestId: 5,
    fileName: "beskadiget.xlsx",
  });
  const failed = importProcessingReducer(started, {
    type: "fail",
    requestId: 5,
    message: "Excel-filen kunne ikke læses.",
  });

  assert.equal(failed.status, "error");
  assert.equal(failed.errorMessage, "Excel-filen kunne ikke læses.");
  assert.equal(isImportProcessing(failed.status), false);
});
