import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("../components/insights-report-dashboard.tsx", import.meta.url),
  "utf8",
);
const strategyComponentSource = readFileSync(
  new URL("../components/strategy-dashboard.tsx", import.meta.url),
  "utf8",
);
const strategyEngineSource = readFileSync(
  new URL("../lib/strategy-engine.ts", import.meta.url),
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

test("den samlede side har tilgængelige Indsigter/Rapport/Strategi-tabs med standardvisningen Indsigter", () => {
  assert.match(uploadSource, /useState<InsightsReportTab>\("insights"\)/u);
  assert.match(componentSource, /export type InsightsReportTab = "insights" \| "report" \| "strategy"/u);
  assert.match(componentSource, /id: "strategy", label: "Strategi"/u);
  assert.match(componentSource, /role="tablist"/u);
  assert.match(componentSource, /role="tab"/u);
  assert.match(componentSource, /aria-selected=\{selected\}/u);
  assert.match(componentSource, /aria-controls=\{tab\.panelId\}/u);
  assert.match(componentSource, /ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/u);
  assert.match(componentSource, /currentIndex[\s\S]*% tabs\.length/u);
  assert.match(componentSource, /role="tabpanel"[\s\S]*strategyPanelId/u);
  assert.match(componentSource, /hidden=\{activeTab !== "insights"\}/u);
  assert.match(componentSource, /hidden=\{activeTab !== "report"\}/u);
  assert.match(componentSource, /hidden=\{activeTab !== "strategy"\}/u);
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
  assert.match(componentSource, /Ingen positive bidrag i sammenligningsperioden\./u);
  assert.match(componentSource, /Ingen negative bidrag i sammenligningsperioden\./u);
  assert.doesNotMatch(componentSource, /Dokumenteret ændring i den sammenlignede periode\./u);
});

test("den tunge analysemotor aktiveres kun på Indsigter og genbruger deferred filtre", () => {
  assert.match(uploadSource, /activeView === "insights"[\s\S]*applyDashboardFilters\(allRows, deferredFilters, "month"\)/u);
  assert.match(uploadSource, /buildInsightAnalysis\(insightSourceRows/u);
  assert.match(uploadSource, /selectedMonths: deferredFilters\.month/u);
  assert.match(uploadSource, /totalRowCount: allRows\.length/u);
  assert.doesNotMatch(uploadSource, /activeView === "reports"/u);
  assert.match(componentSource, /buildStrategicAnalysis\(displayedAnalysis\)/u);
  assert.doesNotMatch(strategyEngineSource, /applyDashboardFilters|InsightSourceRow/u);
});

test("rapporten viser kun tilgængelige evidence-baserede sektioner", () => {
  assert.match(componentSource, /analysis\.report\.sections\.filter\(\(section\) => section\.available\)/u);
  assert.match(componentSource, /Dokumenteret datagrundlag/u);
  assert.match(componentSource, /Drivere viser, hvor bevægelsen er registreret/u);
  assert.match(componentSource, /hasReportContent/u);
  assert.match(componentSource, /Seneste periode:/u);
  assert.match(componentSource, /Ledelsesoverblik/u);
  assert.doesNotMatch(componentSource, /Executive snapshot/u);
  assert.match(strategyComponentSource, /eyebrow="Strategisk overblik"/u);
  assert.doesNotMatch(strategyComponentSource, /Strategisk snapshot/u);
  assert.match(strategyEngineSource, /bidrog til \$\{movement\}/u);
  assert.doesNotMatch(strategyEngineSource, /bidrager positivt til/u);
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
  assert.match(componentSource, /Opdaterer strategisk opsamling…/u);
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
  assert.match(componentSource, /StrategicReportSummary/u);
  assert.match(componentSource, /section\.key === "recommended-focus"[\s\S]*kind: "strategy"/u);
});

test("Strategi-viewet adskiller interne data fra eksterne forhold og har tilgængelig dokumentation", () => {
  assert.match(componentSource, /title=\{activeTab === "insights"[\s\S]*"Strategisk opsamling"/u);
  assert.match(strategyComponentSource, /SWOT-baseret strategisk opsamling/u);
  assert.match(strategyComponentSource, /Eksterne markedsforhold indgår ikke/u);
  assert.match(strategyComponentSource, /Strategisk datagrundlag: \{strategy\.dataBasis\.scopeLabel\}/u);
  assert.match(strategyComponentSource, /STYRKER/u);
  assert.match(strategyComponentSource, /SVAGHEDER/u);
  assert.match(strategyComponentSource, /DATADREVNE MULIGHEDER/u);
  assert.match(strategyComponentSource, /DATADREVNE RISICI/u);
  assert.match(strategyComponentSource, /Se dokumentation/u);
  assert.match(strategyComponentSource, /aria-expanded=\{expanded\}/u);
  assert.match(strategyComponentSource, /aria-controls=\{regionId\}/u);
  assert.match(strategyComponentSource, /role="region"/u);
  assert.match(strategyComponentSource, /lg:grid-cols-2/u);
  assert.match(strategyComponentSource, /testId="strategy-snapshot"/u);
  assert.match(strategyComponentSource, /strategy\.findingsByQuadrant\.strength\.slice\(0, 2\)/u);
  assert.match(strategyComponentSource, /strategy\.findingsByQuadrant\.weakness\.slice\(0, 2\)/u);
  assert.match(strategyComponentSource, /\.slice\(0, 2\)/u);
  assert.match(strategyComponentSource, /strategicFocus\.slice\(0, 3\)/u);
  assert.match(strategyComponentSource, /DEFAULT_FINDING_COUNT = 3/u);
  assert.match(strategyComponentSource, /Vis alle \$\{formatDanishNumber\(findings\.length\)\}/u);
  assert.match(strategyComponentSource, /Vis færre/u);
  assert.match(strategyComponentSource, /aria-label="Dokumentationsmetadata"/u);
});

test("TOWS vises automatisk som konkrete undersøgelsesområder med synlig sporbarhed", () => {
  assert.match(strategyComponentSource, /Strategiske kombinationer/u);
  assert.match(strategyComponentSource, /områder, der kan undersøges nærmere/u);
  assert.match(strategyComponentSource, /SO · Styrker \+ muligheder/u);
  assert.match(strategyComponentSource, /ST · Styrker \+ risici/u);
  assert.match(strategyComponentSource, /WO · Svagheder \+ muligheder/u);
  assert.match(strategyComponentSource, /WT · Svagheder \+ risici/u);
  assert.match(strategyComponentSource, /proposal\.sourceFindingIds\.length/u);
  assert.match(strategyComponentSource, /proposal\.evidenceIds\.length/u);
  assert.match(strategyEngineSource, /seenEvidencePairs/u);
  assert.match(strategyEngineSource, /seenTitlePairs/u);
  assert.match(strategyComponentSource, /self-start overflow-hidden rounded-xl/u);
});

test("den fælles periodemenu sorterer kun valgmulighederne og viser år som diskrete grupper", () => {
  assert.match(controlBarSource, /buildPeriodMenuOptions\(options\)/u);
  assert.match(controlBarSource, /\{allLabels\[field\]\}/u);
  assert.match(controlBarSource, /option\.year \?\? "Andre perioder"/u);
  assert.match(uploadSource, /buildPeriodMenuOptions\(monthOptions\)/u);
});

