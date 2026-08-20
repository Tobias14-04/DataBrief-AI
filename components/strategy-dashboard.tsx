"use client";

import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Info,
  Lightbulb,
  Link2,
  ShieldAlert,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import {
  CommandPanel,
  commandSectionLabelClass,
} from "@/components/command-center-ui";
import {
  formatDanishCurrency,
  formatDanishNumber,
  formatDanishPercent,
} from "@/lib/dashboard-insights";
import type { StrategicAnalysis } from "@/lib/strategy-engine";

type QuadrantKey = "strength" | "weakness" | "opportunity" | "threat";
type TowsType = "so" | "st" | "wo" | "wt";
type StrategicFinding = StrategicAnalysis["findingsByQuadrant"][QuadrantKey][number];
type TowsProposal = StrategicAnalysis["tows"][number];

export type StrategyDashboardProps = {
  strategy: StrategicAnalysis;
};

type AccentStyle = {
  bar: string;
  icon: string;
  label: string;
};

type QuadrantDefinition = AccentStyle & {
  key: QuadrantKey;
  title: string;
  description: string;
  emptyMessage: string;
  iconComponent: LucideIcon;
};

type TowsDefinition = AccentStyle & {
  type: TowsType;
  title: string;
  description: string;
  emptyMessage: string;
};

const EXTERNAL_CONTEXT_NOTICE =
  "Muligheder og risici er udledt af det registrerede datagrundlag. Eksterne markedsforhold indgår ikke, medmindre de findes i datasættet.";
const DEFAULT_FINDING_COUNT = 3;

const quadrantDefinitions: readonly QuadrantDefinition[] = [
  {
    key: "strength",
    title: "STYRKER",
    description: "Dokumenterede interne fordele",
    emptyMessage: "Ingen robuste styrker identificeret i den aktuelle visning.",
    iconComponent: ShieldCheck,
    bar: "bg-emerald-500",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    label: "text-emerald-700",
  },
  {
    key: "weakness",
    title: "SVAGHEDER",
    description: "Dokumenterede interne begrænsninger",
    emptyMessage: "Ingen robuste svagheder identificeret i den aktuelle visning.",
    iconComponent: AlertTriangle,
    bar: "bg-orange-400",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    label: "text-orange-700",
  },
  {
    key: "opportunity",
    title: "DATADREVNE MULIGHEDER",
    description: "Muligheder udledt af registrerede mønstre",
    emptyMessage: "Ingen robuste datadrevne muligheder identificeret i den aktuelle visning.",
    iconComponent: Lightbulb,
    bar: "bg-cyan-500",
    icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
    label: "text-cyan-700",
  },
  {
    key: "threat",
    title: "DATADREVNE RISICI",
    description: "Risici udledt af registrerede mønstre",
    emptyMessage: "Ingen robuste datadrevne risici identificeret i den aktuelle visning.",
    iconComponent: ShieldAlert,
    bar: "bg-orange-600",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    label: "text-orange-700",
  },
] as const;

const towsDefinitions: readonly TowsDefinition[] = [
  {
    type: "so",
    title: "SO · Styrker + muligheder",
    description: "Brug styrker til at udnytte muligheder.",
    emptyMessage: "Ingen robust SO-kombination kan udledes af den aktuelle visning.",
    bar: "bg-emerald-500",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    label: "text-emerald-700",
  },
  {
    type: "st",
    title: "ST · Styrker + risici",
    description: "Brug styrker til at reducere risici.",
    emptyMessage: "Ingen robust ST-kombination kan udledes af den aktuelle visning.",
    bar: "bg-cyan-500",
    icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
    label: "text-cyan-700",
  },
  {
    type: "wo",
    title: "WO · Svagheder + muligheder",
    description: "Brug muligheder til at adressere svagheder.",
    emptyMessage: "Ingen robust WO-kombination kan udledes af den aktuelle visning.",
    bar: "bg-cyan-500",
    icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
    label: "text-cyan-700",
  },
  {
    type: "wt",
    title: "WT · Svagheder + risici",
    description: "Reducer eksponering mod kombinerede svagheder og risici.",
    emptyMessage: "Ingen robust WT-kombination kan udledes af den aktuelle visning.",
    bar: "bg-orange-500",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    label: "text-orange-700",
  },
] as const;

const metricLabels: Record<string, string> = {
  revenue: "Omsætning",
  result: "Resultat",
  grossProfit: "Dækningsbidrag",
  grossMargin: "Dækningsgrad",
  averagePrice: "Gennemsnitspris",
  costShare: "Omkostningsandel",
  cost: "Omkostninger",
  costs: "Omkostninger",
  units: "Enheder",
};

const dimensionLabels: Record<string, string> = {
  category: "Kategori",
  product: "Produkt",
  channel: "Kanal",
  region: "Region",
  period: "Periode",
};

const reliabilityLabels: Record<string, string> = {
  high: "Høj",
  medium: "Mellem",
  low: "Begrænset",
};

function humanizeKey(value: string) {
  const spaced = value
    .replace(/([a-zæøå])([A-ZÆØÅ])/gu, "$1 $2")
    .replace(/[_-]+/gu, " ")
    .trim();
  if (!spaced) return value;
  return `${spaced.charAt(0).toLocaleUpperCase("da-DK")}${spaced.slice(1)}`;
}

function metricLabel(metric: string) {
  return metricLabels[metric] ?? humanizeKey(metric);
}

function dimensionLabel(dimension: string) {
  return dimensionLabels[dimension] ?? humanizeKey(dimension);
}

function reliabilityLabel(reliability: string) {
  return reliabilityLabels[reliability] ?? humanizeKey(reliability);
}

function reliabilityClass(reliability: string) {
  if (reliability === "high") return "text-emerald-700";
  if (reliability === "low") return "text-orange-700";
  return "text-cyan-700";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMetricValue(metric: string | null | undefined, value: number) {
  if (metric === "grossMargin" || metric === "costShare") {
    return formatDanishPercent(value);
  }
  if (metric === "units") return formatDanishNumber(value);
  if (
    metric === "revenue"
    || metric === "result"
    || metric === "grossProfit"
    || metric === "averagePrice"
    || metric === "cost"
    || metric === "costs"
  ) {
    return formatDanishCurrency(value);
  }
  return formatDanishNumber(value);
}

function formatSignedMetricValue(metric: string | null | undefined, value: number) {
  if (value === 0) return formatMetricValue(metric, value);
  return `${value > 0 ? "+" : "−"}${formatMetricValue(metric, Math.abs(value))}`;
}

function formatSignedPercent(value: number) {
  if (value === 0) return formatDanishPercent(value);
  return `${value > 0 ? "+" : "−"}${formatDanishPercent(Math.abs(value))}`;
}

function formatSignedPercentagePoints(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  const formatted = new Intl.NumberFormat("da-DK", { maximumFractionDigits: 1 })
    .format(Math.abs(value) * 100);
  return `${prefix}${formatted} procentpoint`;
}

function MetadataItem({
  label,
  value,
  valueClassName = "text-slate-700",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200/90 bg-slate-50/75 px-2.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className={`mt-0.5 truncate text-xs font-semibold ${valueClassName}`} title={value}>{value}</dd>
    </div>
  );
}

function SnapshotColumn({
  title,
  findings,
  emptyMessage,
}: {
  title: string;
  findings: readonly StrategicFinding[];
  emptyMessage: string;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</h3>
      {findings.length ? (
        <ul className="mt-2.5 space-y-2.5">
          {findings.map((finding) => (
            <li key={finding.id} className="min-w-0 border-l-2 border-cyan-200 pl-3">
              <p className="text-[13px] font-semibold leading-5 text-[#0b1c2d]">{finding.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{finding.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-xs leading-5 text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
}

const StrategicSnapshot = memo(function StrategicSnapshot({
  strategy,
}: {
  strategy: StrategicAnalysis;
}) {
  const opportunityAndRisk = useMemo(
    () => [
      ...strategy.findingsByQuadrant.opportunity,
      ...strategy.findingsByQuadrant.threat,
    ]
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id, "da-DK"))
      .slice(0, 2),
    [strategy.findingsByQuadrant.opportunity, strategy.findingsByQuadrant.threat],
  );
  const focusAreas = strategy.reportSummary.strategicFocus.slice(0, 3);

  return (
    <CommandPanel
      eyebrow="Strategisk overblik"
      title="Vigtigste dokumenterede fokus"
      description="Et kort overblik over de højest prioriterede fund i den aktuelle visning"
      icon={CircleDot}
      tone="neutral"
      testId="strategy-snapshot"
    >
      <div className="grid min-w-0 items-start gap-3 bg-[#f7fafb] p-4 sm:p-5 lg:grid-cols-2 xl:grid-cols-4">
        <SnapshotColumn
          title="Styrker"
          findings={strategy.findingsByQuadrant.strength.slice(0, 2)}
          emptyMessage="Ingen robuste styrker i den aktuelle visning."
        />
        <SnapshotColumn
          title="Svagheder"
          findings={strategy.findingsByQuadrant.weakness.slice(0, 2)}
          emptyMessage="Ingen robuste svagheder i den aktuelle visning."
        />
        <SnapshotColumn
          title="Muligheder og risici"
          findings={opportunityAndRisk}
          emptyMessage="Ingen robuste muligheder eller risici i den aktuelle visning."
        />
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            Anbefalet fokus
          </h3>
          {focusAreas.length ? (
            <ol className="mt-2.5 space-y-2.5">
              {focusAreas.map((proposal, index) => (
                <li key={proposal.id} className="flex gap-2.5 text-xs leading-5 text-slate-600">
                  <span className="grid h-5 min-w-5 place-items-center rounded bg-slate-100 text-[10px] font-semibold tabular-nums text-slate-500">
                    {index + 1}
                  </span>
                  <span className="line-clamp-2">{proposal.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2.5 text-xs leading-5 text-slate-500">
              Ingen dokumenteret strategisk kombination i den aktuelle visning.
            </p>
          )}
        </section>
      </div>
    </CommandPanel>
  );
});

const FindingDocumentation = memo(function FindingDocumentation({
  finding,
  regionId,
  labelledBy,
  hidden,
}: {
  finding: StrategicFinding;
  regionId: string;
  labelledBy: string;
  hidden: boolean;
}) {
  const measurements = [
    isFiniteNumber(finding.value)
      ? { label: "Aktuel værdi", value: formatMetricValue(finding.metric, finding.value) }
      : null,
    isFiniteNumber(finding.comparisonValue)
      ? { label: "Sammenligningsværdi", value: formatMetricValue(finding.metric, finding.comparisonValue) }
      : null,
    isFiniteNumber(finding.absoluteChange) && !isFiniteNumber(finding.percentagePointChange)
      ? { label: "Absolut ændring", value: formatSignedMetricValue(finding.metric, finding.absoluteChange) }
      : null,
    isFiniteNumber(finding.percentagePointChange)
      ? { label: "Ændring", value: formatSignedPercentagePoints(finding.percentagePointChange) }
      : null,
    isFiniteNumber(finding.percentageChange)
      ? { label: "Relativ ændring", value: formatSignedPercent(finding.percentageChange) }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <div
      id={regionId}
      role="region"
      aria-labelledby={labelledBy}
      hidden={hidden}
      className="mt-3 rounded-lg border border-cyan-100 bg-[#f8fbfc] p-4"
    >
      <dl className="grid grid-cols-2 gap-2" aria-label="Dokumentationsmetadata">
        <MetadataItem
          label="Nøgletal"
          value={finding.metric ? metricLabel(finding.metric) : "Tværgående"}
        />
        <MetadataItem
          label="Dimension"
          value={finding.dimension ? dimensionLabel(finding.dimension) : "Samlet visning"}
        />
        <MetadataItem
          label="Pålidelighed"
          value={reliabilityLabel(finding.confidence)}
          valueClassName={reliabilityClass(finding.confidence)}
        />
        <MetadataItem
          label="Datapunkter"
          value={formatDanishNumber(finding.sampleSize)}
        />
      </dl>

      {measurements.length ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Dokumenterede målinger">
          {measurements.map((measurement) => (
            <div key={measurement.label} className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {measurement.label}
              </dt>
              <dd className="mt-1 text-[13px] font-semibold tabular-nums text-[#0b1c2d]">
                {measurement.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-[#0b1c2d]">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Understøttende fakta
        </p>
        {finding.supportingFacts.length ? (
          <ul className="mt-2 space-y-2">
            {finding.supportingFacts.map((fact, index) => (
              <li key={`${finding.id}-fact-${index}`} className="flex gap-2 text-xs leading-5 text-slate-600">
                <CircleDot className="mt-1 h-3 w-3 shrink-0 text-cyan-600" aria-hidden="true" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Ingen yderligere understøttende fakta er registreret for vurderingen.
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-[#0b1c2d]">
          <Link2 className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
          Evidensreferencer
        </p>
        {finding.evidenceIds.length ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Evidens-id'er">
            {finding.evidenceIds.map((evidenceId) => (
              <li
                key={evidenceId}
                className="max-w-full truncate rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-slate-600"
                title={evidenceId}
              >
                {evidenceId}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Fundet bygger på det viste datagrundlag uden en særskilt evidensreference.
          </p>
        )}
      </div>
    </div>
  );
});

const FindingCard = memo(function FindingCard({ finding }: { finding: StrategicFinding }) {
  const [expanded, setExpanded] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-documentation-button`;
  const regionId = `${baseId}-documentation`;

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <article>
        <h4 className="text-sm font-semibold leading-5 text-[#0b1c2d]">{finding.title}</h4>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-slate-600">{finding.description}</p>

        <div className="mt-2.5">
          <button
            id={buttonId}
            type="button"
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-white px-3.5 text-[13px] font-semibold text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 sm:w-auto"
          >
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
            <span>Se dokumentation</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <FindingDocumentation
          finding={finding}
          regionId={regionId}
          labelledBy={buttonId}
          hidden={!expanded}
        />
      </article>
    </li>
  );
});

function QuadrantEmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[120px] place-items-center px-5 py-5 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#0b1c2d]">Intet robust fund</p>
        <p className="mt-1 text-[13px] leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

const SwotQuadrant = memo(function SwotQuadrant({
  definition,
  findings,
}: {
  definition: QuadrantDefinition;
  findings: readonly StrategicFinding[];
}) {
  const headingId = useId();
  const listId = useId();
  const [showAll, setShowAll] = useState(false);
  const Icon = definition.iconComponent;
  const visibleFindings = showAll ? findings : findings.slice(0, DEFAULT_FINDING_COUNT);

  return (
    <section
      aria-labelledby={headingId}
      className="premium-panel-secondary relative min-w-0 self-start overflow-hidden rounded-xl"
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${definition.bar}`} aria-hidden="true" />
      <header className="flex min-h-[84px] items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${definition.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 id={headingId} className={`${commandSectionLabelClass} ${definition.label}`}>
            {definition.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{definition.description}</p>
        </div>
      </header>
      {findings.length ? (
        <>
          <ol id={listId} className="divide-y divide-slate-100">
            {visibleFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
          </ol>
          {findings.length > DEFAULT_FINDING_COUNT ? (
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <button
                type="button"
                aria-expanded={showAll}
                aria-controls={listId}
                onClick={() => setShowAll((current) => !current)}
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {showAll ? "Vis færre" : `Vis alle ${formatDanishNumber(findings.length)}`}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <QuadrantEmptyState message={definition.emptyMessage} />
      )}
    </section>
  );
});

function TowsEmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[13px] font-semibold text-[#0b1c2d]">Ingen dokumenteret kombination</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
      </div>
    </div>
  );
}

const TowsGroup = memo(function TowsGroup({
  definition,
  proposals,
  findingTitles,
}: {
  definition: TowsDefinition;
  proposals: readonly TowsProposal[];
  findingTitles: ReadonlyMap<string, string>;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="premium-panel-secondary relative min-w-0 self-start overflow-hidden rounded-xl"
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${definition.bar}`} aria-hidden="true" />
      <header className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-lg border px-2 text-[11px] font-bold uppercase tracking-[0.08em] ${definition.icon}`}>
            {definition.type}
          </span>
          <div className="min-w-0">
            <h3 id={headingId} className={`text-sm font-semibold leading-5 ${definition.label}`}>
              {definition.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{definition.description}</p>
          </div>
        </div>
      </header>

      {proposals.length ? (
        <ol className="divide-y divide-slate-100">
          {proposals.map((proposal, index) => (
            <li key={proposal.id} className="px-4 py-4 sm:px-5">
              <article>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold tabular-nums text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold leading-5 text-[#0b1c2d]">{proposal.title}</h4>
                    <p className="mt-1.5 text-[13px] leading-5 text-slate-600">{proposal.text}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-5 text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-600">Bygger på:</span>{" "}
                    {proposal.sourceFindingIds
                      .map((findingId) => findingTitles.get(findingId))
                      .filter((title): title is string => Boolean(title))
                      .join(" · ")}
                  </p>
                  <p className="sr-only">
                    Forslaget kobler {formatDanishNumber(proposal.sourceFindingIds.length)} SWOT-fund og {formatDanishNumber(proposal.evidenceIds.length)} evidensreferencer.
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <TowsEmptyState message={definition.emptyMessage} />
      )}
    </section>
  );
});

export const StrategyDashboard = memo(function StrategyDashboard({
  strategy,
}: StrategyDashboardProps) {
  const notice = strategy.externalContextNotice.trim() === EXTERNAL_CONTEXT_NOTICE
    ? strategy.externalContextNotice.trim()
    : EXTERNAL_CONTEXT_NOTICE;
  const findingTitles = useMemo(
    () => new Map(strategy.findings.map((finding) => [finding.id, finding.title])),
    [strategy.findings],
  );

  return (
    <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="strategy-dashboard">
      <StrategicSnapshot strategy={strategy} />

      <CommandPanel
        eyebrow="SWOT-baseret strategisk opsamling"
        title="Strategisk overblik"
        description="Dokumenterede styrker og svagheder koblet med muligheder og risici i den aktuelle visning"
        icon={Waypoints}
        testId="strategy-swot"
      >
        <aside
          className="flex items-start gap-3 border-b border-cyan-100 bg-cyan-50/45 px-5 py-4 text-[13px] leading-5 text-slate-600 sm:px-6"
          aria-label="Afgrænsning af den strategiske analyse"
        >
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cyan-100 bg-white text-cyan-700">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p>{notice}</p>
            <p className="mt-1 text-xs text-cyan-800">
              Strategisk datagrundlag: {strategy.dataBasis.scopeLabel}.
            </p>
          </div>
        </aside>

        <div className="grid min-w-0 items-start gap-3 bg-[#f7fafb] p-4 sm:p-5 lg:grid-cols-2">
          {quadrantDefinitions.map((definition) => (
            <SwotQuadrant
              key={definition.key}
              definition={definition}
              findings={strategy.findingsByQuadrant[definition.key]}
            />
          ))}
        </div>
      </CommandPanel>

      <CommandPanel
        eyebrow="TOWS"
        title="Strategiske kombinationer"
        description="TOWS omsætter de dokumenterede SWOT-fund til områder, der kan undersøges nærmere"
        icon={Waypoints}
        tone="neutral"
        testId="strategy-tows"
      >
        <div className="grid min-w-0 items-start gap-3 bg-[#f7fafb] p-4 sm:p-5 lg:grid-cols-2">
          {towsDefinitions.map((definition) => (
            <TowsGroup
              key={definition.type}
              definition={definition}
              proposals={strategy.tows.filter((proposal) => proposal.type === definition.type)}
              findingTitles={findingTitles}
            />
          ))}
        </div>
      </CommandPanel>
    </section>
  );
});

