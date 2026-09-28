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

const profile = (rows) => buildKpiDataProfile(rows.map((sourceValues) => ({ sourceValues })));
const context = {
  totalRevenue: 0, totalUnits: 0, totalGrossProfit: 0, grossMargin: null,
  totalCosts: null, actualResult: null, revenueVsBudget: 0, budgetRevenue: 0,
  budgetCosts: 0, budgetResult: 0, rowCount: 0, hasGrossProfit: false,
  hasGrossMargin: false, hasCosts: false, hasBudget: false,
};
const evaluate = (id, rows, options = {}) => evaluateStandardKpi(id, { ...context, ...options }, profile(rows));
const sale = (date, customer, order, product, revenue, db = undefined) => ({
  Dato: date, Kundenummer: customer, Ordrenummer: order, Produkt: product,
  Nettoomsætning: revenue, ...(db === undefined ? {} : { Dækningsbidrag: db }),
});

test("CUST: ny kunde afgøres mod historikken i samme dimensionsscope, ikke kun valgt måned", () => {
  const rows = [
    sale("2026-01-10", "Gammel", "O1", "A", 100),
    sale("2026-02-01", "Gammel", "O2", "A", 50),
    sale("2026-02-02", "Ny", "O3", "B", 80),
    sale("2026-03-01", "Senere", "O4", "A", 30),
  ];
  const history = profile(rows);
  const february = rows.filter((row) => row.Dato.startsWith("2026-02"));
  assert.equal(evaluate("new-customers", february, { selectedMonths: ["2026-02"], customerHistoryProfile: history }).value, 1);
  assert.equal(evaluate("new-customers", rows, { selectedMonths: ["2026-02"], customerHistoryProfile: history }).value, 1);
  assert.equal(evaluate("new-customers", [february[0]], { selectedMonths: ["2026-02"], customerHistoryProfile: history }).value, 0);
  assert.equal(evaluate("new-customers", [rows[3]], { selectedMonths: ["2026-02"], customerHistoryProfile: history }).value, null);
  assert.equal(evaluate("new-customers", february, { selectedMonths: ["2026-02"] }).value, null);
  assert.equal(evaluate("new-customers", rows, { customerHistoryProfile: history }).value, 1);
  const onlyProductB = profile(rows.filter((row) => row.Produkt === "B"));
  assert.equal(evaluate("new-customers", [february[1]], { selectedMonths: ["2026-02"], customerHistoryProfile: onlyProductB }).value, 1);
  assert.equal(evaluate("new-customers", [february[1], { Dato: "2026-02-04", Produkt: "B", Nettoomsætning: 10 }], { selectedMonths: ["2026-02"], customerHistoryProfile: onlyProductB }).value, null);
});

test("CUST: flere linjer i samme ordre er ét køb; to ordre-id'er gør kunden tilbagevendende", () => {
  const rows = [
    sale("2026-02-01", "K1", "O1", "A", 50),
    sale("2026-02-01", "K1", "O1", "B", 30),
    sale("2026-02-03", "K1", "O2", "A", 20),
    sale("2026-02-03", "K2", "O3", "A", 10),
  ];
  assert.equal(evaluate("returning-customers", rows).value, 1);
  assert.equal(evaluate("average-purchases-customer", rows).value, 1.5);
  assert.equal(evaluate("returning-customers", rows.slice(0, 2)).value, 0);
  assert.equal(evaluate("average-purchases-customer", rows.slice(0, 2)).value, 1);
});

test("CUST: manglende eller tvetydigt ordre-id giver utilgængelig, ikke rækkefallback", () => {
  const rows = [sale("2026-02-01", "K1", "O1", "A", 50), sale("2026-02-01", "K1", "O1", "B", 30)];
  for (const invalidRows of [
    rows.map((row) => ({ Dato: row.Dato, Kundenummer: row.Kundenummer, Produkt: row.Produkt, Nettoomsætning: row.Nettoomsætning })),
    [rows[0], { ...rows[1], Ordrenummer: "" }],
    [rows[0], { ...rows[1], Kundenummer: "K2" }],
  ]) {
    for (const id of ["returning-customers", "average-purchases-customer"]) {
      const result = evaluate(id, invalidRows);
      assert.equal(result.available, false, id);
      assert.equal(result.value, null, id);
    }
  }
});

test("RANK: margin sammenligner kun komplette DB-grundlag og bevarer dokumenteret nul", () => {
  const complete = [sale("2026-02-01", "K1", "O1", "A", 100, 20), sale("2026-02-01", "K2", "O2", "B", 100, 0)];
  assert.equal(evaluate("highest-margin-product", complete).value, "A");
  assert.equal(evaluate("highest-margin-product", complete.map((row) => ({ ...row, Dækningsbidrag: 0 }))).value, "A");
  const partial = [complete[0], complete[1], sale("2026-02-02", "K2", "O3", "B", 100)];
  const unavailable = evaluate("highest-margin-product", partial);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.value, null);
  assert.match(unavailable.reason, /komplet/i);
  assert.equal(evaluate("highest-margin-product", [sale("2026-02-01", "K1", "O1", "A", 0, 0)]).value, null);
});

test("RANK: komplet procentgrundlag er omsætningsvægtet, uden at blande DB og DG", () => {
  const rows = [
    { Produkt: "A", Nettoomsætning: 100, Dækningsgrad: "10%" },
    { Produkt: "A", Nettoomsætning: 900, Dækningsgrad: "90%" },
    { Produkt: "B", Nettoomsætning: 1000, Dækningsgrad: "70%" },
  ];
  assert.equal(evaluate("highest-margin-product", rows).value, "A");
  assert.equal(evaluate("highest-margin-product", [rows[0], { ...rows[1], Dækningsgrad: "ukendt" }, rows[2]]).value, null);
});

test("RANK: én canonical omsætningsranking, deterministisk tie og samme filtrerede scope", () => {
  const rows = [
    sale("2026-01-01", "K1", "O1", "A", 100),
    sale("2026-02-01", "K2", "O2", "B", 120),
    sale("2026-02-02", "K3", "O3", "A", 20),
  ];
  for (const id of ["best-product", "highest-revenue-product"]) {
    assert.equal(evaluate(id, rows).value, "A");
    assert.equal(evaluate(id, rows.slice(1)).value, "B");
    assert.equal(evaluate(id, [sale("2026-03-01", "K4", "O4", "C", 0)]).value, "C");
    assert.equal(evaluate(id, [sale("2026-03-01", "K4", "O4", "C", -20), sale("2026-03-01", "K5", "O5", "D", -10)]).value, "D");
    assert.equal(evaluate(id, [rows[0], { ...rows[1], Nettoomsætning: "ukendt" }]).value, null);
  }
  assert.equal(evaluate("best-product", rows, { salesProfile: profile(rows.slice(1)) }).value, "B");
  assert.equal(standardKpiDefinitions.filter(({ id }) => ["best-product", "highest-revenue-product"].includes(id)).length, 1);
});

test("RANK: gemte referencer migreres til canonical id uden dublet", () => {
  const saved = parseStoredKpiConfiguration(JSON.stringify({
    version: 1, primaryKpis: ["highest-revenue-product", "best-product"],
    secondaryKpis: ["highest-revenue-product"], customKpis: [],
  }));
  assert.deepEqual(saved.primaryKpis, ["best-product"]);
  const normalized = normalizeKpiConfiguration(saved, new Set(["best-product"]), { ...saved, primaryKpis: ["best-product"] });
  assert.deepEqual(normalized.primaryKpis, ["best-product"]);
  assert.deepEqual(normalized.secondaryKpis, []);
});

test("CUST/RANK: KPI-biblioteket viser korrekte labels, status og aldrig NaN/Infinity", () => {
  const rows = profile([sale("2026-02-01", "K1", "O1", "A", 100, 0), sale("2026-02-02", "K2", "O2", "B", 50)]);
  const ids = ["new-customers", "returning-customers", "average-purchases-customer", "highest-margin-product", "best-product"];
  const evaluations = evaluateStandardKpis(ids, { ...context, customerHistoryProfile: rows, selectedMonths: ["2026-02"] }, rows);
  assert.equal(relevantKpiCategories(standardKpiDefinitions, evaluations).includes("Kunder"), true);
  assert.equal(standardKpiDefinitions.find(({ id }) => id === "best-product")?.name, "Produkt med højest omsætning");
  assert.equal(evaluations["highest-margin-product"].available, false);
  assert.equal(JSON.stringify(evaluations).includes("Infinity"), false);
  assert.equal(JSON.stringify(evaluations).includes("NaN"), false);
});
