"use client";

import {
  Check,
  ChevronDown,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FloatingPopover } from "@/components/floating-popover";
import {
  reconcileDashboardFilterDraft,
  toggleDashboardFilterValue,
} from "@/lib/dashboard-filtering";
import { buildPeriodMenuOptions } from "@/lib/dashboard-insights";
import { normalizeForComparison } from "@/lib/data-labels";

export type DashboardControlKey = "month" | "product" | "category" | "channel" | "region";
export type DashboardControlValues = Record<DashboardControlKey, string[]>;
export type DashboardControlOptions = Record<DashboardControlKey, string[]>;
export type DashboardControlVariant = "default" | "overview" | "analysis";

const labels: Record<DashboardControlKey, string> = {
  month: "Periode",
  product: "Produkt",
  category: "Kategori",
  channel: "Kanal",
  region: "Region",
};

const allLabels: Record<DashboardControlKey, string> = {
  month: "Alle perioder",
  product: "Alle produkter",
  category: "Alle kategorier",
  channel: "Alle kanaler",
  region: "Alle regioner",
};

const largeDatasetCommitDelayMs = 120;

const FilterMenu = memo(function FilterMenu({
  field,
  values,
  options,
  open,
  onOpen,
  onToggle,
  onClear,
}: {
  field: DashboardControlKey;
  values: string[];
  options: string[];
  open: boolean;
  onOpen: (field: DashboardControlKey) => void;
  onToggle: (field: DashboardControlKey, value: string) => void;
  onClear: (field: DashboardControlKey) => void;
}) {
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchable = field === "month" || field === "product" || options.length > 10;
  const normalizedSearch = normalizeForComparison(search);
  const menuOptions = useMemo(
    () => field === "month"
      ? buildPeriodMenuOptions(options)
      : options.map((option) => ({ value: option, label: option, year: null })),
    [field, options],
  );
  const visibleOptions = useMemo(
    () => menuOptions.filter(
      (option) => !normalizedSearch
        || normalizeForComparison(option.label).includes(normalizedSearch)
        || normalizeForComparison(option.value).includes(normalizedSearch),
    ),
    [menuOptions, normalizedSearch],
  );
  const summary = values.length === 0
    ? allLabels[field]
    : values.length === 1
      ? values[0]
      : `${values.length} valgt`;

  return (
    <div className="relative min-w-0 w-full sm:w-auto">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpen(field)}
        aria-expanded={open}
        className={`flex h-11 w-full max-w-full items-center justify-between gap-3 rounded-lg border px-3.5 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:min-w-[150px] sm:w-auto ${
          values.length
            ? "border-cyan-300 bg-cyan-50 text-cyan-900"
            : "border-[#d8e3e8] bg-white text-slate-700 hover:border-cyan-300"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{labels[field]}</span>
          <span className="block max-w-[165px] truncate text-[13px] font-semibold" title={summary}>{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        popoverRef={popoverRef}
        align="left"
        scope="dashboard-control"
      >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-3.5 py-3">
            <p className="text-[13px] font-semibold text-ink">{labels[field]}</p>
            {values.length ? (
              <button
                type="button"
                onClick={() => onClear(field)}
                className="min-h-8 rounded-md px-2 text-xs font-semibold text-brand-700 transition duration-200 hover:bg-brand-50 hover:text-brand-500"
              >
                Ryd valg
              </button>
            ) : null}
          </div>
          {searchable ? (
            <label className="relative block border-b border-slate-100 p-2.5">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Søg i ${labels[field].toLocaleLowerCase("da-DK")}`}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </label>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
            <button
              type="button"
              onClick={() => onClear(field)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] font-medium transition duration-200 ${
                !values.length ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {allLabels[field]}
              {!values.length ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </button>
            {visibleOptions.map((option, index) => {
              const selected = values.includes(option.value);
              const previousYear = visibleOptions[index - 1]?.year;
              const showYearHeading = field === "month" && option.year !== previousYear;
              return (
                <Fragment key={option.value}>
                  {showYearHeading ? (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                      {option.year ?? "Andre perioder"}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onToggle(field, option.value)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition duration-200 ${
                      selected ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                    }`}
                    aria-pressed={selected}
                    title={option.label}
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                  </button>
                </Fragment>
              );
            })}
            {!visibleOptions.length ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">Ingen muligheder matcher søgningen.</p>
            ) : null}
          </div>
      </FloatingPopover>
    </div>
  );
});

export const DashboardControlBar = memo(function DashboardControlBar({
  filters,
  options,
  filteredRows,
  totalRows,
  datasetIdentity,
  isPending = false,
  onChange,
  variant = "default",
}: {
  filters: DashboardControlValues;
  options: DashboardControlOptions;
  filteredRows: number;
  totalRows: number;
  datasetIdentity: object;
  isPending?: boolean;
  onChange: (filters: DashboardControlValues) => void;
  variant?: DashboardControlVariant;
}) {
  const [openField, setOpenField] = useState<DashboardControlKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [isUpdateQueued, setIsUpdateQueued] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [isDashboardUpdatePending, startDashboardUpdate] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const draftFiltersRef = useRef(filters);
  const hasPendingDraftRef = useRef(false);
  const updateTimerRef = useRef<number | null>(null);
  const previousTotalRowsRef = useRef(totalRows);
  const previousDatasetRef = useRef(datasetIdentity);
  const primaryFields = (["month", "category", "product"] as DashboardControlKey[]).filter((field) => options[field].length);
  const moreFields = (["channel", "region"] as DashboardControlKey[]).filter((field) => options[field].length);
  const activeEntries = (Object.entries(draftFilters) as Array<[DashboardControlKey, string[]]>).flatMap(([field, values]) =>
    values.map((value) => ({ field, value })),
  );
  const isUpdating = isPending || isUpdateQueued || isDashboardUpdatePending;
  const openFilterMenu = useCallback((field: DashboardControlKey) => {
    setMoreOpen(false);
    setOpenField((current) => current === field ? null : field);
  }, []);
  const queueDashboardUpdate = useCallback((nextFilters: DashboardControlValues) => {
    draftFiltersRef.current = nextFilters;
    hasPendingDraftRef.current = true;
    setDraftFilters(nextFilters);

    if (updateTimerRef.current) {
      window.clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }

    const commit = () => {
      updateTimerRef.current = null;
      startDashboardUpdate(() => onChange(nextFilters));
    };

    if (totalRows >= 3000) {
      setIsUpdateQueued(true);
      updateTimerRef.current = window.setTimeout(commit, largeDatasetCommitDelayMs);
    } else {
      commit();
    }
  }, [onChange, totalRows]);
  const toggleDraftFilter = useCallback((field: DashboardControlKey, value: string) => {
    queueDashboardUpdate(toggleDashboardFilterValue(draftFiltersRef.current, field, value));
  }, [queueDashboardUpdate]);
  const clearDraftFilter = useCallback((field: DashboardControlKey) => {
    queueDashboardUpdate({ ...draftFiltersRef.current, [field]: [] });
  }, [queueDashboardUpdate]);
  const resetDraftFilters = useCallback(() => {
    queueDashboardUpdate({
      month: [],
      product: [],
      category: [],
      channel: [],
      region: [],
    });
  }, [queueDashboardUpdate]);

  useEffect(() => {
    if (!isUpdating) {
      setShowUpdateStatus(false);
      return;
    }

    const statusTimer = window.setTimeout(() => setShowUpdateStatus(true), 130);
    return () => window.clearTimeout(statusTimer);
  }, [isUpdating]);

  useEffect(() => {
    const reconciled = reconcileDashboardFilterDraft(
      filters,
      draftFiltersRef.current,
      hasPendingDraftRef.current,
    );
    hasPendingDraftRef.current = reconciled.hasPendingDraft;
    if (reconciled.filters !== draftFiltersRef.current) {
      draftFiltersRef.current = reconciled.filters;
      setDraftFilters(reconciled.filters);
    }
    if (!reconciled.hasPendingDraft) {
      setIsUpdateQueued(false);
    }
  }, [filters]);

  useEffect(() => {
    if (
      previousTotalRowsRef.current === totalRows
      && previousDatasetRef.current === datasetIdentity
    ) return;
    previousTotalRowsRef.current = totalRows;
    previousDatasetRef.current = datasetIdentity;
    if (updateTimerRef.current) {
      window.clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    hasPendingDraftRef.current = false;
    draftFiltersRef.current = filters;
    setDraftFilters(filters);
    setIsUpdateQueued(false);
  }, [datasetIdentity, filters, totalRows]);

  useEffect(() => () => {
    if (updateTimerRef.current) window.clearTimeout(updateTimerRef.current);
  }, []);

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      const target = event.target as Node;
      const isControlPopover = target instanceof Element
        && Boolean(target.closest('[data-floating-popover-scope="dashboard-control"]'));
      if (
        rootRef.current
        && !rootRef.current.contains(target)
        && !isControlPopover
      ) {
        setOpenField(null);
        setMoreOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenField(null);
        setMoreOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeMenus);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenus);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="premium-filter-bar relative rounded-xl p-3 sm:p-3.5"
      data-testid="dashboard-control-bar"
      data-variant={variant}
      aria-label="Dashboardfiltre"
      aria-busy={isUpdating}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 hidden h-11 items-center gap-3 border-r border-slate-200 pr-4 sm:flex">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-700">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Filtrer analyse</p>
              {activeEntries.length ? (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800">
                  {activeEntries.length} aktive
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">{filteredRows.toLocaleString("da-DK")} af {totalRows.toLocaleString("da-DK")} rækker</p>
          </div>
        </div>

        {primaryFields.map((field) => (
          <FilterMenu
            key={field}
            field={field}
            values={draftFilters[field]}
            options={options[field]}
            open={openField === field}
            onOpen={openFilterMenu}
            onToggle={toggleDraftFilter}
            onClear={clearDraftFilter}
          />
        ))}

        {moreFields.length ? (
          <div className="relative">
            <button
              ref={moreTriggerRef}
              type="button"
              onClick={() => {
                setOpenField(null);
                setMoreOpen((current) => !current);
              }}
              aria-expanded={moreOpen}
              className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                moreFields.some((field) => draftFilters[field].length)
                  ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                  : "border-[#d8e3e8] bg-white text-slate-600 hover:border-cyan-300"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Flere filtre
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition duration-200 ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <FloatingPopover
              open={moreOpen}
              anchorRef={moreTriggerRef}
              popoverRef={morePopoverRef}
              align="right"
              preferredWidth={380}
              scope="dashboard-control"
            >
              <div className="min-h-0 overflow-y-auto p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {moreFields.map((field) => (
                    <div key={field}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{labels[field]}</p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {options[field].map((option) => {
                          const selected = draftFilters[field].includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleDraftFilter(field, option)}
                              className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors duration-200 ${
                                selected ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50"
                              }`}
                              aria-pressed={selected}
                            >
                              <span className="truncate">{option}</span>
                              {selected ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FloatingPopover>
          </div>
        ) : null}

        <div className="ml-auto flex min-h-11 items-center gap-2">
          <span className="hidden min-h-5 w-[142px] items-center justify-end sm:inline-flex">
            {showUpdateStatus ? (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700"
                role="status"
                aria-live="polite"
              >
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Opdaterer visningen…
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={resetDraftFilters}
            disabled={!activeEntries.length}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
              activeEntries.length
                ? "bg-[#0b1c2d] text-white hover:bg-[#132c43]"
                : "cursor-not-allowed text-slate-400"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Nulstil
          </button>
        </div>
      </div>

      {activeEntries.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Aktive filtre</span>
          {activeEntries.map(({ field, value }) => (
            <button
              key={`${field}-${value}`}
              type="button"
              onClick={() => toggleDraftFilter(field, value)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-cyan-50 px-2.5 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:bg-cyan-100"
              title={`Fjern ${labels[field]}: ${value}`}
            >
              <span className="truncate">{value}</span>
              <X className="h-3 w-3 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
});

