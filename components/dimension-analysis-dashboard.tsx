import { ChartNoAxesCombined } from "lucide-react";
import { CommandEmptyState, CommandPageIntro, CommandPanel } from "@/components/command-center-ui";
import { formatDanishCurrency } from "@/lib/dashboard-insights";
import type { InsightAnalysis, InsightDimension, InsightDriver } from "@/lib/insight-engine";

function share(value: number | null) {
  return value === null ? "Utilgængelig" : `${(value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;
}

export function DimensionAnalysisDashboard({
  dimension,
  analysis,
  supported,
}: {
  dimension: Extract<InsightDimension, "channel" | "region">;
  analysis: InsightAnalysis | null;
  supported: boolean;
}) {
  const label = dimension === "channel" ? "Kanaler" : "Regioner";
  const driver = analysis?.driverAnalyses.find((item) => item.dimension === dimension && item.metric === "revenue");
  const members: InsightDriver[] = driver
    ? [...driver.positiveDrivers, ...driver.negativeDrivers, ...driver.unchangedDrivers]
        .sort((left, right) => Math.abs(right.absoluteChange) - Math.abs(left.absoluteChange))
    : [];

  return (
    <section className="min-w-0 space-y-6 min-[1360px]:col-span-2" data-testid={`${dimension}-analysis-view`}>
      <CommandPageIntro
        eyebrow="Analysedimension"
        title={label}
        description={`Se hvor omsætningsændringen er registreret på tværs af ${label.toLocaleLowerCase("da-DK")}. Det viser ikke årsagen til ændringen.`}
      />
      <CommandPanel title={`Omsætningsdrivere · ${label.toLocaleLowerCase("da-DK")}`} icon={ChartNoAxesCombined}>
        {!supported ? (
          <CommandEmptyState title={`Ingen ${label.toLocaleLowerCase("da-DK")}-data`} message={`Datasættet indeholder ikke dokumenterede ${label.toLocaleLowerCase("da-DK")} i det aktuelle scope.`} />
        ) : !driver ? (
          <CommandEmptyState title="Ingen sammenlignelig periode" message="Vælg en sammenlignelig hel kalendermåned for at se, hvor ændringen er registreret. Periodehandlingen ovenfor kan finde den seneste gyldige sammenligning." />
        ) : (
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
        )}
      </CommandPanel>
    </section>
  );
}
