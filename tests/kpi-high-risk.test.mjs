import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKpiDataProfile,
  evaluateStandardKpi,
  standardKpiDefinitions,
} from "../lib/kpi-customization.ts";
import { resolvePeriodComparison, resolveYearOverYearComparison } from "../lib/period-comparison.ts";

const source = (values) => ({ sourceValues: values });
const profile = (rows) => buildKpiDataProfile(rows.map(source));
const context = (rows, extra = {}) => ({
  totalRevenue: rows.reduce((sum, row) => sum + (row.Nettoomsætning ?? 0), 0),
  totalUnits: rows.reduce((sum, row) => sum + (row.Antal ?? 0), 0),
  ...extra,
});
const evaluate = (id, rows, extra = {}) => evaluateStandardKpi(id, context(rows, extra), profile(rows));
const value = (id, rows, extra = {}) => {
  const result = evaluate(id, rows, extra);
  assert.equal(result.available, true, `${id}: ${result.reason}`);
  return result;
};

test("KPI: salgspris er Σ omsætning / Σ antal, aldrig uvægtet enhedspris", () => {
  const rows = [
    { Produkt: "A", Antal: 1, Nettoomsætning: 100, "Salgspris pr. stk.": 100 },
    { Produkt: "B", Antal: 9, Nettoomsætning: 90, "Salgspris pr. stk.": 10 },
  ];
  assert.equal(value("average-sales-price", rows).value, 19);
  assert.equal(evaluate("average-sales-price", [{ Antal: 0, Nettoomsætning: 100 }]).value, null);
  assert.equal(evaluate("average-sales-price", [{ Antal: 0.1, Nettoomsætning: 1e308 }]).value, null);
});

test("KPI: enhedskost bruger kun dokumenterede variable rækkeomkostninger", () => {
  const rows = [
    { Antal: 1, Nettoomsætning: 200, "Kostpris pr. stk.": 100, "Samlede omkostninger": 1000 },
    { Antal: 9, Nettoomsætning: 180, "Kostpris pr. stk.": 10, "Samlede omkostninger": 900 },
  ];
  assert.equal(value("average-unit-cost", rows).value, 19);
  const mixedSheets = profile([...rows, { Nettoomsætning: 9999, "Samlede omkostninger": 300 }]);
  const separated = evaluateStandardKpi("average-unit-cost", context(rows, { salesProfile: profile(rows) }), mixedSheets);
  assert.equal(separated.available, true);
  assert.equal(separated.value, 19);
  assert.equal(value("average-unit-cost", [{ Antal: 2, Nettoomsætning: 10, Vareforbrug: 0 }]).value, 0);
  assert.equal(value("average-unit-cost", [{ Antal: 4, Nettoomsætning: 10, Vareforbrug: -20 }]).value, -5);
  assert.equal(evaluate("average-unit-cost", [{ Antal: 2, Nettoomsætning: 10, "Samlede omkostninger": 8 }]).value, null);
  assert.equal(evaluate("average-unit-cost", [rows[0], { Antal: 2, Nettoomsætning: 20 }]).value, null);
  assert.equal(evaluate("average-unit-cost", [rows[0], { Nettoomsætning: 20, Vareforbrug: 4 }]).value, null);
  assert.equal(evaluate("average-unit-cost", [{ Antal: 0, Nettoomsætning: 0, Vareforbrug: 0 }]).value, null);
});

test("KPI: dækningsbidrag og dokumenteret nettoresultat har separate id'er og værdier", () => {
  const rows = [
    { Produkt: "A", Nettoomsætning: 300, Dækningsbidrag: 100, Nettoresultat: 80 },
    { Produkt: "B", Nettoomsætning: 400, Dækningsbidrag: 200, Nettoresultat: 10 },
  ];
  assert.equal(value("most-profitable-product", rows).value, "A");
  assert.equal(value("highest-gross-profit-product", rows).value, "B");
  assert.equal(value("average-profit-product", rows).value, 45);
  assert.equal(value("average-gross-profit-product", rows).value, 150);
  const variableOnly = rows.map((row) => ({
    Produkt: row.Produkt, Nettoomsætning: row.Nettoomsætning, Dækningsbidrag: row.Dækningsbidrag,
  }));
  assert.equal(evaluate("most-profitable-product", variableOnly).value, null);
  assert.equal(evaluate("average-profit-product", variableOnly).value, null);
  assert.equal(value("highest-gross-profit-product", variableOnly).value, "B");
  assert.equal(value("average-gross-profit-product", variableOnly).value, 150);
  const names = Object.fromEntries(standardKpiDefinitions.map(({ id, name }) => [id, name]));
  assert.match(names["most-profitable-product"], /nettoresultat/u);
  assert.match(names["highest-gross-profit-product"], /dækningsbidrag/u);
  assert.match(names["average-profit-product"], /nettoresultat/u);
  assert.match(names["average-gross-profit-product"], /dækningsbidrag/u);
});

test("KPI: hurtigste og gennemsnitlig månedlig vækst bruger faktiske nabomåneder", () => {
  const rows = [
    { Måned: "2026-01", Nettoomsætning: 100 },
    { Måned: "2026-02", Nettoomsætning: 200 },
    { Måned: "2026-03", Nettoomsætning: 180 },
  ];
  assert.equal(value("fastest-growth-period", rows).value, "februar 2026");
  assert.match(value("fastest-growth-period", rows).detail, /januar 2026.*februar 2026/u);
  assert.equal(value("average-monthly-growth", rows).value, 0.45);
  assert.match(value("average-monthly-growth", rows).detail, /februar 2026.*marts 2026/u);
  const march = { selectedMonths: ["2026-03"], comparisonProfile: profile(rows) };
  assert.equal(value("fastest-growth-period", [rows[2]], march).value, "marts 2026");
  assert.equal(value("average-monthly-growth", [rows[2]], march).value, -0.1);
  assert.equal(evaluate("average-monthly-growth", [rows[2]], { ...march, partialMonths: ["2026-03"] }).value, null);
  assert.equal(evaluate("average-monthly-growth", [rows[0], rows[2]]).value, null);
});

test("KPI: YoY/YTD sammenligner samme måneder, også ved valgt delinterval", () => {
  const rows = [
    { Måned: "2025-01", Nettoomsætning: 100 },
    { Måned: "2025-02", Nettoomsætning: 200 },
    { Måned: "2025-03", Nettoomsætning: 300 },
    { Måned: "2025-04", Nettoomsætning: 400 },
    { Måned: "2026-01", Nettoomsætning: 200 },
    { Måned: "2026-02", Nettoomsætning: 100 },
    { Måned: "2026-03", Nettoomsætning: 600 },
  ];
  assert.equal(value("year-over-year-growth", rows).value, 0.5);
  assert.match(value("year-over-year-growth", rows).detail, /januar 2025.*marts 2025.*januar 2026.*marts 2026/u);
  const selected = { selectedMonths: ["2026-02", "2026-03"], comparisonProfile: profile(rows) };
  assert.equal(value("year-over-year-growth", rows.slice(-2), selected).value, 0.4);
  assert.equal(resolveYearOverYearComparison(rows.map((row) => row.Måned), selected).status, "available");
  assert.equal(evaluate("year-over-year-growth", rows, { partialMonths: ["2026-03"] }).value, null);
  assert.equal(evaluate("year-over-year-growth", rows.slice(1)).value, null);
  assert.equal(evaluate("year-over-year-growth", rows, { selectedMonths: ["2025-12", "2026-01"] }).value, null);
});

test("KPI: fælles periodepar og produktfilter bestemmer produktvækst", () => {
  const rows = [
    { Måned: "2026-01", Produkt: "A", Nettoomsætning: 100 },
    { Måned: "2026-02", Produkt: "A", Nettoomsætning: 200 },
    { Måned: "2026-03", Produkt: "A", Nettoomsætning: 180 },
    { Måned: "2026-01", Produkt: "B", Nettoomsætning: 100 },
    { Måned: "2026-02", Produkt: "B", Nettoomsætning: 50 },
    { Måned: "2026-03", Produkt: "B", Nettoomsætning: 200 },
    { Måned: "2026-03", Produkt: "Ny", Nettoomsætning: 1000 },
    { Måned: "2026-02", Produkt: "Forsvundet", Nettoomsætning: 1 },
  ];
  assert.equal(value("fastest-growing-product", rows).value, "B");
  assert.match(value("fastest-growing-product", rows).detail, /300.*februar 2026.*marts 2026/u);
  const filtered = rows.filter((row) => row.Produkt === "A");
  assert.equal(value("fastest-growing-product", filtered).value, "A");
  assert.match(value("fastest-growing-product", filtered).detail, /-10.*februar 2026.*marts 2026/u);
  const selected = { selectedMonths: ["2026-03"], comparisonProfile: profile(filtered) };
  assert.equal(value("fastest-growing-product", filtered.filter((row) => row.Måned === "2026-03"), selected).value, "A");
  assert.equal(evaluate("fastest-growing-product", rows, { partialMonths: ["2026-03"] }).value, null);
  assert.equal(evaluate("fastest-growing-product", rows.filter((row) => row.Produkt === "Ny")).value, null);
  assert.equal(resolvePeriodComparison(["2026-01", "2026-03"]).status, "unavailable");
});

test("KPI: alle produkter bruger samme valgte flermånedspar", () => {
  const rows = [
    { Måned: "2026-01", Produkt: "A", Nettoomsætning: 100 },
    { Måned: "2026-02", Produkt: "A", Nettoomsætning: 200 },
    { Måned: "2026-03", Produkt: "A", Nettoomsætning: 180 },
    { Måned: "2026-04", Produkt: "A", Nettoomsætning: 240 },
    { Måned: "2026-01", Produkt: "B", Nettoomsætning: 100 },
    { Måned: "2026-02", Produkt: "B", Nettoomsætning: 50 },
    { Måned: "2026-03", Produkt: "B", Nettoomsætning: 200 },
    { Måned: "2026-04", Produkt: "B", Nettoomsætning: 0 },
  ];
  const selectedMonths = ["2026-03", "2026-04"];
  const periodComparison = resolvePeriodComparison(rows.map((row) => row.Måned), { selectedMonths });
  assert.equal(periodComparison.status, "available");
  const result = value("fastest-growing-product", rows.filter((row) => selectedMonths.includes(row.Måned)), {
    comparisonProfile: profile(rows), selectedMonths, periodComparison,
  });
  assert.equal(result.value, "A");
  assert.match(result.detail, /40.*januar 2026.*februar 2026.*marts 2026.*april 2026/u);
});

test("KPI: central baseline-politik gælder nul og negative tal", () => {
  const zero = [{ Måned: "2026-01", Nettoomsætning: 0 }, { Måned: "2026-02", Nettoomsætning: 20 }];
  assert.equal(evaluate("fastest-growth-period", zero).value, null);
  assert.equal(evaluate("average-monthly-growth", zero).value, null);
  const negative = [{ Måned: "2026-01", Nettoomsætning: -100 }, { Måned: "2026-02", Nettoomsætning: -50 }];
  assert.equal(value("average-monthly-growth", negative).value, 0.5);
  const product = negative.map((row) => ({ ...row, Produkt: "Retur" }));
  assert.equal(value("fastest-growing-product", product).value, "Retur");
  assert.match(value("fastest-growing-product", product).detail, /50/u);
  assert.equal(evaluate("fastest-growing-product", zero.map((row) => ({ ...row, Produkt: "Nul" }))).value, null);
  const yoyZero = [{ Måned: "2025-01", Nettoomsætning: 0 }, { Måned: "2026-01", Nettoomsætning: 20 }];
  assert.equal(evaluate("year-over-year-growth", yoyZero).value, null);
  const yoyNegative = [{ Måned: "2025-01", Nettoomsætning: -100 }, { Måned: "2026-01", Nettoomsætning: -50 }];
  assert.equal(value("year-over-year-growth", yoyNegative).value, 0.5);
});
