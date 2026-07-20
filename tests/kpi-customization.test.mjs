import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultKpiConfiguration,
  evaluateFormula,
  evaluateStandardKpi,
  formatNumber,
  getNumericColumns,
  parseStoredKpiConfiguration,
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
};

const rows = [
  { sourceValues: { Nettoomsætning: 600, Antal: 12, Produkt: "Café latte" } },
  { sourceValues: { Nettoomsætning: 400, Antal: 8, Produkt: "Croissant" } },
];

test("standard-KPI beregnes fra den givne kontekst", () => {
  assert.deepEqual(evaluateStandardKpi("total-revenue", context).value, 1000);
  assert.deepEqual(evaluateStandardKpi("gross-margin", context).value, 0.6);
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
