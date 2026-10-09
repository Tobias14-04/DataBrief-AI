import type { ImportRejections } from "@/lib/import-rejections";
import { formatDanishCurrencyPrecise, formatDanishNumber } from "@/lib/dashboard-insights";
import { isFiniteNumber } from "@/lib/numeric-foundation";

export function ImportClassificationNotice({ summary }: { summary?: { count: number; product: number; category: number; details: Array<{ excelRow: number }> } }) {
  if (!summary?.count) return null;
  return <section role="status" aria-label="Manglende klassifikation" data-testid="import-classification" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
    <p>{formatDanishNumber(summary.count)} {summary.count === 1 ? "salgsrække mangler produkt eller kategori. Rækken er medtaget" : "salgsrækker mangler produkt eller kategori. Rækkerne er medtaget"} i totalerne og vises særskilt i fordelingerne.</p>
    <details className="mt-1"><summary className="cursor-pointer font-semibold underline underline-offset-2">Se klassifikationsmangler</summary>
      <p>Produkt mangler: {summary.product} · Kategori mangler: {summary.category}. Excel-rækker: {summary.details.map((row) => row.excelRow).join(", ")}{summary.count > summary.details.length ? " (første 100)" : ""}.</p>
    </details>
  </section>;
}

export function ImportRejectionNotice({ summary }: { summary: ImportRejections | null | undefined }) {
  if (!summary?.count) return null;
  const coverage = (count: number) => count === summary.count ? "" : ` (dokumenteret på ${formatDanishNumber(count)} af ${formatDanishNumber(summary.count)} rækker)`;
  return (
    <section role="status" aria-label="Udeladte salgsrækker" className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" data-testid="import-rejections">
      <p className="font-semibold">{formatDanishNumber(summary.count)} salgsrækker er udeladt fra analysen</p>
      <p className="mt-1 text-xs leading-5">KPI’er beregnes kun på de accepterede rækker. Ret de manglende eller ugyldige felter i kildefilen for at få rækkerne med.</p>
      <div className="mt-2 space-y-1 text-xs leading-5">
        <p>Bortfalden dokumenteret omsætning: {isFiniteNumber(summary.revenue) ? formatDanishCurrencyPrecise(summary.revenue) : "Kan ikke opgøres"}{coverage(summary.revenueCount)}</p>
        <p>Bortfaldne dokumenterede enheder: {isFiniteNumber(summary.units) ? formatDanishNumber(summary.units) : "Kan ikke opgøres"}{coverage(summary.unitsCount)}</p>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer rounded py-1 text-xs font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">Se rækkenumre og årsager</summary>
        <p className="mt-1 text-xs leading-5">{Object.entries(summary.reasonCounts).map(([reason, count]) => `${reason}: ${formatDanishNumber(count)}`).join(" · ")}</p>
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs leading-5">
          {summary.details.map((row) => (
            <li key={row.excelRow} className="border-t border-amber-200 pt-2">
              <span className="font-semibold">Excel-række {row.excelRow}: </span>{row.reasons.join(". ")}.
              <span className="block">Omsætning: {row.revenue === null ? "Ukendt" : formatDanishCurrencyPrecise(row.revenue)} · Enheder: {row.units === null ? "Ukendt" : formatDanishNumber(row.units)}</span>
            </li>
          ))}
        </ul>
        {summary.count > summary.details.length ? <p className="mt-2 text-xs">Viser de første {summary.details.length} af {formatDanishNumber(summary.count)} udeladte rækker. Summer og årsagstællinger omfatter alle udeladte rækker.</p> : null}
      </details>
    </section>
  );
}
