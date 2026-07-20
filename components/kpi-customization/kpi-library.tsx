"use client";

import { Check, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
  MAX_PRIMARY_KPIS,
  MAX_SECONDARY_KPIS,
  type KpiDefinition,
  type KpiEvaluation,
  type KpiPlacement,
} from "@/lib/kpi-customization";
import { KpiIconBadge } from "@/components/kpi-customization/kpi-ui";

type KpiCategory = "Alle" | "Salg" | "Indtjening" | "Budget" | "Produkter og perioder";

const categories: KpiCategory[] = [
  "Alle",
  "Salg",
  "Indtjening",
  "Budget",
  "Produkter og perioder",
];

const categoryById: Record<string, Exclude<KpiCategory, "Alle">> = {
  "total-revenue": "Salg",
  "total-units": "Salg",
  "avg-revenue-row": "Salg",
  "avg-revenue-unit": "Salg",
  "row-count": "Salg",
  "gross-profit": "Indtjening",
  "gross-margin": "Indtjening",
  "total-costs": "Indtjening",
  result: "Indtjening",
  "gross-profit-unit": "Indtjening",
  "revenue-vs-budget": "Budget",
  "budget-revenue": "Budget",
  "budget-costs": "Budget",
  "budget-result": "Budget",
  "best-product": "Produkter og perioder",
  "best-category": "Produkter og perioder",
  "best-month": "Produkter og perioder",
  "average-order-value": "Produkter og perioder",
};

function selectedLabel(placement: KpiPlacement) {
  return placement === "primary"
    ? "Allerede valgt som primært nøgletal"
    : "Allerede valgt som sekundært nøgletal";
}

function LibraryCard({
  definition,
  evaluation,
  primaryCount,
  secondaryCount,
  onAdd,
}: {
  definition: KpiDefinition;
  evaluation: KpiEvaluation;
  primaryCount: number;
  secondaryCount: number;
  onAdd: (placement: KpiPlacement) => void;
}) {
  const [placementOpen, setPlacementOpen] = useState(false);
  const primaryAvailable = primaryCount < MAX_PRIMARY_KPIS;
  const secondaryAvailable = secondaryCount < MAX_SECONDARY_KPIS;
  const canAdd = evaluation.available && (primaryAvailable || secondaryAvailable);

  function beginAdd() {
    if (!canAdd) return;
    if (primaryAvailable && !secondaryAvailable) return onAdd("primary");
    if (!primaryAvailable && secondaryAvailable) return onAdd("secondary");
    setPlacementOpen(true);
  }

  return (
    <article
      className={`relative rounded-lg border p-4 transition ${
        evaluation.available
          ? "border-slate-200 bg-white shadow-[0_7px_22px_rgba(16,32,51,0.045)] hover:border-slate-300"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <KpiIconBadge definition={definition} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className={`text-sm font-semibold ${evaluation.available ? "text-slate-950" : "text-slate-500"}`}>
                {definition.name}
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">{definition.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                evaluation.available
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {evaluation.available ? "Klar" : "Mangler data"}
            </span>
          </div>
          {!evaluation.available ? (
            <p className="mt-2 text-xs font-medium leading-5 text-amber-800">
              {evaluation.reason ?? definition.requiredFields?.join(", ") ?? "Kan ikke beregnes med de aktuelle data"}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              {definition.isCustom ? "Eget nøgletal" : categoryById[definition.id] ?? "Nøgletal"}
            </p>
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setPlacementOpen(false);
              }}
            >
              <button
                type="button"
                disabled={!canAdd}
                onClick={beginAdd}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {evaluation.available ? "Tilføj" : "Kan ikke tilføjes"}
              </button>
              {placementOpen ? (
                <div className="absolute bottom-11 right-0 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_44px_rgba(16,32,51,0.16)]">
                  <p className="text-xs font-semibold text-slate-900">Hvordan skal nøgletallet vises?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onAdd("primary")}
                      className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-left text-xs font-semibold text-brand-800 hover:bg-brand-100"
                    >
                      Primært
                      <span className="mt-1 block text-[10px] font-medium text-brand-600">
                        {primaryCount} af {MAX_PRIMARY_KPIS} valgt
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdd("secondary")}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      Sekundært
                      <span className="mt-1 block text-[10px] font-medium text-slate-500">
                        {secondaryCount} af {MAX_SECONDARY_KPIS} valgt
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function KpiLibrary({
  definitions,
  selectedPlacements,
  evaluations,
  primaryCount,
  secondaryCount,
  evaluationFor,
  onAdd,
  onCreateCustom,
}: {
  definitions: KpiDefinition[];
  selectedPlacements: Map<string, KpiPlacement>;
  evaluations: Record<string, KpiEvaluation>;
  primaryCount: number;
  secondaryCount: number;
  evaluationFor: (definition: KpiDefinition) => KpiEvaluation;
  onAdd: (id: string, placement: KpiPlacement) => void;
  onCreateCustom: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KpiCategory>("Alle");
  const normalizedQuery = query.trim().toLocaleLowerCase("da-DK");
  const visible = useMemo(
    () =>
      definitions.filter((definition) => {
        const matchesSearch =
          !normalizedQuery ||
          `${definition.name} ${definition.description}`.toLocaleLowerCase("da-DK").includes(normalizedQuery);
        const matchesCategory =
          category === "Alle" ||
          (!definition.isCustom && categoryById[definition.id] === category);
        const selected = selectedPlacements.has(definition.id);
        return matchesSearch && matchesCategory && (!selected || Boolean(normalizedQuery));
      }),
    [category, definitions, normalizedQuery, selectedPlacements],
  );

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Søg efter nøgletal</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søg efter nøgletal"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="button"
          onClick={onCreateCustom}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-200"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Opret eget nøgletal
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer nøgletal efter kategori">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
              category === item
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
            aria-pressed={category === item}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {visible.map((definition) => {
          const placement = selectedPlacements.get(definition.id);
          if (placement) {
            return (
              <div
                key={definition.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-emerald-600">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{definition.name}</p>
                  <p className="mt-0.5 text-xs">{selectedLabel(placement)}</p>
                </div>
              </div>
            );
          }
          return (
            <LibraryCard
              key={definition.id}
              definition={definition}
              evaluation={
                definition.isCustom
                  ? evaluationFor(definition)
                  : evaluations[definition.id] ?? {
                      available: false,
                      value: null,
                      detail: "Kan ikke beregnes",
                      reason: "Kan ikke beregnes med de aktuelle data",
                    }
              }
              primaryCount={primaryCount}
              secondaryCount={secondaryCount}
              onAdd={(nextPlacement) => onAdd(definition.id, nextPlacement)}
            />
          );
        })}
      </div>
      {!visible.length ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-800">Ingen nøgletal matcher din søgning</p>
          <p className="mt-1 text-xs text-slate-500">Prøv et andet ord eller vælg kategorien Alle.</p>
        </div>
      ) : null}
    </section>
  );
}
