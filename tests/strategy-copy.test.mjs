import assert from "node:assert/strict";
import test from "node:test";
import { briefStrategicFocus, briefStrategicFocusSummary, briefStrategicPairTitle, descriptionWithoutRepeatedScope, uniqueDisplayedStrategicFocus, uniqueScopeLabels, visibleScopeFilters } from "../lib/strategy-copy.ts";

const findings = new Map([
  ["budget", {
    title: "Omsætning mod budget er gunstig",
    metric: "revenue",
    dimensionValue: null,
  }],
  ["region", {
    title: "Høj omsætningskoncentration i København",
    metric: "revenue",
    dimensionValue: "København",
  }],
  ["cost", {
    title: "Høj omkostningskoncentration i Løn",
    metric: "cost",
    dimensionValue: "Løn",
  }],
  ["product", {
    title: "Dokumenteret fremgang i Produkt A",
    metric: "revenue",
    dimensionValue: "Produkt A",
  }],
]);

test("anbefalet fokus er kort og gentager ikke fundtitlernes formuleringer", () => {
  const proposal = {
    type: "st",
    sourceFindingIds: ["budget", "region"],
    text: "Følg udviklingen i høj omsætningskoncentration i København tæt, og vurder den i sammenhæng med omsætning mod budget er gunstig.",
  };
  assert.equal(
    briefStrategicFocus(proposal, findings),
    "Følg omsætningskoncentrationen i København sammen med budgetafvigelsen for omsætning.",
  );
  assert.equal(proposal.text.startsWith("Følg udviklingen i høj"), true, "evidensbaseret forslag ændres ikke");
});

test("alle fire fokuspar får undersøgende tekst uden at miste medlemmerne", () => {
  const cases = [
    ["so", ["budget", "product"], "Sammenlign budgetafvigelsen for omsætning med omsætning i Produkt A."],
    ["st", ["budget", "region"], "Følg omsætningskoncentrationen i København sammen med budgetafvigelsen for omsætning."],
    ["wo", ["cost", "product"], "Undersøg omkostningskoncentrationen i Løn i lyset af omsætning i Produkt A."],
    ["wt", ["cost", "region"], "Følg omkostningskoncentrationen i Løn og omsætningskoncentrationen i København samlet."],
  ];
  for (const [type, sourceFindingIds, expected] of cases) {
    assert.equal(briefStrategicFocus({ type, sourceFindingIds, text: "Original" }, findings), expected);
  }
});

test("manglende kildefund bevarer den oprindelige tekst", () => {
  assert.equal(
    briefStrategicFocus({ type: "st", sourceFindingIds: ["budget", "mangler"], text: "Originalt fokus" }, findings),
    "Originalt fokus",
  );
});

test("korttitlen navngiver kilderne frem for at gentage grupperingens generiske titel", () => {
  const proposal = {
    type: "st",
    title: "Positivt signal og eksponering",
    sourceFindingIds: ["budget", "region"],
    text: "Originalt fokus",
  };
  assert.equal(briefStrategicPairTitle(proposal, findings), "Omsætning mod budget · København");
  assert.equal(briefStrategicPairTitle({ ...proposal, sourceFindingIds: ["budget", "mangler"] }, findings), proposal.title);
});

test("Kort fortalt viser et særskilt, kort undersøgelsesfokus", () => {
  const proposal = {
    type: "st",
    sourceFindingIds: ["budget", "region"],
    text: "Originalt fokus",
  };
  assert.equal(briefStrategicFocusSummary(proposal, findings), "Følg omsætningskoncentrationen i København.");
  assert.equal(briefStrategicFocusSummary({ ...proposal, sourceFindingIds: ["budget", "mangler"] }, findings), "Originalt fokus");
});

test("kun identiske viste fokusområder samles uden tab af prioritet eller evidens", () => {
  const proposals = [
    { id: "a", type: "st", sourceFindingIds: ["budget", "region"], evidenceIds: ["e1"], priority: 9, text: "Første" },
    { id: "b", type: "st", sourceFindingIds: ["product", "region"], evidenceIds: ["e2"], priority: 8, text: "Andet" },
    { id: "c", type: "st", sourceFindingIds: ["budget", "cost"], evidenceIds: ["e3"], priority: 7, text: "Tredje" },
  ];
  const shown = uniqueDisplayedStrategicFocus(proposals, findings);
  assert.deepEqual(shown.map((item) => item.id), ["a", "c"]);
  assert.deepEqual(shown[0].evidenceIds, ["e1", "e2"]);
  assert.deepEqual(shown[0].sourceFindingIds, ["budget", "region", "product"]);
  assert.equal(shown[0].priority, 9);
  assert.equal(briefStrategicFocusSummary(shown[1], findings), "Følg omkostningskoncentrationen i Løn.");
  const separateScope = new Map(findings);
  separateScope.set("region-two", { ...findings.get("region"), scopeLabel: "juni 2026" });
  separateScope.set("region", { ...findings.get("region"), scopeLabel: "maj 2026" });
  const scoped = uniqueDisplayedStrategicFocus([
    proposals[0],
    { ...proposals[1], sourceFindingIds: ["product", "region-two"] },
  ], separateScope);
  assert.deepEqual(scoped.map((item) => item.id), ["a", "b"], "forskellige scopes må ikke samles");
});

test("periode og scope gentages ikke i fundkortets præsentation", () => {
  assert.equal(descriptionWithoutRepeatedScope("Omsætning steg i april → maj 2026.", "april → maj 2026"), "Omsætning steg.");
  assert.equal(descriptionWithoutRepeatedScope("Omsætning steg i København.", "april → maj 2026"), "Omsætning steg i København.");
  assert.deepEqual(uniqueScopeLabels(["april → maj 2026", "maj 2026", "maj 2026"]), ["april → maj 2026"]);
  assert.deepEqual(uniqueScopeLabels(["april 2026", "maj 2026"]), ["april 2026", "maj 2026"]);
  assert.deepEqual(visibleScopeFilters("april 2026 → maj 2026", ["maj 2026", "Produkt: A"]), ["Produkt: A"]);
  assert.deepEqual(visibleScopeFilters("maj 2026", ["maj 2026"]), []);
  assert.deepEqual(visibleScopeFilters("april 2026", ["maj 2026", "Region: Nord"]), ["maj 2026", "Region: Nord"]);
});
