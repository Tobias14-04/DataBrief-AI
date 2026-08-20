import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { applyDashboardFilters } from "../lib/dashboard-filtering.ts";
import { buildInsightAnalysis } from "../lib/insight-engine.ts";
import { buildStrategicAnalysis } from "../lib/strategy-engine.ts";

const quadrants = ["strength", "weakness", "opportunity", "threat"];

function row(overrides = {}) {
  return {
    date: new Date(2026, 0, 5),
    month: "januar 2026",
    product: "Basisprodukt",
    category: "Samlet kategori",
    channel: "Butik",
    region: "Danmark",
    revenue: 100,
    units: 10,
    grossProfit: 60,
    grossMargin: null,
    cost: 40,
    ...overrides,
  };
}

function periodRows(monthIndex, products, repetitions = 5) {
  const date = new Date(2026, monthIndex, 5);
  const month = new Intl.DateTimeFormat("da-DK", {
    month: "long",
    year: "numeric",
  }).format(date);
  return products.flatMap((product) => Array.from(
    { length: repetitions },
    () => row({ date, month, ...product }),
  ));
}

function analyze(rows, options = {}) {
  const insights = buildInsightAnalysis(rows, options);
  return { insights, strategy: buildStrategicAnalysis(insights) };
}

function allFindings(strategy) {
  return quadrants.flatMap((quadrant) => strategy.findingsByQuadrant[quadrant]);
}

function hasProductFinding(items, label) {
  return items.some((item) => (
    item.dimension === "product" && item.dimensionValue === label
  ));
}

function assertFiniteSerializableTree(value, path = "strategy") {
  assert.notEqual(value, undefined, `${path} må ikke være undefined`);
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} skal være et endeligt tal`);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteSerializableTree(item, `${path}[${index}]`));
    return;
  }
  Object.entries(value).forEach(([key, item]) => (
    assertFiniteSerializableTree(item, `${path}.${key}`)
  ));
}

function comprehensiveRows() {
  return [
    ...periodRows(0, [
      { product: "Dokumenteret styrke", revenue: 200, grossProfit: 120, cost: 80 },
      { product: "Rentabel niche", revenue: 50, grossProfit: 30, cost: 20 },
      { product: "Presset produkt", revenue: 400, grossProfit: 300, cost: 100 },
      { product: "Dominerende produkt", revenue: 1_000, grossProfit: 600, cost: 400 },
    ], 6),
    ...periodRows(1, [
      { product: "Dokumenteret styrke", revenue: 400, grossProfit: 280, cost: 120 },
      { product: "Rentabel niche", revenue: 200, grossProfit: 150, cost: 50 },
      { product: "Presset produkt", revenue: 300, grossProfit: 20, cost: 280 },
      { product: "Dominerende produkt", revenue: 1_200, grossProfit: 750, cost: 450 },
    ], 6),
  ];
}

test("A: et stærkt positivt produkt klassificeres som en dokumenteret styrke", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Vækstmotor", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Stabil kerne", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
    ...periodRows(1, [
      { product: "Vækstmotor", revenue: 300, grossProfit: 230, cost: 70 },
      { product: "Stabil kerne", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
  ]);

  assert.equal(hasProductFinding(strategy.findingsByQuadrant.strength, "Vækstmotor"), true);
});

test("B: en negativ rentabilitetsudvikling klassificeres som en svaghed", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Presset forretning", revenue: 1_000, grossProfit: 700, cost: 300 },
    ], 10),
    ...periodRows(1, [
      { product: "Presset forretning", revenue: 1_000, grossProfit: 200, cost: 800 },
    ], 10),
  ]);

  const adverseProfitability = strategy.findingsByQuadrant.weakness.some((finding) => (
    ["result", "grossProfit", "grossMargin"].includes(finding.metric)
      && finding.absoluteChange < 0
  ));
  assert.equal(adverseProfitability, true);
});

test("B2: omkostningsdrivere beskriver fortegn og forretningseffekt hver for sig", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { region: "Nordjylland", revenue: 1_000, grossProfit: 500, cost: 500 },
      { region: "Syddanmark", revenue: 1_000, grossProfit: 800, cost: 200 },
    ]),
    ...periodRows(1, [
      { region: "Nordjylland", revenue: 1_000, grossProfit: 700, cost: 300 },
      { region: "Syddanmark", revenue: 1_000, grossProfit: 650, cost: 350 },
    ]),
  ]);
  const costFindings = allFindings(strategy).filter((finding) => (
    finding.metric === "cost" && finding.dimension === "region"
  ));
  const lowerCostFinding = costFindings.find((finding) => finding.dimensionValue === "Nordjylland");
  const higherCostFinding = costFindings.find((finding) => finding.dimensionValue === "Syddanmark");

  assert.equal(lowerCostFinding?.title, "Nordjylland bidrog til lavere omkostninger");
  assert.match(lowerCostFinding?.description ?? "", /negativt bidrag til ændringen i omkostninger/u);
  assert.equal(lowerCostFinding?.absoluteChange, -1_000);
  assert.equal(higherCostFinding?.title, "Syddanmark bidrog til højere omkostninger");
  assert.match(higherCostFinding?.description ?? "", /positivt bidrag til ændringen i omkostninger/u);
  assert.equal(higherCostFinding?.absoluteChange, 750);
  assert.doesNotMatch(costFindings.map((finding) => finding.title).join(" "), /bidrager positivt/u);
});

test("C: robust rentabel vækst med lav intern andel klassificeres som en mulighed", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Rentabel niche", revenue: 50, grossProfit: 30, cost: 20 },
      { product: "Etableret kerne", revenue: 1_000, grossProfit: 800, cost: 200 },
    ]),
    ...periodRows(1, [
      { product: "Rentabel niche", revenue: 250, grossProfit: 200, cost: 50 },
      { product: "Etableret kerne", revenue: 1_000, grossProfit: 800, cost: 200 },
    ]),
  ]);

  assert.equal(hasProductFinding(strategy.findingsByQuadrant.opportunity, "Rentabel niche"), true);
  strategy.findingsByQuadrant.opportunity.forEach((finding) => {
    assert.notEqual(finding.confidence, "low");
  });
});

test("D: høj dokumenteret omsætningskoncentration klassificeres som en risiko", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Dominerende produkt", revenue: 800, grossProfit: 500, cost: 300 },
      { product: "Øvrig portefølje", revenue: 100, grossProfit: 60, cost: 40 },
    ]),
    ...periodRows(1, [
      { product: "Dominerende produkt", revenue: 900, grossProfit: 570, cost: 330 },
      { product: "Øvrig portefølje", revenue: 100, grossProfit: 60, cost: 40 },
    ]),
  ]);

  assert.equal(hasProductFinding(strategy.findingsByQuadrant.threat, "Dominerende produkt"), true);
});

test("E: uden robuste favorable mønstre er mulighedskvadranten tom", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Produkt A", revenue: 600, grossProfit: 300, cost: 300 },
      { product: "Produkt B", revenue: 400, grossProfit: 200, cost: 200 },
    ]),
    ...periodRows(1, [
      { product: "Produkt A", revenue: 600, grossProfit: 300, cost: 300 },
      { product: "Produkt B", revenue: 400, grossProfit: 200, cost: 200 },
    ]),
  ]);

  assert.deepEqual(strategy.findingsByQuadrant.opportunity, []);
});

test("F: SWOT'en afspejler kun det allerede filtrerede udsnit", () => {
  const rows = [
    ...periodRows(0, [
      { product: "Københavner Kaffe", region: "København", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Københavner Te", region: "København", revenue: 400, grossProfit: 240, cost: 160 },
      { product: "Skjult Aarhus-fald", region: "Aarhus", revenue: 1_000, grossProfit: 700, cost: 300 },
      { product: "Aarhus-basis", region: "Aarhus", revenue: 100, grossProfit: 60, cost: 40 },
    ]),
    ...periodRows(1, [
      { product: "Københavner Kaffe", region: "København", revenue: 300, grossProfit: 230, cost: 70 },
      { product: "Københavner Te", region: "København", revenue: 400, grossProfit: 240, cost: 160 },
      { product: "Skjult Aarhus-fald", region: "Aarhus", revenue: 100, grossProfit: 20, cost: 80 },
      { product: "Aarhus-basis", region: "Aarhus", revenue: 100, grossProfit: 60, cost: 40 },
    ]),
  ];
  const filtered = applyDashboardFilters(rows, {
    month: [],
    product: [],
    category: [],
    channel: [],
    region: ["København"],
  });
  const { strategy } = analyze(filtered, {
    sourceName: "Salgsdata",
    totalRowCount: rows.length,
    activeFilterLabels: ["København"],
  });
  const serialized = JSON.stringify(strategy);

  assert.equal(hasProductFinding(strategy.findingsByQuadrant.strength, "Københavner Kaffe"), true);
  assert.equal(strategy.dataBasis.rowCount, filtered.length);
  assert.equal(strategy.dataBasis.totalRowCount, rows.length);
  assert.deepEqual(strategy.dataBasis.activeFilterLabels, ["København"]);
  assert.doesNotMatch(serialized, /Aarhus|Skjult/u);
});

test("G: SWOT, TOWS og evidensreferencer er lukkede, begrænsede og sporbare", () => {
  const { insights, strategy } = analyze(comprehensiveRows());
  const insightEvidenceIds = new Set(insights.evidence.map((evidence) => evidence.id));
  const findings = allFindings(strategy);
  const findingIds = new Set(findings.map((finding) => finding.id));

  assert.deepEqual(
    Object.keys(strategy.findingsByQuadrant).sort(),
    [...quadrants].sort(),
  );
  assert.deepEqual(strategy.findings, findings);
  assert.equal(findingIds.size, findings.length, "SWOT-fund skal have unikke id'er");
  quadrants.forEach((quadrant) => {
    assert.ok(
      strategy.findingsByQuadrant[quadrant].length <= 5,
      `${quadrant} må højst indeholde fem fund`,
    );
  });
  findings.forEach((finding) => {
    assert.equal(
      strategy.findingsByQuadrant[finding.quadrant].includes(finding),
      true,
      `${finding.id} ligger i det forkerte SWOT-kvadrant`,
    );
    assert.equal(["high", "medium", "low"].includes(finding.confidence), true);
    assert.equal(Number.isFinite(finding.economicImpact), true);
    assert.equal(Number.isFinite(finding.priority), true);
    assert.ok(finding.evidenceIds.length > 0, `${finding.id} mangler evidens`);
    finding.evidenceIds.forEach((evidenceId) => {
      assert.equal(insightEvidenceIds.has(evidenceId), true, `Ukendt SWOT-evidens: ${evidenceId}`);
    });
  });

  assert.ok(strategy.tows.length > 0, "Fixture skal udløse mindst ét TOWS-forslag");
  assert.equal(
    new Set(strategy.tows.map((proposal) => proposal.id)).size,
    strategy.tows.length,
    "TOWS-forslag skal have unikke id'er",
  );
  ["so", "st", "wo", "wt"].forEach((type) => {
    assert.ok(
      strategy.tows.filter((proposal) => proposal.type === type).length <= 2,
      `${type} må højst indeholde to TOWS-forslag`,
    );
  });
  strategy.tows.forEach((proposal) => {
    assert.equal(["so", "st", "wo", "wt"].includes(proposal.type), true);
    assert.equal(proposal.sourceFindingIds.length, 2, "Et TOWS-forslag skal koble to SWOT-fund");
    assert.ok(proposal.evidenceIds.length > 0, `${proposal.id} mangler evidens`);
    proposal.sourceFindingIds.forEach((findingId) => {
      assert.equal(findingIds.has(findingId), true, `Ukendt SWOT-fund i TOWS: ${findingId}`);
    });
    proposal.evidenceIds.forEach((evidenceId) => {
      assert.equal(insightEvidenceIds.has(evidenceId), true, `Ukendt TOWS-evidens: ${evidenceId}`);
    });
    assert.match(
      proposal.text,
      /^(?:Undersøg|Vurder|Overvej|Sammenlign|Følg|Prioritér analyse)(?:\s|[.:,])/u,
    );
    assert.doesNotMatch(
      proposal.text,
      /(?<!\p{L})(?:lancér|implementér|ekspandér|luk|stop|investér|ansæt|fyr|hæv|sænk|skær|udfas|opsig|køb|sælg|gennemfør)(?!\p{L})/iu,
    );
  });
});

test("H: strategien opfinder ikke konkurrent-, makro-, lov- eller markedsfakta", () => {
  const { strategy } = analyze(comprehensiveRows());
  const generatedClaims = JSON.stringify({
    findingsByQuadrant: strategy.findingsByQuadrant,
    tows: strategy.tows,
    reportSummary: strategy.reportSummary,
  });

  assert.equal(
    strategy.externalContextNotice,
    "Muligheder og risici er udledt af det registrerede datagrundlag. Eksterne markedsforhold indgår ikke, medmindre de findes i datasættet.",
  );
  assert.doesNotMatch(
    generatedClaims,
    /(?<!\p{L})(?:konkurrent(?:er|erne)?|konkurrence|inflation|renteniveau|lovgivning|regulering|makroøkonomi|branchevækst|markedsandel|markedspres|markedstendens|efterspørgsel)(?!\p{L})/iu,
  );
});

test("I: en eksplosiv procent på en lille baseline undertrykkes og bliver ikke en mulighed", () => {
  const { insights, strategy } = analyze([
    ...periodRows(0, [
      { product: "Mikroeksplosion", revenue: 1, grossProfit: 1, cost: 0 },
      { product: "Stor base", revenue: 2_000_000, grossProfit: 1_200_000, cost: 800_000 },
    ]),
    ...periodRows(1, [
      { product: "Mikroeksplosion", revenue: 1_001, grossProfit: 801, cost: 200 },
      { product: "Stor base", revenue: 2_400_000, grossProfit: 1_440_000, cost: 960_000 },
    ]),
  ]);
  const revenueDrivers = insights.driverAnalyses.find((analysis) => (
    analysis.metric === "revenue" && analysis.dimension === "product"
  ));
  const tinyDriver = revenueDrivers?.positiveDrivers.find((driver) => (
    driver.dimensionValue === "Mikroeksplosion"
  ));

  assert.ok(tinyDriver, "Den lille absolutte driver skal fortsat være dokumenteret i insightlaget");
  assert.equal(tinyDriver.percentageChange, null);
  assert.equal(hasProductFinding(strategy.findingsByQuadrant.opportunity, "Mikroeksplosion"), false);
});

test("J: 7.500 rækker giver en deterministisk fuld analyse på under ét sekund", () => {
  const rows = Array.from({ length: 7_500 }, (_, index) => {
    const monthIndex = index % 24;
    const revenue = 100 + (index % 17) + monthIndex * 2;
    const cost = 40 + (index % 11);
    return row({
      date: new Date(2024 + Math.floor(monthIndex / 12), monthIndex % 12, 1),
      month: `${(monthIndex % 12) + 1}/${2024 + Math.floor(monthIndex / 12)}`,
      product: `Produkt ${index % 80}`,
      category: `Kategori ${index % 12}`,
      channel: index % 2 ? "Online" : "Butik",
      region: `Region ${index % 5}`,
      revenue,
      units: 1 + (index % 5),
      grossProfit: revenue - cost,
      cost,
    });
  });

  const startedAt = performance.now();
  const firstInsights = buildInsightAnalysis(rows, { sourceName: "Syntetisk fil" });
  const firstStrategy = buildStrategicAnalysis(firstInsights);
  const duration = performance.now() - startedAt;
  const secondInsights = buildInsightAnalysis(rows, { sourceName: "Syntetisk fil" });
  const secondStrategy = buildStrategicAnalysis(secondInsights);

  assert.deepEqual(
    { insights: secondInsights, strategy: secondStrategy },
    { insights: firstInsights, strategy: firstStrategy },
  );
  assert.equal(firstInsights.dataBasis.totalRowCount, 7_500);
  assert.ok(duration < 1_000, `Insight + strategi tog ${duration.toFixed(1)} ms`);
});

test("K: serialiseret strategi indeholder aldrig NaN, Infinity eller undefined", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Nulbase", revenue: 0, units: 0, grossProfit: 0, cost: 0 },
      { product: "Stabil", revenue: 0, units: 0, grossProfit: 0, cost: 0 },
    ]),
    ...periodRows(1, [
      { product: "Nulbase", revenue: 100, units: 0, grossProfit: 60, cost: 40 },
      { product: "Stabil", revenue: 0, units: 0, grossProfit: 0, cost: 0 },
    ]),
  ]);
  const serialized = JSON.stringify(strategy);

  assertFiniteSerializableTree(strategy);
  assert.doesNotMatch(serialized, /NaN|Infinity|undefined/u);
});

test("L: rapportresuméet er en direkte og evidensfast projektion af SWOT og TOWS", () => {
  const { insights, strategy } = analyze(comprehensiveRows());
  const insightEvidenceIds = new Set(insights.evidence.map((evidence) => evidence.id));

  quadrants.forEach((quadrant) => {
    const expected = strategy.findingsByQuadrant[quadrant].slice(0, 2).map((finding) => ({
      findingId: finding.id,
      title: finding.title,
      description: finding.description,
      evidenceIds: finding.evidenceIds,
    }));
    assert.deepEqual(strategy.reportSummary.quadrants[quadrant], expected);
    strategy.reportSummary.quadrants[quadrant].forEach((fact) => {
      fact.evidenceIds.forEach((evidenceId) => {
        assert.equal(insightEvidenceIds.has(evidenceId), true);
      });
    });
  });
  assert.ok(strategy.reportSummary.strategicFocus.length <= 3);
  strategy.reportSummary.strategicFocus.forEach((focus) => {
    const source = strategy.tows.find((proposal) => proposal.id === focus.id);
    assert.ok(source, `Rapportresuméet refererer ukendt TOWS-forslag: ${focus.id}`);
    assert.deepEqual(focus, source);
  });
});

test("M: danske labels med æ, ø og å bevares uændret i strategioutputtet", () => {
  const label = "Ærø Åkande";
  const { insights, strategy } = analyze([
    ...periodRows(0, [
      { product: label, revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Råvarer", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
    ...periodRows(1, [
      { product: label, revenue: 300, grossProfit: 230, cost: 70 },
      { product: "Råvarer", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
  ]);
  const insightLabels = insights.driverAnalyses
    .flatMap((analysis) => [...analysis.positiveDrivers, ...analysis.negativeDrivers])
    .map((driver) => driver.dimensionValue);
  const visibleStrategyLabels = allFindings(strategy).map((finding) => finding.dimensionValue);

  assert.equal(insightLabels.includes(label), true);
  assert.equal(visibleStrategyLabels.includes(label), true);
  assert.equal(visibleStrategyLabels.includes("Aero Akande"), false);
});

test("N: en stabil dominerende omsætningskilde opdages uden at være en ændringsdriver", () => {
  const { insights, strategy } = analyze([
    ...periodRows(0, [
      { product: "Stabil dominans", revenue: 900, grossProfit: 540, cost: 360 },
      { product: "Mindre produkt", revenue: 100, grossProfit: 60, cost: 40 },
    ]),
    ...periodRows(1, [
      { product: "Stabil dominans", revenue: 900, grossProfit: 540, cost: 360 },
      { product: "Mindre produkt", revenue: 80, grossProfit: 48, cost: 32 },
    ]),
  ]);
  const stableDriver = insights.driverAnalyses
    .find((item) => item.metric === "revenue" && item.dimension === "product")
    ?.positiveDrivers.find((item) => item.dimensionValue === "Stabil dominans");
  const distribution = insights.evidence.find((item) => (
    item.type === "distribution"
    && item.metric === "revenue"
    && item.dimension === "product"
    && item.dimensionValue === "Stabil dominans"
  ));

  assert.equal(stableDriver, undefined, "Uændrede grupper må ikke fabrikere en ændringsdriver");
  assert.ok(distribution, "Den aktuelle fordeling skal dokumenteres uafhængigt af ændringer");
  assert.equal(hasProductFinding(strategy.findingsByQuadrant.threat, "Stabil dominans"), true);
  assert.equal(
    strategy.findingsByQuadrant.threat.some((finding) => (
      ["category", "channel", "region"].includes(finding.dimension)
      && finding.metric === "revenue"
    )),
    false,
    "En dimension med kun én værdi må ikke beskrives som koncentrationsrisiko",
  );
});

test("O: TOWS kobler to selvstændige evidensspor og gentager ikke samme signal", () => {
  const { strategy } = analyze(comprehensiveRows());
  const findingsById = new Map(strategy.findings.map((finding) => [finding.id, finding]));
  const semanticEvidencePairs = strategy.tows.map((proposal) => (
    [...new Set(proposal.evidenceIds)].sort().join("|")
  ));

  assert.equal(
    new Set(semanticEvidencePairs).size,
    semanticEvidencePairs.length,
    "Et TOWS-par må ikke gentages med kilderne i omvendt rækkefølge",
  );

  strategy.tows.forEach((proposal) => {
    const [left, right] = proposal.sourceFindingIds.map((id) => findingsById.get(id));
    assert.ok(left && right, "TOWS skal referere eksisterende SWOT-fund");
    const leftEvidence = new Set(left.evidenceIds);
    assert.equal(
      right.evidenceIds.some((evidenceId) => leftEvidence.has(evidenceId)),
      false,
      `${proposal.type} må ikke kombinere det samme evidenssignal med sig selv`,
    );
  });
});

test("P: strategien bruger ét fælles seneste sammenligningsscope ved alle perioder", () => {
  const { insights, strategy } = analyze([
    ...periodRows(0, [
      { product: "Kerne", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Niche", revenue: 50, grossProfit: 30, cost: 20 },
    ]),
    ...periodRows(1, [
      { product: "Kerne", revenue: 200, grossProfit: 120, cost: 80 },
      { product: "Niche", revenue: 60, grossProfit: 36, cost: 24 },
    ]),
    ...periodRows(2, [
      { product: "Kerne", revenue: 300, grossProfit: 180, cost: 120 },
      { product: "Niche", revenue: 40, grossProfit: 24, cost: 16 },
    ]),
  ], {
    budget: { revenue: 1_000, basis: "registered" },
  });
  const budgetEvidenceIds = new Set(
    insights.evidence.filter((item) => item.type === "budget").map((item) => item.id),
  );

  assert.equal(insights.dataBasis.scopeMode, "all-filtered-periods");
  assert.equal(strategy.dataBasis.strategyScopeMode, "latest-comparison");
  assert.equal(strategy.dataBasis.scopeMode, "selected-period");
  assert.equal(strategy.dataBasis.scopeLabel, "februar 2026 → marts 2026");
  assert.equal(strategy.dataBasis.periodCount, 2);
  allFindings(strategy).forEach((finding) => {
    assert.equal(
      finding.evidenceIds.some((evidenceId) => budgetEvidenceIds.has(evidenceId)),
      false,
      "Helperiodens budget må ikke blandes ind i seneste periodesammenligning",
    );
  });
});

test("Q: afrundingsstøj i budget og minimale omkostningsposter bliver ikke strategiske fund", () => {
  const { insights, strategy } = analyze(
    Array.from({ length: 10 }, () => row({ revenue: 100, grossProfit: 60, cost: 40 })),
    {
      budget: { revenue: 1_000.01, basis: "registered" },
      costDistribution: [
        { name: "Mikropost", cost: 0.02 },
        { name: "Rest", cost: 0.01 },
      ],
    },
  );
  const immaterialEvidenceIds = new Set(
    insights.evidence
      .filter((item) => item.type === "budget" || (item.type === "distribution" && item.metric === "cost"))
      .map((item) => item.id),
  );

  assert.ok(immaterialEvidenceIds.size > 0, "Insightlaget skal fortsat dokumentere de registrerede værdier");
  allFindings(strategy).forEach((finding) => {
    assert.equal(
      finding.evidenceIds.some((evidenceId) => immaterialEvidenceIds.has(evidenceId)),
      false,
      "Uvigtig afrundingsstøj må ikke løftes til et strategisk fund",
    );
  });
});

test("R: semantisk ens fund og TOWS-tekster deduplikeres på tværs af dimensioner", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Sammenfald", category: "Sammenfald", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Basis", category: "Basis", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
    ...periodRows(1, [
      { product: "Sammenfald", category: "Sammenfald", revenue: 300, grossProfit: 230, cost: 70 },
      { product: "Basis", category: "Basis", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
  ]);

  quadrants.forEach((quadrant) => {
    const claims = strategy.findingsByQuadrant[quadrant].map((finding) => (
      `${finding.title.toLocaleLowerCase("da-DK")}|${finding.description.toLocaleLowerCase("da-DK")}`
    ));
    assert.equal(new Set(claims).size, claims.length, `${quadrant} indeholder dublerede påstande`);
  });
  assert.equal(
    new Set(strategy.tows.map((proposal) => proposal.text.toLocaleLowerCase("da-DK"))).size,
    strategy.tows.length,
  );
});

test("S: valuta ved sætningsslutning får præcis ét punktum", () => {
  const { insights, strategy } = analyze(comprehensiveRows(), {
    budget: { revenue: 13_500, basis: "registered" },
    costDistribution: [
      { name: "Løn", cost: 13_500 },
      { name: "Råvarer", cost: 5_000 },
    ],
  });

  assert.doesNotMatch(JSON.stringify(insights.report), /kr\.\./u);
  assert.doesNotMatch(JSON.stringify(strategy), /kr\.\./u);
});

test("T: én gyldig periode og uordnede rækker holdes i ét strategisk periodescope", () => {
  const validRows = periodRows(0, [
    { product: "Produkt A", revenue: 700, grossProfit: 420, cost: 280 },
    { product: "Produkt B", revenue: 300, grossProfit: 180, cost: 120 },
  ]);
  const invalidRows = Array.from({ length: 10 }, () => row({
    date: null,
    month: "Ukendt periode",
    product: "Uordnet",
    revenue: 500,
    grossProfit: 300,
    cost: 200,
  }));
  const { insights, strategy } = analyze([...validRows, ...invalidRows], {
    budget: { revenue: 1_000, basis: "registered" },
  });
  const budgetEvidenceIds = new Set(
    insights.evidence.filter((item) => item.type === "budget").map((item) => item.id),
  );

  assert.equal(strategy.dataBasis.strategyScopeMode, "latest-period");
  assert.equal(strategy.dataBasis.scopeMode, "selected-period");
  assert.equal(strategy.dataBasis.scopeLabel, "januar 2026");
  assert.equal(strategy.dataBasis.rowCount, validRows.length);
  assert.equal(strategy.dataBasis.periodCount, 1);
  allFindings(strategy).forEach((finding) => {
    assert.equal(finding.evidenceIds.some((id) => budgetEvidenceIds.has(id)), false);
  });
});

test("U: en minimal enhedsbevægelse vurderes mod omsætningens monetære baseline", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Stor volumen", revenue: 2_000_000_000, units: 200_000, grossProfit: 1_200_000_000, cost: 800_000_000 },
      { product: "Kontrol", revenue: 100, units: 1, grossProfit: 60, cost: 40 },
    ]),
    ...periodRows(1, [
      { product: "Stor volumen", revenue: 2_000_002_000, units: 200_000.2, grossProfit: 1_200_001_200, cost: 800_000_800 },
      { product: "Kontrol", revenue: 100, units: 1, grossProfit: 60, cost: 40 },
    ]),
  ]);

  assert.equal(
    allFindings(strategy).some((finding) => finding.metric === "units"),
    false,
    "Én ekstra enhed på en million-enheders baseline må ikke blive et strategisk fund",
  );
});

test("V: returposter kan ikke skabe omsætningsandele over 100 procent", () => {
  const { insights, strategy } = analyze(periodRows(0, [
    { product: "Positiv A", revenue: 1_000, grossProfit: 600, cost: 400 },
    { product: "Positiv B", revenue: 400, grossProfit: 240, cost: 160 },
    { product: "Retur", revenue: -800, grossProfit: -480, cost: -320 },
  ]));
  const productDistribution = insights.evidence.filter((item) => (
    item.type === "distribution" && item.metric === "revenue" && item.dimension === "product"
  ));

  assert.deepEqual(productDistribution, []);
  assert.equal(
    strategy.findingsByQuadrant.threat.some((finding) => (
      finding.metric === "revenue"
      && finding.dimension === "product"
      && (finding.value ?? 0) > 0
    )),
    false,
  );
});

test("W: aggregate ændringer og deres dimensionsdriver parres ikke som uafhængig TOWS-evidens", () => {
  const { insights, strategy } = analyze([
    ...periodRows(0, [
      { product: "Faldkilde", revenue: 200, grossProfit: 120, cost: 80 },
      { product: "Stabil", revenue: 200, grossProfit: 120, cost: 80 },
    ]),
    ...periodRows(1, [
      { product: "Faldkilde", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Stabil", revenue: 200, grossProfit: 120, cost: 80 },
    ]),
  ]);
  const findingsById = new Map(strategy.findings.map((finding) => [finding.id, finding]));
  const evidenceById = new Map(insights.evidence.map((evidence) => [evidence.id, evidence]));

  strategy.tows.forEach((proposal) => {
    const [left, right] = proposal.sourceFindingIds.map((id) => findingsById.get(id));
    if (!left || !right || left.metric !== right.metric) return;
    const leftTypes = new Set(left.evidenceIds.map((id) => evidenceById.get(id)?.type));
    const rightTypes = new Set(right.evidenceIds.map((id) => evidenceById.get(id)?.type));
    const changeDriverPair = (leftTypes.has("change") && rightTypes.has("driver"))
      || (leftTypes.has("driver") && rightTypes.has("change"));
    assert.equal(changeDriverPair, false, `${proposal.type} kombinerer et samlet signal med dets egen driver`);
  });
});

test("X: ugyldig sample size undertrykkes før strategioutput serialiseres", () => {
  const insights = buildInsightAnalysis([
    ...periodRows(0, [
      { product: "Vækst", revenue: 100, grossProfit: 60, cost: 40 },
      { product: "Basis", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
    ...periodRows(1, [
      { product: "Vækst", revenue: 300, grossProfit: 230, cost: 70 },
      { product: "Basis", revenue: 400, grossProfit: 240, cost: 160 },
    ]),
  ]);
  const revenueChange = insights.changes.find((item) => item.metric === "revenue");
  assert.ok(revenueChange);
  const corrupted = {
    ...insights,
    evidence: insights.evidence.map((item) => (
      item.id === revenueChange.evidenceId ? { ...item, sampleSize: Number.NaN } : item
    )),
  };
  const strategy = buildStrategicAnalysis(corrupted);

  assert.equal(
    allFindings(strategy).some((finding) => finding.evidenceIds.includes(revenueChange.evidenceId)),
    false,
  );
  assertFiniteSerializableTree(strategy);
});

test("Y: én periodes budget og omkostningsfordeling deler allerede strategi-scope", () => {
  const { strategy } = analyze(
    Array.from({ length: 10 }, () => row({ revenue: 100, grossProfit: 60, cost: 40 })),
    {
      budget: { revenue: 2_000, basis: "registered" },
      costDistribution: [
        { name: "Løn", cost: 900 },
        { name: "Råvarer", cost: 100 },
      ],
    },
  );

  assert.equal(strategy.dataBasis.strategyScopeMode, "all-filtered-periods");
  assert.equal(
    strategy.findingsByQuadrant.weakness.some((finding) => finding.title.includes("budget")),
    true,
  );
  assert.equal(
    strategy.findingsByQuadrant.threat.some((finding) => (
      finding.metric === "cost" && finding.dimensionValue === "Løn"
    )),
    true,
  );
});

test("Z: enhedsændringer uden omsætning bruger enhedsbasen som materialitetsgrundlag", () => {
  const { strategy } = analyze([
    ...periodRows(0, [
      { product: "Stor volumen", revenue: Number.NaN, units: 200_000, grossProfit: null, cost: null },
      { product: "Kontrol", revenue: Number.NaN, units: 1, grossProfit: null, cost: null },
    ]),
    ...periodRows(1, [
      { product: "Stor volumen", revenue: Number.NaN, units: 200_000.2, grossProfit: null, cost: null },
      { product: "Kontrol", revenue: Number.NaN, units: 1, grossProfit: null, cost: null },
    ]),
  ]);

  assert.equal(allFindings(strategy).some((finding) => finding.metric === "units"), false);
});

