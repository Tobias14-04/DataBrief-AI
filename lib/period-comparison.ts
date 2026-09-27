import { formatDanishMonth, monthSortKey } from "./dashboard-insights.ts";
import { safeRatio } from "./numeric-foundation.ts";

export type PeriodComparison = {
  status: "available" | "unavailable";
  currentMonths: string[];
  previousMonths: string[];
  currentLabel: string | null;
  previousLabel: string | null;
  label: string | null;
  reason: string | null;
};

function monthIndex(value: string): number | null {
  const timestamp = monthSortKey(value);
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  return date.getFullYear() * 12 + date.getMonth();
}

function label(months: readonly string[]): string | null {
  if (!months.length) return null;
  const first = formatDanishMonth(months[0]);
  const last = formatDanishMonth(months.at(-1)!);
  return months.length === 1 ? first : `${first} – ${last}`;
}

export function resolvePeriodComparison(
  availableMonths: readonly string[],
  options: {
    selectedMonths?: readonly string[];
    comparisonMonths?: readonly string[];
    partialMonths?: readonly string[];
  } = {},
): PeriodComparison {
  const available = new Map<number, string>();
  availableMonths.forEach((month) => {
    const index = monthIndex(month);
    if (index !== null && !available.has(index)) available.set(index, month);
  });
  const selected = options.selectedMonths?.length ? options.selectedMonths : null;
  const latestIndex = [...available.keys()].reduce((latest, index) => Math.max(latest, index), -Infinity);
  const requested = selected ?? (available.size ? [available.get(latestIndex)!] : []);
  const currentIndices = [...new Set(requested.map(monthIndex))].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const previousIndices = options.comparisonMonths?.length
    ? [...new Set(options.comparisonMonths.map(monthIndex))]
    : currentIndices.map((_, position) => currentIndices[0]! - currentIndices.length + position);
  const currentMonths = currentIndices.filter((index): index is number => index !== null)
    .sort((a, b) => a - b).map((index) => available.get(index) ?? requested.find((month) => monthIndex(month) === index)!);
  const previousMonths = previousIndices.filter((index): index is number => index !== null)
    .sort((a, b) => a - b).map((index) => available.get(index) ?? options.comparisonMonths?.find((month) => monthIndex(month) === index) ?? formatDanishMonth(new Date(Math.floor(index / 12), index % 12, 1)));
  const currentLabel = label(currentMonths);
  const previousLabel = label(previousMonths);
  const comparisonLabel = currentLabel && previousLabel ? `${previousLabel} → ${currentLabel}` : null;
  const unavailable = (reason: string): PeriodComparison => ({
    status: "unavailable", currentMonths, previousMonths, currentLabel, previousLabel, label: comparisonLabel, reason,
  });
  if (!currentIndices.length || currentIndices.some((index) => index === null)) return unavailable("Ingen gyldig kalendermåned er valgt.");
  if (currentIndices.length !== requested.length) return unavailable("Periodevalget indeholder samme kalendermåned flere gange.");
  const orderedCurrent = [...currentIndices].sort((a, b) => a! - b!) as number[];
  if (orderedCurrent.some((index, position) => position > 0 && index !== orderedCurrent[position - 1] + 1)) {
    return unavailable("Ikke-sammenhængende måneder kan ikke sammenlignes implicit.");
  }
  if (previousIndices.length !== orderedCurrent.length || previousIndices.some((index) => index === null)) {
    return unavailable("Sammenligningsintervallet skal have samme antal hele måneder.");
  }
  const orderedPrevious = [...previousIndices].sort((a, b) => a! - b!) as number[];
  if (orderedPrevious.some((index, position) => position > 0 && index !== orderedPrevious[position - 1] + 1)) {
    return unavailable("Sammenligningsintervallet er ikke sammenhængende.");
  }
  if (!orderedCurrent.every((index) => available.has(index)) || !orderedPrevious.every((index) => available.has(index))) {
    return unavailable("En eller flere kalendermåneder mangler i datagrundlaget; de behandles ikke som 0.");
  }
  const partial = new Set((options.partialMonths ?? []).map(monthIndex));
  if ([...orderedCurrent, ...orderedPrevious].some((index) => partial.has(index))) {
    return unavailable("En delmåned kan ikke sammenlignes med en hel måned uden dokumenteret ens dækning.");
  }
  return { status: "available", currentMonths, previousMonths, currentLabel, previousLabel, label: comparisonLabel, reason: null };
}

export function growthChange(current: number, previous: number) {
  const absolute = current - previous;
  return {
    absolute: Number.isFinite(absolute) ? absolute : null,
    percentage: Number.isFinite(current) && Number.isFinite(previous) && previous !== 0
      ? safeRatio(absolute, Math.abs(previous)) : null,
  };
}

export function inferBoundaryPartialMonths(rows: readonly { date: Date | null; month: string }[]): string[] {
  let earliest: Date | null = null;
  let latest: Date | null = null;
  let allFirstDay = true;
  for (const { date } of rows) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) continue;
    if (date.getDate() !== 1) allFirstDay = false;
    if (!earliest || date.getTime() < earliest.getTime()) earliest = date;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  if (!earliest || !latest || allFirstDay) return [];
  const partial: string[] = [];
  if (earliest.getDate() > 1) partial.push(formatDanishMonth(earliest));
  const monthEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 0).getDate();
  if (latest.getDate() < monthEnd) partial.push(formatDanishMonth(latest));
  return [...new Set(partial)];
}

export type MetricGrowth = {
  current: number;
  previous: number;
  absolute: number;
  percentage: number | null;
  label: string;
};

export function summarizeComparisonMetric<Row extends { month: string; date?: Date | null }>(
  rows: readonly Row[],
  comparison: PeriodComparison,
  value: (row: Row) => number | null | undefined,
): MetricGrowth | null {
  if (comparison.status !== "available" || !comparison.label) return null;
  const currentMonths = new Set(comparison.currentMonths.map(monthIndex));
  const previousMonths = new Set(comparison.previousMonths.map(monthIndex));
  let current = 0;
  let previous = 0;
  let currentCount = 0;
  let previousCount = 0;
  for (const row of rows) {
    const index = monthIndex(row.month) ?? (row.date ? monthIndex(formatDanishMonth(row.date)) : null);
    const inCurrent = currentMonths.has(index);
    const inPrevious = previousMonths.has(index);
    if (!inCurrent && !inPrevious) continue;
    const amount = value(row);
    if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
    if (inCurrent) { current += amount; currentCount += 1; }
    if (inPrevious) { previous += amount; previousCount += 1; }
  }
  if (!currentCount || !previousCount) return null;
  const change = growthChange(current, previous);
  if (change.absolute === null) return null;
  return { current, previous, absolute: change.absolute, percentage: change.percentage, label: comparison.label };
}
