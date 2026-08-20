"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";

import {
  focusAreaOptions,
  parseAnalysisTargetInput,
  primaryGoalOptions,
  toggleAnalysisFocusArea,
  type AnalysisFocusArea,
  type AnalysisPreferences,
  type AnalysisPrimaryGoal,
  type AnalysisTarget,
  type AnalysisTargetKpiId,
  type AnalysisTargetMetric,
} from "@/lib/analysis-preferences";
import { formatDanishNumber } from "@/lib/dashboard-insights";

type TargetDraft = {
  kpiId: AnalysisTargetKpiId;
  input: string;
};

export type AnalysisPreferencesOnboardingProps = {
  fileName: string;
  rowCount: number;
  availableTargets: readonly AnalysisTargetMetric[];
  onComplete: (preferences: AnalysisPreferences) => void;
  onSkip: () => void;
};

function optionClass(selected: boolean, disabled = false) {
  return `flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold leading-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 ${
    selected
      ? "border-cyan-400 bg-cyan-50 text-cyan-950 shadow-[0_8px_20px_rgba(8,145,178,0.08)]"
      : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/45"
  } ${disabled ? "cursor-not-allowed opacity-45 hover:border-slate-200 hover:bg-white" : ""}`;
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
        selected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white text-transparent"
      }`}
      aria-hidden="true"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function targetPlaceholder(metric: AnalysisTargetMetric | undefined) {
  if (metric?.format === "percent") return "fx 65";
  if (metric?.format === "integer") return "fx 10.000";
  return "fx 2.000.000";
}

export const AnalysisPreferencesOnboarding = memo(function AnalysisPreferencesOnboarding({
  fileName,
  rowCount,
  availableTargets,
  onComplete,
  onSkip,
}: AnalysisPreferencesOnboardingProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [focusAreas, setFocusAreas] = useState<AnalysisFocusArea[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState<AnalysisPrimaryGoal | null>(null);
  const [wantsTargets, setWantsTargets] = useState<boolean | null>(null);
  const [targetDrafts, setTargetDrafts] = useState<TargetDraft[]>([]);

  const targetById = useMemo(
    () => new Map(availableTargets.map((target) => [target.id, target])),
    [availableTargets],
  );
  const parsedTargets = useMemo<Array<AnalysisTarget | null>>(() => targetDrafts.map((draft) => {
    const value = parseAnalysisTargetInput(draft.input, draft.kpiId);
    const metric = targetById.get(draft.kpiId);
    return value === null || !metric
      ? null
      : { kpiId: draft.kpiId, value, direction: metric.direction };
  }), [targetById, targetDrafts]);
  const canContinue = step === 1
    || (step === 2 && primaryGoal !== null)
    || (step === 3 && wantsTargets !== null && (
      !wantsTargets
      || (targetDrafts.length > 0 && parsedTargets.every((target) => target !== null))
    ));

  function chooseTargetPreference(value: boolean) {
    setWantsTargets(value);
    if (!value) {
      setTargetDrafts([]);
      return;
    }
    if (!targetDrafts.length && availableTargets[0]) {
      setTargetDrafts([{ kpiId: availableTargets[0].id, input: "" }]);
    }
  }

  function addTarget() {
    const selected = new Set(targetDrafts.map((target) => target.kpiId));
    const next = availableTargets.find((target) => !selected.has(target.id));
    if (next && targetDrafts.length < 3) {
      setTargetDrafts((current) => [...current, { kpiId: next.id, input: "" }]);
    }
  }

  function finish() {
    if (!canContinue) return;
    const targets: AnalysisTarget[] = [];
    if (wantsTargets) {
      for (const target of parsedTargets) {
        if (target) targets.push(target);
      }
    }
    onComplete({
      focusAreas,
      primaryGoal,
      targets: targets.slice(0, 3),
    });
  }

  return (
    <main className="app-workspace min-h-screen">
      <header className="app-topbar border-b text-white">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-white">DataBrief AI</p>
              <p className="text-xs text-slate-300">Dit regneark er klar</p>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="max-w-[190px] truncate text-xs font-semibold text-white sm:max-w-sm" title={fileName}>{fileName}</p>
            <p className="mt-0.5 text-[11px] text-slate-300">{formatDanishNumber(rowCount)} rækker valideret</p>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl items-start justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="premium-panel-primary w-full overflow-hidden rounded-2xl">
          {!started ? (
            <div className="grid min-h-[520px] place-items-center bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbfc_100%)] px-5 py-10 text-center sm:px-10">
              <div className="max-w-xl">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-[0_12px_30px_rgba(8,145,178,0.12)]">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Kort tilpasning</p>
                <h1 className="mt-2 text-[clamp(2rem,5vw,2.7rem)] font-semibold leading-tight tracking-[-0.025em] text-[#0b1c2d]">
                  Tilpas dit overblik
                </h1>
                <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-slate-600 sm:text-base">
                  Svar på 3 korte spørgsmål, så vi kan vise det vigtigste først.
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                  Ca. 30 sekunder
                </p>
                <div className="mx-auto mt-8 grid max-w-md gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b263a] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(11,38,58,0.18)] transition hover:bg-[#123a55] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
                  >
                    Tilpas mit overblik
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={onSkip}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2"
                  >
                    Spring over
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_45%,#eefafd)] px-5 py-5 sm:px-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-cyan-700">{step} af 3</p>
                    <p className="mt-1 text-xs text-slate-500">Et kort svar er nok</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200 bg-white text-cyan-700 shadow-sm">
                    {step === 3 ? <Target className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  </span>
                </div>
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Fremskridt i tilpasningen"
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-valuenow={step}
                >
                  <div className="h-full rounded-full bg-cyan-500 transition-[width] duration-300" style={{ width: `${(step / 3) * 100}%` }} aria-hidden="true" />
                </div>
              </header>

              <div className="min-h-[430px] px-5 py-7 sm:px-8 sm:py-8">
                {step === 1 ? (
                  <section aria-labelledby="preference-question-1">
                    <h1 id="preference-question-1" className="text-2xl font-semibold tracking-[-0.02em] text-[#0b1c2d]">
                      Hvad vil du helst have bedre overblik over?
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Vælg op til 2.</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="group" aria-label="Vælg op til to fokusområder">
                      {focusAreaOptions.map((option) => {
                        const selected = focusAreas.includes(option.id);
                        const disabled = !selected && focusAreas.length >= 2;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            disabled={disabled}
                            onClick={() => setFocusAreas((current) => toggleAnalysisFocusArea(current, option.id))}
                            className={optionClass(selected, disabled)}
                          >
                            <SelectionMark selected={selected} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {step === 2 ? (
                  <section aria-labelledby="preference-question-2">
                    <h1 id="preference-question-2" className="text-2xl font-semibold tracking-[-0.02em] text-[#0b1c2d]">
                      Hvad er vigtigst for dig lige nu?
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Vælg det svar, der passer bedst.</p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Vælg det vigtigste mål lige nu">
                      {primaryGoalOptions.map((option) => {
                        const selected = primaryGoal === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setPrimaryGoal(option.id)}
                            className={optionClass(selected)}
                          >
                            <SelectionMark selected={selected} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {step === 3 ? (
                  <section aria-labelledby="preference-question-3">
                    <h1 id="preference-question-3" className="text-2xl font-semibold tracking-[-0.02em] text-[#0b1c2d]">
                      Har du nogle mål, du gerne vil følge?
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">Du kan tilføje op til 3 mål, som dit datasæt kan beregne.</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Vælg om du vil tilføje mål">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={wantsTargets === true}
                        disabled={!availableTargets.length}
                        onClick={() => chooseTargetPreference(true)}
                        className={optionClass(wantsTargets === true, !availableTargets.length)}
                      >
                        <SelectionMark selected={wantsTargets === true} />
                        <span>Ja, tilføj et mål</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={wantsTargets === false}
                        onClick={() => chooseTargetPreference(false)}
                        className={optionClass(wantsTargets === false)}
                      >
                        <SelectionMark selected={wantsTargets === false} />
                        <span>Nej, ikke lige nu</span>
                      </button>
                    </div>

                    {wantsTargets ? (
                      <div className="mt-6 space-y-3" aria-label="Dine mål">
                        {targetDrafts.map((draft, index) => {
                          const metric = targetById.get(draft.kpiId);
                          const selectedIds = new Set(targetDrafts.map((target) => target.kpiId));
                          const parsed = parseAnalysisTargetInput(draft.input, draft.kpiId);
                          const invalid = draft.input.length > 0 && parsed === null;
                          return (
                            <div key={`${draft.kpiId}-${index}`} className="rounded-xl border border-slate-200 bg-[#f8fbfc] p-3.5 sm:p-4">
                              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.65fr)_44px] sm:items-end">
                                <label className="block min-w-0 text-xs font-semibold text-slate-600">
                                  Nøgletal
                                  <select
                                    value={draft.kpiId}
                                    onChange={(event) => {
                                      const kpiId = event.target.value as AnalysisTargetKpiId;
                                      setTargetDrafts((current) => current.map((item, itemIndex) => (
                                        itemIndex === index ? { kpiId, input: "" } : item
                                      )));
                                    }}
                                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0b1c2d] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                  >
                                    {availableTargets.map((target) => (
                                      <option key={target.id} value={target.id} disabled={target.id !== draft.kpiId && selectedIds.has(target.id)}>
                                        {target.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="block text-xs font-semibold text-slate-600">
                                  {metric?.direction === "at-most" ? "Maksimalt" : "Mål"}
                                  <span className="mt-1.5 flex h-11 items-center rounded-lg border border-slate-200 bg-white focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={draft.input}
                                      onChange={(event) => setTargetDrafts((current) => current.map((item, itemIndex) => (
                                        itemIndex === index ? { ...item, input: event.target.value } : item
                                      )))}
                                      placeholder={targetPlaceholder(metric)}
                                      aria-invalid={invalid}
                                      aria-label={`Mål for ${metric?.label ?? "nøgletal"}`}
                                      className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-[#0b1c2d] outline-none placeholder:font-normal placeholder:text-slate-400"
                                    />
                                    <span className="shrink-0 pr-3 text-xs font-semibold text-slate-500">{metric?.inputSuffix}</span>
                                  </span>
                                  {invalid ? <span className="mt-1 block text-[11px] font-medium text-orange-700">Skriv et gyldigt positivt tal.</span> : null}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setTargetDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                  aria-label={`Fjern mål for ${metric?.label ?? "nøgletal"}`}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {targetDrafts.length < Math.min(3, availableTargets.length) ? (
                          <button
                            type="button"
                            onClick={addTarget}
                            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Tilføj endnu et mål
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {!availableTargets.length ? (
                      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                        Der er ingen af de enkle målnøgletal, som kan beregnes sikkert fra dette datasæt.
                      </p>
                    ) : null}
                  </section>
                ) : null}
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-[#f8fbfc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => step === 1 ? setStarted(false) : setStep((step - 1) as 1 | 2)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-[#0b1c2d] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Tilbage
                  </button>
                  <button
                    type="button"
                    onClick={onSkip}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-[#0b1c2d] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    Spring over
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => {
                    if (step < 3) setStep((step + 1) as 2 | 3);
                    else finish();
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b263a] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#123a55] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {step === 3 ? "Vis mit overblik" : "Fortsæt"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </footer>
            </>
          )}
        </div>
      </section>
    </main>
  );
});
