import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKpiDataProfile,
  evaluateStandardKpi,
  evaluateStandardKpis,
  normalizeKpiConfiguration,
  parseStoredKpiConfiguration,
  relevantKpiCategories,
  standardKpiDefinitions,
} from "../lib/kpi-customization.ts";

const context = {
  totalRevenue: 9999, totalUnits: 0, totalGrossProfit: 0, grossMargin: null,
  totalCosts: null, actualResult: null, revenueVsBudget: 0, budgetRevenue: 0,
  budgetCosts: 0, budgetResult: 0, rowCount: 0, hasGrossProfit: false,
  hasGrossMargin: false, hasCosts: false, hasBudget: false,
};
const metadata = { Valuta: "DKK", Virksomhed: "Test ApS", Regnskabsstatus: "Komplet" };
const balance = (date, values, extra = {}) => ({ Snapshotdato: date, Regnskabsperiode: date.slice(0, 7), ...metadata, ...values, ...extra });
const flow = (period, values, extra = {}) => ({ Regnskabsperiode: period, ...metadata, ...values, ...extra });
const profile = (rows) => buildKpiDataProfile(rows.map((sourceValues) => ({ sourceValues })));
const evaluate = (id, rows, options = {}) => evaluateStandardKpi(id, { ...context, ...options }, profile(rows));
const available = (id, rows, options = {}) => {
  const result = evaluate(id, rows, options);
  assert.equal(result.available, true, `${id}: ${result.reason}`);
  return result.value;
};

test("FIN: seneste fælles balance vælges uden at summere historiske snapshots", () => {
  const rows = [
    balance("2026-01-31", { Egenkapital: 400, Aktiver: 1000, Omsætningsaktiver: 300, "Kortfristet gæld": 150 }),
    balance("2026-02-28", { Egenkapital: 500, Aktiver: 1200, Omsætningsaktiver: 360, "Kortfristet gæld": 120 }),
  ];
  assert.equal(available("equity-ratio", rows), 500 / 1200);
  assert.equal(available("current-ratio", rows), 3);
  assert.equal(available("equity-ratio", rows, { selectedMonths: ["2026-01"] }), 0.4);
  assert.equal(evaluate("equity-ratio", rows, { selectedMonths: ["2026-03"] }).value, null);
});

test("FIN: samme balancedato kan samles på tværs af poster, men ikke duplikeres eller gættes", () => {
  const rows = [balance("2026-01-31", { Aktiver: 1000 }), balance("2026-01-31", { Egenkapital: 400 })];
  assert.equal(available("equity-ratio", rows), 0.4);
  assert.equal(evaluate("equity-ratio", [...rows, balance("2026-01-31", { Aktiver: 1000 })]).value, null);
  assert.equal(evaluate("equity-ratio", [rows[0], balance("2026-02-28", { Egenkapital: 500 })]).value, null);
  assert.equal(evaluate("equity-ratio", [balance("2026-01-31", { Aktiver: 1000, Egenkapital: "ukendt" })]).value, null);
  assert.equal(available("equity-ratio", [balance("2026-01-31", { Aktiver: 1000, Egenkapital: 0 })]), 0);
  assert.equal(evaluate("equity-ratio", [balance("2026-01-31", { Aktiver: 0, Egenkapital: 0 })]).value, null);
  assert.equal(available("gearing", [balance("2026-01-31", { "Rentebærende gæld": -20, Egenkapital: 100 })]), -0.2);
});

test("FIN: valuta, virksomhed og completeness skal være eksplicit og ens", () => {
  const basis = [balance("2026-01-31", { Aktiver: 1000 }), balance("2026-01-31", { Egenkapital: 400 })];
  for (const extra of [{ Valuta: "EUR" }, { Virksomhed: "Anden ApS" }, { Regnskabsstatus: "Ufuldstændig" }]) {
    assert.equal(evaluate("equity-ratio", [basis[0], { ...basis[1], ...extra }]).value, null);
  }
  for (const field of ["Valuta", "Virksomhed", "Regnskabsstatus", "Snapshotdato", "Regnskabsperiode"]) {
    const missing = { ...balance("2026-01-31", { Aktiver: 1000, Egenkapital: 400 }) };
    delete missing[field];
    assert.equal(evaluate("equity-ratio", [missing]).value, null, field);
  }
});

test("FIN: ROA, ROE og aktivomsætning bruger periodeflow og gennemsnit af åbning/slutning", () => {
  const rows = [
    balance("2026-01-01", { Aktiver: 1000, Egenkapital: 400 }),
    balance("2026-01-31", { Aktiver: 1400, Egenkapital: 600 }),
    flow("2026-01", { "Årets resultat": 120, Nettoomsætning: 1200 }),
  ];
  assert.equal(available("return-on-assets", rows, { selectedMonths: ["2026-01"] }), 0.1);
  assert.equal(available("return-on-equity", rows, { selectedMonths: ["2026-01"] }), 0.24);
  assert.equal(available("asset-turnover", rows, { selectedMonths: ["2026-01"] }), 1);
  assert.equal(available("return-on-assets", [balance("2025-12-31", { Aktiver: 1000 }), ...rows.slice(1)], { selectedMonths: ["2026-01"] }), 0.1);
  assert.equal(evaluate("return-on-assets", rows.slice(1), { selectedMonths: ["2026-01"] }).value, null);
  assert.equal(evaluate("return-on-equity", [rows[0], balance("2026-01-31", { Aktiver: 1400, Egenkapital: "ukendt" }), rows[2]]).value, null);
});

test("FIN: valgt regnskabsmåned udelader andre dokumenterede flowperioder", () => {
  const rows = [
    balance("2026-01-01", { Aktiver: 1000 }), balance("2026-01-31", { Aktiver: 1400 }),
    flow("2026-01", { Nettoomsætning: 1200 }), flow("2026-02", { Nettoomsætning: 5000 }),
  ];
  assert.equal(available("asset-turnover", rows, { selectedMonths: ["2026-01"] }), 1);
  assert.equal(evaluate("asset-turnover", rows, { selectedMonths: ["2026-02"] }).value, null);
});

test("FIN: filtreret flow må ikke bruge ufordelbar global balance eller kontekstomsætning", () => {
  const rows = [
    balance("2026-01-01", { Aktiver: 1000 }), balance("2026-01-31", { Aktiver: 1200 }),
    flow("2026-01", { Nettoomsætning: 100 }, { Produkt: "A" }),
  ];
  const filter = { financialFilters: { product: ["A"] }, selectedMonths: ["2026-01"] };
  assert.equal(evaluate("asset-turnover", rows, filter).value, null);
  assert.match(evaluate("asset-turnover", rows, filter).reason, /produkt/u);
  const allocated = rows.map((row) => row.Aktiver === undefined ? row : { ...row, Produkt: "A" });
  assert.equal(available("asset-turnover", allocated, filter), 100 / 1100);
  assert.equal(evaluate("asset-turnover", allocated, { ...filter, selectedMonths: ["2026-02"] }).value, null);
  assert.equal(evaluate("asset-turnover", allocated, { ...filter, partialMonths: ["2026-01"] }).value, null);
});

test("FIN: EBITDA kræver direkte tal eller dokumenterede afskrivninger, samme periode og scope", () => {
  const rows = [flow("2026-01", { Driftsresultat: 100, Afskrivninger: 20, Nettoomsætning: 1000 })];
  assert.equal(available("ebitda", rows), 120);
  assert.equal(available("ebitda-margin", rows), 0.12);
  assert.equal(available("operating-margin", rows), 0.1);
  assert.equal(available("ebit-margin", rows), 0.1);
  assert.equal(evaluate("ebitda", [flow("2026-01", { Driftsresultat: 100 })]).value, null);
  assert.equal(evaluate("ebitda", [flow("2026-01", { Driftsresultat: 100, Afskrivninger: "ukendt" })]).value, null);
  assert.equal(available("ebitda", [flow("2026-01", { EBITDA: 150, Driftsresultat: 100 })]), 150);
  assert.equal(evaluate("ebitda", [flow("2026-01", { Driftsresultat: 100 }), flow("2026-02", { Afskrivninger: 20 })]).value, null);
  assert.equal(evaluate("operating-margin", [flow("2026-01", { Driftsresultat: 100 }), flow("2026-02", { Nettoomsætning: 1000 })]).value, null);
  assert.equal(available("ebitda", [flow("2026-01", { Driftsresultat: -100, Afskrivninger: 20 })]), -80);
});

test("FIN: likviditet og Quick Ratio kræver samme balance, og uendelige værdier afvises", () => {
  const rows = [balance("2026-01-31", { Omsætningsaktiver: 300, Lagerværdi: 60, "Kortfristet gæld": 150, "Likvide beholdninger": 90 })];
  assert.equal(available("quick-ratio", rows), 1.6);
  assert.equal(available("cash-ratio", rows), 0.6);
  assert.equal(available("working-capital", rows), 150);
  assert.equal(evaluate("quick-ratio", [rows[0], balance("2026-02-01", { Lagerværdi: 60 })]).value, null);
  const huge = [balance("2026-01-31", { Omsætningsaktiver: 1e308, Lagerværdi: -1e308, "Kortfristet gæld": -1e308 })];
  for (const id of ["quick-ratio", "working-capital"]) {
    const result = evaluate(id, huge);
    assert.equal(result.value, null);
    assert.equal(JSON.stringify(result).includes("Infinity"), false);
    assert.equal(JSON.stringify(result).includes("NaN"), false);
  }
});

test("FIN: det gamle EBIT-margin-id migrerer sikkert til én driftsmargin", () => {
  assert.equal(standardKpiDefinitions.some(({ id }) => id === "ebit-margin"), false);
  const saved = parseStoredKpiConfiguration(JSON.stringify({ version: 1, primaryKpis: ["ebit-margin", "operating-margin"], secondaryKpis: ["ebit-margin"], customKpis: [] }));
  assert.deepEqual(saved.primaryKpis, ["operating-margin"]);
  const normalized = normalizeKpiConfiguration(saved, new Set(["operating-margin"]), { ...saved, primaryKpis: ["operating-margin"] });
  assert.deepEqual(normalized.primaryKpis, ["operating-margin"]);
  assert.deepEqual(normalized.secondaryKpis, []);
});

test("FIN: UI-biblioteket viser utilgængelig-status og én driftsmargin-definition", () => {
  const rows = profile([{ Snapshotdato: "2026-01-31", Regnskabsperiode: "2026-01", Aktiver: 1000, Egenkapital: "ukendt" }]);
  const evaluations = evaluateStandardKpis(standardKpiDefinitions.map(({ id }) => id), context, rows);
  assert.equal(relevantKpiCategories(standardKpiDefinitions, evaluations).includes("Finansielle nøgletal"), true);
  assert.equal(evaluations["equity-ratio"].available, false);
  assert.equal(evaluations["equity-ratio"].value, null);
  assert.equal(standardKpiDefinitions.filter(({ id }) => id === "operating-margin" || id === "ebit-margin").length, 1);
});
