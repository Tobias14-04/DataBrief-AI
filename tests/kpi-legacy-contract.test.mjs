import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKpiDataProfile,
  evaluateStandardKpi,
  normalizeKpiConfiguration,
  parseStoredKpiConfiguration,
  standardKpiDefinitions,
} from "../lib/kpi-customization.ts";

const context = {
  totalRevenue: 1000, totalUnits: 10, totalGrossProfit: 200, grossMargin: 0.2,
  totalCosts: null, actualResult: null, revenueVsBudget: 50, budgetRevenue: 950,
  budgetCosts: 0, budgetResult: 0, rowCount: 2, hasGrossProfit: true,
  hasGrossMargin: true, hasCosts: false, hasBudget: true,
  revenueGrowth: { current: 1000, previous: 800, absolute: 200, percentage: 0.25, label: "februar 2026 → marts 2026" },
};
const profile = (rows) => buildKpiDataProfile(rows.map((sourceValues) => ({ sourceValues })));
const evaluate = (id, rows, options = {}) => evaluateStandardKpi(id, { ...context, ...options }, profile(rows));
const sale = (date, id, name, order, revenue) => ({ Dato: date, Kundenummer: id, Kundenavn: name, Ordrenummer: order, Nettoomsætning: revenue });
const finance = (period, result, extra = {}) => ({
  Regnskabsperiode: period, Valuta: "DKK", Virksomhed: "Test ApS", Regnskabsstatus: "Komplet",
  Driftsresultat: result, ...extra,
});

test("LEGACY: alle fem aktive dubletpar har ét canonical id og samme rå evaluering via alias", () => {
  const rows = [{ Dato: "2026-03-01", Nettoomsætning: 1000, Antal: 10, Dækningsbidrag: 200, "Budgetteret omsætning": 950 }];
  const pairs = [
    ["avg-revenue-unit", "average-sales-price", 100],
    ["sales-count", "row-count", 2],
    ["month-over-month-growth", "revenue-growth", 0.25],
    ["budget-variance", "revenue-vs-budget", 50],
    ["gross-profit-total", "gross-profit", 200],
  ];
  for (const [legacy, canonical, expected] of pairs) {
    assert.equal(standardKpiDefinitions.some(({ id }) => id === legacy), false, legacy);
    assert.equal(standardKpiDefinitions.filter(({ id }) => id === canonical).length, 1, canonical);
    const current = evaluate(canonical, rows);
    assert.equal(current.available, true, canonical);
    assert.equal(current.value, expected, canonical);
    assert.deepEqual(evaluate(legacy, rows), current, legacy);
  }
  assert.equal(evaluate("gross-profit-total", rows, { totalGrossProfit: 0 }).value, 0);
  assert.equal(standardKpiDefinitions.find(({ id }) => id === "gross-profit")?.name, "Dækningsbidrag");
});

test("LEGACY: fem gamle id'er migreres, og lagerbinding fjernes fra gemte valg", () => {
  const saved = parseStoredKpiConfiguration(JSON.stringify({
    version: 1,
    primaryKpis: ["gross-profit-total", "gross-profit", "avg-revenue-unit", "inventory-binding"],
    secondaryKpis: ["sales-count", "month-over-month-growth", "budget-variance", "gross-profit-total", "inventory-binding"],
    customKpis: [],
  }));
  assert.deepEqual(saved.primaryKpis, ["gross-profit", "average-sales-price"]);
  assert.deepEqual(saved.secondaryKpis, ["row-count", "revenue-growth", "revenue-vs-budget", "gross-profit"]);
  const available = new Set(standardKpiDefinitions.map(({ id }) => id));
  const normalized = normalizeKpiConfiguration(saved, available, saved);
  assert.deepEqual(normalized.primaryKpis, ["gross-profit", "average-sales-price"]);
  assert.deepEqual(normalized.secondaryKpis, ["row-count", "revenue-growth", "revenue-vs-budget"]);
});

test("LEGACY: nye, tilbagevendende og køb pr. kunde bruger kun stabilt kunde-id", () => {
  const history = [
    sale("2026-01-04", "K1", "Samme navn", "O1", 100),
    sale("2026-02-03", "K1", "Samme navn", "O2", 50),
    sale("2026-02-04", "K2", "Samme navn", "O3", 60),
  ];
  const february = history.slice(1);
  assert.equal(evaluate("new-customers", february, { selectedMonths: ["2026-02"], customerHistoryProfile: profile(history) }).value, 1);
  assert.equal(evaluate("returning-customers", history).value, 1);
  assert.equal(evaluate("average-purchases-customer", history).value, 1.5);
  const missingId = { Dato: "2026-02-05", Kundenavn: "Samme navn", Ordrenummer: "O4", Nettoomsætning: 10 };
  for (const id of ["new-customers", "returning-customers", "average-purchases-customer"]) {
    assert.equal(evaluate(id, [missingId], { customerHistoryProfile: profile([missingId]) }).value, null);
    const partial = evaluate(id, [...february, missingId], { selectedMonths: ["2026-02"], customerHistoryProfile: profile([...history, missingId]) });
    assert.equal(partial.available, false, id);
    assert.equal(partial.value, null, id);
    assert.match(partial.reason, /kunde-id/i, id);
  }
});

test("LEGACY: EBIT følger central finansiel periode-, valuta-, scope- og completeness-kontrakt", () => {
  assert.equal(evaluate("ebit", [finance("2026-01", 100)]).value, 100);
  assert.equal(evaluate("ebit", [finance("2026-01", 0)]).value, 0);
  assert.equal(evaluate("ebit", [finance("2026-01", -20)]).value, -20);
  assert.equal(evaluate("ebit", [finance("2026-01", 100), finance("2026-02", 50)], { selectedMonths: ["2026-02"] }).value, 50);
  assert.equal(evaluate("ebit", [finance("2026-01", 100), finance("2026-02", 50)]).value, 150);
  for (const invalid of [
    { Driftsresultat: 100 },
    finance("2026-01", "ukendt"),
    finance("2026-01", 100, { Valuta: "" }),
    finance("2026-01", 100, { Virksomhed: "" }),
    finance("2026-01", 100, { Regnskabsstatus: "Ufuldstændig" }),
  ]) assert.equal(evaluate("ebit", [invalid]).value, null);
  assert.equal(evaluate("ebit", [finance("2026-01", 100), finance("2026-03", 50)]).value, null);
  assert.equal(evaluate("ebit", [finance("2026-01", 100), finance("2026-02", 50, { Valuta: "EUR" })]).value, null);
  assert.equal(evaluate("ebit", [finance("2026-01", 100)], { partialMonths: ["2026-01"] }).value, null);
  assert.equal(evaluate("ebit", [finance("2026-01", 100)], { financialFilters: { product: ["A"] } }).value, null);
  assert.equal(evaluate("ebit", [finance("2026-01", 100, { Produkt: "A" })], { financialFilters: { product: ["A"] } }).value, 100);
});

test("LEGACY: inventory-binding er ikke aktiv og kan ikke give et opdigtet lagerbeløb", () => {
  assert.equal(standardKpiDefinitions.some(({ id }) => id === "inventory-binding"), false);
  const result = evaluate("inventory-binding", [{ Lagerværdi: 100 }]);
  assert.equal(result.available, false);
  assert.equal(result.value, null);
  assert.match(result.reason, /ikke selvstændigt defineret/i);
});

test("LEGACY: KPI-biblioteket er unikt, og aliaser serialiserer ikke NaN/Infinity", () => {
  const ids = standardKpiDefinitions.map(({ id }) => id);
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(standardKpiDefinitions.some(({ name }) => name === "Bruttofortjeneste"), false);
  const extreme = [{ Nettoomsætning: 1e308, Antal: 0.1, Dækningsbidrag: 1e308 }];
  for (const id of ["avg-revenue-unit", "gross-profit-total", "inventory-binding"]) {
    const result = evaluate(id, extreme, { totalRevenue: 1e308, totalUnits: 0.1, totalGrossProfit: 1e308 });
    assert.equal(JSON.stringify(result).includes("NaN"), false);
    assert.equal(JSON.stringify(result).includes("Infinity"), false);
  }
});
