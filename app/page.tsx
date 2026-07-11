import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  FileSpreadsheet,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const benefits = [
  {
    step: "01",
    action: "Upload",
    eyebrow: "Performance overview",
    title: "Instant sales KPIs",
    description: "Move from spreadsheet rows to a clear view of business performance in seconds.",
    detail: "Revenue, units, best product, best month",
    icon: TrendingUp,
    iconClass: "border-brand-100 bg-brand-50 text-brand-700",
  },
  {
    step: "02",
    action: "Analyze",
    eyebrow: "Visual analysis",
    title: "Charts without setup",
    description: "See the patterns behind the totals without formulas, pivots, or manual chart building.",
    detail: "Monthly revenue, categories, products",
    icon: BarChart3,
    iconClass: "border-orange-100 bg-orange-50 text-accent-600",
  },
  {
    step: "03",
    action: "Summarize",
    eyebrow: "Executive readout",
    title: "Executive summary",
    description: "Turn the most important results into a concise summary that is ready to share.",
    detail: "Short business summary from your data",
    icon: Sparkles,
    iconClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
];

const previewStats = [
  ["Revenue", "320,748 kr.", "+12.4% vs. Jan"],
  ["Units sold", "6,474", "+8.1% across period"],
  ["Best category", "Drikke", "34% of revenue"],
  ["Best month", "Jun 2026", "64,280 kr. revenue"],
];

const sampleRows = [
  ["2026-01-05", "Café latte", "Drikke", "2,714 kr.", "59"],
  ["2026-02-14", "Kyllingesandwich", "Sandwich", "3,612 kr.", "43"],
  ["2026-06-22", "Morgenmenu", "Menu", "5,184 kr.", "54"],
];

const featureChips = ["Danish & English headers", "No manual dashboard setup", "Runs in your browser"];

export default function Home() {
  return (
    <main className="overflow-hidden bg-white">
      <header className="relative z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="DataBrief AI home">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-[0_10px_24px_rgba(16,32,51,0.18)]">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-ink">DataBrief AI</span>
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-500 hover:text-brand-700"
          >
            Open upload
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative isolate border-b border-slate-200/80 bg-[linear-gradient(135deg,#f8fbfc_0%,#f1fbfc_45%,#fff8f3_100%)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_20%,rgba(8,145,178,0.14),transparent_28%),radial-gradient(circle_at_8%_85%,rgba(249,115,22,0.10),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(16,32,51,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(16,32,51,0.035)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-20">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white/85 px-3 py-2 text-sm font-semibold text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Turn spreadsheets into business dashboards
            </div>
            <h1 className="text-5xl font-semibold leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
              DataBrief AI
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              Upload your sales spreadsheet and get instant KPIs, visual trends, and a clear business summary —
              without building formulas or dashboards manually.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(16,32,51,0.22)] transition hover:bg-slate-800"
              >
                Upload sales file
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#sample-structure"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:border-brand-500 hover:text-brand-700"
              >
                View sample data
              </a>
            </div>
            <div className="mt-7 flex max-w-xl flex-wrap gap-2">
              {featureChips.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/90 bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur"
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:pl-2">
            <div className="absolute -inset-4 -z-10 rounded-lg bg-white/50 blur-2xl" />
            <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_30px_80px_rgba(16,32,51,0.16),0_6px_20px_rgba(16,32,51,0.08)]">
              <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                  Café Nord sales.xlsx
                </div>
                <div className="w-10" aria-hidden="true" />
              </div>

              <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Example dashboard preview</p>
                    <p className="mt-0.5 text-xs text-slate-500">Preview based on sample sales data</p>
                  </div>
                  <span className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                    Example data
                  </span>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {previewStats.map(([label, value, detail], index) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-lg border border-slate-200 bg-white p-3.5 shadow-[0_4px_14px_rgba(16,32,51,0.05)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            index === 2 ? "bg-accent-500" : index === 3 ? "bg-emerald-500" : "bg-brand-500"
                          }`}
                        />
                      </div>
                      <p className="mt-2 truncate text-base font-semibold text-ink sm:text-lg">{value}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_14px_rgba(16,32,51,0.05)]">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Revenue trend</p>
                      <p className="text-xs text-slate-500">Monthly net revenue</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      +22.6%
                    </div>
                  </div>
                  <div className="relative h-44 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-7 pt-3">
                    <div className="absolute inset-x-4 top-10 border-t border-dashed border-slate-200" />
                    <div className="absolute inset-x-4 top-[86px] border-t border-dashed border-slate-200" />
                    <div className="absolute inset-x-4 bottom-8 border-t border-slate-200" />
                    <svg
                      className="absolute inset-x-4 top-3 h-[118px] w-[calc(100%-2rem)]"
                      viewBox="0 0 520 126"
                      role="img"
                      aria-label="Example revenue trend rising from January to June 2026"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="revenueLine" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#0891b2" />
                          <stop offset="76%" stopColor="#0e7490" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                        <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#0891b2" stopOpacity="0.20" />
                          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M4 104 C62 96, 88 84, 108 87 C170 96, 184 62, 210 67 C278 80, 292 46, 316 48 C370 53, 391 38, 418 40 C468 43, 488 21, 516 14 L516 126 L4 126 Z"
                        fill="url(#revenueArea)"
                      />
                      <path
                        d="M4 104 C62 96, 88 84, 108 87 C170 96, 184 62, 210 67 C278 80, 292 46, 316 48 C370 53, 391 38, 418 40 C468 43, 488 21, 516 14"
                        fill="none"
                        stroke="url(#revenueLine)"
                        strokeLinecap="round"
                        strokeWidth="4"
                        vectorEffect="non-scaling-stroke"
                      />
                      {[
                        [4, 104],
                        [108, 87],
                        [210, 67],
                        [316, 48],
                        [418, 40],
                        [516, 14],
                      ].map(([x, y], index) => (
                        <circle
                          key={x}
                          cx={x}
                          cy={y}
                          r={index === 5 ? "5" : "3.5"}
                          fill="#ffffff"
                          stroke={index === 5 ? "#f97316" : "#0891b2"}
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-x-4 bottom-2 flex justify-between text-[11px] font-medium text-slate-400">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                        <span key={month}>{month}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-50/40 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-brand-700">From workbook to decision</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                The essentials, already organized.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-600 lg:justify-self-end">
              One upload moves through a clear three-step flow, turning everyday sales data into a management-ready
              view.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_50px_rgba(16,32,51,0.08)]">
            <div className="grid divide-y divide-slate-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article key={benefit.title} className="relative flex min-h-[250px] flex-col p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-700">{benefit.step}</span>
                        <span className="h-px w-8 bg-brand-100" aria-hidden="true" />
                        <span className="text-sm font-semibold text-slate-500">{benefit.action}</span>
                      </div>
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${benefit.iconClass}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{benefit.eyebrow}</p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
                    <div className="mt-auto flex items-start gap-2 border-t border-slate-100 pt-4 text-sm font-medium text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                      <span>{benefit.detail}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="sample-structure" className="relative border-b border-slate-200 bg-slate-50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_42%,rgba(8,145,178,0.09),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(249,115,22,0.06),transparent_24%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:py-20">
          <div className="max-w-lg lg:pr-4">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              Product proof: flexible input
            </div>
            <h2 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Your sales workbook does not need our template.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              DataBrief AI recognizes common Danish and English sales columns automatically, including Dato,
              Produkt, Kategori, Antal, and Nettoomsætning.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-slate-600">
              {[
                "Finds the most relevant worksheet and header row",
                "Maps common sales columns in Danish and English",
                "Keeps analysis in your browser for this demo",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-brand-700 shadow-sm">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/upload"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand-700"
            >
              Try with your spreadsheet
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_60px_rgba(16,32,51,0.13)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Sample sales worksheet</p>
                  <p className="text-xs text-slate-500">Café Nord · Salgsdata</p>
                </div>
              </div>
              <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Ready to analyze
              </span>
            </div>

            <div className="grid border-b border-slate-200 bg-slate-50/80 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
              {["Danish headers detected", "Ready to analyze", "No template required"].map((status) => (
                <div key={status} className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-xs font-medium text-slate-600 last:border-b-0 sm:border-b-0">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  {status}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-white text-slate-600">
                  <tr>
                    {["Dato", "Produkt", "Kategori", "Nettoomsætning", "Antal"].map((column) => (
                      <th key={column} className="border-b border-slate-200 px-5 py-3.5 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleRows.map((row) => (
                    <tr key={row.join("-")} className="transition hover:bg-brand-50/35">
                      {row.map((cell, index) => (
                        <td
                          key={cell}
                          className={`px-5 py-4 ${index === 1 ? "font-medium text-ink" : "text-slate-600"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
              <span>Example rows from a café sales workbook</span>
              <span className="font-medium text-brand-700">Danish and English columns supported</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,rgba(8,145,178,0.24),transparent_28%),radial-gradient(circle_at_15%_100%,rgba(249,115,22,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-6 py-14 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-cyan-200">Start with the spreadsheet you already have</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
              Ready to turn your spreadsheet into a dashboard?
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-300">
              Upload a sales file and get KPIs, charts, and a concise business summary in seconds.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink shadow-[0_14px_32px_rgba(0,0,0,0.22)] transition hover:bg-brand-50 sm:w-auto"
          >
            Open upload
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
