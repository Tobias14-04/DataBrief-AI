import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileCheck2,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

const primaryCta =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";
const secondaryCta =
  "inline-flex items-center justify-center gap-2 px-2 py-3 text-sm font-semibold text-slate-600 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";

const steps = [
  { number: "01", title: "Data", text: "Upload dit regneark. Kolonner og perioder valideres, før analysen begynder." },
  { number: "02", title: "Drivere", text: "Se hvilke produkter og kategorier der bidrager til ændringerne i dine nøgletal." },
  { number: "03", title: "Prioriterede findings", text: "Få de vigtigste observationer samlet med tal, perioder og datagrundlag." },
];

const previewStats = [
  { label: "Omsætning", value: "880.000 kr.", detail: "−12 % · −120.000 kr.", tone: "text-orange-700" },
  { label: "Dækningsgrad", value: "40,0 %", detail: "Uændret · 0,0 procentpoint", tone: "text-brand-700" },
  { label: "Dækningsbidrag", value: "352.000 kr.", detail: "−48.000 kr. mod april", tone: "text-orange-700" },
];

const drivers = [
  { label: "Tilbehør", value: "−50.400 kr.", width: "42%" },
  { label: "Kontorartikler", value: "−31.200 kr.", width: "26%" },
  { label: "Øvrige kategorier", value: "−38.400 kr.", width: "32%" },
];

const trust = [
  { icon: ShieldCheck, title: "Lokal behandling", text: "Regnearket behandles i browseren og sendes ikke til en server for at blive analyseret." },
  { icon: FileCheck2, title: "Dokumenterede findings", text: "Hver indsigt kan føres tilbage til beregnede tal, perioder og det relevante datagrundlag." },
  { icon: SlidersHorizontal, title: "Ingen skjulte antagelser", text: "Manglende data og begrænsninger vises tydeligt. Der opfindes ikke tal eller årsager." },
];

export default function Home() {
  return (
    <div className="bg-white text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">
        Spring til indhold
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Senvoriq-forside">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-cyan-300"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-xl font-semibold tracking-tight">Senvoriq</span>
          </Link>
          <nav aria-label="Hovednavigation" className="flex items-center gap-6">
            <a href="#produkt" className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 md:block">Produktet</a>
            <a href="#datagrundlag" className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 md:block">Datagrundlag</a>
            <Link href="/upload" className={primaryCta}>Analysér mine data<ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="border-b border-slate-200 bg-paper">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:px-8 lg:py-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Driveranalyse fra dine salgsdata</p>
              <h1 className="mt-4 max-w-xl text-[2.45rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.4rem]">Se hvad der driver udviklingen i din forretning.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">Senvoriq forbinder dine nøgletal med de produkter og kategorier, der ligger bag ændringerne — uden BI-opsætning.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/upload" className={primaryCta}>Analysér mine data<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <a href="#produkt" className={secondaryCta}>Se produktet</a>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />Dine data behandles lokalt i browseren.</p>
            </div>

            <figure className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-overview-primary" aria-labelledby="preview-caption">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-4 py-3.5 text-white sm:px-5">
                <span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />Senvoriq<span className="ml-1 border-l border-white/20 pl-3 font-normal text-slate-300">Overblik</span></span>
                <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium text-cyan-200">Eksempeldata</span>
              </div>
              <div className="bg-[var(--overview-workspace)] p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span className="font-semibold text-ink">Salg og indtjening</span><span>Maj 2026 mod april 2026</span></div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {previewStats.map((stat) => (
                    <div key={stat.label} className="min-w-0 rounded-lg border border-[var(--overview-border)] bg-white p-3">
                      <p className="text-xs text-slate-600">{stat.label}</p><p className="mt-1.5 text-lg font-semibold tabular-nums">{stat.value}</p><p className={`mt-1.5 text-[11px] leading-4 ${stat.tone}`}>{stat.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-lg border border-[var(--overview-border)] bg-white p-3.5">
                    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Hvor ligger omsætningsfaldet?</h2><span className="text-[11px] text-slate-500">Kategorier</span></div>
                    <ul className="mt-3 space-y-2.5">
                      {drivers.map((driver) => (
                        <li key={driver.label}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="text-slate-600">{driver.label}</span><span className="font-medium tabular-nums">{driver.value}</span></div><div className="h-1.5 overflow-hidden rounded-sm bg-slate-100" aria-hidden="true"><div className="h-full rounded-sm bg-brand-500" style={{ width: driver.width }} /></div></li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-brand-100 border-l-[3px] border-l-brand-500 bg-white p-3.5">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-700"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Prioriteret finding</p>
                    <p className="mt-2 text-sm font-semibold leading-5">To kategorier står for 68 % af faldet.</p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600">Tilbehør og Kontorartikler falder samlet 81.600 kr. Undersøg udviklingen her først.</p>
                    <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-500">Grundlag: omsætning pr. kategori · april og maj 2026</p>
                  </div>
                </div>
              </div>
              <figcaption id="preview-caption" className="border-t border-slate-200 px-4 py-2.5 text-[11px] leading-5 text-slate-500 sm:px-5">Illustrativt produktpreview med fiktive eksempeldata.</figcaption>
            </figure>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid border-y border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
              {steps.map((step) => (
                <article key={step.number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-slate-200 py-5 last:border-b-0 md:block md:border-b-0 md:px-6 md:first:pl-0 md:last:pr-0">
                  <span className="text-xs font-semibold tracking-widest text-brand-700">{step.number}</span><div><h2 className="font-semibold">{step.title}</h2><p className="mt-1.5 text-sm leading-6 text-slate-600">{step.text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="produkt" className="scroll-mt-8 border-b border-slate-200 bg-paper">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8 lg:py-16">
            <div>
              <p className="text-sm font-semibold text-brand-700">Fra status til forklaring</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Et dashboard viser ændringen. Senvoriq viser, hvor den kommer fra.</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600">Driveranalysen fordeler bevægelsen på de dimensioner, dine data understøtter. Den dokumenterer bidragene uden at gætte på årsagen.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-soft">
              <div className="grid md:grid-cols-2">
                <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Almindeligt dashboard</p><p className="mt-5 text-4xl font-semibold tabular-nums">−12 %</p><p className="mt-2 text-sm font-semibold">Omsætningen er faldet.</p><p className="mt-2 text-sm leading-6 text-slate-600">Du kan se udviklingen, men skal selv finde de underliggende bidrag.</p></div>
                <div className="bg-ink p-5 text-white"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Senvoriq driveranalyse</p><p className="mt-5 text-4xl font-semibold tabular-nums">68 %</p><p className="mt-2 text-sm font-semibold">Faldet er koncentreret i to kategorier.</p><p className="mt-2 text-sm leading-6 text-slate-300">81.600 kr. af faldet ligger i Tilbehør og Kontorartikler.</p></div>
              </div>
              <div className="flex items-start gap-3 border-t border-slate-200 bg-white px-5 py-4"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" /><p className="text-xs leading-5 text-slate-600">Resultatet samles i prioriterede findings og en ledelsesrapport med det tilhørende datagrundlag.</p></div>
            </div>
          </div>
        </section>

        <section id="datagrundlag" className="scroll-mt-8 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div><p className="text-sm font-semibold text-brand-700">Et gennemskueligt datagrundlag</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Bygget til seriøse beslutninger.</h2></div>
              <p className="max-w-md text-sm leading-6 text-slate-600">Du kan se, hvad analysen bygger på — og hvor data sætter grænsen.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {trust.map(({ icon: Icon, title, text }) => (
                <article key={title} className="border-t border-slate-300 pt-5"><Icon className="h-5 w-5 text-brand-700" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div><h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Se hvad der driver dine tal.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Upload dit salgsregneark og få et dokumenteret overblik.</p></div>
            <Link href="/upload" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Analysér mine data<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-slate-400"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-5 text-xs sm:px-6 lg:px-8"><span className="font-semibold text-slate-200">Senvoriq</span><span>Salgsdata. Dokumenteret indsigt. Bedre beslutningsgrundlag.</span></div></footer>
    </div>
  );
}
