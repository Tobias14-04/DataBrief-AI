import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyAnalysisPreferences } from "../lib/analysis-preferences.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildManagementReport } from "../lib/management-report.ts";

const empty = createEmptyAnalysisPreferences();
const profile = (area) => ({ focusAreas: [area], primaryGoal: null, targets: [] });
function row(month, product, revenue, cost = 40) {
  return {
    date: null, month, product, category: product, channel: "Butik", region: "Nord",
    revenue, units: 2, grossProfit: revenue - cost,
    grossMargin: revenue ? (revenue - cost) / revenue : null, cost,
  };
}
function report(rows, options = {}, preferences = empty) {
  return buildManagementReport(buildInsightAnalysis(rows, options), preferences, []);
}
const section = (sections, key) => sections.find((item) => item.key === key);
const january = "januar 2026";
const february = "februar 2026";

test("uden sammenlignelig periode bruges kun snapshot og ingen opdigtede drivere", () => {
  const sections = report([row(january, "A", 100)], { sourceName: "Salgsfil.xlsx" });
  assert.match(section(sections, "executive-summary").paragraphs.join(" "), /øjebliksbillede/u);
  assert.equal(section(sections, "development"), undefined);
  assert.equal(section(sections, "drivers"), undefined);
  assert.match(section(sections, "data-basis").paragraphs[0], /Salgsfil\.xlsx/u);
});

test("gyldig månedssammenligning viser få ændringer og positive/negative registrerede drivere", () => {
  const rows = [row(january, "A", 100), row(january, "B", 100), row(february, "A", 120), row(february, "B", 70)];
  const sections = report(rows, { selectedMonth: february });
  assert.ok(section(sections, "development"));
  assert.ok(section(sections, "development").paragraphs.length <= 3);
  const drivers = section(sections, "drivers");
  assert.ok(drivers);
  assert.match(drivers.scope, /januar 2026.*februar 2026/u);
  assert.match(drivers.paragraphs.join(" "), /A.*\+20/u);
  assert.match(drivers.paragraphs.join(" "), /B.*−30/u);
  assert.match(drivers.paragraphs.at(-1), /ikke den bagvedliggende årsag/u);
  assert.equal(sections.some((item) => item.title === "Centrale nøgletal"), false);
  assert.equal(sections.some((item) => item.title === "Strategisk opsamling"), false);
});

test("kun positive drivere håndteres uden negativ påstand", () => {
  const sections = report([row(january, "A", 100), row(february, "A", 120)], { selectedMonth: february });
  const drivers = section(sections, "drivers");
  assert.ok(drivers);
  assert.match(drivers.paragraphs[0], /\+20/u);
  assert.doesNotMatch(drivers.paragraphs.join(" "), /−20/u);
});

test("budget er status, ikke automatisk risiko eller mulighed", () => {
  const sections = report([row(january, "A", 100), row(february, "A", 120)], {
    selectedMonth: february, budget: { revenue: 130, basis: "registered" },
  });
  assert.match(section(sections, "assessment").paragraphs.join(" "), /Budgetstatus/u);
  assert.doesNotMatch(section(sections, "assessment").paragraphs.join(" "), /risiko|mulighed/u);
  assert.equal(section(report([row(january, "A", 100)]), "assessment"), undefined);
});

test("filtre og datakilde fremgår, og manglende omkostning opfindes ikke", () => {
  const rows = [row(january, "A", 100, null), row(february, "A", 120, null)];
  const sections = report(rows, {
    selectedMonth: february, activeFilterLabels: ["Produkt: A"], sourceName: "Import.xlsx", totalRowCount: 20,
  });
  assert.ok(sections.every((item) => item.scope.includes("Produkt: A")));
  assert.ok(sections.every((item) => item.scope.split("Aktive filtre:").length === 2));
  assert.match(section(sections, "data-basis").paragraphs[0], /1 af 20 rækker fra Import\.xlsx/u);
  assert.doesNotMatch(section(sections, "executive-summary").paragraphs.join(" "), /resultatet 0/u);
});

test("onboarding prioriterer produktdimension uden at ændre evidens eller beregninger", () => {
  const rows = [row(january, "A", 100), row(january, "B", 100), row(february, "A", 120), row(february, "B", 70)]
    .map((item) => ({ ...item, category: "Fælles" }));
  const analysis = buildInsightAnalysis(rows, { selectedMonth: february });
  const neutral = buildManagementReport(analysis, empty, []);
  const product = buildManagementReport(analysis, profile("products"), []);
  assert.match(section(product, "drivers").paragraphs[0], /Produkt/u);
  assert.notDeepEqual(section(product, "drivers").evidenceIds, section(neutral, "drivers").evidenceIds);
  assert.match(section(product, "data-basis").paragraphs.join(" "), /valgte fokus: Produkter/u);
  assert.doesNotMatch(section(neutral, "data-basis").paragraphs.join(" "), /valgte fokus/u);
  for (const item of product) {
    for (const id of item.evidenceIds) assert.ok(analysis.evidence.some((fact) => fact.id === id));
  }
});
