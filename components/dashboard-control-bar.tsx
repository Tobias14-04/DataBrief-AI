"use client";

import {
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type DashboardControlKey = "month" | "product" | "category" | "channel" | "region";
export type DashboardControlValues = Record<DashboardControlKey, string[]>;
export type DashboardControlOptions = Record<DashboardControlKey, string[]>;

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

function FilterMenu({
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
  onOpen: () => void;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchable = field === "product" || options.length > 10;
  const normalizedSearch = search.trim().toLocaleLowerCase("da-DK");
  const visibleOptions = useMemo(
    () => options.filter((option) => !normalizedSearch || option.toLocaleLowerCase("da-DK").includes(normalizedSearch)),
    [normalizedSearch, options],
  );
  const summary = values.length === 0
    ? allLabels[field]
    : values.length === 1
      ? values[0]
      : `${values.length} valgt`;

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className={`flex h-10 min-w-[138px] max-w-full items-center justify-between gap-3 rounded-md border px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
          values.length
            ? "border-cyan-300 bg-cyan-50 text-cyan-900"
            : "border-[#d8e3e8] bg-white text-slate-700 hover:border-cyan-300"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">{labels[field]}</span>
          <span className="block max-w-[150px] truncate text-[11px] font-semibold" title={summary}>{summary}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+7px)] z-50 w-[min(300px,calc(100vw-32px))] overflow-hidden rounded-lg border border-[#d8e3e8] bg-white shadow-[0_18px_48px_rgba(7,22,37,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-xs font-semibold text-ink">{labels[field]}</p>
            {values.length ? (
              <button
                type="button"
                onClick={onClear}
                className="text-[10px] font-semibold text-brand-700 transition hover:text-brand-500"
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
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </label>
          ) : null}
          <div className="max-h-64 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={onClear}
              className={`flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-xs font-medium transition ${
                !values.length ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {allLabels[field]}
              {!values.length ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </button>
            {visibleOptions.map((option) => {
              const selected = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 text-left text-xs font-medium transition ${
                    selected ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                  }`}
                  aria-pressed={selected}
                  title={option}
                >
                  <span className="truncate">{option}</span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
            {!visibleOptions.length ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">Ingen muligheder matcher søgningen.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardControlBar({
  filters,
  options,
  filteredRows,
  totalRows,
  onToggle,
  onClear,
  onReset,
}: {
  filters: DashboardControlValues;
  options: DashboardControlOptions;
  filteredRows: number;
  totalRows: number;
  onToggle: (field: DashboardControlKey, value: string) => void;
  onClear: (field: DashboardControlKey) => void;
  onReset: () => void;
}) {
  const [openField, setOpenField] = useState<DashboardControlKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const primaryFields = (["month", "category", "product"] as DashboardControlKey[]).filter((field) => options[field].length);
  const moreFields = (["channel", "region"] as DashboardControlKey[]).filter((field) => options[field].length);
  const activeEntries = (Object.entries(filters) as Array<[DashboardControlKey, string[]]>).flatMap(([field, values]) =>
    values.map((value) => ({ field, value })),
  );

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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
      className="relative rounded-lg border border-[#d8e3e8] bg-white px-3 py-3 shadow-[0_5px_18px_rgba(7,22,37,0.045)]"
      data-testid="dashboard-control-bar"
      aria-label="Dashboardfiltre"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 hidden h-10 items-center gap-2 border-r border-slate-200 pr-3 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-100 bg-cyan-50 text-cyan-700">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-ink">Filtrer analyse</p>
            <p className="text-[9px] text-slate-400">{filteredRows.toLocaleString("da-DK")} af {totalRows.toLocaleString("da-DK")} rækker</p>
          </div>
        </div>

        {primaryFields.map((field) => (
          <FilterMenu
            key={field}
            field={field}
            values={filters[field]}
            options={options[field]}
            open={openField === field}
            onOpen={() => {
              setMoreOpen(false);
              setOpenField((current) => current === field ? null : field);
            }}
            onToggle={(value) => onToggle(field, value)}
            onClear={() => onClear(field)}
          />
        ))}

        {moreFields.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenField(null);
                setMoreOpen((current) => !current);
              }}
              aria-expanded={moreOpen}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                moreFields.some((field) => filters[field].length)
                  ? "border-cyan-300 bg-cyan-50 text-cyan-900"
                  : "border-[#d8e3e8] bg-white text-slate-600 hover:border-cyan-300"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Flere filtre
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {moreOpen ? (
              <div className="absolute right-0 top-[calc(100%+7px)] z-40 w-[min(360px,calc(100vw-32px))] rounded-lg border border-[#d8e3e8] bg-white p-3 shadow-[0_18px_48px_rgba(7,22,37,0.16)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {moreFields.map((field) => (
                    <div key={field}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{labels[field]}</p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {options[field].map((option) => {
                          const selected = filters[field].includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => onToggle(field, option)}
                              className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-[11px] font-medium ${
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
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onReset}
          disabled={!activeEntries.length}
          className={`ml-auto inline-flex h-10 items-center gap-2 rounded-md px-3 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
            activeEntries.length
              ? "bg-[#0b1c2d] text-white hover:bg-[#132c43]"
              : "cursor-not-allowed text-slate-400"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Nulstil
        </button>
      </div>

      {activeEntries.length ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">Aktive filtre</span>
          {activeEntries.map(({ field, value }) => (
            <button
              key={`${field}-${value}`}
              type="button"
              onClick={() => onToggle(field, value)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-800 transition hover:bg-cyan-100"
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
}
