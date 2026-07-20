import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKpiDataProfile,
  defaultKpiConfiguration,
  evaluateFormula,
  evaluateStandardKpi,
  formatNumber,
  formulaToDanishText,
  getNumericColumns,
  parseStoredKpiConfiguration,
  relevantKpiCategories,
  standardKpiDefinitions,
} from "../lib/kpi-customization.ts";

const context = {
  totalRevenue: 1000,
  totalUnits: 20,
  totalGrossProfit: 600,
  grossMargin: 0.6,
  totalCosts: 400,
  actualResult: 600,
  revenueVsBudget: 100,
  budgetRevenue: 900,
  budgetCosts: 350,
  budgetResult: 550,
  rowCount: 2,
  hasGrossProfit: true,
  hasGrossMargin: true,
  hasCosts: true,
  hasBudget: true,
  bestProduct: { name: "Café latte", revenue: 700 },
  bestCategory: { name: "Drikke", revenue: 700 },
  bestMonth: { name: "maj 2026", revenue: 1000 },
  monthlyRevenue: [400, 600],
};

const rows = [
  { sourceValues: { Nettoomsætning: 600, Antal: 12, Produkt: "Café latte" } },
  { sourceValues: { Nettoomsætning: 400, Antal: 8, Produkt: "Croissant" } },
];
const salesProfile = buildKpiDataProfile(rows, {
  grossProfit: [600],
  budgetRevenue: [900],
  budgetCosts: [350],
});

test("standard-KPI beregnes fra den givne kontekst", () => {
  assert.deepEqual(evaluateStandardKpi("total-revenue", context, salesProfile).value, 1000);
  assert.deepEqual(evaluateStandardKpi("gross-margin", context, salesProfile).value, 0.6);
});

test("KPI-registeret genkender danske og engelske kolonnesynonymer", () => {
  const profile = buildKpiDataProfile([
    { sourceValues: { Sales: 1200, Quantity: 24, "Equity Value": 400, "Total Assets": 1000 } },
  ]);
  assert.deepEqual(profile.matchedColumns.revenue, ["Sales"]);
  assert.deepEqual(profile.matchedColumns.units, ["Quantity"]);
  assert.deepEqual(profile.matchedColumns.equity, ["Equity Value"]);
  assert.deepEqual(profile.matchedColumns.assets, ["Total Assets"]);
});

test("finansielle KPI'er beregnes direkte fra det centrale register", () => {
  const profile = buildKpiDataProfile([
    {
      sourceValues: {
        Egenkapital: 400,
        Aktiver: 1000,
        Omsætningsaktiver: 300,
        "Kortfristet gæld": 150,
        Lager: 60,
      },
    },
  ]);
  assert.equal(evaluateStandardKpi("equity-ratio", context, profile).value, 0.4);
  assert.equal(evaluateStandardKpi("current-ratio", context, profile).value, 2);
  assert.equal(evaluateStandardKpi("quick-ratio", context, profile).value, 1.6);
});

test("manglende KPI-data viser de præcise kolonner", () => {
  const profile = buildKpiDataProfile([{ sourceValues: { Egenkapital: 400 } }]);
  const evaluation = evaluateStandardKpi("equity-ratio", context, profile);
  assert.equal(evaluation.available, false);
  assert.deepEqual(evaluation.missingFields, ["Aktiver"]);
  assert.match(evaluation.reason, /Aktiver/);
});

test("KPI-kategorier følger filens faktiske datagrundlag", () => {
  const salesOnly = Object.fromEntries(
    standardKpiDefinitions.map((definition) => [
      definition.id,
      evaluateStandardKpi(definition.id, context, salesProfile),
    ]),
  );
  const categories = relevantKpiCategories(standardKpiDefinitions, salesOnly);
  assert.equal(categories.includes("Salg"), true);
  assert.equal(categories.includes("Finansielle nøgletal"), false);
  assert.equal(categories.includes("Likviditet"), false);
  assert.equal(categories.includes("Lager"), false);
});

test("formelbuilderen kan vise en laesbar dansk forklaring", () => {
  const formula = {
    type: "binary",
    operator: "/",
    left: { type: "aggregate", function: "SUM", column: "Net revenue" },
    right: { type: "aggregate", function: "SUM", column: "Units" },
  };
  assert.equal(
    formulaToDanishText(formula),
    "summen af Net revenue divideret med summen af Units",
  );
});

test("standardlayout skifter sikkert mellem filer med og uden budget", () => {
  const withBudget = defaultKpiConfiguration({ hasBudget: true, hasGrossProfit: true, hasGrossMargin: true, hasCosts: true });
  const withoutBudget = defaultKpiConfiguration({ hasBudget: false, hasGrossProfit: true, hasGrossMargin: true, hasCosts: true });
  assert.equal(withBudget.primaryKpis.includes("revenue-vs-budget"), true);
  assert.equal(withoutBudget.primaryKpis.includes("revenue-vs-budget"), false);
  assert.equal(withoutBudget.primaryKpis.includes("gross-margin"), true);
});

test("brugerdefineret KPI beregnes fra filtrerede rækker", () => {
  const formula = {
    type: "binary",
    operator: "/",
    left: { type: "aggregate", function: "SUM", column: "Nettoomsætning" },
    right: { type: "aggregate", function: "SUM", column: "Antal" },
  };
  assert.equal(evaluateFormula(formula, [rows[0]]), 50);
  assert.equal(evaluateFormula(formula, rows), 50);
});

test("division med nul giver en menneskelig fejl", () => {
  const formula = {
    type: "binary",
    operator: "/",
    left: { type: "aggregate", function: "SUM", column: "Nettoomsætning" },
    right: { type: "number", value: 0 },
  };
  assert.throws(() => evaluateFormula(formula, rows), /nævneren er 0/);
});

test("manglende kolonne deaktiverer beregningen uden crash", () => {
  assert.throws(
    () => evaluateFormula({ type: "aggregate", function: "SUM", column: "Mangler" }, rows),
    /ikke findes i den aktuelle fil/,
  );
});

test("tekstkolonner kan ikke summeres og udelades fra talkolonner", () => {
  assert.deepEqual(getNumericColumns(rows), ["Antal", "Nettoomsætning"]);
  assert.throws(
    () => evaluateFormula({ type: "aggregate", function: "SUM", column: "Produkt" }, rows),
    /ikke indeholder numeriske værdier/,
  );
});

test("konfiguration gemmes og indlæses med versionsnummer", () => {
  const stored = JSON.stringify({
    version: 1,
    primaryKpis: ["total-revenue", "total-units"],
    secondaryKpis: ["best-product"],
    customKpis: [],
  });
  assert.deepEqual(parseStoredKpiConfiguration(stored), JSON.parse(stored));
  assert.equal(parseStoredKpiConfiguration('{"version":2}'), null);
});

test("brugerdefineret division og procentformat er deterministisk", () => {
  const formula = {
    type: "binary",
    operator: "/",
    left: { type: "aggregate", function: "SUM", column: "Antal" },
    right: { type: "number", value: 100 },
  };
  assert.equal(evaluateFormula(formula, rows), 0.2);
  assert.equal(formatNumber(0.2, "percent", 1), "20,0 %");
});

test("ugyldige formler afvises", () => {
  assert.throws(
    () => evaluateFormula({ type: "binary", operator: "^", left: { type: "number", value: 2 }, right: { type: "number", value: 3 } }, rows),
    /Formlen er ugyldig/,
  );
});

test("gemt konfiguration begrænses til fire primære KPI'er", () => {
  const parsed = parseStoredKpiConfiguration(JSON.stringify({
    version: 1,
    primaryKpis: ["a", "b", "c", "d", "e"],
    secondaryKpis: [],
    customKpis: [],
  }));
  assert.equal(parsed?.primaryKpis.length, 4);
});
