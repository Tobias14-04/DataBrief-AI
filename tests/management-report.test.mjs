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
  assert.match(drivers.paragraphs.at(-1), /ikke hvorfor den opstod/u);
  assert.match(drivers.paragraphs[0], /af nettoændringen/u);
  assert.ok(section(sections, "executive-summary").paragraphs.length <= 4);
  assert.ok(section(sections, "executive-summary").metrics.every((item) => item.evidenceId));
  assert.equal(sections.some((item) => item.title === "Centrale nøgletal"), false);
  assert.equal(sections.some((item) => item.title === "Strategisk opsamling"), false);
});

test("ledelsesresume bruger prioriteret fokus som præfiks uden at ændre anbefalingen", () => {
  const analysis = buildInsightAnalysis([row(january, "A", 100), row(february, "A", 120)], { selectedMonth: february });
  const recommendation = analysis.recommendations.find((item) => item.evidenceIds.length > 0);
  const summary = section(buildManagementReport(analysis, empty, []), "executive-summary").paragraphs;
  if (recommendation) {
    assert.ok(summary.some((paragraph) => paragraph.startsWith("Prioriteret fokus: ")));
    assert.ok(summary.every((paragraph) => !paragraph.startsWith("Første analyse: ")));
  }
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
  assert.match(section(sections, "assessment").paragraphs.join(" "), /Budget:/u);
  assert.doesNotMatch(section(sections, "assessment").paragraphs.join(" "), /risiko|mulighed/u);
  assert.equal(section(report([row(january, "A", 100)]), "assessment"), undefined);
  const above = report([row(january, "A", 100), row(february, "A", 120)], {
    selectedMonth: february, budget: { revenue: 110, basis: "registered" },
  });
  assert.match(section(above, "assessment").paragraphs.join(" "), /over budgettet/u);
  assert.match(section(sections, "assessment").paragraphs.join(" "), /under budgettet/u);
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
  assert.match(section(product, "data-basis").paragraphs.join(" "), /virksomhedens fokus: Produkter/u);
  assert.doesNotMatch(section(neutral, "data-basis").paragraphs.join(" "), /virksomhedens fokus/u);
  for (const item of product) {
    for (const id of item.evidenceIds) assert.ok(analysis.evidence.some((fact) => fact.id === id));
  }
});

test("resuméet gentager ikke resultat og dækningsgrad som tekst og tal", () => {
  const sections = report([row(january, "A", 100), row(february, "A", 120)], { selectedMonth: february });
  const summary = section(sections, "executive-summary");
  assert.ok(summary.paragraphs.length >= 2 && summary.paragraphs.length <= 4);
  assert.doesNotMatch(summary.paragraphs.join(" "), /Dækningsgrad|Resultatet er/u);
  assert.ok(summary.metrics.length <= 2);
});

test("nul nettoændring bruger eksplicit absolut bevægelse, ikke en opdigtet nettoandel", () => {
  const sections = report([
    row(january, "A", 100), row(january, "B", 100),
    row(february, "A", 120), row(february, "B", 80),
  ], { selectedMonth: february });
  const drivers = section(sections, "drivers");
  assert.ok(drivers);
  assert.match(drivers.paragraphs.join(" "), /af den absolutte bevægelse/u);
  assert.doesNotMatch(drivers.paragraphs.join(" "), /af nettoændringen/u);
});

test("negativ omsætningsudvikling får korrekt retning uden at blive forklaret kausalt", () => {
  const sections = report([row(january, "A", 120), row(february, "A", 100)], { selectedMonth: february });
  assert.match(section(sections, "executive-summary").paragraphs.join(" "), /et fald i omsætning/u);
  assert.match(section(sections, "development").paragraphs.join(" "), /Omsætning faldt/u);
  assert.match(section(sections, "drivers").paragraphs.join(" "), /ikke hvorfor den opstod/u);
});

test("rapporten bruger samme afgrænsning og gyldige evidensreferencer i alle sektioner", () => {
  const analysis = buildInsightAnalysis([
    row(january, "A", 100), row(january, "B", 100),
    row(february, "A", 120), row(february, "B", 70),
  ], { selectedMonth: february, activeFilterLabels: ["Region: Nord"], sourceName: "Kilde.xlsx" });
  const sections = buildManagementReport(analysis, empty, []);
  assert.ok(sections.every((item) => item.scope.includes("Region: Nord")));
  assert.ok(sections.every((item) => item.evidenceIds.every((id) => analysis.evidence.some((fact) => fact.id === id))));
  assert.match(section(sections, "data-basis").paragraphs[0], /Kilde\.xlsx/u);
});
