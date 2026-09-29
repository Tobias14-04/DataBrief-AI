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
  totalRevenue: 1000, totalUnits: 0, totalGrossProfit: 250, grossMargin: 0.25,
  totalCosts: null, actualResult: null, revenueVsBudget: 0, budgetRevenue: 0,
  budgetCosts: 0, budgetResult: 0, rowCount: 0, hasGrossProfit: true,
  hasGrossMargin: true, hasCosts: false, hasBudget: false,
};
const profile = (rows) => buildKpiDataProfile(rows.map((sourceValues) => ({ sourceValues })));
const evaluate = (id, rows, options = {}) => evaluateStandardKpi(id, { ...context, ...options }, profile(rows));
const customer = (id, name, revenue, db) => ({
  Kundenummer: id, Kundenavn: name, Nettoomsætning: revenue,
  ...(db === undefined ? {} : { Dækningsbidrag: db }),
});

test("DEF: dækningsgrad har kun én canonical KPI, og gammelt id evaluerer samme værdi", () => {
  const rows = [customer("K1", "Nord", 1000, 250)];
  assert.equal(standardKpiDefinitions.filter(({ id }) => ["gross-margin", "gross-profit-margin"].includes(id)).length, 1);
  assert.equal(standardKpiDefinitions.some(({ id }) => id === "gross-profit-margin"), false);
  assert.equal(evaluate("gross-margin", rows).value, 0.25);
  assert.deepEqual(evaluate("gross-profit-margin", rows), evaluate("gross-margin", rows));
  assert.equal(evaluate("gross-profit-margin", rows, { grossMargin: 0 }).value, 0);
  assert.equal(evaluate("gross-profit-margin", rows, { grossMargin: null }).value, null);
});

test("DEF: gamle KPI-id'er migreres sikkert uden dubletter mellem placeringer", () => {
  const saved = parseStoredKpiConfiguration(JSON.stringify({
    version: 1,
    primaryKpis: ["gross-profit-margin", "gross-margin", "most-profitable-customer"],
    secondaryKpis: ["highest-gross-profit-customer", "highest-revenue-product", "best-product"],
    customKpis: [],
  }));
  assert.deepEqual(saved.primaryKpis, ["gross-margin", "highest-gross-profit-customer"]);
  assert.deepEqual(saved.secondaryKpis, ["highest-gross-profit-customer", "best-product"]);
  const normalized = normalizeKpiConfiguration(saved, new Set(["gross-margin", "highest-gross-profit-customer", "best-product"]), saved);
  assert.deepEqual(normalized.primaryKpis, ["gross-margin", "highest-gross-profit-customer"]);
  assert.deepEqual(normalized.secondaryKpis, ["best-product"]);
  assert.equal(standardKpiDefinitions.some(({ id }) => id === "highest-revenue-product" || id === "most-profitable-customer"), false);
});

test("DEF: gennemsnitsomsætning grupperer på kunde-id, ikke ens kundenavne", () => {
  const rows = [customer("K1", "Nord", 50, 10), customer("K2", "Nord", 80, 20), customer("K1", "Nord", 20, 5)];
  assert.equal(evaluate("avg-revenue-customer", rows).value, 75);
  assert.equal(evaluate("highest-revenue-customer", rows).value, "Nord (K2)");
  assert.equal(evaluate("highest-gross-profit-customer", rows).value, "Nord (K2)");
  assert.deepEqual(evaluate("most-profitable-customer", rows), evaluate("highest-gross-profit-customer", rows));
});

test("DEF: kundenavn er aldrig fallback for manglende eller ukendt kunde-id", () => {
  const complete = customer("K1", "Nord", 50, 10);
  for (const invalid of [
    { Kundenavn: "Nord", Nettoomsætning: 100, Dækningsbidrag: 30 },
    customer("", "Nord", 100, 30),
    customer("ukendt", "Nord", 100, 30),
  ]) {
    for (const id of ["avg-revenue-customer", "highest-revenue-customer", "highest-gross-profit-customer"]) {
      const result = evaluate(id, [complete, invalid]);
      assert.equal(result.available, false, id);
      assert.equal(result.value, null, id);
      assert.match(result.reason, /kunde-id/i);
    }
  }
  for (const id of ["avg-revenue-customer", "highest-revenue-customer", "highest-gross-profit-customer"]) {
    assert.equal(evaluate(id, [{ Kundenavn: "Nord", Nettoomsætning: 100, Dækningsbidrag: 30 }]).value, null);
  }
});

test("DEF: højeste kunde-DB kræver komplet dokumenteret grundlag for alle salgsrækker", () => {
  const rows = [customer("K1", "Nord", 100, 30), customer("K2", "Syd", 200, 40)];
  assert.equal(evaluate("highest-gross-profit-customer", rows).value, "Syd (K2)");
  assert.equal(evaluate("highest-gross-profit-customer", [...rows, customer("K1", "Nord", 100, undefined)]).value, null);
  assert.equal(evaluate("highest-gross-profit-customer", [customer("K1", "Nord", 100, 0), customer("K2", "Syd", 100, -5)]).value, "Nord (K1)");
  assert.equal(evaluate("highest-gross-profit-customer", [customer("K1", "Nord", 100, -10), customer("K2", "Syd", 100, -5)]).value, "Syd (K2)");
});

test("DEF: kunde-rankings har deterministisk tie og returnerer aldrig NaN/Infinity", () => {
  const tie = [customer("K2", "Samme", 100, 0), customer("K1", "Samme", 100, 0)];
  assert.equal(evaluate("highest-revenue-customer", tie).value, "Samme (K1)");
  assert.equal(evaluate("highest-gross-profit-customer", tie).value, "Samme (K1)");
  const huge = [customer("K1", "Nord", 1e308, 1e308), customer("K1", "Nord", 1e308, 1e308)];
  for (const id of ["avg-revenue-customer", "highest-revenue-customer", "highest-gross-profit-customer"]) {
    const result = evaluate(id, huge);
    assert.equal(result.available, false, id);
    assert.equal(result.value, null, id);
    assert.equal(JSON.stringify(result).includes("NaN"), false);
    assert.equal(JSON.stringify(result).includes("Infinity"), false);
  }
});
