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

test("den samlede side har tilgængelige Indsigter/Rapport/Strategisk overblik-tabs med standardvisningen Indsigter", () => {
  assert.match(uploadSource, /useState<InsightsReportTab>\("insights"\)/u);
  assert.match(componentSource, /export type InsightsReportTab = "insights" \| "report" \| "strategy"/u);
  assert.match(componentSource, /id: "strategy", label: "Strategisk overblik"/u);
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
  assert.match(componentSource, /stackActionOnMobile=\{preferredDrivers\.length > 1 \|\| metricDimensions\.length > 1\}/u);
  assert.match(componentSource, /ariaLabel="Vælg dimension til driveranalyse"/u);
  assert.match(componentSource, /Andel af nettoændringen:/u);
  assert.match(componentSource, /Andel af absolut bevægelse:/u);
  assert.match(componentSource, /Øvrige \{omittedCount\} medlemmer/u);
  assert.match(componentSource, /Uændrede medlemmer/u);
  assert.match(componentSource, /Ingen positive bidrag i sammenligningsperioden\./u);
  assert.match(componentSource, /Ingen negative bidrag i sammenligningsperioden\./u);
  assert.doesNotMatch(componentSource, /Dokumenteret ændring i den sammenlignede periode\./u);
});

test("den tunge analysemotor aktiveres kun på Indsigter og genbruger deferred filtre", () => {
  assert.match(uploadSource, /comparisonSourceRows = useMemo\([\s\S]*applyDashboardFilters\(allRows, deferredFilters, "month"\)/u);
  assert.match(uploadSource, /activeView === "insights"[\s\S]*comparisonSourceRows/u);
  assert.match(uploadSource, /buildInsightAnalysis\(insightSourceRows/u);
  assert.match(uploadSource, /selectedMonths: deferredFilters\.month/u);
  assert.match(uploadSource, /totalRowCount: allRows\.length/u);
  assert.doesNotMatch(uploadSource, /activeView === "reports"/u);
  assert.match(componentSource, /buildStrategicAnalysis\(displayedAnalysis\)/u);
  assert.doesNotMatch(strategyEngineSource, /applyDashboardFilters|InsightSourceRow/u);
});

test("rapporten bruger et prioriteret, evidensbaseret beslutningsforløb", () => {
  assert.match(componentSource, /buildManagementReport\(analysis, analysisPreferences, targetStatuses\)/u);
  assert.match(componentSource, /report-section-\$\{section\.key\}/u);
  assert.match(componentSource, /hasReportContent/u);
  assert.match(componentSource, /Seneste periode:/u);
  assert.match(componentSource, /Ledelsesoverblik/u);
  assert.doesNotMatch(componentSource, /Executive snapshot/u);
  assert.match(strategyComponentSource, /eyebrow="Kort fortalt"/u);
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
  assert.match(componentSource, /Opdaterer strategisk overblik…/u);
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

test("rapporten har diskret semantisk hierarki uden kopieret strategisektion", () => {
  assert.match(componentSource, /sectionKey === "executive-summary"/u);
  assert.match(componentSource, /sectionKey === "assessment"/u);
  assert.match(componentSource, /sectionKey === "recommended-focus"/u);
  assert.match(componentSource, /sectionKey === "data-basis"/u);
  assert.match(componentSource, /data-report-tone=\{treatment\.tone\}/u);
  assert.doesNotMatch(componentSource, /StrategicReportSummary/u);
  assert.match(componentSource, /\{section\.scope\}/u);
  assert.match(globalStyles, /@page\s*\{\s*size: A4/u);
  assert.match(globalStyles, /body:has\(\[data-testid="management-report"\]\) \*\s*\{\s*visibility: hidden/u);
  assert.match(globalStyles, /break-inside: avoid-page/u);
  assert.match(componentSource, /report-summary-metrics/u);
  assert.match(componentSource, /<details className="report-evidence/u);
  assert.match(componentSource, /Kilde: \$\{analysis\.dataBasis\.sourceName\}/u);
  assert.match(componentSource, /Ref\.: \$\{fact\.id\}/u);
  assert.match(globalStyles, /section\[data-report-tone="focus"\]/u);
  assert.match(globalStyles, /\.report-evidence\s*\{\s*display: none !important/u);
});

test("Strategisk overblik adskiller interne data fra eksterne forhold og har tilgængelig dokumentation", () => {
  assert.match(componentSource, /title=\{activeTab === "insights"[\s\S]*"Strategisk overblik"/u);
  assert.match(strategyComponentSource, /eyebrow="Interne fund"/u);
  assert.match(strategyComponentSource, /Eksterne markedsforhold er ikke vurderet/u);
  assert.match(strategyComponentSource, /Overordnet scope: \{strategy\.dataBasis\.scopeLabel\}\. Hvert fund viser sin egen periode/u);
  assert.match(strategyComponentSource, /POSITIVE SIGNALER/u);
  assert.match(strategyComponentSource, /UDFORDRINGER/u);
  assert.match(strategyComponentSource, /RISICI OG EKSPONERINGER/u);
  assert.doesNotMatch(strategyComponentSource, /DATADREVNE MULIGHEDER|SWOT-baseret|TOWS/u);
  assert.match(strategyComponentSource, /Se dokumentation/u);
  assert.match(strategyComponentSource, /aria-expanded=\{expanded\}/u);
  assert.match(strategyComponentSource, /aria-controls=\{regionId\}/u);
  assert.match(strategyComponentSource, /role="region"/u);
  assert.match(strategyComponentSource, /lg:grid-cols-2/u);
  assert.match(strategyComponentSource, /testId="strategy-snapshot"/u);
  assert.match(strategyComponentSource, /positiveSignals\.slice\(0, 2\)/u);
  assert.doesNotMatch(strategyComponentSource, /line-clamp-2 text-xs leading-5 text-slate-500">\{finding\.description\}/u);
  assert.match(strategyComponentSource, /strategy\.findingsByQuadrant\.weakness\.slice\(0, 2\)/u);
  assert.match(strategyComponentSource, /\.slice\(0, 2\)/u);
  assert.match(strategyComponentSource, /strategicFocus\.slice\(0, 3\)/u);
  assert.match(strategyComponentSource, /DEFAULT_FINDING_COUNT = 3/u);
  assert.match(strategyComponentSource, /Vis alle \$\{formatDanishNumber\(findings\.length\)\}/u);
  assert.match(strategyComponentSource, /Vis færre/u);
  assert.match(strategyComponentSource, /aria-label="Dokumentationsmetadata"/u);
  assert.match(strategyComponentSource, /finding\.reliabilityBasis/u);
  assert.match(strategyComponentSource, /finding\.scopeLabel/u);
});

test("interne sammenhænge vises som undersøgelsesområder med synlig sporbarhed", () => {
  assert.match(strategyComponentSource, /title="Sammenhænge"/u);
  assert.match(strategyComponentSource, /beviser ikke årsagssammenhæng/u);
  assert.match(strategyComponentSource, /briefStrategicFocus\(proposal, findingById\)/u);
  assert.match(strategyComponentSource, /To positive signaler/u);
  assert.match(strategyComponentSource, /Positivt signal og eksponering/u);
  assert.match(strategyComponentSource, /Udfordring og positivt signal/u);
  assert.match(strategyComponentSource, /Udfordring og eksponering/u);
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

