import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import {
  importProcessingSteps,
  importStatusLabel,
  type ImportProcessingStep,
  type ImportProcessingStatus,
} from "@/lib/import-processing";

type ExcelProcessingViewProps = {
  fileName: string;
  status: ImportProcessingStatus;
};

function ProcessingStep({
  label,
  step,
  currentStatus,
}: {
  label: string;
  step: ImportProcessingStep;
  currentStatus: ImportProcessingStatus;
}) {
  const currentIndex = importProcessingSteps.findIndex((item) => item.status === currentStatus);
  const stepIndex = importProcessingSteps.findIndex((item) => item.status === step);
  const isComplete = currentIndex > stepIndex;
  const isCurrent = currentStatus === step;

  return (
    <li
      className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        isCurrent ? "bg-brand-50 text-ink" : "text-slate-500"
      }`}
      aria-current={isCurrent ? "step" : undefined}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
          isComplete
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : isCurrent
              ? "border-brand-200 bg-white text-brand-700"
              : "border-slate-200 bg-white text-slate-400"
        }`}
        aria-hidden="true"
      >
        {isComplete ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : isCurrent ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className={`truncate text-sm ${isCurrent ? "font-semibold" : "font-medium"}`}>{label}</span>
    </li>
  );
}

export function ExcelProcessingView({ fileName, status }: ExcelProcessingViewProps) {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fbfc_0%,#f1fbfc_46%,#fff8f3_100%)]"
      aria-busy="true"
      data-testid="excel-processing-view"
      data-import-status={status}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(8,145,178,0.14),transparent_28%),radial-gradient(circle_at_10%_85%,rgba(249,115,22,0.09),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(16,32,51,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(16,32,51,0.035)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Forside
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-[0_10px_24px_rgba(16,32,51,0.18)]">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-ink">DataBrief AI</span>
          </div>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl items-center px-5 py-10 sm:px-6 lg:px-8">
        <div
          className="w-full overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[0_28px_80px_rgba(16,32,51,0.14),0_6px_20px_rgba(16,32,51,0.06)] backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-white via-white to-brand-50/50 px-5 py-5 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">Excel-regneark</p>
                <p className="truncate text-sm font-semibold text-ink" title={fileName}>{fileName}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-5 py-8 sm:px-7 sm:py-9 md:grid-cols-[minmax(0,1fr)_270px] md:items-center">
            <div className="min-w-0 text-center md:text-left">
              <span
                className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700 shadow-[0_10px_28px_rgba(8,145,178,0.12)] md:mx-0"
                data-testid="processing-spinner"
              >
                <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold leading-tight text-ink sm:text-3xl">Forbereder dit dashboard</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 md:mx-0">
                Vi analyserer dit regneark og finder de relevante data.
              </p>
              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-3 py-2 text-sm font-semibold text-brand-800">
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                <span className="truncate">{importStatusLabel(status)}</span>
              </div>
              <p className="mt-4 inline-flex items-center gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                Store regneark kan tage nogle sekunder.
              </p>
            </div>

            <ol className="space-y-1 rounded-lg border border-slate-200 bg-[#f8fbfc] p-2">
              {importProcessingSteps.map((step) => (
                <ProcessingStep
                  key={step.status}
                  label={step.label}
                  step={step.status}
                  currentStatus={status}
                />
              ))}
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
