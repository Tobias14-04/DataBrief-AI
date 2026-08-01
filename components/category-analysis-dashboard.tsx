"use client";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CircleDollarSign,
  Download,
  Lightbulb,
  PieChart,
  Search,
  Settings2,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CommandEmptyState,
  CommandPageIntro,
  CommandPanel,
  commandSectionLabelClass,
} from "@/components/command-center-ui";
import { PremiumSelect } from "@/components/premium-select";
import {
  AMOUNT_DISPLAY_OPTIONS,
  AMOUNT_DISPLAY_STORAGE_KEY,
  amountUnitLabel,
  formatAmount,
  parseAmountDisplayPreference,
  resolveAmountUnit,
  type AmountDisplayPreference,
  type ResolvedAmountUnit,
} from "@/lib/amount-display";
import {
  CATEGORY_COLUMN_LABELS,
  CATEGORY_METRIC_LABELS,
  CATEGORY_OPTIONAL_COLUMNS,
  buildCategoryAnalysis,
  buildCategoryCsv,
  buildCategoryInsights,
  categoryPercentagesAreEquivalent,
  filterCategoryRows,
  getAvailableCategoryColumns,
  normalizeCategoryColumnSelection,
  parseCategoryColumnSelection,
  serializeCategoryColumnSelection,
  sortCategoryRows,
  type CategoryAnalysisRow,
  type CategoryColumnKey,
  type CategoryMetricInput,
  type CategoryMetricKey,
  type CategorySortDirection,
} from "@/lib/category-analysis";
import {
  formatDanishNumber,
  formatDanishPercent,
} from "@/lib/dashboard-insights";

const CATEGORY_COLUMN_STORAGE_KEY = "databrief.category-table-columns.v1";

type CategoryAnalysisDashboardProps = {
  categories: ReadonlyArray<CategoryMetricInput>;
  hasSourceCategories: boolean;
  hasGrossProfit: boolean;
  hasCosts: boolean;
};

const categoryMetricOptions = [
  { value: "revenue", label: "Omsætning" },
  { value: "revenueShare", label: "Andel" },
  { value: "grossProfit", label: "Dækningsbidrag" },
  { value: "grossMargin", label: "Dækningsgrad" },
  { value: "cost", label: "Omkostninger" },
  { value: "costShare", label: "Omkostningsandel" },
] as const satisfies ReadonlyArray<{
  value: CategoryMetricKey;
  label: string;
}>;

function downloadCategoryCsv(
  rows: ReadonlyArray<CategoryAnalysisRow>,
  visibleColumns: CategoryColumnKey[],
  availableColumns: CategoryColumnKey[],
) {
  const csv = buildCategoryCsv(rows, visibleColumns, availableColumns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "databrief-kategorier.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function CategoryKpiCard({
  label,
  value,
  detail,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  note?: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "orange" | "slate";
}) {
  const styles = {
    cyan: {
      accent: "bg-cyan-500",
      icon: "border-cyan-100 bg-cyan-50 text-cyan-700",
      detail: "text-cyan-700",
    },
    emerald: {
      accent: "bg-emerald-500",
      icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
      detail: "text-emerald-700",
    },
    orange: {
      accent: "bg-orange-500",
      icon: "border-orange-100 bg-orange-50 text-orange-700",
      detail: "text-orange-700",
    },
    slate: {
      accent: "bg-slate-400",
      icon: "border-slate-200 bg-slate-100 text-slate-700",
      detail: "text-slate-600",
    },
  }[tone];

  return (
    <article className="premium-panel-secondary relative min-w-0 overflow-hidden rounded-xl px-4 py-3.5">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${styles.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
            {label}
          </p>
          <p
            className="mt-1 truncate text-[clamp(1.1rem,1.3vw,1.4rem)] font-semibold leading-7 text-[#0b1c2d]"
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
      <p className={`mt-2.5 border-t border-slate-100 pt-2.5 text-xs font-medium leading-4 ${styles.detail}`} title={detail}>
        {detail}
      </p>
      {note ? (
        <p className="mt-1 text-[11px] leading-4 text-slate-500" title={note}>
          {note}
        </p>
      ) : null}
    </article>
  );
}

function CategoryRanking({
  rows,
  valueKey,
  valueFormatter,
  tone,
}: {
  rows: ReadonlyArray<CategoryAnalysisRow>;
  valueKey: "revenue" | "grossProfit" | "grossMargin";
  valueFormatter: (value: number | null) => string;
  tone: "brand" | "positive";
}) {
  const visibleRows = rows
    .filter((row) => row[valueKey] !== null)
    .slice(0, 10);
  const largestAbsoluteValue = Math.max(
    ...visibleRows.map((row) => Math.abs(row[valueKey] ?? 0)),
    0,
  );
  const barClass = tone === "positive" ? "bg-emerald-500" : "bg-cyan-500";

  if (!visibleRows.length) {
    return (
      <CommandEmptyState
        title={valueKey === "grossMargin" ? "Dækningsbidrag mangler" : "Ingen kategoriomsætning"}
        message={valueKey === "grossMargin"
          ? "Dækningsgrad kræver registreret dækningsbidrag og positiv omsætning."
          : "Der er ingen kategorier med omsætning i den aktuelle visning."}
        tone={tone}
      />
    );
  }

  return (
    <ol className="space-y-2.5 px-5 py-4">
      {visibleRows.map((row, index) => {
        const value = row[valueKey];
        const width = largestAbsoluteValue && value !== null
          ? Math.min(100, Math.abs(value) / largestAbsoluteValue * 100)
          : 0;
        const formattedValue = valueFormatter(value);
        return (
          <li
            key={row.name}
            className="grid min-w-0 grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-2.5"
            title={`${row.name}: ${formattedValue}`}
            aria-label={`${row.name}, ${formattedValue}`}
          >
            <span className="text-[11px] font-semibold tabular-nums text-slate-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#0b1c2d]">
                {row.name}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span
                  className={`block h-full rounded-full transition-[width] duration-300 ${barClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
            <span className="max-w-[142px] truncate whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-[#0b1c2d]">
              {formattedValue}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: CategorySortDirection;
}) {
  if (!active) {
    return <ArrowDown className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />;
  }
  return direction === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
    : <ArrowDown className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />;
}

function categoryCellHighlight(
  row: CategoryAnalysisRow,
  key: CategoryColumnKey,
  markers: {
    largestRevenueShare: ReadonlySet<string>;
    highestGrossMargin: ReadonlySet<string>;
    largestCostShare: ReadonlySet<string>;
  },
  activeMetric: CategoryMetricKey,
) {
  const labels: string[] = key === activeMetric ? ["Aktiv sorteringskolonne"] : [];
  let className = key === activeMetric ? "bg-cyan-50/45 text-cyan-950" : "";

  if (key === "revenueShare" && markers.largestRevenueShare.has(row.name)) {
    labels.push("Største omsætningsandel");
    className = "bg-cyan-50/90 font-semibold text-cyan-800";
  } else if (key === "grossMargin" && markers.highestGrossMargin.has(row.name)) {
    labels.push("Højeste dækningsgrad");
    className = "bg-emerald-50/90 font-semibold text-emerald-800";
  } else if (key === "costShare" && markers.largestCostShare.has(row.name)) {
    labels.push("Største omkostningsandel");
    className = "bg-orange-50/90 font-semibold text-orange-800";
  }

  return {
    className,
    label: labels.join(". "),
  };
}

function categoryCountLabel(count: number) {
  return `${formatDanishNumber(count)} ${count === 1 ? "kategori" : "kategorier"}`;
}

function formatCategoryValue(
  row: CategoryAnalysisRow,
  key: CategoryColumnKey,
  amountUnit: ResolvedAmountUnit,
) {
  if (key === "name") return row.name;
  if (key === "revenue" || key === "grossProfit" || key === "cost") {
    return formatAmount(row[key], amountUnit);
  }
  return row[key] === null ? "–" : formatDanishPercent(row[key]);
}

export function CategoryAnalysisDashboard({
  categories,
  hasSourceCategories,
  hasGrossProfit,
  hasCosts,
}: CategoryAnalysisDashboardProps) {
  const [amountPreference, setAmountPreference] = useState<AmountDisplayPreference>("auto");
  const [amountPreferenceHydrated, setAmountPreferenceHydrated] = useState(false);
  const [sortKey, setSortKey] = useState<CategoryMetricKey>("revenue");
  const [sortDirection, setSortDirection] = useState<CategorySortDirection>("desc");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const analysis = useMemo(
    () => buildCategoryAnalysis(categories, { hasGrossProfit, hasCosts }),
    [categories, hasCosts, hasGrossProfit],
  );
  const analysisHasCategories = analysis.hasCategories;
  const analysisHasGrossProfit = analysis.hasGrossProfit;
  const analysisHasCosts = analysis.hasCosts;
  const availableColumns = useMemo(
    () => getAvailableCategoryColumns({
      hasCategories: analysisHasCategories,
      hasGrossProfit: analysisHasGrossProfit,
      hasCosts: analysisHasCosts,
    }),
    [analysisHasCategories, analysisHasCosts, analysisHasGrossProfit],
  );
  const [selectedColumns, setSelectedColumns] = useState<CategoryColumnKey[]>(availableColumns);
  const [columnsHydrated, setColumnsHydrated] = useState(false);

  useEffect(() => {
    setAmountPreference(parseAmountDisplayPreference(
      window.localStorage.getItem(AMOUNT_DISPLAY_STORAGE_KEY),
    ));
    setAmountPreferenceHydrated(true);
  }, []);

  useEffect(() => {
    if (!amountPreferenceHydrated) return;
    window.localStorage.setItem(AMOUNT_DISPLAY_STORAGE_KEY, amountPreference);
  }, [amountPreference, amountPreferenceHydrated]);

  useEffect(() => {
    setSelectedColumns(parseCategoryColumnSelection(
      window.sessionStorage.getItem(CATEGORY_COLUMN_STORAGE_KEY),
      availableColumns,
    ));
    setColumnsHydrated(true);
  }, [availableColumns]);

  useEffect(() => {
    if (!columnsHydrated) return;
    window.sessionStorage.setItem(
      CATEGORY_COLUMN_STORAGE_KEY,
      serializeCategoryColumnSelection(selectedColumns, availableColumns),
    );
  }, [availableColumns, columnsHydrated, selectedColumns]);

  const visibleColumns = useMemo(
    () => normalizeCategoryColumnSelection(selectedColumns, availableColumns),
    [availableColumns, selectedColumns],
  );
  const enabledMetricOptions = useMemo(
    () => categoryMetricOptions.map((option) => ({
      ...option,
      disabled: (option.value === "grossProfit" || option.value === "grossMargin")
        ? !analysis.hasGrossProfit
        : (option.value === "cost" || option.value === "costShare")
          ? !analysis.hasCosts
          : false,
    })),
    [analysis.hasCosts, analysis.hasGrossProfit],
  );
  const effectiveSortKey = enabledMetricOptions.find((option) => (
    option.value === sortKey && !option.disabled
  ))?.value ?? "revenue";
  const chartRows = useMemo(
    () => sortCategoryRows(analysis.rows, effectiveSortKey, sortDirection),
    [analysis.rows, effectiveSortKey, sortDirection],
  );
  const filteredRows = useMemo(
    () => filterCategoryRows(analysis.rows, deferredQuery),
    [analysis.rows, deferredQuery],
  );
  const sortedRows = useMemo(
    () => sortCategoryRows(filteredRows, effectiveSortKey, sortDirection),
    [effectiveSortKey, filteredRows, sortDirection],
  );
  const amountValues = useMemo(
    () => analysis.rows.flatMap((row) => [row.revenue, row.grossProfit, row.cost]),
    [analysis.rows],
  );
  const resolvedAmountUnit = useMemo(
    () => resolveAmountUnit(amountPreference, amountValues),
    [amountPreference, amountValues],
  );
  const insights = useMemo(
    () => buildCategoryInsights(analysis),
    [analysis],
  );
  const markers = useMemo(() => ({
    largestRevenueShare: new Set(
      analysis.largestRevenueShareLeaders.map((row) => row.name),
    ),
    highestGrossMargin: new Set(
      analysis.highestGrossMarginLeaders.map((row) => row.name),
    ),
    largestCostShare: new Set(
      analysis.largestCostShareLeaders.map((row) => row.name),
    ),
  }), [
    analysis.highestGrossMarginLeaders,
    analysis.largestCostShareLeaders,
    analysis.largestRevenueShareLeaders,
  ]);

  function handleMetricChange(value: string) {
    setSortKey(value as CategoryMetricKey);
    setSortDirection("desc");
  }

  function handleTableSort(key: CategoryMetricKey) {
    setSortKey(key);
    setSortDirection((current) => (
      effectiveSortKey === key && current === "desc" ? "asc" : "desc"
    ));
  }

  function toggleColumn(key: CategoryColumnKey) {
    setSelectedColumns((current) => (
      current.includes(key)
        ? current.filter((column) => column !== key)
        : [...current, key]
    ));
  }

  if (!analysis.hasCategories) {
    const isFilteredEmpty = hasSourceCategories;
    return (
      <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="categories-view">
        <CommandPageIntro
          eyebrow="Kategoriperformance"
          title="Kategorier"
          description="Sammenlign størrelse, rentabilitet og omkostninger i den filtrerede visning."
        />
        <CommandPanel
          title={isFilteredEmpty ? "Ingen kategorier matcher filtrene" : "Kategoridata mangler"}
          description={isFilteredEmpty ? "Prøv at justere de aktive filtre." : "Kategorisiden kræver en tilknyttet kategorikolonne."}
          icon={PieChart}
        >
          <CommandEmptyState
            title={isFilteredEmpty ? "Ingen kategorier i visningen" : "Kategorikolonnen er ikke tilgængelig"}
            message={isFilteredEmpty
              ? "Nulstil eller ændr filtrene for at få kategorianalysen vist igen."
              : "Tilknyt en kategorikolonne for at aktivere kategorianalysen."}
            tone="neutral"
          />
        </CommandPanel>
      </section>
    );
  }

  const revenueLeader = analysis.largestCategory;
  const shareLeader = analysis.largestRevenueShare;
  const marginLeader = analysis.highestGrossMargin;
  const costLeader = analysis.largestCostShare;
  const sharedMarginLeader = analysis.highestGrossMarginLeaders.length > 1;
  const costShareFollowsRevenueShare = costLeader?.name === shareLeader?.name
    && categoryPercentagesAreEquivalent(
      costLeader?.costShare ?? null,
      shareLeader?.revenueShare ?? null,
    );
  const activeMetricLabel = CATEGORY_METRIC_LABELS[effectiveSortKey].toLocaleLowerCase("da-DK");

  return (
    <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="categories-view">
      <CommandPageIntro
        eyebrow="Kategoriperformance"
        title="Kategorier"
        description={`${formatDanishNumber(analysis.rows.length)} kategorier i den aktuelle visning.`}
        action={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <PremiumSelect
              value={amountPreference}
              options={[...AMOUNT_DISPLAY_OPTIONS]}
              onChange={(value) => setAmountPreference(value as AmountDisplayPreference)}
              label="Vis beløb som"
              ariaLabel="Vælg fælles beløbsenhed"
              align="right"
              className="w-full sm:w-[170px]"
            />
            <PremiumSelect
              value={effectiveSortKey}
              options={enabledMetricOptions}
              onChange={handleMetricChange}
              label="Rangér efter"
              ariaLabel="Vælg nøgletal til kategorirangering"
              align="right"
              className="w-full sm:w-[210px]"
            />
          </div>
        )}
      />

      <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4" aria-label="Kategorinøgletal">
        <CategoryKpiCard
          label="Største kategori"
          value={revenueLeader?.name ?? "Ikke tilgængelig"}
          detail={revenueLeader ? `${formatAmount(revenueLeader.revenue, resolvedAmountUnit)} i omsætning` : "Ingen omsætning"}
          icon={CircleDollarSign}
          tone="cyan"
        />
        <CategoryKpiCard
          label="Største omsætningsandel"
          value={shareLeader?.name ?? "Ikke tilgængelig"}
          detail={shareLeader?.revenueShare !== null && shareLeader
            ? `${formatDanishPercent(shareLeader.revenueShare)} af omsætningen`
            : "Andel kan ikke beregnes"}
          icon={PieChart}
          tone="cyan"
        />
        <CategoryKpiCard
          label={sharedMarginLeader ? "Fælles højeste dækningsgrad" : "Højeste dækningsgrad"}
          value={sharedMarginLeader
            ? categoryCountLabel(analysis.highestGrossMarginLeaders.length)
            : marginLeader?.name ?? "Ikke tilgængelig"}
          detail={marginLeader?.grossMargin !== null && marginLeader
            ? formatDanishPercent(marginLeader.grossMargin)
            : "Dækningsbidrag mangler"}
          icon={TrendingUp}
          tone={marginLeader ? "emerald" : "slate"}
        />
        <CategoryKpiCard
          label="Største omkostningsandel"
          value={costLeader?.name ?? "Ikke tilgængelig"}
          detail={costLeader?.costShare !== null && costLeader
            ? `${formatDanishPercent(costLeader.costShare)} af omkostningerne`
            : "Omkostningsdata mangler"}
          note={costShareFollowsRevenueShare
            ? "Omkostningsandelen følger omsætningsandelen."
            : undefined}
          icon={WalletCards}
          tone={costLeader ? "orange" : "slate"}
        />
      </div>

      {insights.length ? (
        <aside className="flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/75 px-4 py-3 text-sm leading-6 text-[#123047]" aria-label="Kategoriindsigt">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cyan-200 bg-white text-cyan-700">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <span className="font-semibold">Kategoriindsigt:</span>{" "}
            {insights.map((insight, index) => (
              <span key={insight}>
                {insight}{index < insights.length - 1 ? " " : ""}
              </span>
            ))}
          </div>
        </aside>
      ) : (
        <aside className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600" aria-label="Kategoriindsigt">
          Der er ikke tilstrækkelige sammenlignelige kategoridata til en faglig observation.
        </aside>
      )}

      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
        <CommandPanel
          title="Omsætning pr. kategori"
          description={`Kategoriens størrelse · rangeret efter ${activeMetricLabel}`}
          icon={BarChart3}
          className="h-full"
        >
          <CategoryRanking
            rows={chartRows}
            valueKey="revenue"
            valueFormatter={(value) => formatAmount(value, resolvedAmountUnit)}
            tone="brand"
          />
        </CommandPanel>
        <CommandPanel
          title="Dækningsgrad pr. kategori"
          description={`Aggregeret dækningsbidrag / omsætning · rangeret efter ${activeMetricLabel}`}
          icon={TrendingUp}
          tone="positive"
          className="h-full"
        >
          {analysis.isGrossMarginUniform ? (
            <div>
              <div className="m-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-slate-700">
                <p className="text-sm font-semibold text-[#0b1c2d]">
                  Dækningsgraden er ensartet på tværs af kategorier
                </p>
                <p className="mt-1 text-[13px] leading-5">
                  Alle {categoryCountLabel(analysis.grossMarginCategoryCount)} ligger omkring {analysis.aggregateGrossMargin === null ? "–" : formatDanishPercent(analysis.aggregateGrossMargin)}.
                </p>
              </div>
              <div className="border-t border-slate-100">
                <p className={`${commandSectionLabelClass} px-5 pt-4 text-slate-500`}>
                  Dækningsbidrag pr. kategori
                </p>
                <CategoryRanking
                  rows={chartRows}
                  valueKey="grossProfit"
                  valueFormatter={(value) => formatAmount(value, resolvedAmountUnit)}
                  tone="positive"
                />
              </div>
            </div>
          ) : (
            <CategoryRanking
              rows={chartRows}
              valueKey="grossMargin"
              valueFormatter={(value) => value === null ? "–" : formatDanishPercent(value)}
              tone="positive"
            />
          )}
        </CommandPanel>
      </div>

      <CommandPanel
        eyebrow="Kategoridata"
        title="Detaljeret kategoritabel"
        description="Søg, rangér, tilpas kolonner og eksportér de filtrerede kategorier"
        icon={PieChart}
        className="self-start"
      >
        <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-[#fbfcfd] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-sm">
            <span className="sr-only">Søg efter kategori</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Søg efter kategori"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-[#0b1c2d] outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <details className="group relative shrink-0">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Tilpas kolonner
              </summary>
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(276px,calc(100vw-32px))] rounded-xl border border-[#cfdee5] bg-white p-2 shadow-[0_20px_50px_rgba(7,22,37,0.16)]">
                <p className={`${commandSectionLabelClass} px-2 py-1.5 text-slate-500`}>
                  Synlige kolonner
                </p>
                <div className="space-y-1">
                  {CATEGORY_OPTIONAL_COLUMNS
                    .filter((key) => availableColumns.includes(key))
                    .map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(key)}
                          onChange={() => toggleColumn(key)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
                        />
                        <span>{CATEGORY_COLUMN_LABELS[key]}</span>
                      </label>
                    ))}
                </div>
                <p className="border-t border-slate-100 px-2 pt-2 text-[11px] leading-4 text-slate-500">
                  Kolonnevalget gemmes i denne browsersession.
                </p>
              </div>
            </details>
            <button
              type="button"
              onClick={() => downloadCategoryCsv(sortedRows, visibleColumns, availableColumns)}
              disabled={!sortedRows.length}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm outline-none transition hover:border-cyan-300 hover:text-cyan-800 focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Eksportér CSV
            </button>
          </div>
        </div>

        <div className="max-h-[420px] w-full min-w-0 max-w-full overflow-auto overscroll-contain [contain:inline-size]">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#f3f7f9] text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 shadow-[0_1px_0_#dbe5ea]">
              <tr>
                {visibleColumns.map((key) => {
                  const isNumeric = key !== "name";
                  const active = isNumeric && effectiveSortKey === key;
                  return (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={active
                        ? sortDirection === "asc" ? "ascending" : "descending"
                        : isNumeric ? "none" : undefined}
                      className={`px-4 py-0 ${isNumeric ? "text-right" : "text-left"}`}
                    >
                      {isNumeric ? (
                        <button
                          type="button"
                          onClick={() => handleTableSort(key)}
                          className={`inline-flex min-h-11 w-full items-center justify-end gap-1.5 rounded-sm py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                            active ? "text-cyan-800" : "hover:text-slate-700"
                          }`}
                          aria-label={`Sortér efter ${CATEGORY_COLUMN_LABELS[key].toLocaleLowerCase("da-DK")}`}
                        >
                          <span>{CATEGORY_COLUMN_LABELS[key]}</span>
                          <SortIcon active={active} direction={sortDirection} />
                        </button>
                      ) : (
                        <span className="inline-flex min-h-11 items-center py-2">
                          {CATEGORY_COLUMN_LABELS[key]}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm tabular-nums">
              {sortedRows.map((row) => (
                <tr key={row.name} className="transition-colors hover:bg-slate-50/70">
                  {visibleColumns.map((key) => {
                    const highlight = categoryCellHighlight(
                      row,
                      key,
                      markers,
                      effectiveSortKey,
                    );
                    const displayedValue = formatCategoryValue(row, key, resolvedAmountUnit);
                    return (
                      <td
                        key={key}
                        title={highlight.label || undefined}
                        aria-label={highlight.label ? `${displayedValue}. ${highlight.label}` : undefined}
                        className={`px-4 py-3 ${
                          key === "name"
                            ? "font-semibold text-[#0b1c2d]"
                            : `text-right text-slate-700 ${highlight.className}`
                        }`}
                      >
                        {displayedValue}
                        {highlight.label ? <span className="sr-only">. {highlight.label}</span> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!sortedRows.length ? (
            <CommandEmptyState
              title="Ingen kategorier matcher søgningen"
              message="Prøv et andet kategorinavn, eller ryd søgefeltet."
              tone="neutral"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[11px] leading-4 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">
            Viser {formatDanishNumber(sortedRows.length)} af {formatDanishNumber(analysis.rows.length)} kategorier.
          </span>
          <span>
            {!analysis.hasCompleteCostCoverage && analysis.hasCosts
              ? "Omkostningsandel skjules, fordi ikke alle kategorier har omkostningsdata. "
              : ""}
            Beløb vises i {amountUnitLabel(resolvedAmountUnit)}. CSV bevarer fulde numeriske værdier.
          </span>
        </div>
      </CommandPanel>
    </section>
  );
}
