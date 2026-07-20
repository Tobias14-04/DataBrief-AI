"use client";

import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  MAX_PRIMARY_KPIS,
  MAX_SECONDARY_KPIS,
  evaluateFormula,
  formulaToDanishText,
  formulaToText,
  type AggregateFunction,
  type FormulaOperator,
  type KpiColor,
  type KpiDefinition,
  type KpiFormat,
  type KpiFormula,
  type KpiPlacement,
  type KpiSourceRow,
} from "@/lib/kpi-customization";
import { KpiMiniCard, kpiColorStyles } from "@/components/kpi-customization/kpi-ui";

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
  color: KpiColor;
  terms: FormulaTerm[];
};

const stepNames = ["Navn og visning", "Beregning", "Forhåndsvisning", "Gem"];
const aggregateOptions: Array<{ value: AggregateFunction; label: string }> = [
  { value: "SUM", label: "Sum" },
  { value: "AVG", label: "Gennemsnit" },
  { value: "COUNT", label: "Antal" },
  { value: "COUNT_UNIQUE", label: "Antal unikke" },
  { value: "MIN", label: "Minimum" },
  { value: "MAX", label: "Maksimum" },
];
const operatorOptions: Array<{ value: FormulaOperator; label: string }> = [
  { value: "+", label: "Plus" },
  { value: "-", label: "Minus" },
  { value: "*", label: "Gange" },
  { value: "/", label: "Divideret med" },
];
const formatOptions: Array<{ value: CustomDraft["format"]; label: string }> = [
  { value: "currency", label: "Kr." },
  { value: "percent", label: "Procent" },
  { value: "integer", label: "Helt tal" },
  { value: "decimal", label: "Decimal" },
  { value: "count", label: "Antal" },
];
const colorOptions: Array<{ value: KpiColor; label: string }> = [
  { value: "cyan", label: "Cyan" },
  { value: "green", label: "Grøn" },
  { value: "orange", label: "Orange" },
  { value: "navy", label: "Navy" },
  { value: "purple", label: "Lilla" },
];

function newTerm(operator: FormulaOperator = "/"): FormulaTerm {
  return {
    id: `${Date.now()}-${Math.random()}`,
    operator,
    kind: "aggregate",
    aggregate: "SUM",
    column: "",
    numberValue: "1",
  };
}

function createFormula(terms: FormulaTerm[]): KpiFormula {
  const operand = (term: FormulaTerm): KpiFormula =>
    term.kind === "number"
      ? { type: "number", value: Number(term.numberValue) }
      : { type: "aggregate", function: term.aggregate, column: term.column };

  return terms.slice(1).reduce<KpiFormula>(
    (formula, term) => ({
      type: "binary",
      operator: term.operator,
      left: formula,
      right: operand(term),
    }),
    operand(terms[0]),
  );
}

function isTermComplete(term: FormulaTerm) {
  return term.kind === "number"
    ? term.numberValue.trim() !== "" && Number.isFinite(Number(term.numberValue))
    : Boolean(term.column);
}

export function CustomKpiBuilder({
  existingDefinitions,
  rows,
  numericColumns,
  primaryCount,
  secondaryCount,
  onBack,
  onClose,
  onAdd,
}: {
  existingDefinitions: KpiDefinition[];
  rows: KpiSourceRow[];
  numericColumns: Array<{ name: string; typeLabel?: string }>;
  primaryCount: number;
  secondaryCount: number;
  onBack: () => void;
  onClose: () => void;
  onAdd: (definition: KpiDefinition) => void;
}) {
  const [step, setStep] = useState(0);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [draft, setDraft] = useState<CustomDraft>({
    name: "",
    description: "",
    placement: secondaryCount < MAX_SECONDARY_KPIS ? "secondary" : "primary",
    format: "currency",
    decimals: 0,
    color: "purple",
    terms: [newTerm()],
  });

  const trimmedName = draft.name.trim();
  const duplicateName = existingDefinitions.some(
    (definition) =>
      definition.name.toLocaleLowerCase("da-DK") === trimmedName.toLocaleLowerCase("da-DK"),
  );
  const formulaComplete = draft.terms.length > 0 && draft.terms.every(isTermComplete);
  const formula = useMemo(
    () => (formulaComplete ? createFormula(draft.terms) : null),
    [draft.terms, formulaComplete],
  );
  const evaluation = useMemo(() => {
    if (!formula) return { state: "empty" as const, value: null, message: "" };
    if (!rows.length) {
      return {
        state: "error" as const,
        value: null,
        message: "Ingen rækker matcher de aktuelle dashboardfiltre.",
      };
    }
    try {
      return {
        state: "ready" as const,
        value: evaluateFormula(formula, rows),
        message: `Beregnet ud fra ${rows.length.toLocaleString("da-DK")} filtrerede rækker`,
      };
    } catch (error) {
      return {
        state: "error" as const,
        value: null,
        message: error instanceof Error ? error.message : "Beregningen kunne ikke udføres.",
      };
    }
  }, [formula, rows]);

  const placementAvailable =
    draft.placement === "primary"
      ? primaryCount < MAX_PRIMARY_KPIS
      : secondaryCount < MAX_SECONDARY_KPIS;
  const allValid =
    Boolean(trimmedName) &&
    !duplicateName &&
    formulaComplete &&
    evaluation.state === "ready" &&
    placementAvailable;

  const nameError =
    attemptedStep === 0 && !trimmedName
      ? "Giv nøgletallet et navn."
      : attemptedStep === 0 && duplicateName
        ? "Der findes allerede et nøgletal med dette navn."
        : "";

  function requestBack() {
    const hasChanges =
      Boolean(draft.name || draft.description || draft.terms.some((term) => term.column)) ||
      draft.terms.length > 1;
    if (!hasChanges || window.confirm("Vil du forlade nøgletallet uden at gemme?")) onBack();
  }

  function continueFlow() {
    setAttemptedStep(step);
    if (step === 0 && (!trimmedName || duplicateName || !placementAvailable)) return;
    if (step === 1 && (!formulaComplete || evaluation.state !== "ready")) return;
    setAttemptedStep(null);
    setStep((current) => Math.min(3, current + 1));
  }

  function addTerm() {
    if (draft.terms.length >= 4) return;
    setDraft((current) => ({ ...current, terms: [...current.terms, newTerm()] }));
  }

  function updateTerm(id: string, patch: Partial<FormulaTerm>) {
    setDraft((current) => ({
      ...current,
      terms: current.terms.map((term) => (term.id === id ? { ...term, ...patch } : term)),
    }));
  }

  function save() {
    if (!allValid || !formula) return;
    onAdd({
      id: `custom-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      name: trimmedName,
      description: draft.description.trim() || "Brugerdefineret nøgletal",
      placement: draft.placement,
      format: draft.format,
      decimals: draft.decimals,
      icon: "calculator",
      color: draft.color,
      category: "Brugerdefinerede",
      formula,
      isCustom: true,
    });
  }

  const previewDefinition: KpiDefinition = {
    id: "custom-preview",
    name: trimmedName || "Nyt nøgletal",
    description: draft.description.trim() || "Brugerdefineret nøgletal",
    placement: draft.placement,
    format: draft.format,
    decimals: draft.decimals,
    icon: "calculator",
    color: draft.color,
    formula: formula ?? undefined,
    isCustom: true,
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f8f9]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={requestBack}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200"
              aria-label="Tilbage til nøgletal"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div>
              <h2 id="kpi-customizer-title" className="text-xl font-semibold text-slate-950">Opret eget nøgletal</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Byg en sikker beregning med kolonnerne i dit regneark.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-label="Luk Tilpas nøgletal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Trin i oprettelsen">
          {stepNames.map((name, index) => (
            <li key={name} className="min-w-0">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className={`w-full rounded-md px-2 py-2 text-left transition ${
                  index === step
                    ? "bg-brand-50 text-brand-800"
                    : index < step
                      ? "text-slate-700 hover:bg-slate-50"
                      : "text-slate-400"
                }`}
              >
                <span className="block text-[10px] font-semibold uppercase">Trin {index + 1}</span>
                <span className="mt-0.5 hidden truncate text-xs font-semibold sm:block">{name}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
        <div className="mx-auto w-full max-w-2xl">
          {step === 0 ? (
            <section aria-labelledby="custom-step-name">
              <p className="text-[11px] font-semibold uppercase text-brand-700">Trin 1 af 4</p>
              <h3 id="custom-step-name" className="mt-1 text-lg font-semibold text-slate-950">Navn og visning</h3>
              <p className="mt-1 text-sm text-slate-600">Giv nøgletallet et tydeligt navn og vælg, hvordan det skal vises.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700">Navn på nøgletal</span>
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    className={`mt-1.5 h-11 w-full rounded-lg border bg-white px-3.5 text-sm outline-none focus:ring-2 ${
                      nameError
                        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                        : "border-slate-200 focus:border-brand-400 focus:ring-brand-100"
                    }`}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? "custom-name-error" : undefined}
                  />
                  {nameError ? <p id="custom-name-error" className="mt-1.5 text-xs font-medium text-red-700">{nameError}</p> : null}
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-700">Kort beskrivelse <span className="font-normal text-slate-400">(valgfrit)</span></span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    rows={2}
                    className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold text-slate-700">Format</span>
                  <select
                    value={draft.format}
                    onChange={(event) => setDraft((current) => ({ ...current, format: event.target.value as CustomDraft["format"] }))}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  >
                    {formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <fieldset>
                  <legend className="text-xs font-semibold text-slate-700">Antal decimaler</legend>
                  <div className="mt-1.5 grid h-11 grid-cols-3 rounded-lg border border-slate-200 bg-white p-1">
                    {([0, 1, 2] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, decimals: value }))}
                        className={`rounded-md text-sm font-semibold ${draft.decimals === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                        aria-pressed={draft.decimals === value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-semibold text-slate-700">Placering</legend>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {(["primary", "secondary"] as const).map((placement) => {
                      const disabled =
                        placement === "primary"
                          ? primaryCount >= MAX_PRIMARY_KPIS
                          : secondaryCount >= MAX_SECONDARY_KPIS;
                      return (
                        <button
                          key={placement}
                          type="button"
                          disabled={disabled}
                          onClick={() => setDraft((current) => ({ ...current, placement }))}
                          className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
                            draft.placement === placement
                              ? "border-brand-300 bg-brand-50 text-brand-800"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                          aria-pressed={draft.placement === placement}
                        >
                          {placement === "primary" ? "Primært" : "Sekundært"}
                          <span className="mt-1 block text-[11px] font-medium opacity-75">
                            {placement === "primary"
                              ? `${primaryCount} af ${MAX_PRIMARY_KPIS} valgt`
                              : `${secondaryCount} af ${MAX_SECONDARY_KPIS} valgt`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-semibold text-slate-700">Accentfarve</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, color: option.value }))}
                        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
                          draft.color === option.value
                            ? "border-slate-400 bg-white text-slate-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                        aria-pressed={draft.color === option.value}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${kpiColorStyles[option.value].accent}`} aria-hidden="true" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="custom-step-formula">
              <p className="text-[11px] font-semibold uppercase text-brand-700">Trin 2 af 4</p>
              <h3 id="custom-step-formula" className="mt-1 text-lg font-semibold text-slate-950">Byg beregningen</h3>
              <p className="mt-1 text-sm text-slate-600">Vælg en funktion og en talkolonne. Tilføj kun flere led, hvis du har brug for dem.</p>
              <div className="mt-5 space-y-3">
                {draft.terms.map((term, index) => (
                  <div key={term.id} className="rounded-lg border border-slate-200 bg-white p-3.5">
                    {index > 0 ? (
                      <label className="mb-3 block">
                        <span className="text-[11px] font-semibold uppercase text-slate-500">Operator</span>
                        <select
                          value={term.operator}
                          onChange={(event) => updateTerm(term.id, { operator: event.target.value as FormulaOperator })}
                          className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        >
                          {operatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[130px_150px_minmax(0,1fr)_auto] sm:items-end">
                      <label>
                        <span className="text-[11px] font-semibold uppercase text-slate-500">Ledtype</span>
                        <select
                          value={term.kind}
                          onChange={(event) => updateTerm(term.id, { kind: event.target.value as FormulaTerm["kind"] })}
                          className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                        >
                          <option value="aggregate">Kolonne</option>
                          <option value="number">Fast tal</option>
                        </select>
                      </label>
                      {term.kind === "aggregate" ? (
                        <>
                          <label>
                            <span className="text-[11px] font-semibold uppercase text-slate-500">Funktion</span>
                            <select
                              value={term.aggregate}
                              onChange={(event) => updateTerm(term.id, { aggregate: event.target.value as AggregateFunction })}
                              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                            >
                              {aggregateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="text-[11px] font-semibold uppercase text-slate-500">Kolonne</span>
                            <select
                              value={term.column}
                              onChange={(event) => updateTerm(term.id, { column: event.target.value })}
                              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                            >
                              <option value="">Vælg talkolonne</option>
                              {numericColumns.map((column) => (
                                <option key={column.name} value={column.name}>
                                  {column.name}{column.typeLabel ? ` · ${column.typeLabel}` : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <label className="sm:col-span-2">
                          <span className="text-[11px] font-semibold uppercase text-slate-500">Tal</span>
                          <input
                            type="number"
                            value={term.numberValue}
                            onChange={(event) => updateTerm(term.id, { numberValue: event.target.value })}
                            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        disabled={draft.terms.length === 1}
                        onClick={() => setDraft((current) => ({ ...current, terms: current.terms.filter((item) => item.id !== term.id) }))}
                        className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Fjern beregningsled ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={draft.terms.length >= 4}
                onClick={addTerm}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tilføj beregningsled
              </button>
              {!formulaComplete ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">Byg dit nøgletal</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {attemptedStep === 1
                      ? "Vælg en kolonne for at færdiggøre beregningen."
                      : "Vælg mindst én talkolonne for at se en live-forhåndsvisning."}
                  </p>
                </div>
              ) : evaluation.state === "error" ? (
                <div role="alert" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {evaluation.message}
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="custom-step-preview">
              <p className="text-[11px] font-semibold uppercase text-brand-700">Trin 3 af 4</p>
              <h3 id="custom-step-preview" className="mt-1 text-lg font-semibold text-slate-950">Forhåndsvisning</h3>
              <p className="mt-1 text-sm text-slate-600">Kontrollér værdien og den læsbare beregning, før du gemmer.</p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                <KpiMiniCard
                  definition={previewDefinition}
                  evaluation={{
                    available: evaluation.state === "ready",
                    value: evaluation.value,
                    detail: evaluation.message,
                    reason: evaluation.state === "error" ? evaluation.message : undefined,
                  }}
                />
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase text-slate-500">Beregningen med ord</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
                    {formula ? formulaToDanishText(formula) : "Vælg en kolonne for at færdiggøre beregningen."}
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Teknisk formel</p>
                    <code className="mt-1 block break-words text-xs text-slate-600">
                      {formula ? formulaToText(formula) : "Ikke klar"}
                    </code>
                  </div>
                  <p className="mt-4 text-xs font-medium text-brand-700">{evaluation.message}</p>
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="custom-step-save">
              <p className="text-[11px] font-semibold uppercase text-brand-700">Trin 4 af 4</p>
              <h3 id="custom-step-save" className="mt-1 text-lg font-semibold text-slate-950">Klar til at tilføje</h3>
              <p className="mt-1 text-sm text-slate-600">Nøgletallet bliver føjet til din aktuelle dashboardopsætning.</p>
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">{previewDefinition.name}</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      Vises som {draft.placement === "primary" ? "primært" : "sekundært"} nøgletal · {evaluation.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <KpiMiniCard
                  definition={previewDefinition}
                  evaluation={{
                    available: evaluation.state === "ready",
                    value: evaluation.value,
                    detail: evaluation.message,
                  }}
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-7">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === 0 ? requestBack : () => { setAttemptedStep(null); setStep((current) => current - 1); }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {step === 0 ? "Tilbage til nøgletal" : "Tilbage"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={continueFlow}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              Fortsæt
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!allValid}
              onClick={save}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Tilføj nøgletal
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
