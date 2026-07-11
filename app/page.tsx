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

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="DataBrief AI home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">DataBrief AI</span>
        </Link>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-500"
        >
          Open upload
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl items-center gap-12 px-6 pb-14 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-brand-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Demo MVP for spreadsheet-driven sales reporting
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            DataBrief AI
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
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
              className="inline-flex items-center justify-center rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-brand-500"
            >
              View sample format
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-line bg-white shadow-soft">
          <div className="border-b border-line bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Example dashboard preview</p>
                <p className="text-xs text-slate-500">Preview based on sample sales data</p>
              </div>
              <span className="rounded-md bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                Example data
              </span>
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Revenue", "320,748 kr.", "Example total revenue"],
                ["Units sold", "6,474", "Example units sold"],
                ["Best category", "Drikke", "Highest revenue category"],
                ["Best month", "Jun 2026", "Strongest sample month"],
              ].map(([label, value, detail]) => (
                <div key={label} className="rounded-md border border-line p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
                  <p className="mt-1 text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-line p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Revenue trend</p>
                <p className="text-xs text-slate-500">Example Jan-Jun 2026</p>
              </div>
              <div className="flex h-44 items-end gap-3">
                {[38, 56, 44, 72, 61, 92].map((height, index) => (
                  <div key={height} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-brand-500"
                      style={{ height: `${height}%`, opacity: 0.55 + index * 0.06 }}
                    />
                    <span className="text-xs text-slate-500">{["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-14 lg:grid-cols-3 lg:px-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="rounded-lg border border-line bg-white p-6">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">{benefit.title}</h2>
                <p className="mt-3 leading-7 text-slate-600">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="sample-structure" className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">Sample file structure</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              Upload a sales worksheet, even with Danish column names.
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              DataBrief AI detects common English and Danish sales columns automatically, including Dato, Produkt,
              Kategori, Antal and Nettoomsætning. Keep one sale per row for the cleanest dashboard.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Dato", "Produkt", "Kategori", "Nettoomsætning", "Antal"].map((column) => (
                    <th key={column} className="border-b border-line px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["2026-01-05", "Café latte", "Drikke", "2,714 kr.", "59"],
                  ["2026-02-14", "Kyllingesandwich", "Sandwich", "3,612 kr.", "43"],
                  ["2026-06-22", "Morgenmenu", "Menu", "5,184 kr.", "54"],
                ].map((row) => (
                  <tr key={row.join("-")}>
                    {row.map((cell) => (
                      <td key={cell} className="px-4 py-3 text-slate-700">
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
