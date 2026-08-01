"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { FloatingPopover } from "@/components/floating-popover";
import { normalizeForComparison } from "@/lib/data-labels";

export type PremiumSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const normalizedSearch = normalizeForComparison(search);
  const visibleOptions = useMemo(
    () => options.filter((option) => (
      !normalizedSearch
      || normalizeForComparison(option.label).includes(normalizedSearch)
      || normalizeForComparison(option.description).includes(normalizedSearch)
    )),
    [normalizedSearch, options],
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const selectedIndex = visibleOptions.findIndex((option) => option.value === value && !option.disabled);
    const firstEnabledIndex = visibleOptions.findIndex((option) => !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabledIndex));

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        rootRef.current
        && !rootRef.current.contains(target)
        && !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, value, visibleOptions]);

  function chooseOption(option: PremiumSelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveActive(direction: 1 | -1) {
    if (!visibleOptions.length) return;
    let nextIndex = activeIndex;
    for (let attempt = 0; attempt < visibleOptions.length; attempt += 1) {
      nextIndex = (nextIndex + direction + visibleOptions.length) % visibleOptions.length;
      if (!visibleOptions[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        optionRefs.current[nextIndex]?.focus();
        return;
      }
    }
  }

  function focusBoundary(boundary: "first" | "last") {
    const indexes = visibleOptions.map((_, index) => index);
    const orderedIndexes = boundary === "first" ? indexes : indexes.reverse();
    const nextIndex = orderedIndexes.find((index) => !visibleOptions[index]?.disabled);
    if (nextIndex === undefined) return;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusBoundary("first");
    } else if (event.key === "End") {
      event.preventDefault();
      focusBoundary("last");
    } else if (event.key === "Enter") {
      const activeOption = visibleOptions[activeIndex];
      if (!activeOption) return;
      event.preventDefault();
      chooseOption(activeOption);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        className={`flex h-11 w-full items-center gap-3 rounded-lg border bg-white px-3.5 text-left shadow-[0_4px_14px_rgba(13,35,55,0.055)] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
          open
            ? "border-cyan-300 ring-2 ring-cyan-100"
            : "border-[#cfdee5] hover:border-cyan-300 hover:shadow-[0_7px_18px_rgba(13,35,55,0.08)]"
        }`}
      >
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-500">
              {label}
            </span>
          ) : null}
          <span className={`block truncate font-semibold text-[#0b1c2d] ${label ? "mt-0.5 text-[13px]" : "text-sm"}`}>
            {selectedOption?.label ?? "Vælg"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        popoverRef={popoverRef}
        align={align}
      >
          {searchable ? (
            <label className="sticky top-0 z-10 block border-b border-slate-100 bg-white p-2.5">
              <span className="sr-only">Søg</span>
              <Search
                className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Søg i muligheder"
                autoFocus
                className="h-9 w-full rounded-lg border border-slate-200 bg-[#f7fafb] pl-8 pr-3 text-[13px] text-ink outline-none transition duration-200 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          ) : null}
          <div
            id={listboxId}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
            role="listbox"
            aria-label={ariaLabel}
          >
            {visibleOptions.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <button
                  key={`${option.value}-${index}`}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  tabIndex={active ? 0 : -1}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => chooseOption(option)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${
                    selected
                      ? "bg-cyan-50 text-cyan-900"
                      : active
                        ? "bg-slate-50 text-ink"
                        : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                  } disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-400 disabled:opacity-50`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">{option.description}</span> : null}
                  </span>
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
      </FloatingPopover>
    </div>
  );
});
