import assert from "node:assert/strict";
import test from "node:test";

import { buildKpiDataProfile, evaluateStandardKpi, evaluateStandardKpis, relevantKpiCategories, standardKpiDefinitions } from "../lib/kpi-customization.ts";

const context = {
  totalRevenue: 0, totalUnits: 0, totalGrossProfit: 0, grossMargin: null,
  totalCosts: null, actualResult: null, revenueVsBudget: 0, budgetRevenue: 0,
  budgetCosts: 0, budgetResult: 0, rowCount: 0, hasGrossProfit: false,
  hasGrossMargin: false, hasCosts: false, hasBudget: false,
};
const profile = (rows) => buildKpiDataProfile(rows.map((sourceValues) => ({ sourceValues })));
const evaluate = (id, rows, options = {}) => evaluateStandardKpi(id, { ...context, ...options }, profile(rows));
const value = (id, rows, options = {}) => {
  const result = evaluate(id, rows, options);
  assert.equal(result.available, true, `${id}: ${result.reason}`);
  return result;
};
const stock = (date, product, inventoryValue, inventoryQuantity, extra = {}) => ({
  Snapshotdato: date, Produkt: product, Lagerværdi: inventoryValue, Lagerantal: inventoryQuantity, ...extra,
});
const flow = (date, product, cogs, extra = {}) => ({
  Dato: date, Produkt: product, Nettoomsætning: 100, Vareforbrug: cogs, ...extra,
});

test("STOCK: ét snapshot er en total, dokumenteret nul er ikke ukendt", () => {
  const rows = [stock("2026-01-31", "A", 0, 0), stock("2026-01-31", "B", 300, 20)];
  assert.equal(value("inventory-value", rows).value, 300);
  assert.equal(value("inventory-value", [stock("2026-01-31", "A", 0, 0)]).value, 0);
  assert.equal(value("inventory-item-count", rows).value, 20);
  assert.equal(value("lowest-inventory", rows).value, "A");
  assert.equal(value("highest-inventory", rows).value, "B");
  assert.equal(value("average-inventory-value", rows).value, 300);
  assert.equal(evaluate("inventory-binding", rows).value, null);
  assert.match(evaluate("inventory-binding", rows).reason, /ikke selvstændigt defineret/u);
  assert.equal(evaluate("inventory-turnover", rows).value, null);
});

test("STOCK: en tvetydig Lager-kolonne opfindes ikke som lagerværdi", () => {
  const rows = [{ Snapshotdato: "2026-01-31", Produkt: "A", Lager: 100 }];
  assert.equal(profile(rows).matchedColumns.inventoryValue, undefined);
  assert.equal(evaluate("inventory-value", rows).value, null);
});

test("STOCK: lagerkategorien forbliver synlig ved lagerværdi, også når snapshotdato mangler", () => {
  const rows = [{ Produkt: "A", Lagerværdi: 100 }];
  const evaluations = evaluateStandardKpis(standardKpiDefinitions.map((definition) => definition.id), context, profile(rows));
  assert.equal(evaluations["inventory-value"].available, false);
  assert.equal(relevantKpiCategories(standardKpiDefinitions, evaluations).includes("Lager"), true);
});

test("STOCK: historiske snapshots lægges ikke sammen; råcelle-AVG erstattes af AVG(snapshot-total)", () => {
  const rows = [
    stock("2026-01-01", "A", 100, 10), stock("2026-01-01", "B", 300, 30),
    stock("2026-01-31", "A", 200, 20), stock("2026-01-31", "B", 400, 40),
  ];
  assert.equal(value("inventory-value", rows).value, 600);
  assert.equal(value("inventory-item-count", rows).value, 60);
  assert.equal(value("average-inventory-value", rows).value, 500);
  assert.equal(value("lowest-inventory", rows).value, "A");
  assert.equal(value("highest-inventory", rows).value, "B");
  assert.match(value("inventory-value", rows).detail, /2026-01-31/u);
  assert.equal(value("inventory-value", rows, { selectedMonths: ["2026-01"] }).value, 600);
});

test("STOCK: seneste ufuldstændige snapshot springes over for værdi, men gennemsnit skjuler det ikke", () => {
  const rows = [stock("2026-01-01", "A", 100, 10), stock("2026-01-31", "A", null, 20)];
  assert.equal(value("inventory-value", rows).value, 100);
  assert.equal(evaluate("average-inventory-value", rows).value, null);
  assert.equal(evaluate("inventory-value", [stock("2026-01-01", "A", null, 0)]).value, null);
  assert.equal(evaluate("inventory-value", [{ Produkt: "A", Lagerværdi: 100 }]).value, null);
  assert.equal(evaluate("inventory-value", [stock("2026-01", "A", 100, 10)]).value, null);
  assert.equal(evaluate("inventory-value", [stock("31.02.2026", "A", 100, 10)]).value, null);
  const missingMember = [
    stock("2026-01-01", "A", 100, 10), stock("2026-01-01", "B", 200, 20),
    stock("2026-01-31", "A", 120, 12),
  ];
  assert.equal(value("inventory-value", missingMember).value, 300);
  assert.equal(evaluate("average-inventory-value", missingMember).value, null);
});

test("STOCK: laveste/højeste lager rangerer samlede medlemmer på seneste snapshot", () => {
  const rows = [
    stock("2026-01-01", "A", 100, 1),
    stock("2026-01-31", "A", 20, 3), stock("2026-01-31", "A", 30, 4),
    stock("2026-01-31", "B", 50, 6),
  ];
  assert.equal(value("lowest-inventory", rows).value, "B");
  assert.equal(value("highest-inventory", rows).value, "A");
  assert.match(value("highest-inventory", rows).detail, /7 enheder/u);
  assert.equal(evaluate("lowest-inventory", [{ Snapshotdato: "2026-01-31", Lagerværdi: 10, Lagerantal: 1 }]).value, null);
});

test("STOCK: turnover bruger kun dokumenteret COGS og mindst to snapshots i samme periode", () => {
  const rows = [
    stock("2026-01-01", "A", 400, 40), stock("2026-01-31", "A", 600, 60),
    flow("2026-01-01", "A", 100), flow("2026-01-31", "A", 150),
  ];
  assert.equal(value("inventory-turnover", rows, { selectedMonths: ["2026-01"] }).value, 0.5);
  assert.equal(value("inventory-days", rows, { selectedMonths: ["2026-01"] }).value, 62);
  assert.match(value("inventory-days", rows, { selectedMonths: ["2026-01"] }).detail, /31 kalenderdage/u);
  assert.equal(evaluate("inventory-turnover", rows.slice(1), { selectedMonths: ["2026-01"] }).value, null);
  const genericCost = rows.map((row) => row.Vareforbrug === undefined ? row : {
    Dato: row.Dato, Produkt: row.Produkt, Nettoomsætning: row.Nettoomsætning, Omkostninger: row.Vareforbrug,
  });
  assert.equal(evaluate("inventory-turnover", genericCost, { selectedMonths: ["2026-01"] }).value, null);
  assert.equal(evaluate("inventory-days", genericCost, { selectedMonths: ["2026-01"] }).value, null);
});

test("STOCK: særskilt dokumenteret COGS-ark kan bruges uden skjult salgskost-fallback", () => {
  const sales = [
    { Dato: "2026-01-01", Produkt: "A", Nettoomsætning: 100, Omkostninger: 999 },
    { Dato: "2026-01-31", Produkt: "A", Nettoomsætning: 100, Omkostninger: 999 },
  ];
  const rows = [
    stock("2026-01-01", "A", 400, 40), stock("2026-01-31", "A", 600, 60),
    ...sales,
    { Dato: "2026-01-01", Produkt: "A", Vareforbrug: 100 },
    { Dato: "2026-01-31", Produkt: "A", Vareforbrug: 150 },
  ];
  assert.equal(value("inventory-turnover", rows, { selectedMonths: ["2026-01"], salesProfile: profile(sales) }).value, 0.5);
  assert.equal(value("inventory-days", rows, { selectedMonths: ["2026-01"], salesProfile: profile(sales) }).value, 62);
  assert.equal(evaluate("inventory-turnover", rows.slice(0, 4), { selectedMonths: ["2026-01"], salesProfile: profile(sales) }).value, null);
});

test("STOCK: lagerdage bruger 29 dage i skudårs-februar og 11 i dokumenteret delperiode", () => {
  const february = [
    stock("2028-02-01", "A", 100, 10), stock("2028-02-29", "A", 100, 10),
    flow("2028-02-01", "A", 50), flow("2028-02-29", "A", 50),
  ];
  assert.equal(value("inventory-turnover", february, { selectedMonths: ["2028-02"] }).value, 1);
  assert.equal(value("inventory-days", february, { selectedMonths: ["2028-02"] }).value, 29);
  const partial = [
    stock("2026-01-10", "A", 100, 10), stock("2026-01-20", "A", 100, 10),
    flow("2026-01-10", "A", 50), flow("2026-01-20", "A", 50),
  ];
  const period = { selectedMonths: ["2026-01"], partialMonths: ["2026-01"], inventoryPeriod: { start: "2026-01-10", end: "2026-01-20" } };
  assert.equal(value("inventory-days", partial, period).value, 11);
  assert.equal(value("inventory-days", partial, { selectedMonths: ["2026-01"], partialMonths: ["2026-01"] }).value, 11);
  const march = [
    stock("2026-03-10", "A", 100, 10), stock("2026-03-20", "A", 100, 10),
    flow("2026-01-01", "A", 900), flow("2026-03-10", "A", 50), flow("2026-03-20", "A", 50),
  ];
  assert.equal(value("inventory-days", march, { selectedMonths: ["2026-03"], partialMonths: ["2026-03"] }).value, 11);
});

test("STOCK: produkt, kategori og region afgrænser lager og flow ens", () => {
  const dimension = { Kategori: "Drikke", Region: "Nord" };
  const rows = [
    stock("2026-01-01", "A", 100, 10, dimension), stock("2026-01-31", "A", 200, 20, dimension),
    flow("2026-01-01", "A", 40, dimension), flow("2026-01-31", "A", 50, dimension),
    stock("2026-01-01", "B", 500, 50, { Kategori: "Mad", Region: "Syd" }),
    stock("2026-01-31", "B", 800, 80, { Kategori: "Mad", Region: "Syd" }),
    flow("2026-01-01", "B", 100, { Kategori: "Mad", Region: "Syd" }),
    flow("2026-01-31", "B", 200, { Kategori: "Mad", Region: "Syd" }),
  ];
  const options = { selectedMonths: ["2026-01"], inventoryFilters: { product: ["A"], category: ["Drikke"], region: ["Nord"] } };
  assert.equal(value("inventory-value", rows, options).value, 200);
  assert.equal(value("average-inventory-value", rows, options).value, 150);
  assert.equal(value("inventory-turnover", rows, options).value, 0.6);
  assert.equal(value("inventory-days", rows, options).value, 31 / 0.6);
  const unallocatedStock = [stock("2026-01-01", "A", 100, 10, { Kategori: "Drikke" }), stock("2026-01-31", "A", 200, 20, { Kategori: "Drikke" }), ...rows.filter((row) => row.Vareforbrug !== undefined)];
  assert.equal(evaluate("inventory-turnover", unallocatedStock, options).value, null);
  assert.match(evaluate("inventory-turnover", unallocatedStock, options).reason, /region/u);
});

test("STOCK: periodegrænser følger filtreret flow, og valgt tom måned er ikke nul", () => {
  const rows = [
    stock("2026-01-01", "A", 100, 10), stock("2026-01-31", "A", 100, 10),
    flow("2026-01-01", "A", 40), flow("2026-01-31", "A", 60),
    flow("2026-02-01", "B", 999),
  ];
  const filtered = { inventoryFilters: { product: ["A"] } };
  assert.equal(value("inventory-turnover", rows, filtered).value, 1);
  assert.equal(value("inventory-days", rows, filtered).value, 31);
  assert.equal(evaluate("inventory-turnover", rows, { ...filtered, selectedMonths: ["2026-01", "2026-02"] }).value, null);
});

test("STOCK: Quick Ratio kræver balanceposter på samme snapshotdato og scope", () => {
  const rows = [
    stock("2026-01-31", "A", 60, 6, { Regnskabsperiode: "2026-01", Valuta: "DKK", Virksomhed: "Test ApS", Regnskabsstatus: "Komplet" }),
    { Snapshotdato: "2026-01-31", Regnskabsperiode: "2026-01", Omsætningsaktiver: 300, "Kortfristet gæld": 150, Valuta: "DKK", Virksomhed: "Test ApS", Regnskabsstatus: "Komplet" },
  ];
  assert.equal(value("quick-ratio", rows).value, 1.6);
  const mismatch = [rows[0], { Snapshotdato: "2026-02-01", Omsætningsaktiver: 300, "Kortfristet gæld": 150 }];
  assert.equal(evaluate("quick-ratio", mismatch).value, null);
  assert.equal(evaluate("quick-ratio", rows, { inventoryFilters: { region: ["Nord"] } }).value, null);
  assert.equal(evaluate("quick-ratio", [rows[0], { ...rows[1], "Kortfristet gæld": 0 }]).value, null);
});

test("STOCK: 0, ukendt og ekstreme værdier bliver ikke blandet eller vist som Infinity", () => {
  const knownZero = [stock("2026-01-01", "A", 100, 0), stock("2026-01-31", "A", 100, 0), flow("2026-01-01", "A", 0), flow("2026-01-31", "A", 0)];
  assert.equal(value("inventory-item-count", knownZero).value, 0);
  assert.equal(value("inventory-turnover", knownZero).value, 0);
  assert.equal(evaluate("inventory-days", knownZero).value, null);
  const huge = [stock("2026-01-01", "A", 1e308, 1), stock("2026-01-31", "A", 1e308, 1), flow("2026-01-01", "A", 1e308), flow("2026-01-31", "A", 1e308)];
  for (const id of ["inventory-value", "average-inventory-value", "inventory-turnover", "inventory-days", "quick-ratio"]) {
    const result = evaluate(id, huge);
    assert.equal(JSON.stringify(result).includes("Infinity"), false, id);
    assert.equal(JSON.stringify(result).includes("NaN"), false, id);
  }
});
