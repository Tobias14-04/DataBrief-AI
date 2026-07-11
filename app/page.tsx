import Link from "next/link";
import { ArrowRight, BarChart3, FileSpreadsheet, Sparkles, TrendingUp } from "lucide-react";

const benefits = [
  {
    title: "Instant sales KPIs",
    description: "See revenue, units, strongest product or category, and best month right after upload.",
    icon: TrendingUp,
  },
  {
    title: "Charts without setup",
    description: "Turn raw spreadsheet rows into visual revenue, product, and category views.",
    icon: BarChart3,
  },
  {
    title: "AI-style narrative",
    description: "Generate a concise business readout that highlights performance and next steps.",
    icon: Sparkles,
  },
];

const previewStats = [
  ["Revenue", "320,748 kr.", "Example total revenue"],
  ["Units sold", "6,474", "Example units sold"],
  ["Best category", "Drikke", "Highest revenue category"],
  ["Best month", "Jun 2026", "Strongest sample month"],
];

const sampleRows = [
  ["2026-01-05", "Café latte", "Drikke", "2,714 kr.", "59"],
  ["2026-02-14", "Kyllingesandwich", "Sandwich", "3,612 kr.", "43"],
  ["2026-06-22", "Morgenmenu", "Menu", "5,184 kr.", "54"],
];

export default function Home() {
  return (
    <main className="overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="DataBrief AI home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white shadow-soft">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">DataBrief AI</span>
        </Link>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/85 px-4 py-2 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:border-brand-500"
        >
          Open upload
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="relative -mt-[88px] bg-gradient-to-br from-white via-brand-50/60 to-orange-50/70 pt-[88px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/90 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-24 h-80 w-2/3 bg-[radial-gradient(circle_at_70%_35%,rgba(8,145,178,0.20),transparent_55%)] blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-2/3 bg-[radial-gradient(circle_at_20%_70%,rgba(249,115,22,0.12),transparent_58%)] blur-2xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center gap-10 px-6 pb-16 pt-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Demo MVP for spreadsheet-driven sales reporting
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
              DataBrief AI
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Upload an Excel sales file and get a polished dashboard, core KPI cards, and a short
              executive-style business report in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800"
              >
                Upload sales file
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#sample-structure"
                className="inline-flex items-center justify-center rounded-md border border-white/70 bg-white/80 px-5 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur transition hover:border-brand-500"
              >
                View sample data
              </a>
            </div>
            <div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-600 sm:grid-cols-3">
              {["Danish headers", "No database", "Demo-ready"].map((item) => (
                <div key={item} className="rounded-md border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-white/35 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/75 bg-white/90 shadow-[0_28px_80px_rgba(16,32,51,0.16)] backdrop-blur">
              <div className="border-b border-line/70 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Example dashboard preview</p>
                    <p className="text-xs text-slate-500">Preview based on sample sales data</p>
                  </div>
                  <span className="rounded-md border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    Example data
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {previewStats.map(([label, value, detail]) => (
                    <div key={label} className="rounded-lg border border-line/80 bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
                      <p className="mt-1 text-sm text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-line/80 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-ink">Revenue trend</p>
                    <p className="text-xs text-slate-500">Example Jan-Jun 2026</p>
                  </div>
                  <div className="relative h-48 overflow-hidden rounded-lg bg-gradient-to-b from-slate-50 to-white p-3">
                    <div className="absolute inset-x-3 top-10 border-t border-dashed border-line" />
                    <div className="absolute inset-x-3 top-24 border-t border-dashed border-line" />
                    <svg
                      className="absolute inset-x-3 top-4 h-32 w-[calc(100%-1.5rem)]"
                      viewBox="0 0 520 150"
                      role="img"
                      aria-label="Example revenue trend rising from January to June"
                    >
                      <defs>
                        <linearGradient id="revenueLine" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0%" stopColor="#0891b2" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                        <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#0891b2" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M10 128 C80 102, 112 112, 160 86 C214 56, 250 82, 304 58 C360 34, 400 48, 510 18 L510 150 L10 150 Z"
                        fill="url(#revenueArea)"
                      />
                      <path
                        d="M10 128 C80 102, 112 112, 160 86 C214 56, 250 82, 304 58 C360 34, 400 48, 510 18"
                        fill="none"
                        stroke="url(#revenueLine)"
                        strokeLinecap="round"
                        strokeWidth="5"
                      />
                      {[10, 160, 304, 510].map((x, index) => (
                        <circle
                          key={x}
                          cx={x}
                          cy={[128, 86, 58, 18][index]}
                          r="5"
                          fill="#ffffff"
                          stroke="#0891b2"
                          strokeWidth="3"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-x-3 bottom-8 flex items-end gap-3">
                      {[38, 56, 44, 72, 61, 92].map((height) => (
                        <div key={height} className="flex h-24 flex-1 flex-col items-center justify-end">
                          <div className="w-full rounded-t-md bg-brand-500/20" style={{ height: `${height}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-3 bottom-3 flex justify-between text-xs text-slate-500">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => (
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

      <section className="border-y border-line bg-white/90">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-16 lg:grid-cols-3 lg:px-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className="rounded-xl border border-line/80 bg-white p-7 shadow-[0_18px_50px_rgba(16,32,51,0.06)]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white text-brand-700 shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-xl font-semibold text-ink">{benefit.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="sample-structure" className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase text-brand-700">Sample file structure</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">
              Upload a sales worksheet, even with Danish column names.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              DataBrief AI detects common English and Danish sales columns automatically, including Dato, Produkt,
              Kategori, Antal and Nettoomsætning. Keep one sale per row for the cleanest dashboard.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_22px_70px_rgba(16,32,51,0.10)]">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {["Dato", "Produkt", "Kategori", "Nettoomsætning", "Antal"].map((column) => (
                    <th key={column} className="border-b border-line px-5 py-4 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sampleRows.map((row) => (
                  <tr key={row.join("-")} className="transition hover:bg-slate-50/70">
                    {row.map((cell) => (
                      <td key={cell} className="px-5 py-4 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
