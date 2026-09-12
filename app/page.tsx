import Link from "next/link";
import { ArrowRight, BarChart3, Check, FileCheck2, FileSpreadsheet, FileText, ShieldCheck, SlidersHorizontal } from "lucide-react";

const primaryCta = "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";
const secondaryCta = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";

const steps = [
  { number: "01", title: "Forstå data", icon: FileSpreadsheet, text: "Senvoriq finder de relevante kolonner og validerer regnearket. Du kan se og rette tilknytningerne, før analysen begynder.", detail: "Automatisk mapping · tydelig validering" },
  { number: "02", title: "Find driverne", icon: BarChart3, text: "Se, hvor udviklingen er registreret på tværs af produkter, kategorier og de øvrige dimensioner, dine data understøtter.", detail: "Nøgletal · udvikling · bidrag til ændringen" },
  { number: "03", title: "Prioritér", icon: FileText, text: "Få dokumenterede findings og en ledelsesrapport, der samler de vigtigste ændringer og peger på, hvad du bør undersøge først.", detail: "Prioriterede indsigter · ledelsesoverblik" },
];

// Illustrative figures only: April revenue 1,000,000; May 880,000.
// Category changes sum to -120,000; the first two account for 68%.
// Contribution margin is 40% in both periods: 400,000 → 352,000.
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
const mappings = [["Order date", "Dato"], ["Varenavn", "Produkt"], ["Nettoomsætning", "Omsætning"], ["Quantity", "Antal"]];
const trust = [
  { icon: ShieldCheck, title: "Lokalt i din browser", text: "Regnearket behandles lokalt. Dine salgsdata sendes ikke til en server for at blive analyseret." },
  { icon: FileCheck2, title: "Findings med dokumentation", text: "Indsigter bygger på beregnede tal. Du kan se de relevante perioder og det tilhørende datagrundlag." },
  { icon: SlidersHorizontal, title: "Ingen skjulte antagelser", text: "Manglende data og begrænsninger fremgår tydeligt. Der opfindes hverken tal, benchmarks eller årsager." },
];

export default function Home() {
  return (
    <div className="bg-white text-ink">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Spring til indhold</a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Senvoriq-forside">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-cyan-300"><BarChart3 className="h-5 w-5" aria-hidden="true" /></span>
            <span className="text-xl font-semibold tracking-tight">Senvoriq</span>
          </Link>
          <nav aria-label="Hovednavigation" className="flex items-center gap-7">
            <a href="#saadan-fungerer-det" className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 md:block">Sådan fungerer det</a>
            <a href="#datagrundlag" className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 md:block">Dine data</a>
            <Link href="/upload" className={primaryCta}>Analysér mine data<ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" /></Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="border-b border-slate-200 bg-paper">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Fra salgsdata til beslutningsgrundlag</p>
              <h1 className="mt-5 max-w-xl text-[2.6rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl xl:text-[3.45rem]">Se hvad der driver udviklingen i din forretning.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Senvoriq beregner dine vigtigste nøgletal og viser, hvor ændringer i omsætning, margin og resultat er registreret — med dokumentation fra dine salgsdata og uden BI-opsætning.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/upload" className={primaryCta}>Analysér mine data<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <a href="#eksempel" className={secondaryCta}>Se eksempel</a>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />Dine data behandles lokalt i browseren.</p>
              <p className="mt-8 max-w-md border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500">Til mindre virksomheder med mange salgs- og produktlinjer — og uden eget BI- eller datateam.</p>
            </div>

            <figure className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-overview-primary" aria-labelledby="preview-caption">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-5 py-4 text-white">
                <span className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />Senvoriq <span className="ml-2 border-l border-white/20 pl-3 font-normal text-slate-300">Overblik</span></span>
                <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] font-medium text-cyan-200">Eksempeldata</span>
              </div>
              <div className="bg-[var(--overview-workspace)] p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span className="font-semibold text-ink">Salg og indtjening</span><span>Maj 2026 mod april 2026</span></div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {previewStats.map((stat) => (
                    <div key={stat.label} className="min-w-0 rounded-lg border border-[var(--overview-border)] bg-white p-3">
                      <p className="text-xs text-slate-600">{stat.label}</p>
                      <p className="mt-2 text-lg font-semibold tabular-nums">{stat.value}</p>
                      <p className={`mt-2 text-[11px] leading-4 ${stat.tone}`}>{stat.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-[var(--overview-border)] bg-white p-4">
                  <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Hvor ligger omsætningsfaldet?</h2><span className="text-[11px] text-slate-500">Kategorier</span></div>
                  <p className="mt-1 text-xs text-slate-500">Bidrag til ændringen · i alt −120.000 kr.</p>
                  <ul className="mt-4 space-y-3">
                    {drivers.map((driver) => (
                      <li key={driver.label}>
                        <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-slate-600">{driver.label}</span><span className="font-medium tabular-nums">{driver.value}</span></div>
                        <div className="h-2 overflow-hidden rounded-sm bg-slate-100" aria-hidden="true"><div className="h-full rounded-sm bg-brand-500" style={{ width: driver.width }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 rounded-lg border border-[var(--overview-border)] border-l-[3px] border-l-brand-500 bg-white p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-700"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Prioriteret indsigt</p>
                  <p className="mt-2 text-sm font-semibold leading-6">To kategorier står for 68 % af faldet.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Tilbehør og Kontorartikler falder samlet 81.600 kr. Start med at undersøge udviklingen i disse kategorier.</p>
                  <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">Grundlag: omsætning pr. kategori · april og maj 2026</p>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-lg bg-ink p-3 text-white"><FileText className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" /><div><p className="text-xs font-semibold">Ledelsesrapport</p><p className="mt-0.5 text-[11px] text-slate-300">Nøgletal, prioriterede findings og datagrundlag samlet.</p></div></div>
              </div>
              <figcaption id="preview-caption" className="border-t border-slate-200 px-5 py-3 text-[11px] leading-5 text-slate-500">Illustrativt produktpreview med fiktive eksempeldata. Ikke en kundecase.</figcaption>
            </figure>
          </div>
        </section>

        <section id="saadan-fungerer-det" className="scroll-mt-8 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-brand-700">Tre lag i dit beslutningsgrundlag</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Fra regneark til det, du bør undersøge.</h2>
            <div className="mt-9 grid gap-6 md:grid-cols-3">
              {steps.map(({ number, title, icon: Icon, text, detail }) => (
                <article key={number} className="rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold tracking-widest text-brand-700">{number}</span><Icon className="h-5 w-5 text-brand-600" aria-hidden="true" /></div>
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
                  <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{detail}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-4 rounded-xl bg-paper p-6">
              <SlidersHorizontal className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
              <div><h3 className="text-sm font-semibold">Dit fokus bestemmer rækkefølgen.</h3><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">Fortæl, hvad du vil følge og forbedre, og tilføj eventuelt KPI-mål. Senvoriq prioriterer dit overblik, dine indsigter og din rapport ud fra svarene. Tal og dokumentation er de samme.</p></div>
            </div>
          </div>
        </section>

        <section id="eksempel" className="scroll-mt-8 border-b border-slate-200 bg-paper">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div><p className="text-sm font-semibold text-brand-700">Fra nøgletal til dokumenteret indsigt</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Ikke bare hvad der skete — men hvor ændringen kommer fra.</h2></div>
              <p className="max-w-md text-sm leading-6 text-slate-600">Et dashboard viser udviklingen. Senvoriq forbinder nøgletallene med bidragene fra dine produkter og kategorier, så du ved, hvor du skal se nærmere.</p>
            </div>
            <p className="mt-8 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">Eksempeldata · maj mod april 2026 · samme eksempel som ovenfor</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">01 · Ændringen</p><p className="mt-5 text-3xl font-semibold tabular-nums">−12 %</p><h3 className="mt-3 font-semibold">Omsætningen er faldet.</h3><p className="mt-2 text-sm leading-6 text-slate-600">Fra 1.000.000 kr. til 880.000 kr. Det er et fald på 120.000 kr.</p>
              </article>
              <article className="rounded-xl border border-brand-100 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">02 · Bidragene</p><p className="mt-5 text-3xl font-semibold tabular-nums text-brand-700">68 %</p><h3 className="mt-3 font-semibold">Faldet er koncentreret i to kategorier.</h3><p className="mt-2 text-sm leading-6 text-slate-600">Tilbehør og Kontorartikler står for 81.600 kr. af det samlede fald på 120.000 kr.</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">03 · Sammenhængen</p><p className="mt-5 text-3xl font-semibold tabular-nums">40,0 %</p><h3 className="mt-3 font-semibold">Dækningsgraden er stabil.</h3><p className="mt-2 text-sm leading-6 text-slate-600">Dækningsbidraget falder 48.000 kr., mens dækningsgraden er uændret. Undersøg antal, priser og produktmix nærmere.</p>
              </article>
            </div>
            <p className="mt-5 max-w-3xl text-xs leading-6 text-slate-500">Driveranalysen viser, hvor ændringen er registreret. Den fastslår ikke årsagen. En stabil dækningsgrad dokumenterer eksempelvis ikke i sig selv en ændring i volumen.</p>
          </div>
        </section>

        <section id="datagrundlag" className="scroll-mt-8 border-b border-slate-200">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <p className="text-sm font-semibold text-brand-700">Bygget til hverdagens regneark</p>
              <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Brug de data, du allerede arbejder med.</h2>
              <p className="mt-5 max-w-lg leading-7 text-slate-600">Du behøver ikke en fast skabelon. Senvoriq genkender danske og engelske kolonnenavne og foreslår automatisk, hvordan de skal tilknyttes.</p>
              <ul className="mt-6 space-y-3">
                {["Se præcis, hvilke kolonner der er matchet.", "Ret tilknytningerne, når der er behov for det.", "Få besked om manglende eller ugyldige data."].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm leading-6 text-slate-600"><Check className="mt-1 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />{text}</li>
                ))}
              </ul>
            </div>
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-paper px-6 py-5"><FileSpreadsheet className="h-5 w-5 text-brand-700" aria-hidden="true" /><div><p className="text-sm font-semibold">Kolonnetilknytning</p><p className="mt-1 text-xs text-slate-500">Eksempel på automatisk mapping</p></div></div>
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th scope="col" className="px-6 py-4 font-medium">I dit regneark</th><th scope="col" className="px-6 py-4 font-medium">Tilknyttet felt</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {mappings.map(([source, target]) => (
                    <tr key={source}><td className="px-6 py-4 text-slate-600">{source}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"><Check className="h-3 w-3" aria-hidden="true" />{target}</span></td></tr>
                  ))}
                </tbody>
              </table>
              <figcaption className="border-t border-slate-200 bg-paper px-6 py-4 text-xs leading-5 text-slate-500">Du kan gennemgå og rette matchene. Analysen afhænger af de felter og perioder, regnearket indeholder.</figcaption>
            </figure>
          </div>
        </section>

        <section aria-label="Et gennemskueligt datagrundlag" className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3 lg:px-8">
          {trust.map(({ icon: Icon, title, text }) => (
            <div key={title}><Icon className="h-5 w-5 text-brand-700" aria-hidden="true" /><h2 className="mt-3 text-sm font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>
          ))}
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-16 lg:flex-row lg:items-center lg:px-8">
            <div><h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Se hvad der faktisk driver dine tal.</h2><p className="mt-4 max-w-xl leading-7 text-slate-300">Upload dit salgsregneark og få et dokumenteret overblik på få minutter.</p></div>
            <Link href="/upload" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Analysér mine data<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className="bg-ink text-slate-400"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-6 text-xs lg:px-8"><span className="font-semibold text-slate-200">Senvoriq</span><span>Salgsdata. Dokumenteret indsigt. Bedre beslutningsgrundlag.</span></div></footer>
    </div>
  );
}
