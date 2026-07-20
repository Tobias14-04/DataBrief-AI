"use client";

import { GripVertical, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
  MAX_PRIMARY_KPIS,
  type KpiDefinition,
  type KpiPlacement,
} from "@/lib/kpi-customization";
import { KpiIconBadge } from "@/components/kpi-customization/kpi-ui";

function SelectedKpiRow({
  definition,
  index,
  total,
  placement,
  primaryCount,
  onMove,
  onChangePlacement,
  onRemove,
  onDeleteCustom,
}: {
  definition: KpiDefinition;
  index: number;
  total: number;
  placement: KpiPlacement;
  primaryCount: number;
  onMove: (direction: -1 | 1) => void;
  onChangePlacement: () => void;
  onRemove: () => void;
  onDeleteCustom: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const targetPlacement = placement === "primary" ? "secondary" : "primary";
  const targetLabel = targetPlacement === "primary" ? "Flyt til primære" : "Flyt til sekundære";
  const moveToPrimaryDisabled = targetPlacement === "primary" && primaryCount >= MAX_PRIMARY_KPIS;

  function run(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <div className="relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_5px_16px_rgba(16,32,51,0.035)]">
      <span className="cursor-grab text-slate-300" aria-hidden="true">
        <GripVertical className="h-4 w-4" />
      </span>
      <KpiIconBadge definition={definition} size="small" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{definition.name}</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
          {placement === "primary" ? "Primært nøgletal" : "Sekundært nøgletal"}
          {definition.isCustom ? " · Eget nøgletal" : ""}
        </p>
      </div>
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="grid h-9 w-9 place-items-center rounded-md border border-transparent text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
          aria-label={`Handlinger for ${definition.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-10 z-20 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(16,32,51,0.14)]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={moveToPrimaryDisabled}
              onClick={() => run(onChangePlacement)}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {targetLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={index === 0}
              onClick={() => run(() => onMove(-1))}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Flyt op
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={index === total - 1}
              onClick={() => run(() => onMove(1))}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Flyt ned
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onRemove)}
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Fjern fra dashboard
            </button>
            {definition.isCustom ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => run(onDeleteCustom)}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Slet eget nøgletal
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SelectedKpiList({
  title,
  description,
  placement,
  definitions,
  maximum,
  primaryCount,
  onMove,
  onChangePlacement,
  onRemove,
  onDeleteCustom,
}: {
  title: string;
  description: string;
  placement: KpiPlacement;
  definitions: KpiDefinition[];
  maximum: number;
  primaryCount: number;
  onMove: (id: string, direction: -1 | 1) => void;
  onChangePlacement: (id: string) => void;
  onRemove: (id: string) => void;
  onDeleteCustom: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {definitions.length} af {maximum} valgt
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {definitions.map((definition, index) => (
          <SelectedKpiRow
            key={definition.id}
            definition={definition}
            index={index}
            total={definitions.length}
            placement={placement}
            primaryCount={primaryCount}
            onMove={(direction) => onMove(definition.id, direction)}
            onChangePlacement={() => onChangePlacement(definition.id)}
            onRemove={() => onRemove(definition.id)}
            onDeleteCustom={() => onDeleteCustom(definition.id)}
          />
        ))}
        {!definitions.length ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
            Ingen nøgletal er valgt i denne gruppe.
          </div>
        ) : null}
      </div>
    </section>
  );
}
