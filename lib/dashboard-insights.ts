export type DashboardMetricKey = "revenue" | "units" | "grossProfit" | "grossMargin" | "cost" | "rows";

export const dashboardMetricLabels: Record<DashboardMetricKey, string> = {
  revenue: "Omsætning",
  units: "Solgte enheder",
  grossProfit: "Dækningsbidrag",
  grossMargin: "Dækningsgrad",
  cost: "Omkostninger",
  rows: "Medtagne rækker",
};

const monthNames = [
  "januar",
  "februar",
  "marts",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "december",
] as const;

const monthLookup = new Map<string, number>([
  ["jan", 0], ["januar", 0], ["january", 0],
  ["feb", 1], ["februar", 1], ["february", 1],
  ["mar", 2], ["marts", 2], ["march", 2],
  ["apr", 3], ["april", 3],
  ["maj", 4], ["may", 4],
  ["jun", 5], ["juni", 5], ["june", 5],
  ["jul", 6], ["juli", 6], ["july", 6],
  ["aug", 7], ["august", 7],
  ["sep", 8], ["sept", 8], ["september", 8],
  ["okt", 9], ["oktober", 9], ["oct", 9], ["october", 9],
  ["nov", 10], ["november", 10],
  ["dec", 11], ["december", 11],
]);

function parseMonth(value: string | Date) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { month: value.getMonth(), year: value.getFullYear() };
  }

  const text = value.trim();
  const yearFirst = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/.exec(text);
  if (yearFirst) {
    const month = Number(yearFirst[2]) - 1;
    return month >= 0 && month < 12 ? { month, year: Number(yearFirst[1]) } : null;
  }

  const monthFirst = /^(\d{1,2})[-/.](\d{4})$/.exec(text);
  if (monthFirst) {
    const month = Number(monthFirst[1]) - 1;
    return month >= 0 && month < 12 ? { month, year: Number(monthFirst[2]) } : null;
  }

  const namedMonth = /^([\p{L}.]+)\s+(\d{4})$/u.exec(text.toLocaleLowerCase("da-DK"));
  if (namedMonth) {
    const normalizedName = namedMonth[1].replace(/\./g, "");
    const month = monthLookup.get(normalizedName);
    return month === undefined ? null : { month, year: Number(namedMonth[2]) };
  }

  return null;
}

export function formatDanishMonth(value: string | Date, variant: "long" | "short" = "long") {
  const parsed = parseMonth(value);
  if (!parsed) return typeof value === "string" ? value.trim() : "Ukendt måned";
  if (variant === "long") return `${monthNames[parsed.month]} ${parsed.year}`;
  return new Intl.DateTimeFormat("da-DK", { month: "short", year: "2-digit" }).format(
    new Date(parsed.year, parsed.month, 1),
  );
}

export function monthSortKey(value: string | Date) {
  const parsed = parseMonth(value);
  return parsed ? new Date(parsed.year, parsed.month, 1).getTime() : null;
}

export function formatDanishCurrency(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDanishPercent(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDanishNumber(value: number) {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(value);
}

export function formatMetricTooltip(value: number | string, metric: string | number) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const key = String(metric) as DashboardMetricKey;
  const label = dashboardMetricLabels[key] ?? String(metric);

  if (!Number.isFinite(numericValue)) return [String(value), label] as [string, string];
  if (key === "grossMargin") return [formatDanishPercent(numericValue), label] as [string, string];
  if (key === "units" || key === "rows") return [formatDanishNumber(numericValue), label] as [string, string];
  return [formatDanishCurrency(numericValue), label] as [string, string];
}

export type MonthlyReportMetric = {
  key: DashboardMetricKey | "result" | "budgetStatus";
  label: string;
  value: string;
};

export type MonthlyReportInput = {
  month: string;
  revenue: number;
  rowCount: number;
  units?: number | null;
  grossProfit?: number | null;
  grossMargin?: number | null;
  result?: number | null;
  budget?: {
    deviation: number;
    status: "På budget" | "Over budgettet" | "Under budgettet";
  } | null;
};

function rowText(rowCount: number) {
  return rowCount === 1 ? "1 medtaget række" : `${formatDanishNumber(rowCount)} medtagne rækker`;
}

function unitText(units: number) {
  return units === 1 ? "1 solgt enhed" : `${formatDanishNumber(units)} solgte enheder`;
}

export function buildMonthlyReport(input: MonthlyReportInput) {
  const metrics: MonthlyReportMetric[] = [
    { key: "revenue", label: dashboardMetricLabels.revenue, value: formatDanishCurrency(input.revenue) },
  ];

  let secondarySentence = "";
  if (input.grossProfit !== null && input.grossProfit !== undefined) {
    metrics.push({ key: "grossProfit", label: dashboardMetricLabels.grossProfit, value: formatDanishCurrency(input.grossProfit) });
    secondarySentence = `dækningsbidraget ${formatDanishCurrency(input.grossProfit)}`;
  } else if (input.grossMargin !== null && input.grossMargin !== undefined) {
    metrics.push({ key: "grossMargin", label: dashboardMetricLabels.grossMargin, value: formatDanishPercent(input.grossMargin) });
    secondarySentence = `dækningsgraden ${formatDanishPercent(input.grossMargin)}`;
  } else if (input.result !== null && input.result !== undefined) {
    metrics.push({ key: "result", label: "Resultat", value: formatDanishCurrency(input.result) });
    secondarySentence = `resultatet ${formatDanishCurrency(input.result)}`;
  } else if (input.units !== null && input.units !== undefined) {
    metrics.push({ key: "units", label: dashboardMetricLabels.units, value: formatDanishNumber(input.units) });
    secondarySentence = unitText(input.units);
  }

  if (input.budget) {
    metrics.push({ key: "budgetStatus", label: "Budgetstatus", value: input.budget.status });
  }
  metrics.push({ key: "rows", label: dashboardMetricLabels.rows, value: formatDanishNumber(input.rowCount) });

  const month = formatDanishMonth(input.month);
  let summary = `I ${month} var omsætningen ${formatDanishCurrency(input.revenue)}`;

  if (secondarySentence) {
    summary += secondarySentence.startsWith("dæknings") || secondarySentence.startsWith("resultatet")
      ? `, ${secondarySentence}`
      : `, med ${secondarySentence}`;
  }

  if (input.budget) {
    const deviation = formatDanishCurrency(Math.abs(input.budget.deviation));
    if (input.budget.status === "På budget") {
      summary += ", og omsætningen var på det fordelte månedsbudget";
    } else {
      summary += `, og omsætningen lå ${deviation} ${input.budget.deviation >= 0 ? "over" : "under"} det fordelte månedsbudget`;
    }
  }
  summary += `, baseret på ${rowText(input.rowCount)}`;

  return { metrics, summary: `${summary}.` };
}

export type AdaptiveMarginChartMode = "grossProfit" | "grossMargin" | "empty";

export function getAdaptiveMarginChartMode(hasGrossProfit: boolean, hasGrossMargin: boolean): AdaptiveMarginChartMode {
  if (hasGrossProfit) return "grossProfit";
  if (hasGrossMargin) return "grossMargin";
  return "empty";
}
