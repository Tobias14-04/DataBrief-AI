import { ChartNoAxesCombined } from "lucide-react";
import { CommandPageIntro, CommandPanel } from "@/components/command-center-ui";
import { formatDanishCurrency } from "@/lib/dashboard-insights";
import type { InsightAnalysis, InsightDimension, InsightDriver } from "@/lib/insight-engine";

function share(value: number | null) {
  return value === null ? "Utilgængelig" : `${(value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;
}

export function DimensionAnalysisDashboard({
  dimension,
  analysis,
  supported,
  comparisonLabel,
  onCompareLatest,
}: {
  dimension: Extract<InsightDimension, "channel" | "region">;
  analysis: InsightAnalysis | null;
  supported: boolean;
  comparisonLabel?: string;
  onCompareLatest?: () => void;
}) {
  const label = dimension === "channel" ? "Kanaler" : "Regioner";
  const driver = analysis?.driverAnalyses.find((item) => item.dimension === dimension && item.metric === "revenue");
  const members: InsightDriver[] = driver
    ? [...driver.positiveDrivers, ...driver.negativeDrivers, ...driver.unchangedDrivers]
        .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))
    : [];

  return (
    <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid={`${dimension}-analysis-view`}>
      <CommandPageIntro
        eyebrow="Analysedimension"
        title={label}
        description={`Se hvor omsætningsændringen er registreret på tværs af ${label.toLocaleLowerCase("da-DK")}. Det viser ikke årsagen til ændringen.`}
      />
      {!supported || !driver ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-5" role="status">
          <div>
            <p className="text-sm font-semibold text-ink">{supported ? "Ingen sammenlignelig periode" : `Ingen ${label.toLocaleLowerCase("da-DK")}-data`}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {supported
                ? `Vælg en komplet kalendermåned for at sammenligne ${label.toLocaleLowerCase("da-DK")}. ${comparisonLabel ? `Seneste gyldige par: ${comparisonLabel}.` : "Der findes endnu ikke et gyldigt periodepar."}`
                : `Datasættet indeholder ikke dokumenterede ${label.toLocaleLowerCase("da-DK")} i det aktuelle scope.`}
            </p>
          </div>
          {supported && onCompareLatest ? (
            <button type="button" onClick={onCompareLatest} className="mt-3 inline-flex min-h-10 shrink-0 items-center rounded-lg bg-[#0b263a] px-4 text-xs font-semibold text-white hover:bg-[#153d58] sm:mt-0">
              Sammenlign seneste komplette måned
            </button>
          ) : null}
        </div>
      ) : (
        <CommandPanel title={`Omsætningsdrivere · ${label.toLocaleLowerCase("da-DK")}`} icon={ChartNoAxesCombined}>
          <div className="overflow-x-auto">
            <p className="border-b border-slate-100 px-5 py-4 text-xs text-slate-600">{driver.comparisonPeriod} · omsætningsændring {formatDanishCurrency(driver.totalChange)} · samme filtre i begge perioder</p>
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr><th scope="col" className="px-5 py-3">Medlem</th><th scope="col" className="px-3 py-3 text-right">Bidrag i kr.</th><th scope="col" className="px-3 py-3 text-right">Andel af nettoændringen</th><th scope="col" className="px-5 py-3 text-right">Andel af absolut bevægelse</th></tr>
              </thead>
              <tbody>
                {members.map((item) => (
                  <tr key={item.evidenceId} className="border-t border-slate-100">
                    <th scope="row" className="px-5 py-3 font-medium text-ink">{item.dimensionValue}</th>
                    <td className="px-3 py-3 text-right tabular-nums">{formatDanishCurrency(item.absoluteChange)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{share(item.contribution)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{share(item.movementShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!members.length ? <p className="px-5 py-5 text-sm text-slate-600">Ingen dokumenterede ændringer i denne dimension.</p> : null}
            {Math.abs(driver.reconciliationDifference) > 0.01 ? <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-800">Ikke-afstemt rest: {formatDanishCurrency(driver.reconciliationDifference)}.</p> : null}
          </div>
        </CommandPanel>
      )}
    </section>
  );
}
