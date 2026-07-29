import assert from "node:assert/strict";
import test from "node:test";

import {
  amountUnitLabel,
  formatAmount,
  parseAmountDisplayPreference,
  resolveAmountUnit,
} from "../lib/amount-display.ts";

test("beløb formatteres konsekvent som kr., t.kr. og mio. kr.", () => {
  assert.equal(formatAmount(42_672, "kr"), "42.672 kr.");
  assert.equal(formatAmount(42_672, "thousand"), "42,7 t.kr.");
  assert.equal(formatAmount(2_270_000, "million"), "2,27 mio. kr.");
  assert.equal(formatAmount(-1_250, "thousand"), "-1,3 t.kr.");
});

test("automatisk beløbsenhed vælges én gang ud fra visningens største beløb", () => {
  assert.equal(resolveAmountUnit("auto", [12, 999]), "kr");
  assert.equal(resolveAmountUnit("auto", [999, 1_000]), "thousand");
  assert.equal(resolveAmountUnit("auto", [42_672, 999_999]), "thousand");
  assert.equal(resolveAmountUnit("auto", [42_672, 2_270_000]), "million");
  assert.equal(resolveAmountUnit("kr", [9_000_000]), "kr");
});

test("lagrede beløbspræferencer valideres og ugyldige værdier falder tilbage til Automatisk", () => {
  assert.equal(parseAmountDisplayPreference("auto"), "auto");
  assert.equal(parseAmountDisplayPreference("kr"), "kr");
  assert.equal(parseAmountDisplayPreference("thousand"), "thousand");
  assert.equal(parseAmountDisplayPreference("million"), "million");
  assert.equal(parseAmountDisplayPreference("usd"), "auto");
  assert.equal(parseAmountDisplayPreference(null), "auto");
  assert.equal(amountUnitLabel("million"), "mio. kr.");
});

test("ikke-endelige beløb vises aldrig som NaN eller Infinity", () => {
  assert.equal(formatAmount(Number.NaN, "kr"), "–");
  assert.equal(formatAmount(Number.POSITIVE_INFINITY, "million"), "–");
  assert.equal(formatAmount(null, "thousand"), "–");
});
