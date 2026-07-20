"use client";

import {
  formatNumber,
  type KpiDefinition,
  type KpiEvaluation,
} from "@/lib/kpi-customization";
import { KpiIconBadge, KpiMiniCard } from "@/components/kpi-customization/kpi-ui";

export function KpiMiniPreview({
  primary,
  secondary,
  evaluationFor,
}: {
  primary: KpiDefinition[];
  secondary: KpiDefinition[];
  evaluationFor: (definition: KpiDefinition) => KpiEvaluation;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase text-brand-700">Forhåndsvisning</p>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Sådan vises nøgletallene på dashboardet</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Værdierne følger de filtre, der er aktive i dashboardet lige nu.
        </p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {primary.map((definition) => (
          <KpiMiniCard
            key={definition.id}
            definition={definition}
            evaluation={evaluationFor(definition)}
          />
        ))}
      </div>
      {secondary.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {secondary.map((definition) => {
            const evaluation = evaluationFor(definition);
            return (
              <div
                key={definition.id}
                className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <KpiIconBadge definition={definition} size="small" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{definition.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {evaluation.available && evaluation.value !== null
                      ? formatNumber(evaluation.value, definition.format, definition.decimals)
                      : "Kan ikke beregnes"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
