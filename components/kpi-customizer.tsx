"use client";

import { Eye, Library, RotateCcw, Save, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_PRIMARY_KPIS,
  MAX_SECONDARY_KPIS,
  MIN_PRIMARY_KPIS,
  evaluateFormula,
  standardKpiDefinitions,
  type KpiConfiguration,
  type KpiDefinition,
  type KpiEvaluation,
  type KpiPlacement,
  type KpiSourceRow,
} from "@/lib/kpi-customization";
import { CustomKpiBuilder } from "@/components/kpi-customization/custom-kpi-builder";
import { KpiLibrary } from "@/components/kpi-customization/kpi-library";
import { KpiMiniPreview } from "@/components/kpi-customization/kpi-mini-preview";
import { SelectedKpiList } from "@/components/kpi-customization/selected-kpi-list";

type PanelTab = "selected" | "library" | "preview";

const panelTabs: Array<{
  id: PanelTab;
  label: string;
  icon: typeof SlidersHorizontal;
}> = [
  { id: "selected", label: "Valgte nøgletal", icon: SlidersHorizontal },
  { id: "library", label: "Tilføj nøgletal", icon: Library },
  { id: "preview", label: "Forhåndsvisning", icon: Eye },
];

export function KpiCustomizer({
  open,
  configuration,
  defaults,
  evaluations,
  libraryEvaluations,
  rows,
  numericColumns,
  onClose,
  onSave,
}: {
  open: boolean;
  configuration: KpiConfiguration;
  defaults: KpiConfiguration;
  evaluations: Record<string, KpiEvaluation>;
  libraryEvaluations: Record<string, KpiEvaluation>;
  rows: KpiSourceRow[];
  numericColumns: Array<{ name: string; typeLabel?: string }>;
  onClose: () => void;
  onSave: (configuration: KpiConfiguration) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(configuration);
  const [activeTab, setActiveTab] = useState<PanelTab>("selected");
  const [showBuilder, setShowBuilder] = useState(false);
  const [message, setMessage] = useState("");

  const dirty = JSON.stringify(draft) !== JSON.stringify(configuration);
  const definitions = useMemo(
    () => [...standardKpiDefinitions, ...draft.customKpis],
    [draft.customKpis],
  );
  const definitionMap = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );
  const selectedPlacements = useMemo(() => {
    const placements = new Map<string, KpiPlacement>();
    draft.primaryKpis.forEach((id) => placements.set(id, "primary"));
    draft.secondaryKpis.forEach((id) => placements.set(id, "secondary"));
    return placements;
  }, [draft.primaryKpis, draft.secondaryKpis]);
  const selectedPrimary = draft.primaryKpis
    .map((id) => definitionMap.get(id))
    .filter((definition): definition is KpiDefinition => Boolean(definition));
  const selectedSecondary = draft.secondaryKpis
    .map((id) => definitionMap.get(id))
    .filter((definition): definition is KpiDefinition => Boolean(definition));

  function evaluationFor(definition: KpiDefinition): KpiEvaluation {
    if (!definition.isCustom || !definition.formula) {
      return (
        evaluations[definition.id] ?? {
          available: false,
          value: null,
          detail: "Kan ikke beregnes",
          reason: "Kan ikke beregnes med de aktuelle data.",
        }
      );
    }
    if (!rows.length) {
      return {
        available: false,
        value: null,
        detail: "Ingen filtrerede rækker",
        reason: "Ingen rækker matcher de aktuelle filtre.",
      };
    }
    try {
      return {
        available: true,
        value: evaluateFormula(definition.formula, rows),
        detail: `Beregnet ud fra ${rows.length.toLocaleString("da-DK")} filtrerede rækker`,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Beregningen kunne ikke udføres.";
      return { available: false, value: null, detail: reason, reason };
    }
  }

  const selectedCustomKpisValid = [...selectedPrimary, ...selectedSecondary].every(
    (definition) => !definition.isCustom || evaluationFor(definition).available,
  );
  const canSave =
    selectedPrimary.length >= MIN_PRIMARY_KPIS &&
    selectedPrimary.length <= MAX_PRIMARY_KPIS &&
    selectedSecondary.length <= MAX_SECONDARY_KPIS &&
    selectedCustomKpisValid;

  useEffect(() => {
    if (!open) return;
    setDraft(configuration);
    setActiveTab("selected");
    setShowBuilder(false);
    setMessage("");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [configuration, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (!open) return null;

  function requestClose() {
    if (
      showBuilder &&
      !window.confirm("Vil du lukke uden at gemme det nøgletal, du er ved at oprette?")
    ) {
      return;
    }
    if (
      dirty &&
      !window.confirm("Du har ændringer, der ikke er gemt. Vil du lukke uden at gemme?")
    ) {
      return;
    }
    onClose();
  }

  function updatePlacement(id: string, placement: KpiPlacement | null) {
    setMessage("");
    setDraft((current) => {
      const currentPrimary = current.primaryKpis.filter((kpiId) => kpiId !== id);
      const currentSecondary = current.secondaryKpis.filter((kpiId) => kpiId !== id);
      if (placement === "primary" && currentPrimary.length >= MAX_PRIMARY_KPIS) {
        setMessage("Du kan højst vælge 4 primære nøgletal.");
        return current;
      }
      if (placement === "secondary" && currentSecondary.length >= MAX_SECONDARY_KPIS) {
        setMessage("Du kan højst vælge 6 sekundære nøgletal.");
        return current;
      }
      return {
        ...current,
        primaryKpis:
          placement === "primary" ? [...currentPrimary, id] : currentPrimary,
        secondaryKpis:
          placement === "secondary" ? [...currentSecondary, id] : currentSecondary,
        customKpis: placement
          ? current.customKpis.map((definition) =>
              definition.id === id ? { ...definition, placement } : definition,
            )
          : current.customKpis,
      };
    });
  }

  function move(id: string, placement: KpiPlacement, direction: -1 | 1) {
    setMessage("");
    setDraft((current) => {
      const key = placement === "primary" ? "primaryKpis" : "secondaryKpis";
      const list = [...current[key]];
      const index = list.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return current;
      [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
      return { ...current, [key]: list };
    });
  }

  function deleteCustom(id: string) {
    setMessage("");
    setDraft((current) => ({
      ...current,
      primaryKpis: current.primaryKpis.filter((kpiId) => kpiId !== id),
      secondaryKpis: current.secondaryKpis.filter((kpiId) => kpiId !== id),
      customKpis: current.customKpis.filter((definition) => definition.id !== id),
    }));
  }

  function addCustom(definition: KpiDefinition) {
    setDraft((current) => ({
      ...current,
      customKpis: [...current.customKpis, definition],
      primaryKpis:
        definition.placement === "primary"
          ? [...current.primaryKpis, definition.id]
          : current.primaryKpis,
      secondaryKpis:
        definition.placement === "secondary"
          ? [...current.secondaryKpis, definition.id]
          : current.secondaryKpis,
    }));
    setShowBuilder(false);
    setActiveTab("selected");
    setMessage(`${definition.name} er føjet til dashboardet.`);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && requestClose()}
    >
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-customizer-title"
        className="relative ml-auto flex h-full w-full flex-col border-l border-slate-200 bg-[#f4f8f9] shadow-[-28px_0_80px_rgba(16,32,51,0.18)] sm:max-w-[880px]"
      >
        {showBuilder ? (
          <CustomKpiBuilder
            existingDefinitions={definitions}
            rows={rows}
            numericColumns={numericColumns}
            primaryCount={selectedPrimary.length}
            secondaryCount={selectedSecondary.length}
            onBack={() => setShowBuilder(false)}
            onClose={requestClose}
            onAdd={addCustom}
          />
        ) : (
          <>
            <header className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 sm:px-7 sm:pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                    <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="kpi-customizer-title" className="text-xl font-semibold text-slate-950">
                      Tilpas nøgletal
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      Vælg, hvilke resultater der skal fremhæves på dashboardet.
                    </p>
                    <p className="mt-1.5 text-xs font-semibold text-brand-700">
                      {selectedPrimary.length} primære · {selectedSecondary.length} sekundære
                    </p>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={requestClose}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  aria-label="Luk Tilpas nøgletal"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div
                className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
                role="tablist"
                aria-label="Områder i Tilpas nøgletal"
              >
                {panelTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`kpi-panel-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMessage("");
                      }}
                      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-xs font-semibold transition sm:text-sm ${
                        activeTab === tab.id
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="h-3" />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
              {message ? (
                <div
                  role="status"
                  className="mx-auto mb-4 max-w-3xl rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
                >
                  {message}
                </div>
              ) : null}

              {activeTab === "selected" ? (
                <div
                  id="kpi-panel-selected"
                  role="tabpanel"
                  className="mx-auto w-full max-w-3xl space-y-4"
                >
                  <SelectedKpiList
                    title="Primære nøgletal"
                    description="De store nøgletalskort øverst på dashboardet."
                    placement="primary"
                    definitions={selectedPrimary}
                    maximum={MAX_PRIMARY_KPIS}
                    primaryCount={selectedPrimary.length}
                    onMove={(id, direction) => move(id, "primary", direction)}
                    onChangePlacement={(id) => updatePlacement(id, "secondary")}
                    onRemove={(id) => updatePlacement(id, null)}
                    onDeleteCustom={deleteCustom}
                  />
                  <SelectedKpiList
                    title="Sekundære nøgletal"
                    description="Kompakte nøgletal, der supplerer overblikket."
                    placement="secondary"
                    definitions={selectedSecondary}
                    maximum={MAX_SECONDARY_KPIS}
                    primaryCount={selectedPrimary.length}
                    onMove={(id, direction) => move(id, "secondary", direction)}
                    onChangePlacement={(id) => updatePlacement(id, "primary")}
                    onRemove={(id) => updatePlacement(id, null)}
                    onDeleteCustom={deleteCustom}
                  />
                </div>
              ) : null}

              {activeTab === "library" ? (
                <div id="kpi-panel-library" role="tabpanel">
                  <KpiLibrary
                    definitions={definitions}
                    selectedPlacements={selectedPlacements}
                    evaluations={libraryEvaluations}
                    primaryCount={selectedPrimary.length}
                    secondaryCount={selectedSecondary.length}
                    evaluationFor={evaluationFor}
                    onAdd={updatePlacement}
                    onCreateCustom={() => setShowBuilder(true)}
                  />
                </div>
              ) : null}

              {activeTab === "preview" ? (
                <div id="kpi-panel-preview" role="tabpanel">
                  <KpiMiniPreview
                    primary={selectedPrimary}
                    secondary={selectedSecondary}
                    evaluationFor={evaluationFor}
                  />
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="min-h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Annuller
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(defaults);
                      setMessage("Standardopsætningen er gendannet. Gem for at anvende den.");
                      setActiveTab("selected");
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Nulstil standard
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    disabled={!canSave || !dirty}
                    onClick={() => onSave(draft)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-700 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.2)] hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Gem dashboard
                  </button>
                  <p
                    className={`text-[11px] font-medium ${
                      !canSave ? "text-amber-700" : dirty ? "text-slate-500" : "text-emerald-700"
                    }`}
                  >
                    {!canSave
                      ? !selectedCustomKpisValid
                        ? "Et valgt eget nøgletal kan ikke beregnes med de aktuelle data."
                        : "Vælg mindst 2 og højst 4 primære nøgletal."
                      : dirty
                        ? "Du har ændringer, der ikke er gemt."
                        : "Alle ændringer er gemt."}
                  </p>
                </div>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
