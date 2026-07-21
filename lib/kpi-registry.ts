import type {
  KpiColor,
  KpiDefinition,
  KpiEvaluation,
  KpiFormat,
  KpiIcon,
  KpiLevel,
  KpiSourceRow,
  StandardKpiContext,
} from "./kpi-customization";
import { normalizeColumnHeader, salesColumnAliases } from "./spreadsheet-fields.ts";

export type KpiCategory =
  | "Salg"
  | "Indtjening"
  | "Budget"
  | "Produkter"
  | "Tid og perioder"
  | "Finansielle nøgletal"
  | "Likviditet"
  | "Rentabilitet"
  | "Lager"
  | "Kunder"
  | "Brugerdefinerede";

export type KpiDataField =
  | "revenue"
  | "units"
  | "grossProfit"
  | "grossMargin"
  | "cost"
  | "budgetRevenue"
  | "budgetCosts"
  | "product"
  | "category"
  | "date"
  | "month"
  | "week"
  | "quarter"
  | "year"
  | "orderId"
  | "customerId"
  | "customerName"
  | "unitPrice"
  | "unitCost"
  | "variableCost"
  | "fixedCost"
  | "equity"
  | "assets"
  | "currentAssets"
  | "currentLiabilities"
  | "inventory"
  | "cash"
  | "receivables"
  | "totalDebt"
  | "liabilities"
  | "operatingProfit"
  | "ebitda"
  | "depreciation"
  | "inventoryQuantity"
  | "netProfit";

type KpiFieldDefinition = {
  label: string;
  aliases: string[];
};

export const kpiFieldRegistry: Record<KpiDataField, KpiFieldDefinition> = {
  revenue: {
    label: "Omsætning",
    aliases: [...salesColumnAliases.netRevenue, ...salesColumnAliases.grossRevenue, ...salesColumnAliases.revenue, "omsætning i alt", "net sales", "salg i alt"],
  },
  units: {
    label: "Antal",
    aliases: [...salesColumnAliases.units],
  },
  grossProfit: {
    label: "Dækningsbidrag eller bruttofortjeneste",
    aliases: [...salesColumnAliases.grossProfit, "bruttoresultat"],
  },
  grossMargin: {
    label: "Dækningsgrad",
    aliases: [...salesColumnAliases.grossMargin, "gross margin %"],
  },
  cost: {
    label: "Omkostninger",
    aliases: [...salesColumnAliases.cost, "produktomkostning", "produktomkostninger"],
  },
  variableCost: {
    label: "Variable omkostninger",
    aliases: ["variable omkostninger", "variable costs", "variable cost", "variable expenses"],
  },
  fixedCost: {
    label: "Faste omkostninger",
    aliases: ["faste omkostninger", "fixed costs", "fixed cost", "fixed expenses"],
  },
  budgetRevenue: {
    label: "Budgetteret omsætning",
    aliases: ["budgetteret omsætning", "budget omsætning", "budget revenue", "budget sales", "revenue budget"],
  },
  budgetCosts: {
    label: "Budgetterede omkostninger",
    aliases: ["budgetterede omkostninger", "budget omkostninger", "budget costs", "cost budget"],
  },
  product: {
    label: "Produkt",
    aliases: [...salesColumnAliases.product],
  },
  category: {
    label: "Kategori",
    aliases: [...salesColumnAliases.category],
  },
  date: {
    label: "Dato",
    aliases: [...salesColumnAliases.date],
  },
  month: {
    label: "Måned",
    aliases: [...salesColumnAliases.month],
  },
  week: {
    label: "Uge",
    aliases: ["uge", "ugenummer", "week", "week number", "week no"],
  },
  quarter: {
    label: "Kvartal",
    aliases: ["kvartal", "quarter", "fiscal quarter", "qtr"],
  },
  year: {
    label: "År",
    aliases: ["år", "year", "regnskabsår", "fiscal year"],
  },
  orderId: {
    label: "Ordre-id",
    aliases: ["ordre-id", "ordre id", "ordrenummer", "order id", "order number", "invoice id", "fakturanummer"],
  },
  customerId: {
    label: "Kunde-id",
    aliases: ["kunde-id", "kunde id", "kundenummer", "customer id", "customer number", "client id", "account id"],
  },
  customerName: {
    label: "Kunde",
    aliases: ["kunde", "kundenavn", "customer", "customer name", "client", "client name"],
  },
  unitPrice: {
    label: "Salgspris pr. enhed",
    aliases: [...salesColumnAliases.unitPrice, "enhedspris", "salgspris", "price per unit"],
  },
  unitCost: {
    label: "Kostpris pr. enhed",
    aliases: ["kostpris pr. stk.", "kostpris pr stk", "kostpris pr. enhed", "unit cost", "cost per unit", "purchase price"],
  },
  equity: {
    label: "Egenkapital",
    aliases: ["egenkapital", "equity", "equity value", "owners equity", "owner's equity", "shareholders equity", "shareholder equity"],
  },
  assets: {
    label: "Aktiver",
    aliases: ["aktiver", "aktiver i alt", "assets", "total assets"],
  },
  currentAssets: {
    label: "Omsætningsaktiver",
    aliases: ["omsætningsaktiver", "current assets", "short term assets", "kortfristede aktiver"],
  },
  currentLiabilities: {
    label: "Kortfristet gæld",
    aliases: ["kortfristet gæld", "kortfristede forpligtelser", "current liabilities", "short term liabilities", "short term debt"],
  },
  inventory: {
    label: "Lager",
    aliases: ["lager", "lagerværdi", "varelager", "inventory", "stock", "stock value", "inventories"],
  },
  cash: {
    label: "Likvide beholdninger",
    aliases: ["likvide beholdninger", "likvider", "cash", "cash and equivalents", "cash equivalents", "bankbeholdning"],
  },
  receivables: {
    label: "Tilgodehavender",
    aliases: ["tilgodehavender", "debitorer", "accounts receivable", "receivables", "trade receivables"],
  },
  totalDebt: {
    label: "Rentebærende gæld",
    aliases: ["rentebærende gæld", "samlet gæld", "total debt", "interest bearing debt", "debt"],
  },
  liabilities: {
    label: "Forpligtelser",
    aliases: ["forpligtelser", "passiver ekskl egenkapital", "liabilities", "total liabilities"],
  },
  operatingProfit: {
    label: "Driftsresultat",
    aliases: ["driftsresultat", "resultat af primær drift", "operating profit", "operating income", "ebit"],
  },
  ebitda: {
    label: "EBITDA",
    aliases: ["ebitda", "resultat før renter skat afskrivninger", "earnings before interest taxes depreciation and amortization"],
  },
  depreciation: {
    label: "Af- og nedskrivninger",
    aliases: ["afskrivninger", "af- og nedskrivninger", "depreciation", "amortization", "depreciation and amortization"],
  },
  inventoryQuantity: {
    label: "Lagerantal",
    aliases: ["lagerantal", "antal på lager", "lagerbeholdning", "stock quantity", "inventory quantity", "quantity on hand", "on hand"],
  },
  netProfit: {
    label: "Årets resultat",
    aliases: ["årets resultat", "nettoresultat", "net profit", "net income", "profit after tax", "resultat efter skat"],
  },
};

export type KpiRequirement = {
  mode: "all" | "any";
  fields: KpiDataField[];
  label?: string;
};

export type KpiDataProfile = {
  columns: string[];
  matchedColumns: Partial<Record<KpiDataField, string[]>>;
  rawValues: Partial<Record<KpiDataField, unknown[]>>;
  numericValues: Partial<Record<KpiDataField, number[]>>;
  rows: Array<{ values: Partial<Record<KpiDataField, unknown>> }>;
};

type KpiCalculationResult = {
  value: number | string;
  detail: string;
};

export type RegisteredKpiDefinition = KpiDefinition & {
  category: KpiCategory;
  level: KpiLevel;
  requirements: KpiRequirement[];
  status: "dynamic";
  calculate: (input: { context: StandardKpiContext; profile: KpiDataProfile }) => KpiCalculationResult;
};

const normalizeColumnName = normalizeColumnHeader;

const normalizedFieldAliases = Object.fromEntries(
  Object.entries(kpiFieldRegistry).map(([field, definition]) => [
    field,
    new Set([definition.label, ...definition.aliases].map(normalizeColumnName)),
  ]),
) as Record<KpiDataField, Set<string>>;

function toNumericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const isPercent = text.includes("%");
  const cleaned = text.replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return isPercent && parsed > 1 ? parsed / 100 : parsed;
}

export function matchKpiField(column: string): KpiDataField | null {
  const normalized = normalizeColumnName(column);
  const match = (Object.keys(kpiFieldRegistry) as KpiDataField[]).find((field) =>
    normalizedFieldAliases[field].has(normalized),
  );
  return match ?? null;
}

export function scoreKpiHeaders(headers: string[]) {
  return new Set(headers.map(matchKpiField).filter(Boolean)).size;
}

export function buildKpiDataProfile(
  rows: KpiSourceRow[],
  virtualValues: Partial<Record<KpiDataField, unknown[]>> = {},
): KpiDataProfile {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.sourceValues))),
  ).filter((column) => !column.startsWith("__"));
  const matchedColumns: Partial<Record<KpiDataField, string[]>> = {};
  const rawValues: Partial<Record<KpiDataField, unknown[]>> = {};
  const numericValues: Partial<Record<KpiDataField, number[]>> = {};

  columns.forEach((column) => {
    const field = matchKpiField(column);
    if (!field) return;
    matchedColumns[field] = [...(matchedColumns[field] ?? []), column];
  });

  (Object.keys(kpiFieldRegistry) as KpiDataField[]).forEach((field) => {
    const fieldColumns = matchedColumns[field] ?? [];
    const values = [
      ...rows.flatMap((row) =>
        fieldColumns
          .map((column) => row.sourceValues[column])
          .filter((value) => value !== "" && value !== null && value !== undefined),
      ),
      ...(virtualValues[field] ?? []),
    ];
    if (!values.length) return;
    rawValues[field] = values;
    numericValues[field] = values
      .map(toNumericValue)
      .filter((value): value is number => value !== null);
    if (!matchedColumns[field]?.length && virtualValues[field]?.length) {
      matchedColumns[field] = [kpiFieldRegistry[field].label];
    }
  });

  const profileRows = rows
    .map((row) => {
      const values: Partial<Record<KpiDataField, unknown>> = {};
      (Object.keys(kpiFieldRegistry) as KpiDataField[]).forEach((field) => {
        const column = (matchedColumns[field] ?? []).find((candidate) => {
          const value = row.sourceValues[candidate];
          return value !== "" && value !== null && value !== undefined;
        });
        if (column) values[field] = row.sourceValues[column];
      });
      return { values };
    })
    .filter((row) => Object.keys(row.values).length > 0);

  return { columns, matchedColumns, rawValues, numericValues, rows: profileRows };
}

function hasField(profile: KpiDataProfile, field: KpiDataField) {
  return Boolean(profile.rawValues[field]?.length);
}

function sum(profile: KpiDataProfile, field: KpiDataField) {
  return (profile.numericValues[field] ?? []).reduce((total, value) => total + value, 0);
}

function uniqueCount(profile: KpiDataProfile, field: KpiDataField) {
  return new Set((profile.rawValues[field] ?? []).map((value) => String(value).trim()).filter(Boolean)).size;
}

function ratio(numerator: number, denominator: number, label: string) {
  if (!denominator) throw new Error(`${label} kan ikke beregnes, fordi grundlaget er 0.`);
  return numerator / denominator;
}

function average(values: number[], label: string) {
  if (!values.length) throw new Error(`${label} kræver mindst én numerisk værdi.`);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function rowNumber(row: KpiDataProfile["rows"][number], field: KpiDataField) {
  return toNumericValue(row.values[field]);
}

function rowText(row: KpiDataProfile["rows"][number], field: KpiDataField) {
  const value = row.values[field];
  return value === "" || value === null || value === undefined ? null : String(value).trim();
}

function groupedSums(profile: KpiDataProfile, groupField: KpiDataField, valueField: KpiDataField) {
  const groups = new Map<string, number>();
  profile.rows.forEach((row) => {
    const group = rowText(row, groupField);
    const value = rowNumber(row, valueField);
    if (!group || value === null) return;
    groups.set(group, (groups.get(group) ?? 0) + value);
  });
  return Array.from(groups, ([name, value]) => ({ name, value }));
}

function rankedGroup<T extends { name: string; value: number }>(
  groups: T[],
  direction: "highest" | "lowest",
  label: string,
) {
  const ranked = [...groups].sort((a, b) =>
    direction === "highest" ? b.value - a.value : a.value - b.value,
  );
  if (!ranked[0]) throw new Error(`${label} kræver mindst én gyldig gruppe.`);
  return ranked[0] as T;
}

function parseProfileDate(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === "number" && value > 1 && value < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  const danishDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (danishDate) {
    const [, day, month, year] = danishDate;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date : null;
}

type PeriodUnit = "day" | "week" | "month" | "quarter" | "year";

function isoWeek(date: Date) {
  const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  working.setUTCDate(working.getUTCDate() + 4 - (working.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  return {
    year: working.getUTCFullYear(),
    week: Math.ceil(((working.getTime() - yearStart.getTime()) / 86400000 + 1) / 7),
  };
}

function datePeriod(date: Date, unit: PeriodUnit) {
  const year = date.getUTCFullYear();
  if (unit === "day") {
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date) };
  }
  if (unit === "week") {
    const value = isoWeek(date);
    return { key: `${value.year}-${String(value.week).padStart(2, "0")}`, label: `Uge ${value.week}, ${value.year}` };
  }
  if (unit === "month") {
    return { key: `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat("da-DK", { month: "short", year: "numeric", timeZone: "UTC" }).format(date) };
  }
  if (unit === "quarter") {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    return { key: `${year}-Q${quarter}`, label: `${quarter}. kvt. ${year}` };
  }
  return { key: String(year), label: String(year) };
}

function fallbackPeriod(row: KpiDataProfile["rows"][number], unit: PeriodUnit) {
  const field = unit === "month" ? "month" : unit === "week" ? "week" : unit === "quarter" ? "quarter" : unit === "year" ? "year" : null;
  if (!field) return null;
  const label = rowText(row, field);
  return label ? { key: label, label } : null;
}

function periodRevenue(profile: KpiDataProfile, unit: PeriodUnit) {
  const groups = new Map<string, { label: string; value: number; order: number }>();
  profile.rows.forEach((row, index) => {
    const revenue = rowNumber(row, "revenue");
    if (revenue === null) return;
    const date = parseProfileDate(row.values.date);
    const period = date ? datePeriod(date, unit) : fallbackPeriod(row, unit);
    if (!period) return;
    const current = groups.get(period.key);
    groups.set(period.key, { label: period.label, value: (current?.value ?? 0) + revenue, order: current?.order ?? index });
  });
  return Array.from(groups.entries())
    .map(([key, value]) => ({ key, name: value.label, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key, "da") || a.order - b.order);
}

function periodGrowthRates(profile: KpiDataProfile, unit: PeriodUnit) {
  const periods = periodRevenue(profile, unit);
  return periods.slice(1).map((period, index) => ({
    name: period.label,
    value: ratio(period.value - periods[index].value, periods[index].value, "Periodevækst"),
  }));
}

function groupedRatio(
  profile: KpiDataProfile,
  groupField: KpiDataField,
  numeratorField: KpiDataField,
  denominatorField: KpiDataField,
) {
  const numerators = new Map(groupedSums(profile, groupField, numeratorField).map((group) => [group.name, group.value]));
  const denominators = new Map(groupedSums(profile, groupField, denominatorField).map((group) => [group.name, group.value]));
  return Array.from(numerators, ([name, numerator]) => ({
    name,
    value: ratio(numerator, denominators.get(name) ?? 0, name),
  }));
}

function groupedCounts(profile: KpiDataProfile, groupField: KpiDataField) {
  const groups = new Map<string, number>();
  profile.rows.forEach((row) => {
    const group = rowText(row, groupField);
    if (group) groups.set(group, (groups.get(group) ?? 0) + 1);
  });
  return Array.from(groups, ([name, value]) => ({ name, value }));
}

function groupedGrowth(profile: KpiDataProfile, groupField: KpiDataField) {
  const groups = new Map<string, Map<string, number>>();
  profile.rows.forEach((row) => {
    const group = rowText(row, groupField);
    const revenue = rowNumber(row, "revenue");
    const date = parseProfileDate(row.values.date);
    const period = date ? datePeriod(date, "month") : fallbackPeriod(row, "month");
    if (!group || revenue === null || !period) return;
    const values = groups.get(group) ?? new Map<string, number>();
    values.set(period.key, (values.get(period.key) ?? 0) + revenue);
    groups.set(group, values);
  });
  return Array.from(groups, ([name, values]) => {
    const periods = Array.from(values.entries()).sort(([a], [b]) => a.localeCompare(b, "da"));
    if (periods.length < 2) return null;
    const first = periods[0][1];
    const last = periods.at(-1)![1];
    return { name, value: ratio(last - first, first, `${name}s vækst`) };
  }).filter((item): item is { name: string; value: number } => item !== null);
}

function newCustomersInLatestMonth(profile: KpiDataProfile) {
  const firstPurchase = new Map<string, Date>();
  profile.rows.forEach((row) => {
    const customer = rowText(row, "customerId") ?? rowText(row, "customerName");
    const date = parseProfileDate(row.values.date);
    if (!customer || !date) return;
    const current = firstPurchase.get(customer);
    if (!current || date < current) firstPurchase.set(customer, date);
  });
  const dates = Array.from(firstPurchase.values());
  if (!dates.length) throw new Error("Nye kunder kræver gyldige kunde- og datoværdier.");
  const latest = dates.reduce((current, date) => date > current ? date : current);
  return dates.filter((date) => date.getUTCFullYear() === latest.getUTCFullYear() && date.getUTCMonth() === latest.getUTCMonth()).length;
}

function requirements(
  all: KpiDataField[] = [],
  any: Array<{ fields: KpiDataField[]; label?: string }> = [],
): KpiRequirement[] {
  return [
    ...(all.length ? [{ mode: "all" as const, fields: all }] : []),
    ...any.map((requirement) => ({ mode: "any" as const, ...requirement })),
  ];
}

function defineKpi(definition: {
  id: string;
  name: string;
  description: string;
  category: KpiCategory;
  level?: KpiLevel;
  placement?: "primary" | "secondary";
  format: KpiFormat;
  decimals?: 0 | 1 | 2;
  icon: KpiIcon;
  color: KpiColor;
  requirements?: KpiRequirement[];
  calculate: RegisteredKpiDefinition["calculate"];
}): RegisteredKpiDefinition {
  return {
    placement: definition.placement ?? "secondary",
    decimals: definition.decimals ?? 0,
    isCustom: false,
    status: "dynamic",
    level: definition.level ?? "standard",
    requirements: definition.requirements ?? [],
    ...definition,
  };
}

export const standardKpiDefinitions: RegisteredKpiDefinition[] = [
  defineKpi({ id: "total-revenue", name: "Samlet omsætning", description: "Summen af den registrerede omsætning", category: "Salg", level: "recommended", placement: "primary", format: "currency", icon: "revenue", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: context.totalRevenue, detail: "Beregnet ud fra omsætningskolonnen" }) }),
  defineKpi({ id: "total-units", name: "Samlet antal solgte enheder", description: "Summen af den registrerede antalskolonne", category: "Salg", level: "recommended", placement: "primary", format: "integer", icon: "units", color: "navy", requirements: requirements(["units"]), calculate: ({ context }) => ({ value: context.totalUnits, detail: "Beregnet ud fra antalskolonnen" }) }),
  defineKpi({ id: "gross-profit", name: "Dækningsbidrag", description: "Omsætning efter variable omkostninger", category: "Indtjening", level: "recommended", placement: "primary", format: "currency", icon: "profit", color: "green", requirements: requirements(["grossProfit"]), calculate: ({ context }) => ({ value: context.totalGrossProfit, detail: "Beregnet ud fra dækningsbidraget" }) }),
  defineKpi({ id: "gross-margin", name: "Dækningsgrad", description: "Dækningsbidrag som andel af omsætningen", category: "Indtjening", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["grossProfit", "grossMargin"], label: "Dækningsbidrag eller dækningsgrad" }]), calculate: ({ context }) => ({ value: context.grossMargin, detail: "Beregnet ud fra dækningsdata" }) }),
  defineKpi({ id: "total-costs", name: "Samlede omkostninger", description: "Registrerede omkostninger i den aktuelle visning", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements([], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: context.totalCosts, detail: "Beregnet ud fra omkostningsdata" }) }),
  defineKpi({ id: "result", name: "Resultat", description: "Omsætning minus registrerede omkostninger", category: "Indtjening", format: "currency", icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: context.actualResult, detail: "Omsætning minus omkostninger" }) }),
  defineKpi({ id: "revenue-vs-budget", name: "Omsætning mod budget", description: "Forskel mellem faktisk og budgetteret omsætning", category: "Budget", placement: "primary", format: "currency", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget, detail: "Faktisk omsætning sammenholdt med budget" }) }),
  defineKpi({ id: "best-product", name: "Bedste produkt", description: "Produktet med den højeste omsætning", category: "Produkter", level: "recommended", format: "text", icon: "units", color: "navy", requirements: requirements(["product", "revenue"]), calculate: ({ context }) => { if (!context.bestProduct) throw new Error("Ingen produkter i den aktuelle visning."); return { value: context.bestProduct.name, detail: "Produktet med den højeste omsætning" }; } }),
  defineKpi({ id: "best-category", name: "Bedste kategori", description: "Kategorien med den højeste omsætning", category: "Produkter", format: "text", icon: "target", color: "cyan", requirements: requirements(["category", "revenue"]), calculate: ({ context }) => { if (!context.bestCategory) throw new Error("Ingen kategorier i den aktuelle visning."); return { value: context.bestCategory.name, detail: "Kategorien med den højeste omsætning" }; } }),
  defineKpi({ id: "best-month", name: "Bedste måned", description: "Måneden med den højeste omsætning", category: "Tid og perioder", level: "recommended", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => { if (!context.bestMonth) throw new Error("Ingen måneder i den aktuelle visning."); return { value: context.bestMonth.name, detail: "Måneden med den højeste omsætning" }; } }),
  defineKpi({ id: "avg-revenue-row", name: "Gennemsnitlig omsætning pr. række", description: "Omsætning divideret med registrerede salgsrækker", category: "Salg", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.rowCount, "Gennemsnitlig omsætning pr. række"), detail: `Beregnet ud fra ${context.rowCount} rækker` }) }),
  defineKpi({ id: "avg-revenue-unit", name: "Gennemsnitlig omsætning pr. solgt enhed", description: "Omsætning divideret med solgte enheder", category: "Salg", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["revenue", "units"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.totalUnits, "Omsætning pr. enhed"), detail: "Omsætning pr. solgt enhed" }) }),
  defineKpi({ id: "gross-profit-unit", name: "Dækningsbidrag pr. solgt enhed", description: "Dækningsbidrag divideret med solgte enheder", category: "Indtjening", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["grossProfit", "units"]), calculate: ({ context }) => ({ value: ratio(context.totalGrossProfit, context.totalUnits, "Dækningsbidrag pr. enhed"), detail: "Dækningsbidrag pr. solgt enhed" }) }),
  defineKpi({ id: "row-count", name: "Antal registrerede salgsrækker", description: "Antallet af rækker i den aktuelle visning", category: "Salg", format: "count", icon: "units", color: "navy", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: context.rowCount, detail: "Filtrerede salgsrækker" }) }),
  defineKpi({ id: "average-order-value", name: "Gennemsnitlig ordreværdi", description: "Omsætning divideret med unikke ordrer", category: "Kunder", format: "currency", decimals: 2, icon: "calculator", color: "purple", requirements: requirements(["revenue", "orderId"]), calculate: ({ context, profile }) => ({ value: ratio(context.totalRevenue, context.orderCount ?? uniqueCount(profile, "orderId"), "Gennemsnitlig ordreværdi"), detail: "Omsætning pr. unik ordre" }) }),
  defineKpi({ id: "budget-revenue", name: "Budgetteret omsætning", description: "Budgetteret omsætning for den aktuelle visning", category: "Budget", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetRevenue"]), calculate: ({ context }) => ({ value: context.budgetRevenue, detail: "Budgetteret omsætning" }) }),
  defineKpi({ id: "budget-costs", name: "Budgetterede omkostninger", description: "Budgetterede omkostninger for den aktuelle visning", category: "Budget", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetCosts"]), calculate: ({ context }) => ({ value: context.budgetCosts, detail: "Budgetterede omkostninger" }) }),
  defineKpi({ id: "budget-result", name: "Budgetteret resultat", description: "Budgetteret omsætning minus omkostninger", category: "Budget", format: "currency", icon: "profit", color: "green", requirements: requirements(["budgetRevenue", "budgetCosts"]), calculate: ({ context }) => ({ value: context.budgetResult, detail: "Budgetteret omsætning minus omkostninger" }) }),
  defineKpi({ id: "equity-ratio", name: "Soliditetsgrad", description: "Egenkapital som andel af de samlede aktiver", category: "Finansielle nøgletal", format: "percent", decimals: 1, icon: "target", color: "navy", requirements: requirements(["equity", "assets"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "equity"), sum(profile, "assets"), "Soliditetsgrad"), detail: "Egenkapital divideret med aktiver" }) }),
  defineKpi({ id: "current-ratio", name: "Likviditetsgrad", description: "Omsætningsaktiver i forhold til kortfristet gæld", category: "Likviditet", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "currentLiabilities"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "currentAssets"), sum(profile, "currentLiabilities"), "Likviditetsgrad"), detail: "Omsætningsaktiver divideret med kortfristet gæld" }) }),
  defineKpi({ id: "quick-ratio", name: "Quick Ratio", description: "Likvide omsætningsaktiver i forhold til kortfristet gæld", category: "Likviditet", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "inventory", "currentLiabilities"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "currentAssets") - sum(profile, "inventory"), sum(profile, "currentLiabilities"), "Quick Ratio"), detail: "Omsætningsaktiver uden lager divideret med kortfristet gæld" }) }),
  defineKpi({ id: "gearing", name: "Gearing", description: "Rentebærende gæld i forhold til egenkapital", category: "Finansielle nøgletal", format: "decimal", decimals: 2, icon: "target", color: "orange", requirements: requirements(["totalDebt", "equity"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "totalDebt"), sum(profile, "equity"), "Gearing"), detail: "Rentebærende gæld divideret med egenkapital" }) }),
  defineKpi({ id: "debt-ratio", name: "Gældsgrad", description: "Forpligtelser som andel af de samlede aktiver", category: "Finansielle nøgletal", format: "percent", decimals: 1, icon: "target", color: "orange", requirements: requirements(["liabilities", "assets"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "liabilities"), sum(profile, "assets"), "Gældsgrad"), detail: "Forpligtelser divideret med aktiver" }) }),
  defineKpi({ id: "operating-margin", name: "Overskudsgrad", description: "Driftsresultat som andel af omsætningen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["operatingProfit", "revenue"]), calculate: ({ profile, context }) => ({ value: ratio(sum(profile, "operatingProfit"), context.totalRevenue || sum(profile, "revenue"), "Overskudsgrad"), detail: "Driftsresultat divideret med omsætning" }) }),
  defineKpi({ id: "return-on-assets", name: "Afkastningsgrad (ROA)", description: "Årets resultat i forhold til de samlede aktiver", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "assets"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "netProfit"), sum(profile, "assets"), "Afkastningsgrad"), detail: "Årets resultat divideret med aktiver" }) }),
  defineKpi({ id: "return-on-equity", name: "Egenkapitalens forrentning (ROE)", description: "Årets resultat i forhold til egenkapitalen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "equity"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "netProfit"), sum(profile, "equity"), "Egenkapitalens forrentning"), detail: "Årets resultat divideret med egenkapital" }) }),
  defineKpi({ id: "gross-profit-margin", name: "Bruttoavance", description: "Bruttofortjeneste som andel af omsætningen", category: "Indtjening", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["grossProfit", "revenue"]), calculate: ({ profile, context }) => ({ value: ratio(context.totalGrossProfit || sum(profile, "grossProfit"), context.totalRevenue || sum(profile, "revenue"), "Bruttoavance"), detail: "Bruttofortjeneste divideret med omsætning" }) }),
  defineKpi({ id: "net-margin", name: "Nettomargin", description: "Årets resultat som andel af omsætningen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "revenue"]), calculate: ({ profile, context }) => ({ value: ratio(sum(profile, "netProfit"), context.totalRevenue || sum(profile, "revenue"), "Nettomargin"), detail: "Årets resultat divideret med omsætning" }) }),
  defineKpi({ id: "working-capital", name: "Arbejdskapital", description: "Omsætningsaktiver minus kortfristet gæld", category: "Likviditet", format: "currency", icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "currentLiabilities"]), calculate: ({ profile }) => ({ value: sum(profile, "currentAssets") - sum(profile, "currentLiabilities"), detail: "Omsætningsaktiver minus kortfristet gæld" }) }),
  defineKpi({ id: "revenue-growth", name: "Omsætningsvækst", description: "Udviklingen fra første til seneste registrerede periode", category: "Salg", format: "percent", decimals: 1, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => { const periods = context.monthlyRevenue ?? []; if (periods.length < 2) throw new Error("Omsætningsvækst kræver mindst to perioder."); return { value: ratio(periods.at(-1)! - periods[0], periods[0], "Omsætningsvækst"), detail: "Udvikling fra første til seneste periode" }; } }),
  defineKpi({ id: "inventory-value", name: "Lagerværdi", description: "Den samlede registrerede værdi af lageret", category: "Lager", format: "currency", icon: "units", color: "orange", requirements: requirements(["inventory"]), calculate: ({ profile }) => ({ value: sum(profile, "inventory"), detail: "Summen af den registrerede lagerværdi" }) }),
  defineKpi({ id: "inventory-turnover", name: "Lageromsætningshastighed", description: "Vareforbrug i forhold til lagerværdien", category: "Lager", format: "decimal", decimals: 2, icon: "units", color: "orange", requirements: requirements(["cost", "inventory"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "cost"), sum(profile, "inventory"), "Lageromsætningshastighed"), detail: "Vareforbrug divideret med lagerværdi" }) }),
  defineKpi({ id: "customer-count", name: "Antal kunder", description: "Antallet af unikke kunder i datagrundlaget", category: "Kunder", format: "count", icon: "units", color: "navy", requirements: requirements(["customerId"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "customerId"), detail: "Unikke registrerede kunder" }) }),
  defineKpi({ id: "revenue-per-day", name: "Omsætning pr. dag", description: "Gennemsnitlig omsætning pr. aktiv salgsdag", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue", "date"]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "day"); return { value: average(periods.map((period) => period.value), "Omsætning pr. dag"), detail: `Gennemsnit på tværs af ${periods.length} salgsdage` }; } }),
  defineKpi({ id: "revenue-per-week", name: "Omsætning pr. uge", description: "Gennemsnitlig omsætning pr. aktiv salgsuge", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "week"], label: "Dato eller uge" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "week"); return { value: average(periods.map((period) => period.value), "Omsætning pr. uge"), detail: `Gennemsnit på tværs af ${periods.length} salgsuger` }; } }),
  defineKpi({ id: "revenue-per-month", name: "Omsætning pr. måned", description: "Gennemsnitlig omsætning pr. aktiv måned", category: "Salg", level: "recommended", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "month"); return { value: average(periods.map((period) => period.value), "Omsætning pr. måned"), detail: `Gennemsnit på tværs af ${periods.length} måneder` }; } }),
  defineKpi({ id: "revenue-per-quarter", name: "Omsætning pr. kvartal", description: "Gennemsnitlig omsætning pr. aktivt kvartal", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "quarter"], label: "Dato eller kvartal" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "quarter"); return { value: average(periods.map((period) => period.value), "Omsætning pr. kvartal"), detail: `Gennemsnit på tværs af ${periods.length} kvartaler` }; } }),
  defineKpi({ id: "revenue-per-year", name: "Omsætning pr. år", description: "Gennemsnitlig omsætning pr. registreret år", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "year"], label: "Dato eller år" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "year"); return { value: average(periods.map((period) => period.value), "Omsætning pr. år"), detail: `Gennemsnit på tværs af ${periods.length} år` }; } }),
  defineKpi({ id: "highest-sale", name: "Højeste omsætning", description: "Den højeste omsætning på en enkelt salgsrække", category: "Salg", format: "currency", icon: "revenue", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ profile }) => ({ value: Math.max(...(profile.numericValues.revenue ?? [])), detail: "Højeste registrerede salgsværdi" }) }),
  defineKpi({ id: "lowest-sale", name: "Laveste omsætning", description: "Den laveste omsætning på en enkelt salgsrække", category: "Salg", format: "currency", icon: "revenue", color: "navy", requirements: requirements(["revenue"]), calculate: ({ profile }) => ({ value: Math.min(...(profile.numericValues.revenue ?? [])), detail: "Laveste registrerede salgsværdi" }) }),
  defineKpi({ id: "sales-count", name: "Antal salg", description: "Antallet af registrerede salgsposter", category: "Salg", format: "count", icon: "units", color: "navy", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: context.rowCount, detail: "Registrerede salgsposter i visningen" }) }),
  defineKpi({ id: "order-count", name: "Antal ordrer", description: "Antallet af unikke registrerede ordrer", category: "Salg", format: "count", icon: "units", color: "navy", requirements: requirements(["orderId"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "orderId"), detail: "Unikke ordrenumre" }) }),
  defineKpi({ id: "avg-revenue-customer", name: "Gennemsnitlig omsætning pr. kunde", description: "Omsætning divideret med unikke kunder", category: "Kunder", format: "currency", decimals: 2, icon: "calculator", color: "purple", requirements: requirements(["revenue"], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ context, profile }) => ({ value: ratio(context.totalRevenue, uniqueCount(profile, hasField(profile, "customerId") ? "customerId" : "customerName"), "Omsætning pr. kunde"), detail: "Omsætning pr. unik kunde" }) }),
  defineKpi({ id: "best-sales-day", name: "Bedste salgsdag", description: "Dagen med den højeste samlede omsætning", category: "Tid og perioder", level: "recommended", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue", "date"]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "day"), "highest", "Bedste salgsdag"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-sales-week", name: "Bedste uge", description: "Ugen med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "week"], label: "Dato eller uge" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "week"), "highest", "Bedste uge"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-quarter", name: "Bedste kvartal", description: "Kvartalet med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "quarter"], label: "Dato eller kvartal" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "quarter"), "highest", "Bedste kvartal"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-year", name: "Bedste år", description: "Året med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "year"], label: "Dato eller år" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "year"), "highest", "Bedste år"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "fastest-growth-period", name: "Hurtigste vækstperiode", description: "Måneden med den største vækst fra måneden før", category: "Tid og perioder", level: "advanced", format: "text", icon: "revenue", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const best = rankedGroup(periodGrowthRates(profile, "month"), "highest", "Hurtigste vækstperiode"); return { value: best.name, detail: `${(best.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % vækst` }; } }),
  defineKpi({ id: "slowest-period", name: "Langsomste periode", description: "Måneden med den laveste omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "orange", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const period = rankedGroup(periodRevenue(profile, "month"), "lowest", "Langsomste periode"); return { value: period.label, detail: `${period.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "month-over-month-growth", name: "Måned-over-måned-vækst", description: "Væksten fra næstseneste til seneste måned", category: "Tid og perioder", level: "recommended", format: "percent", decimals: 1, icon: "revenue", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "month"); if (periods.length < 2) throw new Error("Måned-over-måned-vækst kræver mindst to måneder."); const previous = periods.at(-2)!; const latest = periods.at(-1)!; return { value: ratio(latest.value - previous.value, previous.value, "Måned-over-måned-vækst"), detail: `${previous.label} til ${latest.label}` }; } }),
  defineKpi({ id: "year-over-year-growth", name: "År-over-år-vækst", description: "Væksten fra næstseneste til seneste år", category: "Tid og perioder", level: "advanced", format: "percent", decimals: 1, icon: "revenue", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "year"], label: "Dato eller år" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "year"); if (periods.length < 2) throw new Error("År-over-år-vækst kræver mindst to år."); const previous = periods.at(-2)!; const latest = periods.at(-1)!; return { value: ratio(latest.value - previous.value, previous.value, "År-over-år-vækst"), detail: `${previous.label} til ${latest.label}` }; } }),
  defineKpi({ id: "average-monthly-growth", name: "Gennemsnitlig månedlig vækst", description: "Gennemsnittet af de månedlige vækstrater", category: "Tid og perioder", level: "advanced", format: "percent", decimals: 1, icon: "calculator", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const rates = periodGrowthRates(profile, "month"); return { value: average(rates.map((rate) => rate.value), "Gennemsnitlig månedlig vækst"), detail: `Beregnet på ${rates.length} periodeskift` }; } }),
  defineKpi({ id: "most-profitable-product", name: "Mest rentable produkt", description: "Produktet med det højeste samlede resultat", category: "Produkter", level: "recommended", format: "text", icon: "profit", color: "green", requirements: requirements(["product"], [{ fields: ["grossProfit", "netProfit"], label: "Dækningsbidrag eller resultat" }]), calculate: ({ profile }) => { const field = hasField(profile, "grossProfit") ? "grossProfit" : "netProfit"; const product = rankedGroup(groupedSums(profile, "product", field), "highest", "Mest rentable produkt"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} kr. i indtjening` }; } }),
  defineKpi({ id: "most-sold-product", name: "Mest solgte produkt", description: "Produktet med flest solgte enheder", category: "Produkter", level: "recommended", format: "text", icon: "units", color: "cyan", requirements: requirements(["product", "units"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "units"), "highest", "Mest solgte produkt"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} solgte enheder` }; } }),
  defineKpi({ id: "least-sold-product", name: "Mindst solgte produkt", description: "Produktet med færrest solgte enheder", category: "Produkter", format: "text", icon: "units", color: "navy", requirements: requirements(["product", "units"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "units"), "lowest", "Mindst solgte produkt"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} solgte enheder` }; } }),
  defineKpi({ id: "highest-revenue-product", name: "Produkt med højest omsætning", description: "Produktet med den største samlede omsætning", category: "Produkter", format: "text", icon: "revenue", color: "cyan", requirements: requirements(["product", "revenue"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "revenue"), "highest", "Produktomsætning"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "fastest-growing-product", name: "Produkt med størst vækst", description: "Produktet med den højeste vækst mellem første og seneste måned", category: "Produkter", level: "advanced", format: "text", icon: "revenue", color: "green", requirements: requirements(["product", "revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const product = rankedGroup(groupedGrowth(profile, "product"), "highest", "Produktvækst"); return { value: product.name, detail: `${(product.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % vækst` }; } }),
  defineKpi({ id: "highest-margin-product", name: "Produkt med højeste dækningsgrad", description: "Produktet med det højeste dækningsbidrag relativt til omsætningen", category: "Produkter", level: "advanced", format: "text", icon: "profit", color: "green", requirements: requirements(["product", "revenue", "grossProfit"]), calculate: ({ profile }) => { const product = rankedGroup(groupedRatio(profile, "product", "grossProfit", "revenue"), "highest", "Produktets dækningsgrad"); return { value: product.name, detail: `${(product.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % dækningsgrad` }; } }),
  defineKpi({ id: "highest-gross-profit-product", name: "Produkt med størst dækningsbidrag", description: "Produktet med det højeste samlede dækningsbidrag", category: "Produkter", format: "text", icon: "profit", color: "green", requirements: requirements(["product", "grossProfit"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "grossProfit"), "highest", "Produktets dækningsbidrag"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} kr. i dækningsbidrag` }; } }),
  defineKpi({ id: "product-count", name: "Antal produkter", description: "Antallet af unikke produkter i datagrundlaget", category: "Produkter", format: "count", icon: "units", color: "navy", requirements: requirements(["product"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "product"), detail: "Unikke registrerede produkter" }) }),
  defineKpi({ id: "average-sales-price", name: "Gennemsnitlig salgspris", description: "Den gennemsnitlige registrerede salgspris pr. enhed", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements([], [{ fields: ["unitPrice", "revenue"], label: "Salgspris eller omsætning" }, { fields: ["unitPrice", "units"], label: "Salgspris eller antal" }]), calculate: ({ context, profile }) => ({ value: hasField(profile, "unitPrice") ? average(profile.numericValues.unitPrice ?? [], "Gennemsnitlig salgspris") : ratio(context.totalRevenue, context.totalUnits, "Gennemsnitlig salgspris"), detail: "Gennemsnitlig pris pr. solgt enhed" }) }),
  defineKpi({ id: "average-unit-cost", name: "Gennemsnitlig kostpris", description: "Den gennemsnitlige registrerede kostpris pr. enhed", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements([], [{ fields: ["unitCost", "cost"], label: "Kostpris pr. enhed eller omkostninger" }, { fields: ["unitCost", "units"], label: "Kostpris pr. enhed eller antal" }]), calculate: ({ context, profile }) => ({ value: hasField(profile, "unitCost") ? average(profile.numericValues.unitCost ?? [], "Gennemsnitlig kostpris") : ratio(context.totalCosts, context.totalUnits, "Gennemsnitlig kostpris"), detail: "Gennemsnitlig kostpris pr. solgt enhed" }) }),
  defineKpi({ id: "average-revenue-product", name: "Omsætning pr. produkt", description: "Gennemsnitlig omsætning pr. unikt produkt", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["product", "revenue"]), calculate: ({ context, profile }) => ({ value: ratio(context.totalRevenue, uniqueCount(profile, "product"), "Omsætning pr. produkt"), detail: "Gennemsnit pr. unikt produkt" }) }),
  defineKpi({ id: "average-profit-product", name: "Profit pr. produkt", description: "Gennemsnitligt dækningsbidrag eller resultat pr. produkt", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["product"], [{ fields: ["grossProfit", "netProfit"], label: "Dækningsbidrag eller resultat" }]), calculate: ({ context, profile }) => ({ value: ratio(hasField(profile, "grossProfit") ? context.totalGrossProfit : sum(profile, "netProfit"), uniqueCount(profile, "product"), "Profit pr. produkt"), detail: "Gennemsnitlig indtjening pr. produkt" }) }),
  defineKpi({ id: "new-customers", name: "Nye kunder", description: "Kunder med første registrerede køb i den seneste måned", category: "Kunder", level: "advanced", format: "count", icon: "units", color: "green", requirements: requirements(["date"], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ profile }) => ({ value: newCustomersInLatestMonth(profile), detail: "Første registrerede køb i seneste måned" }) }),
  defineKpi({ id: "returning-customers", name: "Tilbagevendende kunder", description: "Kunder med mere end ét registreret køb", category: "Kunder", format: "count", icon: "units", color: "green", requirements: requirements([], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ profile }) => { const field = hasField(profile, "customerId") ? "customerId" : "customerName"; return { value: groupedCounts(profile, field).filter((customer) => customer.value > 1).length, detail: "Kunder med flere registrerede køb" }; } }),
  defineKpi({ id: "most-profitable-customer", name: "Mest profitable kunde", description: "Kunden med det højeste samlede dækningsbidrag", category: "Kunder", level: "advanced", format: "text", icon: "profit", color: "green", requirements: requirements(["grossProfit"], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ profile }) => { const field = hasField(profile, "customerId") ? "customerId" : "customerName"; const customer = rankedGroup(groupedSums(profile, field, "grossProfit"), "highest", "Mest profitable kunde"); return { value: customer.name, detail: `${customer.value.toLocaleString("da-DK")} kr. i dækningsbidrag` }; } }),
  defineKpi({ id: "highest-revenue-customer", name: "Kunde med størst omsætning", description: "Kunden med den højeste samlede omsætning", category: "Kunder", format: "text", icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ profile }) => { const field = hasField(profile, "customerId") ? "customerId" : "customerName"; const customer = rankedGroup(groupedSums(profile, field, "revenue"), "highest", "Kundeomsætning"); return { value: customer.name, detail: `${customer.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "average-purchases-customer", name: "Gennemsnitligt antal køb pr. kunde", description: "Registrerede ordrer eller salg divideret med unikke kunder", category: "Kunder", format: "decimal", decimals: 2, icon: "calculator", color: "purple", requirements: requirements([], [{ fields: ["customerId", "customerName"], label: "Kunde-id eller kunde" }]), calculate: ({ context, profile }) => { const customerField = hasField(profile, "customerId") ? "customerId" : "customerName"; const purchases = hasField(profile, "orderId") ? uniqueCount(profile, "orderId") : context.rowCount; return { value: ratio(purchases, uniqueCount(profile, customerField), "Køb pr. kunde"), detail: "Gennemsnitligt antal registrerede køb" }; } }),
  defineKpi({ id: "profit-margin", name: "Profitmargin", description: "Resultat som andel af omsætningen", category: "Indtjening", level: "recommended", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["cost", "grossProfit", "netProfit"], label: "Omkostninger, dækningsbidrag eller resultat" }]), calculate: ({ context, profile }) => { const result = hasField(profile, "netProfit") ? sum(profile, "netProfit") : context.actualResult; return { value: ratio(result, context.totalRevenue, "Profitmargin"), detail: "Resultat divideret med omsætning" }; } }),
  defineKpi({ id: "gross-profit-total", name: "Bruttofortjeneste", description: "Den samlede registrerede bruttofortjeneste", category: "Indtjening", format: "currency", icon: "profit", color: "green", requirements: requirements(["grossProfit"]), calculate: ({ profile, context }) => ({ value: context.totalGrossProfit || sum(profile, "grossProfit"), detail: "Samlet bruttofortjeneste før faste omkostninger" }) }),
  defineKpi({ id: "ebit", name: "EBIT", description: "Resultat af den primære drift før renter og skat", category: "Indtjening", level: "advanced", format: "currency", icon: "profit", color: "green", requirements: requirements(["operatingProfit"]), calculate: ({ profile }) => ({ value: sum(profile, "operatingProfit"), detail: "Registreret driftsresultat" }) }),
  defineKpi({ id: "ebitda", name: "EBITDA", description: "Driftsresultat før renter, skat og afskrivninger", category: "Indtjening", level: "advanced", format: "currency", icon: "profit", color: "green", requirements: requirements([], [{ fields: ["ebitda", "operatingProfit"], label: "EBITDA eller driftsresultat" }]), calculate: ({ profile }) => ({ value: hasField(profile, "ebitda") ? sum(profile, "ebitda") : sum(profile, "operatingProfit") + sum(profile, "depreciation"), detail: hasField(profile, "ebitda") ? "Registreret EBITDA" : "Driftsresultat tillagt afskrivninger" }) }),
  defineKpi({ id: "ebit-margin", name: "EBIT-margin", description: "Driftsresultat som andel af omsætningen", category: "Indtjening", level: "advanced", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["operatingProfit", "revenue"]), calculate: ({ profile, context }) => ({ value: ratio(sum(profile, "operatingProfit"), context.totalRevenue || sum(profile, "revenue"), "EBIT-margin"), detail: "EBIT divideret med omsætning" }) }),
  defineKpi({ id: "ebitda-margin", name: "EBITDA-margin", description: "EBITDA som andel af omsætningen", category: "Indtjening", level: "advanced", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["ebitda", "operatingProfit"], label: "EBITDA eller driftsresultat" }]), calculate: ({ profile, context }) => { const value = hasField(profile, "ebitda") ? sum(profile, "ebitda") : sum(profile, "operatingProfit") + sum(profile, "depreciation"); return { value: ratio(value, context.totalRevenue || sum(profile, "revenue"), "EBITDA-margin"), detail: "EBITDA divideret med omsætning" }; } }),
  defineKpi({ id: "variable-costs", name: "Variable omkostninger", description: "Summen af de registrerede variable omkostninger", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements(["variableCost"]), calculate: ({ profile }) => ({ value: sum(profile, "variableCost"), detail: "Samlede variable omkostninger" }) }),
  defineKpi({ id: "fixed-costs", name: "Faste omkostninger", description: "Summen af de registrerede faste omkostninger", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements(["fixedCost"]), calculate: ({ profile }) => ({ value: sum(profile, "fixedCost"), detail: "Samlede faste omkostninger" }) }),
  defineKpi({ id: "cost-per-unit", name: "Omkostning pr. enhed", description: "Samlede omkostninger divideret med solgte enheder", category: "Indtjening", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements(["units"], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: ratio(context.totalCosts, context.totalUnits, "Omkostning pr. enhed"), detail: "Omkostninger pr. solgt enhed" }) }),
  defineKpi({ id: "average-profit-order", name: "Gennemsnitlig profit pr. ordre", description: "Resultat divideret med unikke ordrer", category: "Indtjening", level: "advanced", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["orderId"], [{ fields: ["grossProfit", "netProfit", "cost"], label: "Dækningsbidrag, resultat eller omkostninger" }]), calculate: ({ context, profile }) => { const profit = hasField(profile, "netProfit") ? sum(profile, "netProfit") : hasField(profile, "grossProfit") ? context.totalGrossProfit : context.actualResult; return { value: ratio(profit, uniqueCount(profile, "orderId"), "Profit pr. ordre"), detail: "Gennemsnitlig indtjening pr. ordre" }; } }),
  defineKpi({ id: "budget-variance", name: "Budgetafvigelse", description: "Forskellen mellem faktisk og budgetteret omsætning", category: "Budget", level: "recommended", format: "currency", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget, detail: "Faktisk omsætning minus budget" }) }),
  defineKpi({ id: "budget-variance-percent", name: "Budgetafvigelse %", description: "Omsætningsafvigelsen målt i procent af budgettet", category: "Budget", format: "percent", decimals: 1, icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: ratio(context.revenueVsBudget, context.budgetRevenue, "Budgetafvigelse"), detail: "Afvigelse i procent af budgettet" }) }),
  defineKpi({ id: "budget-attainment", name: "Budgetopfyldelse %", description: "Faktisk omsætning som andel af budgettet", category: "Budget", level: "recommended", format: "percent", decimals: 1, icon: "target", color: "green", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.budgetRevenue, "Budgetopfyldelse"), detail: "Andel af omsætningsbudgettet realiseret" }) }),
  defineKpi({ id: "budget-vs-result", name: "Budget mod resultat", description: "Forskellen mellem faktisk og budgetteret resultat", category: "Budget", level: "advanced", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetRevenue", "budgetCosts"], [{ fields: ["cost", "grossProfit", "netProfit"], label: "Omkostninger, dækningsbidrag eller resultat" }]), calculate: ({ context, profile }) => { const actual = hasField(profile, "netProfit") ? sum(profile, "netProfit") : context.actualResult; return { value: actual - context.budgetResult, detail: "Faktisk resultat minus budgetteret resultat" }; } }),
  defineKpi({ id: "over-budget-status", name: "Over budget", description: "Viser om omsætningen ligger over det budgetterede niveau", category: "Budget", format: "text", icon: "target", color: "green", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget > 0 ? "Ja" : "Nej", detail: context.revenueVsBudget > 0 ? "Omsætningen ligger over budgettet" : "Omsætningen ligger ikke over budgettet" }) }),
  defineKpi({ id: "under-budget-status", name: "Under budget", description: "Viser om omsætningen ligger under det budgetterede niveau", category: "Budget", format: "text", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget < 0 ? "Ja" : "Nej", detail: context.revenueVsBudget < 0 ? "Omsætningen ligger under budgettet" : "Omsætningen ligger ikke under budgettet" }) }),
  defineKpi({ id: "cash-ratio", name: "Cash Ratio", description: "Likvide beholdninger i forhold til kortfristet gæld", category: "Likviditet", level: "advanced", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["cash", "currentLiabilities"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "cash"), sum(profile, "currentLiabilities"), "Cash Ratio"), detail: "Likvider divideret med kortfristet gæld" }) }),
  defineKpi({ id: "asset-turnover", name: "Aktivernes omsætningshastighed", description: "Omsætning i forhold til de samlede aktiver", category: "Finansielle nøgletal", level: "advanced", format: "decimal", decimals: 2, icon: "calculator", color: "navy", requirements: requirements(["revenue", "assets"]), calculate: ({ profile, context }) => ({ value: ratio(context.totalRevenue || sum(profile, "revenue"), sum(profile, "assets"), "Aktivernes omsætningshastighed"), detail: "Omsætning divideret med aktiver" }) }),
  defineKpi({ id: "inventory-binding", name: "Lagerbinding", description: "Kapital bundet i den registrerede lagerværdi", category: "Lager", level: "recommended", format: "currency", icon: "units", color: "orange", requirements: requirements(["inventory"]), calculate: ({ profile }) => ({ value: sum(profile, "inventory"), detail: "Samlet kapital bundet i lager" }) }),
  defineKpi({ id: "average-inventory-value", name: "Gennemsnitlig lagerværdi", description: "Gennemsnittet af de registrerede lagerværdier", category: "Lager", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements(["inventory"]), calculate: ({ profile }) => ({ value: average(profile.numericValues.inventory ?? [], "Gennemsnitlig lagerværdi"), detail: "Gennemsnitlig registreret lagerværdi" }) }),
  defineKpi({ id: "inventory-days", name: "Lagerdage", description: "Estimeret antal dage varerne ligger på lager", category: "Lager", level: "advanced", format: "decimal", decimals: 1, icon: "calculator", color: "orange", requirements: requirements(["cost", "inventory"]), calculate: ({ profile }) => ({ value: ratio(365, ratio(sum(profile, "cost"), sum(profile, "inventory"), "Lageromsætningshastighed"), "Lagerdage"), detail: "365 divideret med lageromsætningshastigheden" }) }),
  defineKpi({ id: "inventory-item-count", name: "Antal varer", description: "Det samlede registrerede antal varer på lager", category: "Lager", format: "integer", icon: "units", color: "navy", requirements: requirements(["inventoryQuantity"]), calculate: ({ profile }) => ({ value: sum(profile, "inventoryQuantity"), detail: "Samlet antal enheder på lager" }) }),
  defineKpi({ id: "lowest-inventory", name: "Laveste lager", description: "Den laveste registrerede lagerbeholdning", category: "Lager", format: "integer", icon: "units", color: "orange", requirements: requirements(["inventoryQuantity"]), calculate: ({ profile }) => ({ value: Math.min(...(profile.numericValues.inventoryQuantity ?? [])), detail: "Laveste registrerede lagerantal" }) }),
  defineKpi({ id: "highest-inventory", name: "Højeste lager", description: "Den højeste registrerede lagerbeholdning", category: "Lager", format: "integer", icon: "units", color: "navy", requirements: requirements(["inventoryQuantity"]), calculate: ({ profile }) => ({ value: Math.max(...(profile.numericValues.inventoryQuantity ?? [])), detail: "Højeste registrerede lagerantal" }) }),
];

function requirementStatus(definition: RegisteredKpiDefinition, profile: KpiDataProfile) {
  const missing: string[] = [];
  const matched = new Set<string>();

  definition.requirements.forEach((requirement) => {
    const present = requirement.fields.filter((field) => hasField(profile, field));
    present.forEach((field) => matched.add(kpiFieldRegistry[field].label));
    if (requirement.mode === "all") {
      requirement.fields
        .filter((field) => !hasField(profile, field))
        .forEach((field) => missing.push(kpiFieldRegistry[field].label));
    } else if (!present.length) {
      missing.push(requirement.label ?? requirement.fields.map((field) => kpiFieldRegistry[field].label).join(" eller "));
    }
  });

  return { missing: Array.from(new Set(missing)), matched: Array.from(matched) };
}

export function evaluateRegisteredKpi(
  id: string,
  context: StandardKpiContext,
  profile: KpiDataProfile,
): KpiEvaluation {
  const definition = standardKpiDefinitions.find((item) => item.id === id);
  if (!definition) return { available: false, value: null, detail: "Ukendt nøgletal", reason: "Ukendt nøgletal" };
  const status = requirementStatus(definition, profile);
  if (status.missing.length) {
    const reason = status.missing.length === 1
      ? `Mangler kolonnen '${status.missing[0]}'`
      : `Mangler: ${status.missing.join(" og ")}`;
    return { available: false, value: null, detail: reason, reason, missingFields: status.missing, matchedFields: status.matched };
  }
  try {
    const result = definition.calculate({ context, profile });
    return { available: true, value: result.value, detail: result.detail, missingFields: [], matchedFields: status.matched };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Beregningen kunne ikke udføres.";
    return { available: false, value: null, detail: reason, reason, missingFields: [], matchedFields: status.matched };
  }
}

export function relevantKpiCategories(
  definitions: KpiDefinition[],
  evaluations: Record<string, KpiEvaluation>,
) {
  const categories = new Set<KpiCategory>();
  const categorySignals: Partial<Record<KpiCategory, string[]>> = {
    Salg: ["Omsætning", "Antal", "Ordre-id"],
    Indtjening: ["Dækningsbidrag eller bruttofortjeneste", "Dækningsgrad", "Omkostninger", "Variable omkostninger", "Faste omkostninger", "Driftsresultat", "EBITDA", "Årets resultat"],
    Budget: ["Budgetteret omsætning", "Budgetterede omkostninger"],
    Produkter: ["Produkt", "Kategori", "Salgspris pr. enhed", "Kostpris pr. enhed"],
    "Tid og perioder": ["Dato", "Måned", "Uge", "Kvartal", "År"],
    "Finansielle nøgletal": ["Egenkapital", "Aktiver", "Rentebærende gæld", "Forpligtelser"],
    Likviditet: ["Omsætningsaktiver", "Kortfristet gæld", "Likvide beholdninger", "Tilgodehavender"],
    Rentabilitet: ["Driftsresultat", "Årets resultat", "Aktiver", "Egenkapital"],
    Lager: ["Lager", "Lagerantal"],
    Kunder: ["Kunde-id", "Kunde"],
  };
  definitions.forEach((definition) => {
    const category = definition.category as KpiCategory | undefined;
    if (!category) return;
    const evaluation = evaluations[definition.id];
    const signals = categorySignals[category];
    const categoryDetected = signals
      ? evaluation?.matchedFields?.some((field) => signals.includes(field))
      : evaluation?.available || evaluation?.matchedFields?.length;
    if (definition.isCustom || evaluation?.available || categoryDetected) categories.add(category);
  });
  return Array.from(categories);
}
