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
const controlBarSource = readFileSync(
  new URL("../components/dashboard-control-bar.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../app/globals.css", import.meta.url),
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

test("filteropdateringer bevarer eksisterende data og viser kun forsinket status", () => {
  assert.match(uploadSource, /isUpdating=\{isFilterUpdatePending\}/u);
  assert.match(componentSource, /useDelayedUpdateStatus\(isUpdating/u);
  assert.match(componentSource, /delay = 130/u);
  assert.match(componentSource, /displayedAnalysis/u);
  assert.match(componentSource, /fading-out/u);
  assert.match(componentSource, /fading-in/u);
  assert.match(componentSource, /aria-busy=\{isUpdating \|\| isSwapping\}/u);
  assert.match(componentSource, /Opdaterer indsigter…/u);
  assert.match(componentSource, /Opdaterer rapport…/u);
  assert.match(controlBarSource, /setShowUpdateStatus/u);
  assert.match(controlBarSource, /window\.setTimeout\(\(\) => setShowUpdateStatus\(true\), 130\)/u);
  assert.match(controlBarSource, /w-\[142px\]/u);
});

test("KPI'er, ændringer og drivere bruger billige CSS-overgange uden sektions-remount", () => {
  assert.match(componentSource, /SmoothMetricValue/u);
  assert.match(componentSource, /insight-driver-bar/u);
  assert.match(componentSource, /key=\{item\.evidenceId\}/u);
  assert.doesNotMatch(componentSource, /<DriverPanel key=/u);
  assert.match(globalStyles, /\.insight-data-region-out/u);
  assert.match(globalStyles, /\.insight-data-region-in/u);
  assert.match(globalStyles, /\.insight-driver-bar[\s\S]*width 240ms/u);
  assert.match(globalStyles, /prefers-reduced-motion: reduce[\s\S]*\.insight-driver-bar[\s\S]*transition: none/u);
});

test("rapporten har diskret semantisk hierarki for resume, risici, muligheder, fokus og datagrundlag", () => {
  assert.match(componentSource, /sectionKey === "executive-summary"/u);
  assert.match(componentSource, /sectionKey === "risks"/u);
  assert.match(componentSource, /sectionKey === "opportunities"/u);
  assert.match(componentSource, /sectionKey === "recommended-focus"/u);
  assert.match(componentSource, /sectionKey === "data-basis"/u);
  assert.match(componentSource, /data-report-tone=\{treatment\.tone\}/u);
});
