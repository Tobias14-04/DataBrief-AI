"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export type PremiumSelectOption = {
  value: string;
  label: string;
};

export const PremiumSelect = memo(function PremiumSelect({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  searchable = false,
  align = "right",
  className = "",
}: {
  value: string;
  options: PremiumSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  ariaLabel: string;
  searchable?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const normalizedSearch = search.trim().toLocaleLowerCase("da-DK");
  const visibleOptions = useMemo(
    () => options.filter((option) => (
      !normalizedSearch || option.label.toLocaleLowerCase("da-DK").includes(normalizedSearch)
    )),
    [normalizedSearch, options],
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-11 w-full items-center gap-3 rounded-lg border bg-white px-3.5 text-left shadow-[0_4px_14px_rgba(13,35,55,0.055)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
          open
            ? "border-cyan-300 ring-2 ring-cyan-100"
            : "border-[#cfdee5] hover:border-cyan-300 hover:shadow-[0_7px_18px_rgba(13,35,55,0.08)]"
        }`}
      >
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {label}
            </span>
          ) : null}
          <span className={`block truncate font-semibold text-[#0b1c2d] ${label ? "mt-0.5 text-[13px]" : "text-sm"}`}>
            {selectedOption?.label ?? "Vælg"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          className={`absolute top-[calc(100%+8px)] z-[70] w-[min(288px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[#cfdee5] bg-white shadow-[0_22px_55px_rgba(7,22,37,0.18)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {searchable ? (
            <label className="relative block border-b border-slate-100 p-2.5">
              <span className="sr-only">Søg</span>
              <Search
                className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Søg i muligheder"
                autoFocus
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#f7fafb] pl-8 pr-3 text-[13px] text-ink outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          ) : null}
          <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label={ariaLabel}>
            {visibleOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition ${
                    selected
                      ? "bg-cyan-50 text-cyan-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" /> : null}
                </button>
              );
            })}
            {!visibleOptions.length ? (
              <p className="px-3 py-7 text-center text-[13px] text-slate-500">
                Ingen muligheder matcher søgningen.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
