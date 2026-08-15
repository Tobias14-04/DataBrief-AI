"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Gauge,
  Lightbulb,
  ListChecks,
  PackageCheck,
  Percent,
  SearchCheck,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  memo,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  CommandEmptyState,
  CommandPageIntro,
  CommandPanel,
  CompactKpiCard,
  commandSectionLabelClass,
  type CommandTone,
} from "@/components/command-center-ui";
import { PremiumSelect } from "@/components/premium-select";
import {
  formatDanishCurrency,
  formatDanishNumber,
  formatDanishPercent,
} from "@/lib/dashboard-insights";
import type {
  InsightAnalysis,
  InsightDriver,
  InsightDriverAnalysis,
  InsightMetricChange,
  InsightMetricKey,
  InsightObservation,
  InsightRecommendation,
  InsightReliability,
  InsightSnapshotItem,
  InsightTone,
} from "@/lib/insight-engine";

export type InsightsReportTab = "insights" | "report";

export type InsightsReportDashboardProps = {
  analysis: InsightAnalysis;
  activeTab: InsightsReportTab;
  onTabChange: (tab: InsightsReportTab) => void;
};

const metricIcons: Record<string, LucideIcon> = {
  revenue: CircleDollarSign,
  result: Gauge,
  grossProfit: TrendingUp,
  grossMargin: Percent,
  averagePrice: CircleDollarSign,
  costShare: Percent,
  costs: WalletCards,
  cost: WalletCards,
  units: PackageCheck,
};

function toCommandTone(tone: InsightTone): CommandTone {
  if (tone === "positive") return "positive";
  if (tone === "negative") return "warning";
  return "neutral";
}

function toneTextClass(tone: InsightTone) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-orange-700";
  return "text-slate-600";
}

function ChangeIcon({ change }: { change: number }) {
  const Icon = change > 0
    ? ArrowUpRight
    : change < 0
      ? ArrowDownRight
      : ArrowRight;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

function reliabilityLabel(reliability: InsightReliability) {
  if (reliability === "high") return "Højt analysegrundlag";
  if (reliability === "medium") return "Mellemstort analysegrundlag";
  return "Begrænset analysegrundlag";
}

function formatMetricDelta(metric: InsightMetricKey, value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  if (metric === "units") return `${prefix}${formatDanishNumber(absolute)}`;
  if (metric === "grossMargin" || metric === "costShare") {
    return `${prefix}${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 }).format(absolute * 100)} procentpoint`;
  }
  if (metric === "averagePrice") return `${prefix}${formatDanishCurrency(absolute)}`;
  return `${prefix}${formatDanishCurrency(absolute)}`;
}

function driverExplanation(driver: InsightDriverAnalysis) {
  const positive = driver.positiveDrivers[0]?.dimensionValue;
  const negative = driver.negativeDrivers[0]?.dimensionValue;
  if (driver.metric === "cost") {
    if (positive && negative) {
      return `De registrerede data viser især en omkostningsstigning i ${positive}, mens ${negative} havde det største registrerede omkostningsfald.`;
    }
    if (positive) {
      return `Den største registrerede omkostningsstigning findes i ${positive}.`;
    }
    if (negative) {
      return `Det største registrerede omkostningsfald findes i ${negative}.`;
    }
  }
  if (positive && negative) {
    return `De registrerede data viser især et positivt bidrag til ${driver.label.toLocaleLowerCase("da-DK")} fra ${positive}, mens ${negative} trak i modsat retning.`;
  }
  if (positive) {
    return `Det største registrerede positive bidrag til ${driver.label.toLocaleLowerCase("da-DK")} kommer fra ${positive}.`;
  }
  if (negative) {
    return `Det største registrerede negative bidrag til ${driver.label.toLocaleLowerCase("da-DK")} kommer fra ${negative}.`;
  }
  return `Der er ingen enkelt registreret ${driver.dimensionLabel.toLocaleLowerCase("da-DK")}, som kan fremhæves som driver.`;
}

function DashboardTabs({
  activeTab,
  onTabChange,
  insightsTabId,
  reportTabId,
  insightsPanelId,
  reportPanelId,
}: {
  activeTab: InsightsReportTab;
  onTabChange: (tab: InsightsReportTab) => void;
  insightsTabId: string;
  reportTabId: string;
  insightsPanelId: string;
  reportPanelId: string;
}) {
  const insightsRef = useRef<HTMLButtonElement>(null);
  const reportRef = useRef<HTMLButtonElement>(null);
  const tabs: Array<{
    id: InsightsReportTab;
    label: string;
    icon: LucideIcon;
    tabId: string;
    panelId: string;
  }> = [
    { id: "insights", label: "Indsigter", icon: BrainCircuit, tabId: insightsTabId, panelId: insightsPanelId },
    { id: "report", label: "Rapport", icon: FileText, tabId: reportTabId, panelId: reportPanelId },
  ];

  function selectTab(tab: InsightsReportTab, focus = false) {
    onTabChange(tab);
    if (focus) {
      window.requestAnimationFrame(() => {
        (tab === "insights" ? insightsRef : reportRef).current?.focus();
      });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const nextTab = event.key === "Home"
      ? tabs[0].id
      : event.key === "End"
        ? tabs.at(-1)?.id ?? "report"
        : tabs[(currentIndex + (event.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length].id;
    selectTab(nextTab, true);
  }

  return (
    <div
      role="tablist"
      aria-label="Vælg mellem indsigter og rapport"
      className="inline-grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm sm:w-auto"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={tab.id === "insights" ? insightsRef : reportRef}
            id={tab.tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tab.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={handleKeyDown}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 sm:min-w-[128px] ${
              selected
                ? "bg-[#0b263a] text-white shadow-[0_8px_20px_rgba(8,31,48,0.16)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0b1c2d]"
            }`}
          >
            <Icon className={`h-4 w-4 ${selected ? "text-cyan-300" : "text-slate-400"}`} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const ExecutiveSnapshot = memo(function ExecutiveSnapshot({
  items,
  changes,
}: {
  items: InsightSnapshotItem[];
  changes: InsightMetricChange[];
}) {
  if (!items.length) {
    return (
      <CommandPanel title="Executive snapshot" icon={Gauge}>
        <CommandEmptyState
          title="Ingen nøgletal i den aktuelle visning"
          message="Tilpas filtrene eller datagrundlaget for at vise et ledelsesoverblik."
        />
      </CommandPanel>
    );
  }

  return (
    <section aria-labelledby="executive-snapshot-title" data-testid="executive-snapshot">
      <div className="mb-3 flex items-end justify-between gap-4 px-0.5">
        <div>
          <p className={`${commandSectionLabelClass} text-brand-700`}>Aktuel visning</p>
          <h2 id="executive-snapshot-title" className="mt-1.5 text-xl font-semibold text-[#0b1c2d]">Executive snapshot</h2>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">Kun nøgletal med dokumenteret datagrundlag</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.slice(0, 5).map((item) => {
          const Icon = metricIcons[item.metric] ?? BarChart3;
          const latestChange = changes.find((change) => change.metric === item.metric);
          return (
            <CompactKpiCard
              key={item.evidenceId}
              label={item.label}
              value={item.formattedValue}
              detail={item.changeLabel
                ?? (latestChange?.changeLabel
                  ? `Seneste periode: ${latestChange.changeLabel}`
                  : "Ingen pålidelig sammenligning for nøgletallet")}
              icon={Icon}
              tone={toCommandTone(item.changeLabel ? item.tone : latestChange?.tone ?? "neutral")}
            />
          );
        })}
      </div>
    </section>
  );
});

function ChangesPanel({ changes }: { changes: InsightMetricChange[] }) {
  const visibleChanges = changes.slice(0, 5);
  const desktopGridClass = visibleChanges.length >= 5
    ? "xl:grid-cols-5"
    : visibleChanges.length === 4
      ? "xl:grid-cols-4"
      : "xl:grid-cols-3";
  return (
    <CommandPanel
      eyebrow="Dokumenterede bevægelser"
      title="Hvad er ændret?"
      description="De vigtigste ændringer i den valgte og filtrerede periode"
      icon={ListChecks}
      testId="insight-changes"
    >
      {changes.length ? (
        <ul className={`grid gap-px bg-slate-100 sm:grid-cols-2 ${desktopGridClass}`}>
          {visibleChanges.map((change) => (
            <li key={change.evidenceId} className="min-w-0 bg-white px-5 py-5 sm:px-6">
              <div className={`flex items-center gap-2 text-sm font-semibold ${toneTextClass(change.tone)}`}>
                <ChangeIcon change={change.absoluteChange} />
                <span className="truncate" title={change.label}>{change.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#0b1c2d]">
                {change.changeLabel ?? formatMetricDelta(change.metric, change.absoluteChange)}
              </p>
              <p className="mt-2 text-[13px] leading-5 text-slate-600">
                Dokumenteret ændring i den sammenlignede periode.
              </p>
              <p className="mt-3 text-[11px] font-medium text-slate-400">{change.comparisonLabel} · {reliabilityLabel(change.reliability)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <CommandEmptyState
          title="Ingen pålidelig periodeændring"
          message="Snapshot-værdierne kan vises, men datagrundlaget indeholder ikke en sammenlignelig tidligere periode."
        />
      )}
    </CommandPanel>
  );
}

function ContributionList({
  title,
  items,
  tone,
  metric,
}: {
  title: string;
  items: InsightDriver[];
  tone: "positive" | "negative";
  metric: InsightMetricKey;
}) {
  const maxContribution = Math.max(
    ...items.map((item) => item.movementShare),
    0,
  );
  const barClass = tone === "positive" ? "bg-emerald-500" : "bg-orange-500";
  const valueClass = tone === "positive" ? "text-emerald-700" : "text-orange-700";

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${barClass}`} aria-hidden="true" />
        <h3 className="text-[13px] font-semibold text-[#0b1c2d]">{title}</h3>
      </div>
      {items.length ? (
        <ol className="mt-4 space-y-4">
          {items.slice(0, 5).map((item, index) => {
            const contribution = item.movementShare;
            const width = maxContribution > 0
              ? Math.max(5, (contribution / maxContribution) * 100)
              : 5;
            return (
              <li key={`${item.dimensionValue}-${index}`} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5">
                <span className="text-[11px] font-semibold tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-slate-700" title={item.dimensionValue}>{item.dimensionValue}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
                        {item.percentageChange === null
                          ? "Procentændring skjult ved lille grundlag"
                          : `${item.percentageChange > 0 ? "+" : item.percentageChange < 0 ? "−" : ""}${formatDanishPercent(Math.abs(item.percentageChange))} mod forrige periode`}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-slate-400" aria-hidden="true">{formatDanishPercent(item.movementShare)} af bevægelsen</span>
                    <span className="sr-only">Andel af den samlede absolutte bevægelse: {(contribution * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} procent</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
                <span className={`max-w-[132px] truncate text-right text-[13px] font-semibold tabular-nums ${valueClass}`} title={formatMetricDelta(metric, item.absoluteChange)}>
                  {formatMetricDelta(metric, item.absoluteChange)}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-[13px] leading-5 text-slate-500">Ingen registrerede bidrag i denne retning.</p>
      )}
    </div>
  );
}

function DriverPanel({
  drivers,
  analysis,
}: {
  drivers: InsightDriverAnalysis[];
  analysis: InsightAnalysis;
}) {
  const preferredDrivers = useMemo(() => {
    const dimensionPriority = { category: 0, product: 1, channel: 2, region: 3 } as const;
    const byMetric = new Map<InsightMetricKey, InsightDriverAnalysis>();
    [...drivers]
      .sort((left, right) => dimensionPriority[left.dimension] - dimensionPriority[right.dimension])
      .forEach((driver) => {
        if (!byMetric.has(driver.metric)) byMetric.set(driver.metric, driver);
      });
    return Array.from(byMetric.values());
  }, [drivers]);
  const [selectedMetric, setSelectedMetric] = useState<string>(preferredDrivers[0]?.metric ?? "");
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const availableMetricIds = useMemo<string[]>(() => preferredDrivers.map((driver) => driver.metric), [preferredDrivers]);
  const resolvedMetric = availableMetricIds.includes(selectedMetric)
    ? selectedMetric
    : availableMetricIds[0] ?? "";
  const activeDriver = preferredDrivers.find((driver) => driver.metric === resolvedMetric) ?? null;
  const explanationId = useId();

  function changeMetric(metric: string) {
    setSelectedMetric(metric);
    setExpandedMetric(null);
  }

  if (!activeDriver) {
    return (
      <CommandPanel
        eyebrow="Driveranalyse"
        title="Hvad driver udviklingen?"
        description="Bidrag beregnes ud fra faktiske periodedifferencer"
        icon={SearchCheck}
        testId="driver-analysis"
      >
        <CommandEmptyState
          title="Ingen dokumenterede drivere"
          message="Der kræves mindst to sammenlignelige perioder og en registreret dimension som produkt, kategori, kanal eller region."
        />
      </CommandPanel>
    );
  }

  const expanded = expandedMetric === activeDriver.metric;
  const isCostDriver = activeDriver.metric === "cost";
  const driverOptions = preferredDrivers.map((driver) => ({ value: driver.metric, label: driver.label }));
  const driverEvidence = analysis.evidence.find((item) => item.id === activeDriver.evidenceId);
  const relatedDimensions = analysis.driverAnalyses
    .filter((driver) => driver.metric === activeDriver.metric && driver.dimension !== activeDriver.dimension)
    .map((driver) => ({
      dimension: driver.dimensionLabel,
      item: [...driver.positiveDrivers, ...driver.negativeDrivers]
        .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))[0],
    }))
    .filter((entry): entry is { dimension: string; item: InsightDriver } => Boolean(entry.item));

  return (
    <CommandPanel
      eyebrow="Driveranalyse"
      title="Hvad driver udviklingen?"
      description="Bidragene er beregnet fra registrerede periodedifferencer — ikke antagede årsager"
      icon={SearchCheck}
      testId="driver-analysis"
      action={preferredDrivers.length > 1 ? (
        <PremiumSelect
          value={activeDriver.metric}
          options={driverOptions}
          onChange={changeMetric}
          ariaLabel="Vælg nøgletal til driveranalyse"
          align="right"
          className="min-w-0 flex-1 sm:w-[190px] sm:flex-none"
        />
      ) : null}
      stackActionOnMobile={preferredDrivers.length > 1}
    >
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fcfd_0%,#ffffff_60%)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Samlet ændring · {activeDriver.label}</p>
            <p className="mt-1.5 text-[28px] font-semibold leading-none tabular-nums text-[#0b1c2d]">{formatMetricDelta(activeDriver.metric, activeDriver.totalChange)}</p>
            <p className="mt-2 text-xs text-slate-500">{activeDriver.comparisonPeriod} · fordelt efter {activeDriver.dimensionLabel.toLocaleLowerCase("da-DK")}</p>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={explanationId}
            onClick={() => setExpandedMetric(expanded ? null : activeDriver.metric)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-[13px] font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
          >
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            Forklar udviklingen
          </button>
        </div>
      </div>

      <div className="grid gap-4 bg-[#f7fafb] p-4 sm:p-5 xl:grid-cols-2">
        <ContributionList
          title={isCostDriver ? "Største omkostningsstigninger" : "Største positive drivere"}
          items={activeDriver.positiveDrivers}
          tone={isCostDriver ? "negative" : "positive"}
          metric={activeDriver.metric}
        />
        <ContributionList
          title={isCostDriver ? "Største omkostningsfald" : "Største negative drivere"}
          items={activeDriver.negativeDrivers}
          tone={isCostDriver ? "positive" : "negative"}
          metric={activeDriver.metric}
        />
      </div>

      <div
        id={explanationId}
        hidden={!expanded}
        className="border-t border-slate-200 bg-[#0b263a] px-5 py-5 text-white sm:px-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-300">Dokumenteret forklaring</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">{driverExplanation(activeDriver)}</p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Dataene viser, hvor ændringen opstod, men ikke nødvendigvis den bagvedliggende forretningsmæssige årsag.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-semibold text-white">Understøttende fakta</p>
            {driverEvidence?.supportingFacts.length ? (
              <ul className="mt-3 space-y-2">
                {driverEvidence.supportingFacts.slice(0, 4).map((fact, index) => (
                  <li key={`${activeDriver.metric}-fact-${index}`} className="flex gap-2 text-xs leading-5 text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-xs leading-5 text-slate-400">Ingen yderligere fakta er nødvendige for denne forklaring.</p>}
            {relatedDimensions.length ? (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-[11px] font-semibold text-white">Andre registrerede dimensioner</p>
                <ul className="mt-2 space-y-1.5">
                  {relatedDimensions.map(({ dimension, item }) => (
                    <li key={`${activeDriver.metric}-${dimension}`} className="text-[11px] leading-5 text-slate-300">
                      {dimension}: {item.dimensionValue} ({formatMetricDelta(activeDriver.metric, item.absoluteChange)})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-3 border-t border-white/10 pt-3 text-[11px] font-medium text-cyan-200">
              {reliabilityLabel(driverEvidence?.reliability ?? analysis.reliability)}
            </p>
          </div>
        </div>
      </div>
    </CommandPanel>
  );
}

function ObservationCard({ observation }: { observation: InsightObservation }) {
  return (
    <li className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_5px_16px_rgba(16,32,51,0.04)] sm:p-5">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
        observation.tone === "positive"
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : observation.tone === "negative"
            ? "border-orange-100 bg-orange-50 text-orange-700"
            : "border-cyan-100 bg-cyan-50 text-cyan-700"
      }`}>
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#0b1c2d]">{observation.title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-slate-600">{observation.text}</p>
      </div>
    </li>
  );
}

function AttentionAndFocus({
  observations,
  recommendations,
}: {
  observations: InsightObservation[];
  recommendations: InsightRecommendation[];
}) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <CommandPanel
        eyebrow="Prioriterede observationer"
        title="Det bør du bemærke"
        description="Observationerne er prioriteret efter dokumenteret økonomisk betydning"
        icon={Lightbulb}
      >
        {observations.length ? (
          <ul className="grid gap-3 bg-[#f7fafb] p-4 sm:grid-cols-2 sm:p-5">
            {observations.slice(0, 5).map((observation) => (
              <ObservationCard key={observation.id} observation={observation} />
            ))}
          </ul>
        ) : (
          <CommandEmptyState
            title="Ingen væsentlige observationer"
            message="Der er ikke dokumenteret ændringer, som bør fremhæves særskilt i den aktuelle visning."
          />
        )}
      </CommandPanel>

      <section className="premium-panel-dark overflow-hidden rounded-xl text-white" aria-labelledby="recommended-focus-title">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-300">Næste analysetrin</p>
          <div className="mt-1.5 flex items-center justify-between gap-4">
            <h2 id="recommended-focus-title" className="text-lg font-semibold">Anbefalet fokus</h2>
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-cyan-200">
              <Target className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
        {recommendations.length ? (
          <ol className="divide-y divide-white/[0.08] px-5 sm:px-6">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <li key={recommendation.id} className="grid grid-cols-[26px_minmax(0,1fr)] gap-3 py-4 first:pt-5 last:pb-5">
                <span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-cyan-300/10 text-[11px] font-semibold text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-6 text-slate-100">{recommendation.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-5 py-8 text-center sm:px-6">
            <ShieldCheck className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
            <p className="mt-2 text-sm leading-6 text-slate-300">Datagrundlaget giver ikke anledning til et specifikt undersøgelsespunkt.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function InsightsView({ analysis }: { analysis: InsightAnalysis }) {
  const driverStateKey = analysis.driverAnalyses.map((driver) => {
    const leadingDriver = [...driver.positiveDrivers, ...driver.negativeDrivers]
      .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))[0];
    return `${driver.evidenceId}:${driver.totalChange}:${leadingDriver?.dimensionValue ?? "none"}:${leadingDriver?.absoluteChange ?? 0}`;
  }).join("|");
  return (
    <div className="space-y-6">
      <ExecutiveSnapshot items={analysis.snapshot} changes={analysis.changes} />
      <ChangesPanel changes={analysis.changes} />
      <DriverPanel key={driverStateKey} drivers={analysis.driverAnalyses} analysis={analysis} />
      <AttentionAndFocus
        observations={analysis.observations}
        recommendations={analysis.recommendations}
      />
    </div>
  );
}

function ReportView({ analysis }: { analysis: InsightAnalysis }) {
  const sections = analysis.report.sections.filter((section) => section.available);
  const hasReportContent = sections.some((section) => section.key !== "data-basis");
  const reportSubtitle = analysis.dataBasis.scopeMode === "all-filtered-periods"
    ? `${analysis.dataBasis.scopeLabel}.${analysis.currentPeriod && analysis.comparisonPeriod
        ? ` Udviklingen sammenlignes fra ${analysis.comparisonPeriod.label} til ${analysis.currentPeriod.label}.`
        : " Der findes ingen tidligere sammenlignelig periode."}`
    : analysis.currentPeriod
      ? analysis.comparisonPeriod
        ? `${analysis.currentPeriod.label} sammenlignet med ${analysis.comparisonPeriod.label}.`
        : `${analysis.currentPeriod.label}. Der findes ingen tidligere sammenlignelig periode.`
      : "Den aktuelle filtrerede visning.";
  const dataBasisSummary = `Analysen omfatter ${formatDanishNumber(analysis.dataBasis.rowCount)} af ${formatDanishNumber(analysis.dataBasis.totalRowCount)} rækker fra ${analysis.dataBasis.sourceName}.${
    analysis.dataBasis.activeFilterLabels.length
      ? ` Aktive filtre: ${analysis.dataBasis.activeFilterLabels.join(", ")}.`
      : ""
  }`;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <article className="premium-panel overflow-hidden rounded-xl" aria-labelledby="management-report-title" data-testid="management-report">
        <header className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_48%,#eefafd)] px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className={`${commandSectionLabelClass} text-brand-700`}>Ledelsesrapport</p>
              <h2 id="management-report-title" className="mt-2 text-2xl font-semibold tracking-[-0.015em] text-[#0b1c2d]">
                {analysis.report.title || "Ledelsesrapport"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{reportSubtitle}</p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm">
              <BookOpenText className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </header>

        {hasReportContent ? (
          <div className="divide-y divide-slate-100">
            {sections.map((section, index) => (
              <section key={section.key} aria-labelledby={`report-section-${section.key}`} className="px-5 py-6 sm:px-7">
                <div className="grid gap-4 sm:grid-cols-[34px_minmax(0,1fr)]">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-[11px] font-semibold text-cyan-800" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h3 id={`report-section-${section.key}`} className="text-base font-semibold text-[#0b1c2d]">{section.title}</h3>
                    <div className="mt-2 space-y-2.5 text-sm leading-6 text-slate-700">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${section.key}-paragraph-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <CommandEmptyState
            title="Rapporten kan ikke dannes endnu"
            message="Der mangler et tilstrækkeligt datagrundlag til en dokumenteret ledelsesrapport."
          />
        )}
      </article>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="premium-panel-dark rounded-xl p-5 text-white" aria-labelledby="report-basis-title">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 id="report-basis-title" className="mt-4 text-base font-semibold">Dokumenteret datagrundlag</h2>
          <p className="mt-2 text-[13px] leading-6 text-slate-300">
            {dataBasisSummary}
          </p>
          <p className="mt-4 border-t border-white/10 pt-4 text-xs font-medium leading-5 text-cyan-200">
            {reliabilityLabel(analysis.reliability)}
          </p>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700">
              <SearchCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#0b1c2d]">Sådan skal rapporten læses</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Drivere viser, hvor bevægelsen er registreret. De dokumenterer ikke i sig selv den bagvedliggende forretningsmæssige årsag.
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

export const InsightsReportDashboard = memo(function InsightsReportDashboard({
  analysis,
  activeTab,
  onTabChange,
}: InsightsReportDashboardProps) {
  const idPrefix = useId();
  const insightsTabId = `${idPrefix}-insights-tab`;
  const reportTabId = `${idPrefix}-report-tab`;
  const insightsPanelId = `${idPrefix}-insights-panel`;
  const reportPanelId = `${idPrefix}-report-panel`;

  return (
    <section className="min-w-0 space-y-6 min-[1360px]:col-span-2" data-testid="insights-report-dashboard">
      <CommandPageIntro
        eyebrow={activeTab === "insights" ? "Beslutningsgrundlag" : "Aktuel rapport"}
        title={activeTab === "insights" ? "Indsigter" : "Ledelsesrapport"}
        description={activeTab === "insights"
          ? "Forstå udviklingen, find de vigtigste drivere og se, hvad der bør undersøges."
          : "Læs en kortfattet ledelsesrapport baseret på den valgte periode og de aktive filtre."}
        action={(
          <DashboardTabs
            activeTab={activeTab}
            onTabChange={onTabChange}
            insightsTabId={insightsTabId}
            reportTabId={reportTabId}
            insightsPanelId={insightsPanelId}
            reportPanelId={reportPanelId}
          />
        )}
      />

      {activeTab === "insights" ? (
        <div
          id={insightsPanelId}
          role="tabpanel"
          aria-labelledby={insightsTabId}
          tabIndex={0}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4"
        >
          <InsightsView analysis={analysis} />
        </div>
      ) : (
        <div
          id={reportPanelId}
          role="tabpanel"
          aria-labelledby={reportTabId}
          tabIndex={0}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4"
        >
          <ReportView analysis={analysis} />
        </div>
      )}
    </section>
  );
});
