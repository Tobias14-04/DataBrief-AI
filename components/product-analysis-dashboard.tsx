"use client";

import {
  ArrowDown,
  ArrowUp,
  Boxes,
  CircleDollarSign,
  Lightbulb,
  PackageCheck,
  Search,
  Settings2,
  ShoppingBasket,
  Tag,
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
  formatDanishCurrency,
  formatDanishCurrencyPrecise,
  formatDanishNumber,
  formatDanishPercent,
} from "@/lib/dashboard-insights";
import {
  PRODUCT_METRIC_LABELS,
  PRODUCT_TABLE_COLUMN_LABELS,
  PRODUCT_TABLE_OPTIONAL_COLUMNS,
  buildProductAnalysis,
  buildProductInsight,
  filterProductRows,
  getAvailableProductTableColumns,
  normalizeProductTableColumnSelection,
  parseProductTableColumnSelection,
  productMetricValue,
  rankProductRows,
  serializeProductTableColumnSelection,
  sortProductRows,
  type ProductAnalysisRow,
  type ProductMetricInput,
  type ProductMetricKey,
  type ProductSortDirection,
  type ProductTableColumnKey,
} from "@/lib/product-analysis";

const PRODUCT_COLUMN_PREFERENCE_KEY = "databrief.product-table-columns.v1";
const numericColumns = new Set<ProductTableColumnKey>([
  "revenue",
  "units",
  "averagePrice",
  "share",
]);

type ProductAnalysisDashboardProps = {
  products: ReadonlyArray<ProductMetricInput>;
  hasSourceProducts: boolean;
  hasRevenue: boolean;
  hasUnits: boolean;
};

function formatMetricValue(
  value: number | null,
  key: ProductMetricKey,
) {
  if (value === null) return "Ikke tilgængelig";
  if (key === "revenue") return formatDanishCurrency(value);
  if (key === "units") return formatDanishNumber(value);
  if (key === "averagePrice") return formatDanishCurrencyPrecise(value);
  return formatDanishPercent(value);
}

function ProductKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
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
            className="mt-1 truncate text-[clamp(1.15rem,1.35vw,1.45rem)] font-semibold leading-7 text-[#0b1c2d]"
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
      <p className={`mt-2.5 truncate border-t border-slate-100 pt-2.5 text-xs font-medium ${styles.detail}`} title={detail}>
        {detail}
      </p>
    </article>
  );
}

function ProductRanking({
  rows,
  metric,
}: {
  rows: ReadonlyArray<ProductAnalysisRow>;
  metric: ProductMetricKey;
}) {
  const rankedRows = rankProductRows(rows, metric, 10);
  const largestValue = Math.max(
    ...rankedRows.map((row) => Math.abs(productMetricValue(row, metric) ?? 0)),
    0,
  );

  if (!rankedRows.length) {
    return (
      <CommandEmptyState
        title={metric === "averagePrice" ? "Gennemsnitspris kan ikke beregnes" : "Ingen værdier at rangere"}
        message={metric === "averagePrice"
          ? "Gennemsnitspris kræver både omsætning og et gyldigt antal over 0."
          : "Det valgte nøgletal er ikke tilgængeligt i den aktuelle visning."}
        tone="neutral"
      />
    );
  }

  return (
    <ol className="space-y-2.5 px-5 py-4">
      {rankedRows.map((row, index) => {
        const value = productMetricValue(row, metric);
        const width = largestValue && value !== null
          ? Math.min(100, Math.abs(value) / largestValue * 100)
          : 0;
        return (
          <li key={row.name} className="grid min-w-0 grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-2.5">
            <span className="text-[11px] font-semibold tabular-nums text-slate-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#0b1c2d]" title={row.name}>
                {row.name}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-cyan-500 transition-[width] duration-300"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
            <span className="whitespace-nowrap text-right text-[13px] font-semibold tabular-nums text-[#0b1c2d]">
              {formatMetricValue(value, metric)}
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
  direction: ProductSortDirection;
}) {
  if (!active) {
    return <ArrowDown className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />;
  }
  return direction === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
    : <ArrowDown className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />;
}

export function ProductAnalysisDashboard({
  products,
  hasSourceProducts,
  hasRevenue,
  hasUnits,
}: ProductAnalysisDashboardProps) {
  const [rankingMetric, setRankingMetric] = useState<ProductMetricKey>("revenue");
  const [tableSort, setTableSort] = useState<{
    key: ProductTableColumnKey;
    direction: ProductSortDirection;
  }>({ key: "revenue", direction: "desc" });
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const analysis = useMemo(
    () => buildProductAnalysis(products, { hasRevenue, hasUnits }),
    [hasRevenue, hasUnits, products],
  );
  const analysisHasProducts = analysis.hasProducts;
  const analysisHasRevenue = analysis.hasRevenue;
  const analysisHasUnits = analysis.hasUnits;
  const availableColumns = useMemo(
    () => getAvailableProductTableColumns({
      hasProducts: analysisHasProducts,
      hasRevenue: analysisHasRevenue,
      hasUnits: analysisHasUnits,
    }),
    [analysisHasProducts, analysisHasRevenue, analysisHasUnits],
  );
  const [selectedColumns, setSelectedColumns] = useState<ProductTableColumnKey[]>(availableColumns);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  useEffect(() => {
    setSelectedColumns(parseProductTableColumnSelection(
      window.sessionStorage.getItem(PRODUCT_COLUMN_PREFERENCE_KEY),
      availableColumns,
    ));
    setPreferencesHydrated(true);
  }, [availableColumns]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    window.sessionStorage.setItem(
      PRODUCT_COLUMN_PREFERENCE_KEY,
      serializeProductTableColumnSelection(selectedColumns, availableColumns),
    );
  }, [availableColumns, preferencesHydrated, selectedColumns]);

  const visibleColumns = useMemo(
    () => normalizeProductTableColumnSelection(selectedColumns, availableColumns),
    [availableColumns, selectedColumns],
  );
  const filteredRows = useMemo(
    () => filterProductRows(analysis.rows, deferredQuery),
    [analysis.rows, deferredQuery],
  );
  const sortedRows = useMemo(
    () => sortProductRows(filteredRows, tableSort.key, tableSort.direction),
    [filteredRows, tableSort],
  );
  const insight = buildProductInsight(analysis);
  const revenueLeader = analysis.highestRevenue;
  const unitsLeader = analysis.mostUnits;
  const averagePriceLeader = analysis.highestAveragePrice;
  const averagePriceAvailable = analysis.rows.some((row) => row.averagePrice !== null);
  const shareAvailable = analysis.rows.some((row) => row.share !== null);
  const metricOptions = useMemo(() => [
    {
      value: "revenue",
      label: "Omsætning",
      description: "Registreret produktomsætning",
      disabled: !analysis.hasRevenue,
    },
    {
      value: "units",
      label: "Solgte enheder",
      description: "Registreret salgsvolumen",
      disabled: !analysis.hasUnits,
    },
    {
      value: "averagePrice",
      label: "Gennemsnitspris",
      description: "Omsætning divideret med enheder",
      disabled: !averagePriceAvailable,
    },
    {
      value: "share",
      label: "Andel af samlet omsætning",
      description: "Produktets andel i den filtrerede visning",
      disabled: !shareAvailable,
    },
  ], [analysis.hasRevenue, analysis.hasUnits, averagePriceAvailable, shareAvailable]);

  function changeRanking(metric: string) {
    const nextMetric = metric as ProductMetricKey;
    setRankingMetric(nextMetric);
    setTableSort({ key: nextMetric, direction: "desc" });
  }

  function changeTableSort(key: ProductTableColumnKey) {
    setTableSort((current) => (
      current.key === key
        ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
        : { key, direction: key === "name" ? "asc" : "desc" }
    ));
    if (key !== "name") setRankingMetric(key);
  }

  function toggleColumn(key: ProductTableColumnKey) {
    setSelectedColumns((current) => (
      current.includes(key)
        ? current.filter((column) => column !== key)
        : [...current, key]
    ));
    if (tableSort.key === key) {
      setTableSort({ key: "revenue", direction: "desc" });
      setRankingMetric("revenue");
    }
  }

  const highlightedValue = numericColumns.has(tableSort.key)
    ? sortedRows.reduce<number | null>((highest, row) => {
      const value = row[tableSort.key as ProductMetricKey];
      if (value === null) return highest;
      return highest === null || value > highest ? value : highest;
    }, null)
    : null;

  if (!analysis.hasProducts) {
    const isFilteredEmpty = hasSourceProducts;
    return (
      <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="products-view">
        <CommandPageIntro
          eyebrow="Produktperformance"
          title="Produkter"
          description="Sammenlign produktperformance i den aktuelle, filtrerede visning."
        />
        <CommandPanel
          title={isFilteredEmpty ? "Ingen produkter matcher filtrene" : "Produktdata mangler"}
          description={isFilteredEmpty ? "Prøv at justere de aktive filtre." : "Produktsiden kræver en tilknyttet produktkolonne."}
          icon={PackageCheck}
        >
          <CommandEmptyState
            title={isFilteredEmpty ? "Ingen produkter i visningen" : "Produktkolonnen er ikke tilgængelig"}
            message={isFilteredEmpty
              ? "Nulstil eller ændr filtrene for at få produktanalysen vist igen."
              : "Tilknyt en produktkolonne for at aktivere produktanalyse."}
            tone="neutral"
          />
        </CommandPanel>
      </section>
    );
  }

  if (!analysis.hasRevenue) {
    return (
      <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="products-view">
        <CommandPageIntro
          eyebrow="Produktperformance"
          title="Produkter"
          description={`${formatDanishNumber(analysis.rows.length)} produkter i den aktuelle visning.`}
        />
        <CommandPanel
          title="Omsætningsdata mangler"
          description="Produktanalysen kræver omsætning for at beregne nøgletal og andele."
          icon={CircleDollarSign}
        >
          <CommandEmptyState
            title="Omsætning er ikke tilgængelig"
            message="Tilknyt en omsætningskolonne for at aktivere produktanalysen."
            tone="neutral"
          />
        </CommandPanel>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="products-view">
      <CommandPageIntro
        eyebrow="Produktperformance"
        title="Produkter"
        description={`${formatDanishNumber(analysis.rows.length)} produkter i den aktuelle visning.`}
        action={(
          <PremiumSelect
            value={rankingMetric}
            options={metricOptions}
            onChange={changeRanking}
            label="Rangér efter"
            ariaLabel="Vælg nøgletal til produktrangering"
            align="right"
            className="w-full sm:w-[260px]"
          />
        )}
      />

      <div className="grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4" aria-label="Produktnøgletal">
        <ProductKpiCard
          label="Bedste produkt"
          value={revenueLeader?.name ?? "Ikke tilgængelig"}
          detail={revenueLeader?.revenue !== null && revenueLeader
            ? formatDanishCurrency(revenueLeader.revenue)
            : "Ingen omsætning registreret"}
          icon={PackageCheck}
          tone="cyan"
        />
        <ProductKpiCard
          label="Højeste omsætning"
          value={revenueLeader?.revenue !== null && revenueLeader
            ? formatDanishCurrency(revenueLeader.revenue)
            : "Ikke tilgængelig"}
          detail={revenueLeader?.name ?? "Intet produkt"}
          icon={CircleDollarSign}
          tone="emerald"
        />
        <ProductKpiCard
          label="Flest solgte enheder"
          value={unitsLeader?.units !== null && unitsLeader
            ? formatDanishNumber(unitsLeader.units)
            : "Ikke tilgængelig"}
          detail={unitsLeader?.name ?? "Antalsdata mangler"}
          icon={ShoppingBasket}
          tone={unitsLeader ? "orange" : "slate"}
        />
        <ProductKpiCard
          label="Højeste gennemsnitspris"
          value={averagePriceLeader?.averagePrice !== null && averagePriceLeader
            ? formatDanishCurrencyPrecise(averagePriceLeader.averagePrice)
            : "Ikke beregnelig"}
          detail={averagePriceLeader?.name ?? "Kræver et gyldigt antal"}
          icon={Tag}
          tone={averagePriceLeader ? "cyan" : "slate"}
        />
      </div>

      {insight ? (
        <aside className="flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-cyan-50/75 px-4 py-3 text-sm leading-6 text-[#123047]" aria-label="Produktindsigt">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cyan-200 bg-white text-cyan-700">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p><span className="font-semibold">Produktindsigt:</span> {insight}</p>
        </aside>
      ) : (
        <aside className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600" aria-label="Produktindsigt">
          Der er ikke tilstrækkelige data til en produktindsigt i den aktuelle visning.
        </aside>
      )}

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.55fr)]">
        <CommandPanel
          eyebrow="Rangering"
          title={PRODUCT_METRIC_LABELS[rankingMetric].title}
          description={PRODUCT_METRIC_LABELS[rankingMetric].description}
          icon={Boxes}
          className="self-start"
        >
          <ProductRanking rows={analysis.rows} metric={rankingMetric} />
        </CommandPanel>

        <CommandPanel
          eyebrow="Produktdata"
          title="Detaljeret produkttabel"
          description="Søg, sortér og tilpas kolonner i den filtrerede visning"
          icon={PackageCheck}
          className="self-start"
        >
          <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-[#fbfcfd] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block min-w-0 flex-1 sm:max-w-sm">
              <span className="sr-only">Søg efter produktnavn</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Søg efter produkt"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-[#0b1c2d] outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <details className="group relative shrink-0">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Tilpas kolonner
              </summary>
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(260px,calc(100vw-32px))] rounded-xl border border-[#cfdee5] bg-white p-2 shadow-[0_20px_50px_rgba(7,22,37,0.16)]">
                <p className={`${commandSectionLabelClass} px-2 py-1.5 text-slate-500`}>
                  Synlige kolonner
                </p>
                <div className="space-y-1">
                  {PRODUCT_TABLE_OPTIONAL_COLUMNS
                    .filter((key) => availableColumns.includes(key))
                    .map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(key)}
                          onChange={() => toggleColumn(key)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
                        />
                        <span>{PRODUCT_TABLE_COLUMN_LABELS[key]}</span>
                      </label>
                    ))}
                </div>
                <p className="border-t border-slate-100 px-2 pt-2 text-[11px] leading-4 text-slate-500">
                  Valget gemmes i denne browsersession.
                </p>
              </div>
            </details>
          </div>

          <div className="max-h-[420px] min-w-0 overflow-auto overscroll-contain">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="sticky top-0 z-10 bg-[#f3f7f9] text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 shadow-[0_1px_0_#dbe5ea]">
                <tr>
                  {visibleColumns.map((key) => {
                    const active = tableSort.key === key;
                    const isNumeric = key !== "name";
                    return (
                      <th
                        key={key}
                        scope="col"
                        aria-sort={active
                          ? tableSort.direction === "asc" ? "ascending" : "descending"
                          : "none"}
                        className={`px-4 py-0 ${isNumeric ? "text-right" : "text-left"}`}
                      >
                        <button
                          type="button"
                          onClick={() => changeTableSort(key)}
                          className={`inline-flex min-h-11 w-full items-center gap-1.5 rounded-sm py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                            isNumeric ? "justify-end" : "justify-start"
                          } ${active ? "text-cyan-800" : "hover:text-slate-700"}`}
                          aria-label={`Sortér efter ${PRODUCT_TABLE_COLUMN_LABELS[key].toLocaleLowerCase("da-DK")}`}
                        >
                          <span>{PRODUCT_TABLE_COLUMN_LABELS[key]}</span>
                          <SortIcon active={active} direction={tableSort.direction} />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm tabular-nums">
                {sortedRows.map((row) => (
                  <tr key={row.name} className="transition-colors hover:bg-slate-50/70">
                    {visibleColumns.map((key) => {
                      const value = key === "name" ? null : row[key];
                      const highlighted = key !== "name"
                        && highlightedValue !== null
                        && value === highlightedValue;
                      return (
                        <td
                          key={key}
                          className={`px-4 py-3 ${
                            key === "name"
                              ? "font-semibold text-[#0b1c2d]"
                              : `text-right text-slate-700 ${highlighted ? "bg-emerald-50/75 font-semibold text-emerald-800" : ""}`
                          }`}
                        >
                          {key === "name" ? row.name : formatMetricValue(value, key)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!sortedRows.length ? (
              <CommandEmptyState
                title="Ingen produkter matcher søgningen"
                message="Prøv et andet produktnavn, eller ryd søgefeltet."
                tone="neutral"
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[11px] leading-4 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span aria-live="polite">
              Viser {formatDanishNumber(sortedRows.length)} af {formatDanishNumber(analysis.rows.length)} produkter.
            </span>
            {!averagePriceAvailable && analysis.hasUnits ? (
              <span>Gennemsnitspris kræver mindst ét produkt med et gyldigt antal over 0.</span>
            ) : null}
            {!analysis.hasUnits ? (
              <span>Enhedsbaserede nøgletal er ikke tilgængelige i dette datasæt.</span>
            ) : null}
          </div>
        </CommandPanel>
      </div>
    </section>
  );
}
