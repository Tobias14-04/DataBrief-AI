import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("../components/insights-report-dashboard.tsx", import.meta.url),
  "utf8",
);
const uploadSource = readFileSync(
  new URL("../components/upload-dashboard.tsx", import.meta.url),
  "utf8",
);

test("den samlede side har tilgængelige Indsigter/Rapport-tabs med standardvisningen Indsigter", () => {
  assert.match(uploadSource, /useState<InsightsReportTab>\("insights"\)/u);
  assert.match(componentSource, /role="tablist"/u);
  assert.match(componentSource, /role="tab"/u);
  assert.match(componentSource, /aria-selected=\{selected\}/u);
  assert.match(componentSource, /aria-controls=\{tab\.panelId\}/u);
  assert.match(componentSource, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/u);
  assert.match(componentSource, /currentIndex[\s\S]*% tabs\.length/u);
});

test("driverforklaringen er en tilgængelig disclosure og viser positive samt negative bidrag", () => {
  assert.match(componentSource, /Forklar udviklingen/u);
  assert.match(componentSource, /aria-expanded=\{expanded\}/u);
  assert.match(componentSource, /aria-controls=\{explanationId\}/u);
  assert.match(componentSource, /Største positive drivere/u);
  assert.match(componentSource, /Største negative drivere/u);
  assert.match(componentSource, /movementShare/u);
  assert.match(componentSource, /percentageChange/u);
  assert.match(componentSource, /Andre registrerede dimensioner/u);
  assert.match(componentSource, /Dataene viser, hvor ændringen opstod/u);
  assert.match(componentSource, /ChangeIcon change=\{change\.absoluteChange\}/u);
  assert.match(componentSource, /stackActionOnMobile=\{preferredDrivers\.length > 1\}/u);
});

test("den tunge analysemotor aktiveres kun på Indsigter og genbruger deferred filtre", () => {
  assert.match(uploadSource, /activeView === "insights"[\s\S]*applyDashboardFilters\(allRows, deferredFilters, "month"\)/u);
  assert.match(uploadSource, /buildInsightAnalysis\(insightSourceRows/u);
  assert.match(uploadSource, /selectedMonths: deferredFilters\.month/u);
  assert.match(uploadSource, /totalRowCount: allRows\.length/u);
  assert.doesNotMatch(uploadSource, /activeView === "reports"/u);
});

test("rapporten viser kun tilgængelige evidence-baserede sektioner", () => {
  assert.match(componentSource, /analysis\.report\.sections\.filter\(\(section\) => section\.available\)/u);
  assert.match(componentSource, /Dokumenteret datagrundlag/u);
  assert.match(componentSource, /Drivere viser, hvor bevægelsen er registreret/u);
  assert.match(componentSource, /hasReportContent/u);
  assert.match(componentSource, /Seneste periode:/u);
});
