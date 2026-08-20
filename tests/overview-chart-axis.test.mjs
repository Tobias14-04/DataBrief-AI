import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../components/overview-dashboard.tsx", import.meta.url),
  "utf8",
);

test("månedsgrafen viser flest mulige labels adaptivt uden at ændre datapunkterne", () => {
  assert.match(source, /<AreaChart data=\{data\}/u);
  assert.match(
    source,
    /<XAxis[\s\S]*dataKey="name"[\s\S]*minTickGap=\{8\}[\s\S]*interval="preserveStartEnd"[\s\S]*tickFormatter=\{\(value\) => formatDanishMonth\(String\(value\), "short"\)\}/u,
  );
  assert.doesNotMatch(source, /<XAxis[\s\S]*ticks=\{/u);
});

test("hover viser fortsat den fulde måned og markerer det aktive datapunkt", () => {
  assert.match(source, /labelFormatter=\{\(label\) => formatDanishMonth\(String\(label\)\)\}/u);
  assert.match(source, /activeDot=\{\{ r: 5,/u);
});
