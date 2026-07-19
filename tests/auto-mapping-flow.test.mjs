import assert from "node:assert/strict";
import test from "node:test";

import {
  assessAutoMapping,
  mappingStatusForSource,
  shouldShowColumnReview,
} from "../lib/auto-mapping-flow.ts";

const confidentAssessment = {
  confidence: 96,
  headerIsSecure: true,
  validRowCount: 120,
  skippedRowCount: 0,
  missingFields: [],
  duplicateColumns: [],
  ambiguities: [],
  competingSheets: [],
  hasRevenueSource: true,
};

test("A: sikre nødvendige kolonner går direkte til dashboardet", () => {
  assert.equal(assessAutoMapping(confidentAssessment).canOpenDashboard, true);
});

test("B: et manglende nødvendigt felt åbner kolonnekontrollen", () => {
  const decision = assessAutoMapping({
    ...confidentAssessment,
    missingFields: ["Produkt / Product"],
  });

  assert.equal(decision.canOpenDashboard, false);
  assert.match(decision.reasons.join(" "), /Produkt/);
});

test("C: konkurrerende omsætningskolonner forklares i kolonnekontrollen", () => {
  const decision = assessAutoMapping({
    ...confidentAssessment,
    ambiguities: [{ field: "Omsætning", columns: ["Beløb", "Salg"] }],
  });

  assert.equal(decision.canOpenDashboard, false);
  assert.match(decision.reasons.join(" "), /Beløb.*Salg/);
});

test("D: et sikkert automatisk match kan åbnes igen til manuel kontrol", () => {
  assert.equal(
    shouldShowColumnReview({
      hasWorkbookAnalysis: true,
      hasDashboardData: true,
      reviewRequested: true,
    }),
    true,
  );
});

test("E: en anvendt manuel tilknytning får manuel status", () => {
  assert.equal(mappingStatusForSource(true), "manual");
});

test("F: demodata med sikre kolonner går direkte til dashboardet", () => {
  const demoDecision = assessAutoMapping({
    ...confidentAssessment,
    confidence: 100,
  });

  assert.equal(demoDecision.canOpenDashboard, true);
});
