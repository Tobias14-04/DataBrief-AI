import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  availableAnalysisTargetMetrics,
  buildAnalysisTargetStatuses,
  createEmptyAnalysisPreferences,
  parseAnalysisTargetInput,
  prioritizeInsightAnalysis,
  prioritizeKpiConfiguration,
  prioritizeStrategicAnalysis,
  toggleAnalysisFocusArea,
} from "../lib/analysis-preferences.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildStrategicAnalysis } from "../lib/strategy-engine.ts";

const onboardingSource = readFileSync(
  new URL("../components/analysis-preferences-onboarding.tsx", import.meta.url),
  "utf8",
);
const uploadSource = readFileSync(
  new URL("../components/upload-dashboard.tsx", import.meta.url),
  "utf8",
);
const insightSource = readFileSync(
  new URL("../components/insights-report-dashboard.tsx", import.meta.url),
  "utf8",
);

function row(month, revenue, cost, product = "Café") {
  return {
    date: null,
    month,
    product,
    category: "Drikke",
    channel: "Butik",
    region: "København",
    revenue,
    units: 10,
    grossProfit: revenue - cost,
    grossMargin: (revenue - cost) / revenue,
    cost,
  };
}

test("spørgsmål 1 tillader højst to valgte fokusområder", () => {
  let selected = toggleAnalysisFocusArea([], "sales");
  selected = toggleAnalysisFocusArea(selected, "profitability");
  selected = toggleAnalysisFocusArea(selected, "costs");
  assert.deepEqual(selected, ["sales", "profitability"]);
  assert.deepEqual(toggleAnalysisFocusArea(selected, "sales"), ["profitability"]);
});

test("målvalget viser kun nøgletal, som faktisk kan beregnes", () => {
  const available = availableAnalysisTargetMetrics({
    "total-revenue": { available: true, value: 2_000_000 },
    result: { available: false, value: null },
    "gross-margin": { available: true, value: 0.65 },
    "total-costs": { available: false, value: null },
    "total-units": { available: true, value: 4_200 },
  });

  assert.deepEqual(available.map((metric) => metric.id), [
    "total-revenue",
    "gross-margin",
    "total-units",
  ]);
});

test("danske målbeløb og procenter læses uden at ændre KPI-enheden", () => {
  assert.equal(parseAnalysisTargetInput("2.000.000 kr.", "total-revenue"), 2_000_000);
  assert.equal(parseAnalysisTargetInput("65,5 %", "gross-margin"), 0.655);
  assert.equal(parseAnalysisTargetInput("10.000", "total-units"), 10_000);
  assert.equal(parseAnalysisTargetInput("65,5", "total-units"), null);
  assert.equal(parseAnalysisTargetInput("101 %", "gross-margin"), null);
});

test("overblikkets eksisterende KPI-kort prioriteres efter valgte svar og mål", () => {
  const configuration = {
    version: 1,
    primaryKpis: ["total-revenue", "gross-profit", "gross-margin", "total-units"],
    secondaryKpis: ["best-product", "best-category", "best-month", "total-costs", "result"],
    customKpis: [],
  };
  const available = new Set([
    ...configuration.primaryKpis,
    ...configuration.secondaryKpis,
  ]);
  const prioritized = prioritizeKpiConfiguration(configuration, {
    focusAreas: ["costs"],
    primaryGoal: "control-costs",
    targets: [{ kpiId: "total-costs", value: 500_000, direction: "at-most" }],
  }, available);

  assert.deepEqual(prioritized.primaryKpis.slice(0, 3), ["total-costs", "result", "gross-margin"]);
  assert.deepEqual(new Set([...prioritized.primaryKpis, ...prioritized.secondaryKpis]), available);
  assert.equal(prioritizeKpiConfiguration(configuration, createEmptyAnalysisPreferences(), available), configuration);
});

test("målafvigelser er matematiske, danske og retningsbevidste", () => {
  const statuses = buildAnalysisTargetStatuses({
    focusAreas: [],
    primaryGoal: "overview",
    targets: [
      { kpiId: "gross-margin", value: 0.7, direction: "at-least" },
      { kpiId: "total-revenue", value: 2_000_000, direction: "at-least" },
      { kpiId: "total-costs", value: 500_000, direction: "at-most" },
    ],
  }, {
    "gross-margin": { available: true, value: 0.67 },
    "total-revenue": { available: true, value: 2_100_000 },
    "total-costs": { available: true, value: 550_000 },
  });

  assert.equal(statuses[0].state, "behind");
  assert.match(statuses[0].text, /67\s%.*3 procentpoint under dit mål på 70\s%\./u);
  assert.equal(statuses[1].state, "on-track");
  assert.match(statuses[1].text, /100\.000.+over dit mål/u);
  assert.equal(statuses[2].state, "behind");
  assert.match(statuses[2].text, /50\.000.+over din grænse/u);
});

test("indsigter prioriteres efter profil uden at ændre fakta eller evidens", () => {
  const analysis = buildInsightAnalysis([
    row("januar 2026", 1_000, 400),
    row("februar 2026", 1_200, 900),
  ]);
  const originalEvidenceIds = analysis.evidence.map((evidence) => evidence.id);
  const prioritized = prioritizeInsightAnalysis(analysis, {
    focusAreas: ["costs"],
    primaryGoal: "control-costs",
    targets: [],
  });
  const evidenceById = new Map(prioritized.evidence.map((evidence) => [evidence.id, evidence]));
  const firstMetrics = prioritized.observations[0].evidenceIds
    .map((id) => evidenceById.get(id)?.metric)
    .filter(Boolean);

  assert.ok(firstMetrics.includes("cost") || firstMetrics.includes("costShare") || firstMetrics.includes("result"));
  assert.deepEqual(prioritized.evidence.map((evidence) => evidence.id), originalEvidenceIds);
  assert.deepEqual(
    new Set(prioritized.observations.map((observation) => observation.id)),
    new Set(analysis.observations.map((observation) => observation.id)),
  );
});

test("strategiens dokumenterede findings prioriteres uden at ændre fakta eller evidens", () => {
  const analysis = buildInsightAnalysis([
    row("januar 2026", 1_000, 400),
    row("februar 2026", 1_200, 900),
  ]);
  const strategy = buildStrategicAnalysis(analysis);
  const prioritized = prioritizeStrategicAnalysis(strategy, {
    focusAreas: ["profitability"],
    primaryGoal: "improve-profit",
    targets: [{ kpiId: "result", value: 500, direction: "at-least" }],
  });

  assert.equal(prioritized.findingsByQuadrant.weakness[0]?.metric, "result");
  assert.deepEqual(
    new Set(prioritized.findings.map((finding) => finding.id)),
    new Set(strategy.findings.map((finding) => finding.id)),
  );
  assert.deepEqual(
    new Set(prioritized.tows.flatMap((recommendation) => recommendation.evidenceIds)),
    new Set(strategy.tows.flatMap((recommendation) => recommendation.evidenceIds)),
  );
});

test("onboarding ligger kun i overgangen efter en ny valideret import", () => {
  assert.match(onboardingSource, /Tilpas dit overblik/u);
  assert.match(onboardingSource, /Svar på 3 korte spørgsmål/u);
  assert.match(onboardingSource, /Ca\. 30 sekunder/u);
  assert.match(onboardingSource, /\{step\} af 3/u);
  assert.match(onboardingSource, /role="progressbar"/u);
  assert.match(onboardingSource, /aria-pressed=\{selected\}/u);
  assert.match(onboardingSource, /role="radiogroup"/u);
  assert.match(onboardingSource, /targetDrafts\.length < 3/u);
  assert.match(onboardingSource, /targets: targets\.slice\(0, 3\)/u);
  assert.match(onboardingSource, /onClick=\{onSkip\}/u);
  assert.match(uploadSource, /if \(parsed\.autoResult\) \{[\s\S]*setShowAnalysisOnboarding\(true\)/u);
  assert.match(uploadSource, /if \(pendingManualImport\) \{[\s\S]*setShowAnalysisOnboarding\(true\)/u);
  assert.match(uploadSource, /if \(showAnalysisOnboarding && data\) \{[\s\S]*<AnalysisPreferencesOnboarding/u);

  const navigationFunction = uploadSource.match(
    /const changeActiveView = useCallback\([\s\S]*?\n  \}, \[\]\);/u,
  )?.[0];
  assert.ok(navigationFunction);
  assert.doesNotMatch(navigationFunction, /setShowAnalysisOnboarding/u);
});

test("mål vises i både Indsigter og Rapport uden at ændre analysemotoren", () => {
  assert.match(insightSource, /Sådan ligger du i forhold til dine mål/u);
  assert.match(insightSource, /Dine mål og afvigelser/u);
  assert.match(insightSource, /prioritizeInsightAnalysis\(displayedAnalysis, analysisPreferences\)/u);
  assert.match(insightSource, /prioritizeStrategicAnalysis/u);
  assert.doesNotMatch(readFileSync(new URL("../lib/insight-engine.ts", import.meta.url), "utf8"), /analysisPreferences/u);
});
