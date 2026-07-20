"use client";

import {
  ArrowDown,
  ArrowUp,
  Calculator,
  ChevronRight,
  CircleDollarSign,
  GripVertical,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_PRIMARY_KPIS,
  MAX_SECONDARY_KPIS,
  MIN_PRIMARY_KPIS,
  evaluateFormula,
  formatNumber,
  formulaToText,
  standardKpiDefinitions,
  type AggregateFunction,
  type FormulaOperator,
  type KpiColor,
  type KpiConfiguration,
  type KpiDefinition,
  type KpiEvaluation,
  type KpiFormat,
  type KpiFormula,
  type KpiIcon,
  type KpiPlacement,
  type KpiSourceRow,
} from "@/lib/kpi-customization";

type FormulaTerm = {
  id: string;
  operator: FormulaOperator;
  kind: "aggregate" | "number";
  aggregate: AggregateFunction;
  column: string;
  numberValue: string;
};

type CustomDraft = {
  name: string;
  description: string;
  placement: KpiPlacement;
  format: Exclude<KpiFormat, "text">;
  decimals: 0 | 1 | 2;
  icon: KpiIcon;
  color: KpiColor;
  terms: FormulaTerm[];
};

const newTerm = (operator: FormulaOperator = "/"): FormulaTerm => ({
  id: `${Date.now()}-${Math.random()}`,
  operator,
  kind: "aggregate",
  aggregate: "SUM",
  column: "",
  numberValue: "1",
});

const emptyCustomDraft = (): CustomDraft => ({
  name: "",
  description: "",
  placement: "secondary",
  format: "currency",
  decimals: 0,
  icon: "calculator",
  color: "purple",
  terms: [newTerm()],
});

const iconMap: Record<KpiIcon, LucideIcon> = {
  revenue: CircleDollarSign,
  profit: TrendingUp,
  target: Target,
  units: PackageCheck,
  calculator: Calculator,
};

const colorStyles: Record<KpiColor, { icon: string; accent: string; text: string }> = {
  cyan: { icon: "border-cyan-200 bg-cyan-50 text-cyan-700", accent: "bg-cyan-500", text: "text-cyan-700" },
  green: { icon: "border-emerald-200 bg-emerald-50 text-emerald-700", accent: "bg-emerald-500", text: "text-emerald-700" },
  orange: { icon: "border-orange-200 bg-orange-50 text-orange-700", accent: "bg-orange-500", text: "text-orange-700" },
  navy: { icon: "border-slate-200 bg-slate-100 text-slate-800", accent: "bg-slate-500", text: "text-slate-600" },
  purple: { icon: "border-violet-200 bg-violet-50 text-violet-700", accent: "bg-violet-500", text: "text-violet-700" },
};

function createFormula(terms: FormulaTerm[]): KpiFormula {
  const operand = (term: FormulaTerm): KpiFormula =>
    term.kind === "number"
      ? { type: "number", value: Number(term.numberValue) }
      : { type: "aggregate", function: term.aggregate, column: term.column };

  return terms.slice(1).reduce<KpiFormula>(
    (formula, term) => ({ type: "binary", operator: term.operator, left: formula, right: operand(term) }),
    operand(terms[0]),
  );
}

function KpiPreviewCard({
  definition,
  evaluation,
  compact = false,
}: {
  definition: KpiDefinition;
  evaluation: KpiEvaluation;
  compact?: boolean;
}) {
  const Icon = iconMap[definition.icon];
  const styles = colorStyles[definition.color];
  return (
    <div className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_rgba(16,32,51,0.06)] ${compact ? "p-3.5" : "p-4"}`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${styles.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-right text-xs font-semibold leading-4 text-slate-600">{definition.name}</p>
      </div>
      <p className={`${compact ? "mt-3 text-lg" : "mt-4 text-2xl"} break-words font-semibold text-slate-950`}>
        {evaluation.available && evaluation.value !== null
          ? formatNumber(evaluation.value, definition.format, definition.decimals)
          : "Kan ikke beregnes"}
      </p>
      <p className={`mt-3 border-t border-slate-100 pt-2.5 text-[11px] font-medium leading-4 ${evaluation.available ? styles.text : "text-amber-700"}`}>
        {evaluation.available ? evaluation.detail : evaluation.reason}
      </p>
    </div>
  );
}

function OrderRow({
  definition,
  index,
  total,
  placement,
  onMove,
  onChangePlacement,
  onRemove,
}: {
  definition: KpiDefinition;
  index: number;
  total: number;
  placement: KpiPlacement;
  onMove: (direction: -1 | 1) => void;
  onChangePlacement: () => void;
  onRemove: () => void;
}) {
  const Icon = iconMap[definition.icon];
  const styles = colorStyles[definition.color];
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_5px_16px_rgba(16,32,51,0.035)]">
      <span className={`grid h-8 w-8 place-items-center rounded-md border ${styles.icon}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{definition.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{placement === "primary" ? "Primært nøgletal" : "Sekundært nøgletal"}</p>
      </div>
      <div className="flex items-center gap-1">
        <GripVertical className="hidden h-4 w-4 text-slate-300 sm:block" aria-hidden="true" />
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Flyt ${definition.name} op`}>
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Flyt ${definition.name} ned`}>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onChangePlacement} className="grid h-8 w-8 place-items-center rounded-md text-brand-700 hover:bg-brand-50" aria-label={`Flyt ${definition.name} til ${placement === "primary" ? "sekundære" : "primære"} nøgletal`}>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Fjern ${definition.name}`}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function KpiCustomizer({
  open,
  configuration,
  defaults,
  evaluations,
  rows,
  numericColumns,
  onClose,
  onSave,
}: {
  open: boolean;
  configuration: KpiConfiguration;
  defaults: KpiConfiguration;
  evaluations: Record<string, KpiEvaluation>;
  rows: KpiSourceRow[];
  numericColumns: Array<{ name: string; typeLabel?: string }>;
  onClose: () => void;
  onSave: (configuration: KpiConfiguration) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(configuration);
  const [message, setMessage] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(emptyCustomDraft);
  const [builderError, setBuilderError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(configuration);
  const definitions = useMemo(
    () => [...standardKpiDefinitions, ...draft.customKpis],
    [draft.customKpis],
  );
  const definitionMap = useMemo(() => new Map(definitions.map((definition) => [definition.id, definition])), [definitions]);

  useEffect(() => {
    if (!open) return;
    setDraft(configuration);
    setMessage("");
    setBuilderError("");
    setShowBuilder(false);
    setCustomDraft(emptyCustomDraft());
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
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden"));
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
    if (!dirty || window.confirm("Du har ændringer, der ikke er gemt. Vil du lukke uden at gemme?")) onClose();
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
        primaryKpis: placement === "primary" ? [...currentPrimary, id] : currentPrimary,
        secondaryKpis: placement === "secondary" ? [...currentSecondary, id] : currentSecondary,
        customKpis: placement
          ? current.customKpis.map((definition) => definition.id === id ? { ...definition, placement } : definition)
          : current.customKpis,
      };
    });
  }

  function move(id: string, placement: KpiPlacement, direction: -1 | 1) {
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

  function removeCustom(id: string) {
    setDraft((current) => ({
      ...current,
      primaryKpis: current.primaryKpis.filter((kpiId) => kpiId !== id),
      secondaryKpis: current.secondaryKpis.filter((kpiId) => kpiId !== id),
      customKpis: current.customKpis.filter((definition) => definition.id !== id),
    }));
  }

  function evaluationFor(definition: KpiDefinition): KpiEvaluation {
    if (!definition.isCustom || !definition.formula) return evaluations[definition.id] ?? { available: false, value: null, detail: "Kan ikke beregnes", reason: "Kan ikke beregnes" };
    if (!rows.length) return { available: false, value: null, detail: "Ingen filtrerede rækker", reason: "Ingen rækker matcher de aktuelle filtre." };
    try {
      return { available: true, value: evaluateFormula(definition.formula, rows), detail: `Beregnet ud fra ${rows.length.toLocaleString("da-DK")} filtrerede rækker` };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Beregningen kunne ikke udføres.";
      return { available: false, value: null, detail: reason, reason };
    }
  }

  let liveFormula: KpiFormula | null = null;
  let liveEvaluation: KpiEvaluation = { available: false, value: null, detail: "Vælg en kolonne", reason: "Vælg en kolonne til beregningen." };
  try {
    liveFormula = createFormula(customDraft.terms);
    if (!rows.length) throw new Error("Ingen rækker matcher de aktuelle filtre.");
    const value = evaluateFormula(liveFormula, rows);
    liveEvaluation = { available: true, value, detail: `Beregnet ud fra ${rows.length.toLocaleString("da-DK")} filtrerede rækker` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Beregningen kunne ikke udføres.";
    liveEvaluation = { available: false, value: null, detail: reason, reason };
  }

  const liveDefinition: KpiDefinition = {
    id: "preview",
    name: customDraft.name || "Nyt nøgletal",
    description: customDraft.description || "Live-forhåndsvisning",
    placement: customDraft.placement,
    format: customDraft.format,
    decimals: customDraft.decimals,
    icon: customDraft.icon,
    color: customDraft.color,
    formula: liveFormula ?? undefined,
    isCustom: true,
  };

  function addCustomKpi() {
    const name = customDraft.name.trim();
    if (!name) return setBuilderError("Giv nøgletallet et navn.");
    if (definitions.some((definition) => definition.name.toLocaleLowerCase("da-DK") === name.toLocaleLowerCase("da-DK"))) {
      return setBuilderError("Der findes allerede et nøgletal med dette navn.");
    }
    if (!liveFormula || !liveEvaluation.available) return setBuilderError(liveEvaluation.reason ?? "Beregningen er ikke gyldig.");
    if (customDraft.placement === "primary" && draft.primaryKpis.length >= MAX_PRIMARY_KPIS) return setBuilderError("Du kan højst vælge 4 primære nøgletal.");
    if (customDraft.placement === "secondary" && draft.secondaryKpis.length >= MAX_SECONDARY_KPIS) return setBuilderError("Du kan højst vælge 6 sekundære nøgletal.");
    const id = `custom-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const definition = { ...liveDefinition, id, name, description: customDraft.description.trim() || "Brugerdefineret nøgletal", formula: liveFormula };
    setDraft((current) => ({
      ...current,
      customKpis: [...current.customKpis, definition],
      primaryKpis: customDraft.placement === "primary" ? [...current.primaryKpis, id] : current.primaryKpis,
      secondaryKpis: customDraft.placement === "secondary" ? [...current.secondaryKpis, id] : current.secondaryKpis,
    }));
    setCustomDraft(emptyCustomDraft());
    setBuilderError("");
    setShowBuilder(false);
  }

  const selectedPrimary = draft.primaryKpis.map((id) => definitionMap.get(id)).filter((definition): definition is KpiDefinition => Boolean(definition));
  const selectedSecondary = draft.secondaryKpis.map((id) => definitionMap.get(id)).filter((definition): definition is KpiDefinition => Boolean(definition));
  const canSave = selectedPrimary.length >= MIN_PRIMARY_KPIS && selectedPrimary.length <= MAX_PRIMARY_KPIS && selectedSecondary.length <= MAX_SECONDARY_KPIS;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="kpi-customizer-title" className="relative ml-auto flex h-full w-full flex-col border-l border-slate-200 bg-[#f4f8f9] shadow-[-28px_0_80px_rgba(16,32,51,0.18)] sm:max-w-[760px]">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="kpi-customizer-title" className="text-xl font-semibold text-slate-950">Tilpas nøgletal</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">Vælg, hvilke resultater der skal fremhæves på dashboardet.</p>
                <p className="mt-2 text-xs font-semibold text-brand-700">{draft.primaryKpis.length} primære · {draft.secondaryKpis.length} sekundære</p>
              </div>
            </div>
            <button ref={closeRef} type="button" onClick={requestClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200" aria-label="Luk Tilpas nøgletal">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-4 sm:p-6">
            {message ? <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{message}</div> : null}

            {([
              ["primary", "1", "Primære nøgletal", "Vælg 2–4 store kort øverst på dashboardet.", selectedPrimary],
              ["secondary", "2", "Sekundære nøgletal", "Vælg op til 6 kompakte nøgletal.", selectedSecondary],
            ] as const).map(([placement, number, title, description, selected]) => (
              <section key={placement} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-brand-100 bg-white text-xs font-semibold text-brand-700">{number}</span>
                  <div>
                    <h3 className="font-semibold text-slate-950">{title}</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {selected.map((definition, index) => (
                    <OrderRow
                      key={definition.id}
                      definition={definition}
                      index={index}
                      total={selected.length}
                      placement={placement}
                      onMove={(direction) => move(definition.id, placement, direction)}
                      onChangePlacement={() => updatePlacement(definition.id, placement === "primary" ? "secondary" : "primary")}
                      onRemove={() => updatePlacement(definition.id, null)}
                    />
                  ))}
                  {!selected.length ? <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-xs text-slate-500">Ingen nøgletal valgt</p> : null}
                </div>
              </section>
            ))}

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(16,32,51,0.05)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-brand-100 bg-brand-50 text-xs font-semibold text-brand-700">+</span>
                <div>
                  <h3 className="font-semibold text-slate-950">Tilgængelige standardnøgletal</h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Utilgængelige nøgletal forklarer, hvilke data der mangler.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                {standardKpiDefinitions.map((definition) => {
                  const evaluation = evaluations[definition.id];
                  const placement = draft.primaryKpis.includes(definition.id) ? "primary" : draft.secondaryKpis.includes(definition.id) ? "secondary" : null;
                  const Icon = iconMap[definition.icon];
                  return (
                    <article key={definition.id} className={`rounded-lg border p-3.5 ${evaluation?.available ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-slate-100/70 opacity-75"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${colorStyles[definition.color].icon}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{definition.name}</h4>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${placement ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-600"}`}>
                              {placement === "primary" ? "Primær" : placement === "secondary" ? "Sekundær" : "Ikke valgt"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-slate-500">{definition.description}</p>
                          <p className={`mt-2 text-[11px] font-semibold ${evaluation?.available ? "text-emerald-700" : "text-amber-700"}`}>
                            {evaluation?.available ? "Klar" : evaluation?.reason ?? "Mangler data"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" disabled={!evaluation?.available} onClick={() => updatePlacement(definition.id, placement === "primary" ? null : "primary")} className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${placement === "primary" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
                          {placement === "primary" ? "Fjern primær" : "Vælg primær"}
                        </button>
                        <button type="button" disabled={!evaluation?.available} onClick={() => updatePlacement(definition.id, placement === "secondary" ? null : "secondary")} className={`min-h-9 rounded-md border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${placement === "secondary" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
                          {placement === "secondary" ? "Fjern sekundær" : "Vælg sekundær"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(16,32,51,0.05)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-violet-100 bg-violet-50 text-xs font-semibold text-violet-700">3</span>
                  <div>
                    <h3 className="font-semibold text-slate-950">Egne nøgletal</h3>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">Byg en sikker beregning med registrerede talkolonner.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowBuilder((current) => !current)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Opret eget nøgletal
                </button>
              </div>

              {draft.customKpis.length ? (
                <div className="mt-4 space-y-2">
                  {draft.customKpis.map((definition) => (
                    <div key={definition.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{definition.name}</p>
                        <p className={`mt-0.5 text-[11px] font-medium ${evaluationFor(definition).available ? "text-emerald-700" : "text-amber-700"}`}>
                          {evaluationFor(definition).available ? formulaToText(definition.formula!) : evaluationFor(definition).reason}
                        </p>
                      </div>
                      <button type="button" onClick={() => removeCustom(definition.id)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Slet ${definition.name}`}>
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {showBuilder ? (
                <div className="mt-5 space-y-5 rounded-lg border border-violet-100 bg-[#faf9ff] p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Trin 1 · Navn og visning</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-600">Navn på nøgletal
                        <input value={customDraft.name} onChange={(event) => setCustomDraft((current) => ({ ...current, name: event.target.value }))} aria-describedby={builderError ? "custom-kpi-error" : undefined} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">Kort beskrivelse
                        <input value={customDraft.description} onChange={(event) => setCustomDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                      </label>
                      <label className="text-xs font-semibold text-slate-600">Placering
                        <select value={customDraft.placement} onChange={(event) => setCustomDraft((current) => ({ ...current, placement: event.target.value as KpiPlacement }))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
                          <option value="primary">Primær</option><option value="secondary">Sekundær</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-600">Format
                        <select value={customDraft.format} onChange={(event) => setCustomDraft((current) => ({ ...current, format: event.target.value as CustomDraft["format"] }))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
                          <option value="currency">Kr.</option><option value="percent">Procent</option><option value="integer">Helt tal</option><option value="decimal">Decimal</option><option value="count">Antal</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-600">Antal decimaler
                        <select value={customDraft.decimals} onChange={(event) => setCustomDraft((current) => ({ ...current, decimals: Number(event.target.value) as 0 | 1 | 2 }))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
                          <option value={0}>0</option><option value={1}>1</option><option value={2}>2</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-600">Accentfarve
                        <select value={customDraft.color} onChange={(event) => setCustomDraft((current) => ({ ...current, color: event.target.value as KpiColor }))} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900">
                          <option value="cyan">Cyan</option><option value="green">Grøn</option><option value="orange">Orange</option><option value="navy">Navy</option><option value="purple">Lilla</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-violet-100 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Trin 2 · Byg beregningen</p>
                    <div className="mt-3 space-y-3">
                      {customDraft.terms.map((term, index) => (
                        <div key={term.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[110px_120px_minmax(0,1fr)_auto]">
                          {index ? (
                            <select aria-label={`Operator for led ${index + 1}`} value={term.operator} onChange={(event) => setCustomDraft((current) => ({ ...current, terms: current.terms.map((item) => item.id === term.id ? { ...item, operator: event.target.value as FormulaOperator } : item) }))} className="h-10 rounded-md border border-slate-200 px-2 text-sm">
                              <option value="+">Plus</option><option value="-">Minus</option><option value="*">Gange</option><option value="/">Divideret med</option>
                            </select>
                          ) : <span className="flex h-10 items-center text-xs font-semibold text-slate-500">Første led</span>}
                          <select aria-label={`Type for led ${index + 1}`} value={term.kind} onChange={(event) => setCustomDraft((current) => ({ ...current, terms: current.terms.map((item) => item.id === term.id ? { ...item, kind: event.target.value as FormulaTerm["kind"] } : item) }))} className="h-10 rounded-md border border-slate-200 px-2 text-sm">
                            <option value="aggregate">Kolonne</option><option value="number">Fast tal</option>
                          </select>
                          {term.kind === "aggregate" ? (
                            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                              <select aria-label={`Funktion for led ${index + 1}`} value={term.aggregate} onChange={(event) => setCustomDraft((current) => ({ ...current, terms: current.terms.map((item) => item.id === term.id ? { ...item, aggregate: event.target.value as AggregateFunction } : item) }))} className="h-10 rounded-md border border-slate-200 px-2 text-sm">
                                <option value="SUM">Sum</option><option value="AVG">Gennemsnit</option><option value="COUNT">Antal</option><option value="COUNT_UNIQUE">Antal unikke</option><option value="MIN">Minimum</option><option value="MAX">Maksimum</option>
                              </select>
                              <select aria-label={`Kolonne for led ${index + 1}`} value={term.column} onChange={(event) => setCustomDraft((current) => ({ ...current, terms: current.terms.map((item) => item.id === term.id ? { ...item, column: event.target.value } : item) }))} className="h-10 min-w-0 rounded-md border border-slate-200 px-2 text-sm">
                                <option value="">Vælg kolonne</option>
                                {numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}{column.typeLabel ? ` · ${column.typeLabel}` : ""}</option>)}
                              </select>
                            </div>
                          ) : (
                            <input aria-label={`Tal for led ${index + 1}`} type="number" value={term.numberValue} onChange={(event) => setCustomDraft((current) => ({ ...current, terms: current.terms.map((item) => item.id === term.id ? { ...item, numberValue: event.target.value } : item) }))} className="h-10 rounded-md border border-slate-200 px-3 text-sm" />
                          )}
                          <button type="button" disabled={customDraft.terms.length === 1} onClick={() => setCustomDraft((current) => ({ ...current, terms: current.terms.filter((item) => item.id !== term.id) }))} className="grid h-10 w-10 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label={`Fjern beregningsled ${index + 1}`}>
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" disabled={customDraft.terms.length >= 3} onClick={() => setCustomDraft((current) => ({ ...current, terms: [...current.terms, newTerm()] }))} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-violet-300 disabled:opacity-40">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Tilføj beregningsled
                    </button>
                    {liveFormula ? <p className="mt-3 rounded-md bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">{formulaToText(liveFormula)}</p> : null}
                  </div>

                  <div className="border-t border-violet-100 pt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">Trin 3 · Live-forhåndsvisning</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <KpiPreviewCard definition={liveDefinition} evaluation={liveEvaluation} />
                      <button type="button" onClick={addCustomKpi} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-300">
                        <Sparkles className="h-4 w-4" aria-hidden="true" /> Tilføj nøgletal
                      </button>
                    </div>
                    {builderError ? <p id="custom-kpi-error" role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{builderError}</p> : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(16,32,51,0.05)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-brand-100 bg-brand-50 text-xs font-semibold text-brand-700">4</span>
                <div>
                  <h3 className="font-semibold text-slate-950">Forhåndsvisning</h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Kortene bruger den aktuelle filtrerede datavisning.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedPrimary.map((definition) => <KpiPreviewCard key={definition.id} definition={definition} evaluation={evaluationFor(definition)} />)}
              </div>
              {selectedSecondary.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedSecondary.map((definition) => <KpiPreviewCard key={definition.id} definition={definition} evaluation={evaluationFor(definition)} compact />)}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-14px_32px_rgba(16,32,51,0.08)] backdrop-blur sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={requestClose} className="min-h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuller</button>
              <button type="button" onClick={() => { setDraft(defaults); setMessage(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Nulstil standard
              </button>
            </div>
            <button type="button" disabled={!canSave} onClick={() => onSave(draft)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-700 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.2)] hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-4 w-4" aria-hidden="true" />
              Gem dashboard
            </button>
          </div>
          {!canSave ? <p className="mt-2 text-center text-[11px] font-medium text-amber-700 sm:text-right">Vælg mindst 2 og højst 4 primære nøgletal.</p> : null}
        </footer>
      </aside>
    </div>
  );
}
