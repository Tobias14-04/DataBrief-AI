import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("../components/cost-intelligence-dashboard.tsx", import.meta.url),
  "utf8",
);
const tableSource = readFileSync(
  new URL("../lib/cost-detail-table.ts", import.meta.url),
  "utf8",
);

test("sammenligningskontrollen har entydig dansk tekst, knapsemantik og en stabil skjult serie", () => {
  assert.match(componentSource, /Sammenlign med forrige periode/u);
  assert.match(componentSource, /aria-pressed=\{showComparison\}/u);
  assert.match(componentSource, /aria-controls=\{chartId\}/u);
  assert.match(componentSource, /aria-hidden=\{!showComparison\}/u);
  assert.match(componentSource, /hide=\{!showComparison\}/u);
  assert.match(componentSource, /includeHidden/u);
  assert.doesNotMatch(componentSource, /Sammenligning: \{showComparison \? "Til" : "Fra"\}/u);
});

test("indsigtsdisclosure og forklaringen om robust rentabilitet er tilgængelige uden ny popover-dependency", () => {
  assert.match(componentSource, /aria-expanded=\{disclosure\.expanded\}/u);
  assert.match(componentSource, /aria-controls=\{additionalInsightsId\}/u);
  assert.match(componentSource, /motion-reduce:transition-none/u);
  assert.match(componentSource, /<details[\s\S]*?<summary/u);
  assert.match(componentSource, /Forklar robust rentabilitet/u);
  assert.match(
    componentSource,
    /Kun produkter med et tilstrækkeligt datagrundlag medtages, så enkelte små salg ikke skaber misvisende resultater\./u,
  );
});

test("budgetafvigelsens forklaring er dansk, mens CSV-flowet fortsat bruger rå tabelværdier", () => {
  assert.match(
    tableSource,
    /Afvigelsen viser forskellen mellem faktisk forbrug og budget\. Under budget er gunstigt\./u,
  );
  assert.match(tableSource, /buildCostDetailCsv/u);
  assert.match(tableSource, /formatCsvCell\(row, key\)/u);
  assert.doesNotMatch(tableSource, /formatCsvCell[\s\S]*under budget/u);
});
