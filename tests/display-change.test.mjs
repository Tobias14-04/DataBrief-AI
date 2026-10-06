import assert from "node:assert/strict";
import test from "node:test";
import { formatSignedPercentage, formatSignedPercentagePoints } from "../lib/display-change.ts";

test("afrundede procentpoint får ikke et misvisende fortegn ved nul", () => {
  assert.equal(formatSignedPercentagePoints(-0.0001), "0 procentpoint");
  assert.equal(formatSignedPercentagePoints(0.0001), "0 procentpoint");
  assert.equal(formatSignedPercentagePoints(0), "0 procentpoint");
  assert.equal(formatSignedPercentagePoints(-0.006), "−0,6 procentpoint");
  assert.equal(formatSignedPercentagePoints(0.006), "+0,6 procentpoint");
});

test("afrundede procenter får ikke et misvisende fortegn ved nul", () => {
  assert.equal(formatSignedPercentage(-0.0001, "0 %"), "0 %");
  assert.equal(formatSignedPercentage(0.0001, "0 %"), "0 %");
  assert.equal(formatSignedPercentage(-0.08, "8 %"), "−8 %");
  assert.equal(formatSignedPercentage(0.08, "8 %"), "+8 %");
});
