import assert from "node:assert/strict";
import test from "node:test";

import { buildInsightAnalysis, summarizeDriverTopN } from "../lib/insight-engine.ts";

const dimensions = ["product", "category", "channel", "region"];

function sale(month, dimension, member, revenue) {
  return {
    date: new Date(2026, month, 5), month: month === 0 ? "januar 2026" : "februar 2026",
    product: "Fast", category: "Fast", channel: "Fast", region: "Fast",
    [dimension]: member, revenue, units: 1, grossProfit: null, cost: null,
  };
}

function drivers(rows, dimension, options = {}) {
  const analysis = buildInsightAnalysis(rows, options);
  const result = analysis.driverAnalyses.find((item) => item.metric === "revenue" && item.dimension === dimension);
  assert.ok(result, `Mangler omsætningsdrivere for ${dimension}`);
  return { analysis, result, members: [...result.positiveDrivers, ...result.negativeDrivers, ...result.unchangedDrivers] };
}

function assertFiniteTree(value) {
  if (typeof value === "number") return assert.equal(Number.isFinite(value), true);
  if (Array.isArray(value)) return value.forEach(assertFiniteTree);
  if (value && typeof value === "object") Object.values(value).forEach(assertFiniteTree);
}

for (const dimension of dimensions) {
  test(`DRV: ${dimension} afstemmer A +20/B -30 og tre særskilte mål`, () => {
    const { analysis, result, members } = drivers([
      sale(0, dimension, "A", 100), sale(0, dimension, "B", 100),
      sale(1, dimension, "A", 120), sale(1, dimension, "B", 70),
    ], dimension, { activeFilterLabels: ["Produkt: Valgt"] });
    const a = members.find((item) => item.dimensionValue === "A");
    const b = members.find((item) => item.dimensionValue === "B");
    assert.equal(result.totalChange, -10);
    assert.equal(a.absoluteChange, 20);
    assert.equal(b.absoluteChange, -30);
    assert.equal(a.contribution, -2);
    assert.equal(b.contribution, 3);
    assert.equal(a.movementShare, 0.4);
    assert.equal(b.movementShare, 0.6);
    assert.equal(members.reduce((sum, item) => sum + item.absoluteChange, 0), result.totalChange);
    assert.equal(result.reconciliationDifference, 0);
    assert.equal(a.metric, "revenue");
    assert.equal(a.dimension, dimension);
    assert.deepEqual(a.scopeFilters, ["Produkt: Valgt"]);
    assert.match(a.previousPeriod, /januar/u);
    assert.match(a.currentPeriod, /februar/u);
    assert.deepEqual(new Set(Object.values(a.measures).map((item) => item.id)).size, 3);
    assert.deepEqual(Object.values(a.measures).map((item) => item.label), [
      "Omsætningsbidrag i kr.", "Andel af nettoændringen", "Andel af absolut bevægelse",
    ]);
    const evidence = analysis.evidence.find((item) => item.id === a.evidenceId);
    assert.equal(evidence?.driverMeasures?.netShare.value, -2);
    assert.match(evidence?.supportingFacts.join(" ") ?? "", /januar.*februar.*Produkt: Valgt/u);
    const driverReport = analysis.report.sections.find((section) => section.key === "positive-drivers");
    if (dimension === "category") {
      assert.match(driverReport?.paragraphs.join(" ") ?? "", /omsætningsbidrag i kr\..*kategori A.*januar.*februar.*Produkt: Valgt/u);
      assert.match(analysis.observations.map((item) => item.text).join(" "), /registrerede omsætningsbidrag.*kategori.*januar.*februar/u);
    }
    assertFiniteTree(analysis);
  });

  test(`DRV: ${dimension} bevarer bevægelsesandel ved nul nettoændring`, () => {
    const { result, members } = drivers([
      sale(0, dimension, "A", 100), sale(0, dimension, "B", 100),
      sale(1, dimension, "A", 120), sale(1, dimension, "B", 80),
    ], dimension);
    assert.equal(result.totalChange, 0);
    assert.deepEqual(members.map((item) => item.contribution), [null, null]);
    assert.deepEqual(members.map((item) => item.movementShare), [0.5, 0.5]);
  });

  test(`DRV: ${dimension} medtager tilgang, afgang, uændret og ukendt medlem`, () => {
    const { result, members } = drivers([
      sale(0, dimension, "A", 100), sale(0, dimension, "B", 50),
      sale(0, dimension, "C", 20), sale(0, dimension, "", 10),
      sale(1, dimension, "A", 100), sale(1, dimension, "C", 30),
      sale(1, dimension, "D", 40), sale(1, dimension, "", 0),
    ], dimension);
    assert.deepEqual(new Set(members.map((item) => item.dimensionValue)),
      new Set(["A", "B", "C", "D", { product: "Produkt ikke registreret", category: "Ikke kategoriseret", channel: "Kanal ikke registreret", region: "Region ikke registreret" }[dimension]]));
    assert.equal(members.find((item) => item.dimensionValue === "A").absoluteChange, 0);
    assert.equal(members.find((item) => item.dimensionValue === "B").absoluteChange, -50);
    assert.equal(members.find((item) => item.dimensionValue === "D").absoluteChange, 40);
    assert.equal(members.find((item) => item.dimensionValue === { product: "Produkt ikke registreret", category: "Ikke kategoriseret", channel: "Kanal ikke registreret", region: "Region ikke registreret" }[dimension]).absoluteChange, -10);
    assert.equal(members.reduce((sum, item) => sum + item.absoluteChange, 0), result.totalChange);
  });
}

test("DRV: én region +10 vises, og kendt +20/ukendt -10 afstemmes", () => {
  const single = drivers([sale(0, "region", "Nord", 100), sale(1, "region", "Nord", 110)], "region");
  assert.equal(single.members.length, 1);
  assert.equal(single.members[0].contribution, 1);
  assert.equal(single.members[0].movementShare, 1);

  const mixed = drivers([
    sale(0, "region", "Nord", 100), sale(0, "region", "", 100),
    sale(1, "region", "Nord", 120), sale(1, "region", "", 90),
  ], "region");
  assert.equal(mixed.result.totalChange, 10);
  assert.equal(mixed.members.find((item) => item.dimensionValue === "Region ikke registreret").absoluteChange, -10);
  assert.equal(mixed.members.reduce((sum, item) => sum + item.absoluteChange, 0), 10);
});

test("DRV: top-N bevarer nævneren og viser en afstemmelig rest", () => {
  const rows = Array.from({ length: 7 }, (_, index) => [
    sale(0, "product", `P${index}`, 10), sale(1, "product", `P${index}`, 20),
  ]).flat();
  const { result } = drivers(rows, "product");
  const top = summarizeDriverTopN(result.positiveDrivers, 5);
  assert.equal(top.shown.length, 5);
  assert.equal(top.omittedCount, 2);
  assert.equal(top.omittedChange, 20);
  assert.ok(Math.abs(top.omittedMovementShare - 2 / 7) < 1e-12);
  assert.ok(Math.abs(top.omittedNetShare - 2 / 7) < 1e-12);
  assert.equal(top.shown.reduce((sum, item) => sum + item.absoluteChange, 0) + top.omittedChange, result.totalChange);
  const groupEvidence = drivers(rows, "product").analysis.evidence.find((item) => item.id === result.evidenceId);
  assert.match(groupEvidence?.supportingFacts.join(" ") ?? "", /Øvrige 4 positive medlemmer/u);
});

test("DRV: scope er del af ID; nulbevægelse giver null-andel uden NaN", () => {
  const rows = [sale(0, "region", "Nord", 100), sale(1, "region", "Nord", 100)];
  const plain = drivers(rows, "region");
  const filtered = drivers(rows, "region", { activeFilterLabels: ["Kanal: Online"] });
  assert.notEqual(plain.members[0].evidenceId, filtered.members[0].evidenceId);
  assert.equal(plain.members[0].contribution, null);
  assert.equal(plain.members[0].movementShare, null);
  assert.equal(plain.result.unchangedDrivers.length, 1);
  assertFiniteTree(plain.analysis);
});
