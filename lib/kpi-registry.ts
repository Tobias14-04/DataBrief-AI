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
import {
  chooseRepresentativeLabel,
  comparableLabel,
  normalizeForComparison,
} from "./data-labels.ts";
import { inferBoundaryPartialMonths, resolvePeriodComparison, resolveYearOverYearComparison, summarizeComparisonMetric } from "./period-comparison.ts";
import { formatDanishMonth, monthSortKey } from "./dashboard-insights.ts";
import { isVariableRowCostHeader, normalizeColumnHeader, salesColumnAliases } from "./spreadsheet-fields.ts";
import { isFiniteNumber, parseNumericValue, parsePercentageValue, safeRatio } from "./numeric-foundation.ts";

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
  | "cogs"
  | "budgetRevenue"
  | "budgetCosts"
  | "product"
  | "category"
  | "date"
  | "snapshotDate"
  | "accountingPeriod"
  | "periodStart"
  | "periodEnd"
  | "currency"
  | "company"
  | "financialStatus"
  | "month"
  | "channel"
  | "region"
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
  | "inventoryValue"
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
  cogs: {
    label: "Vareforbrug (COGS)",
    aliases: ["vareforbrug i alt", "samlet vareforbrug", "cogs amount", "cost of goods sold amount"],
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
  snapshotDate: {
    label: "Snapshotdato",
    aliases: ["snapshotdato", "balancedato", "balance dato", "lagerdato", "lager snapshot dato", "inventory date", "stock date", "snapshot date", "as of date", "opgørelsesdato"],
  },
  accountingPeriod: { label: "Regnskabsperiode", aliases: ["regnskabsperiode", "accounting period", "financial period", "flow period"] },
  periodStart: { label: "Periodestart", aliases: ["periodestart", "periode start", "period start", "accounting period start"] },
  periodEnd: { label: "Periodeslut", aliases: ["periodeslut", "periode slut", "period end", "accounting period end"] },
  currency: { label: "Valuta", aliases: ["valuta", "valutakode", "currency", "currency code"] },
  company: { label: "Virksomhed", aliases: ["virksomhed", "selskab", "company", "legal entity", "entity"] },
  financialStatus: { label: "Regnskabsstatus", aliases: ["regnskabsstatus", "datastatus", "financial status", "completeness", "completeness status"] },
  month: {
    label: "Måned",
    aliases: [...salesColumnAliases.month],
  },
  channel: {
    label: "Kanal",
    aliases: [...salesColumnAliases.channel],
  },
  region: {
    label: "Region",
    aliases: [...salesColumnAliases.region],
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
    aliases: [...salesColumnAliases.unitCost],
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
  inventoryValue: {
    label: "Lagerværdi",
    aliases: ["lagerværdi", "lagerets værdi", "varelagerværdi", "inventory value", "stock value", "inventory valuation", "inventories"],
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
    aliases: ["lagerantal", "antal på lager", "antal varer på lager", "lagerbeholdning antal", "stock quantity", "inventory quantity", "quantity on hand"],
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
  rows: Array<{ values: Partial<Record<KpiDataField, unknown>>; fields: readonly KpiDataField[] }>;
};

type NormalizedKpiSourceSchema = {
  columns: string[];
  matchedColumns: Partial<Record<KpiDataField, string[]>>;
  fields: readonly KpiDataField[];
};

type NormalizedKpiSourceRow = {
  schema: NormalizedKpiSourceSchema;
  rawValues: Partial<Record<KpiDataField, unknown[]>>;
  numericValues: Partial<Record<KpiDataField, number[]>>;
  values: Partial<Record<KpiDataField, unknown>>;
  hasValues: boolean;
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

const normalizedFieldLookup = new Map<string, KpiDataField>();
(Object.keys(kpiFieldRegistry) as KpiDataField[]).forEach((field) => {
  normalizedFieldAliases[field].forEach((alias) => {
    if (!normalizedFieldLookup.has(alias)) normalizedFieldLookup.set(alias, field);
  });
});

const normalizedSourceRowCache = new WeakMap<Record<string, unknown>, NormalizedKpiSourceRow>();
const normalizedSourceSchemaCache = new Map<string, NormalizedKpiSourceSchema>();
const MAX_CACHED_SOURCE_SCHEMAS = 64;

function toNumericValue(value: unknown, field?: KpiDataField) {
  return field === "grossMargin" ? parsePercentageValue(value) : parseNumericValue(value);
}

export function matchKpiField(column: string): KpiDataField | null {
  return normalizedFieldLookup.get(normalizeColumnName(column)) ?? null;
}

export function scoreKpiHeaders(headers: string[]) {
  return new Set(headers.map(matchKpiField).filter(Boolean)).size;
}

function normalizeKpiSourceRow(sourceValues: Record<string, unknown>): NormalizedKpiSourceRow {
  const cached = normalizedSourceRowCache.get(sourceValues);
  if (cached) return cached;

  const columns = Object.keys(sourceValues).filter((column) => !column.startsWith("__"));
  const schemaKey = JSON.stringify(columns);
  let schema = normalizedSourceSchemaCache.get(schemaKey);
  if (!schema) {
    if (normalizedSourceSchemaCache.size >= MAX_CACHED_SOURCE_SCHEMAS) {
      normalizedSourceSchemaCache.clear();
    }
    const matchedColumns: Partial<Record<KpiDataField, string[]>> = {};
    columns.forEach((column) => {
      const field = matchKpiField(column);
      if (field) (matchedColumns[field] ??= []).push(column);
    });
    schema = { columns, matchedColumns, fields: Object.keys(matchedColumns) as KpiDataField[] };
    normalizedSourceSchemaCache.set(schemaKey, schema);
  }

  const normalized: NormalizedKpiSourceRow = {
    schema,
    rawValues: {},
    numericValues: {},
    values: {},
    hasValues: false,
  };

  (Object.entries(schema.matchedColumns) as Array<[KpiDataField, string[]]>).forEach(([field, fieldColumns]) => {
    fieldColumns.forEach((column) => {
      const value = sourceValues[column];
      if (value === "" || value === null || value === undefined) return;
      (normalized.rawValues[field] ??= []).push(value);
      const numericValue = toNumericValue(value, field);
      if (numericValue !== null) (normalized.numericValues[field] ??= []).push(numericValue);
      if (!(field in normalized.values)) {
        normalized.values[field] = value;
        normalized.hasValues = true;
      }
    });
  });

  normalizedSourceRowCache.set(sourceValues, normalized);
  return normalized;
}

export function buildKpiDataProfile(
  rows: KpiSourceRow[],
  virtualValues: Partial<Record<KpiDataField, unknown[]>> = {},
): KpiDataProfile {
  const columnSet = new Set<string>();
  const matchedColumnSets: Partial<Record<KpiDataField, Set<string>>> = {};
  const rawValues: Partial<Record<KpiDataField, unknown[]>> = {};
  const numericValues: Partial<Record<KpiDataField, number[]>> = {};
  const fields = Object.keys(kpiFieldRegistry) as KpiDataField[];
  const profileRows: KpiDataProfile["rows"] = [];
  const seenSchemas = new Set<NormalizedKpiSourceSchema>();

  rows.forEach((row) => {
    const normalized = normalizeKpiSourceRow(row.sourceValues);
    if (!seenSchemas.has(normalized.schema)) {
      seenSchemas.add(normalized.schema);
      normalized.schema.columns.forEach((column) => columnSet.add(column));
      (Object.entries(normalized.schema.matchedColumns) as Array<[KpiDataField, string[]]>).forEach(([field, fieldColumns]) => {
        fieldColumns.forEach((column) => {
          (matchedColumnSets[field] ??= new Set()).add(column);
        });
      });
    }
    (Object.entries(normalized.rawValues) as Array<[KpiDataField, unknown[]]>).forEach(([field, values]) => {
      (rawValues[field] ??= []).push(...values);
    });
    (Object.entries(normalized.numericValues) as Array<[KpiDataField, number[]]>).forEach(([field, values]) => {
      (numericValues[field] ??= []).push(...values);
    });
    let derivedVariableCost: number | null = null;
    if (!normalized.rawValues.variableCost?.length) {
      const costHeader = normalized.schema.matchedColumns.cost?.find(isVariableRowCostHeader);
      const explicitVariableCost = costHeader ? parseNumericValue(row.sourceValues[costHeader]) : null;
      const units = parseNumericValue(normalized.values.units);
      const unitCost = parseNumericValue(normalized.values.unitCost);
      const revenue = parseNumericValue(normalized.values.revenue);
      const grossProfit = parseNumericValue(normalized.values.grossProfit);
      const multipliedUnitCost = units === null || unitCost === null ? null : units * unitCost;
      const impliedVariableCost = revenue === null || grossProfit === null ? null : revenue - grossProfit;
      derivedVariableCost = explicitVariableCost
        ?? (isFiniteNumber(multipliedUnitCost) ? multipliedUnitCost : null)
        ?? (isFiniteNumber(impliedVariableCost) ? impliedVariableCost : null);
      if (derivedVariableCost !== null) {
        (rawValues.variableCost ??= []).push(derivedVariableCost);
        (numericValues.variableCost ??= []).push(derivedVariableCost);
        (matchedColumnSets.variableCost ??= new Set()).add(costHeader ?? "Antal × Kostpris pr. stk.");
      }
    }
    const revenue = parseNumericValue(normalized.values.revenue);
    const cogsHeader = normalized.schema.matchedColumns.cost?.find((header) =>
      ["vareforbrug", "cogs", "costofgoodssold"].includes(normalizeColumnHeader(header)));
    if (cogsHeader) (matchedColumnSets.cogs ??= new Set()).add(cogsHeader);
    const derivedCogs = cogsHeader && !normalized.rawValues.cogs?.length
      ? parseNumericValue(row.sourceValues[cogsHeader]) : null;
    if (derivedCogs !== null) {
      (rawValues.cogs ??= []).push(derivedCogs);
      (numericValues.cogs ??= []).push(derivedCogs);
      (matchedColumnSets.cogs ??= new Set()).add(cogsHeader!);
    }
    const snapshotCandidate = normalized.schema.fields.some((field) =>
      ["inventoryValue", "inventoryQuantity", "equity", "assets", "currentAssets", "currentLiabilities", "cash", "totalDebt", "liabilities"].includes(field));
    const derivedSnapshotDate = snapshotCandidate && normalized.values.snapshotDate === undefined
      ? normalized.values.date : undefined;
    if (derivedSnapshotDate !== undefined && derivedSnapshotDate !== null && derivedSnapshotDate !== "") {
      (rawValues.snapshotDate ??= []).push(derivedSnapshotDate);
      (matchedColumnSets.snapshotDate ??= new Set()).add(normalized.schema.matchedColumns.date?.[0] ?? "Dato");
    }
    const variableCost = derivedVariableCost ?? parseNumericValue(normalized.values.variableCost);
    const derivedGrossProfit = !normalized.rawValues.grossProfit?.length && revenue !== null && variableCost !== null
      ? revenue - variableCost : null;
    if (isFiniteNumber(derivedGrossProfit)) {
      (rawValues.grossProfit ??= []).push(derivedGrossProfit);
      (numericValues.grossProfit ??= []).push(derivedGrossProfit);
      (matchedColumnSets.grossProfit ??= new Set()).add("Omsætning − variable omkostninger");
    }
    if (normalized.hasValues) profileRows.push({ values: {
      ...normalized.values,
      ...(derivedCogs === null ? {} : { cogs: derivedCogs }),
      ...(derivedSnapshotDate === undefined ? {} : { snapshotDate: derivedSnapshotDate }),
      ...(derivedVariableCost === null ? {} : { variableCost: derivedVariableCost }),
      ...(isFiniteNumber(derivedGrossProfit) ? { grossProfit: derivedGrossProfit } : {}),
    }, fields: cogsHeader && !normalized.schema.fields.includes("cogs")
      ? [...normalized.schema.fields, "cogs"] : normalized.schema.fields });
  });

  const columns = Array.from(columnSet);
  const matchedColumns = Object.fromEntries(
    Object.entries(matchedColumnSets).map(([field, values]) => [field, Array.from(values)]),
  ) as Partial<Record<KpiDataField, string[]>>;

  fields.forEach((field) => {
    const values = virtualValues[field] ?? [];
    if (values.length) {
      (rawValues[field] ??= []).push(...values);
      values.forEach((value) => {
        const numericValue = toNumericValue(value, field);
        if (numericValue !== null) (numericValues[field] ??= []).push(numericValue);
      });
      if (!matchedColumns[field]?.length) {
        matchedColumns[field] = [kpiFieldRegistry[field].label];
      }
    }

    if (rawValues[field]?.length && !numericValues[field]) {
      numericValues[field] = [];
    }
  });

  return { columns, matchedColumns, rawValues, numericValues, rows: profileRows };
}

function hasField(profile: KpiDataProfile, field: KpiDataField) {
  return Boolean(profile.rawValues[field]?.length);
}

type PeriodUnit = "day" | "week" | "month" | "quarter" | "year";
type RankedValue = { key?: string; name: string; value: number };
type PeriodRevenueValue = RankedValue & {
  key: string;
  label: string;
  order: number;
};

type KpiProfileAnalysisCache = {
  sums: Map<KpiDataField, number>;
  uniqueCounts: Map<KpiDataField, number>;
  groupedSums: Map<string, RankedValue[]>;
  periodRevenue: Map<PeriodUnit, PeriodRevenueValue[]>;
  parsedDates: WeakMap<KpiDataProfile["rows"][number], Date | null>;
};

const profileAnalysisCaches = new WeakMap<KpiDataProfile, KpiProfileAnalysisCache>();
const dayFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("da-DK", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function getProfileAnalysisCache(profile: KpiDataProfile) {
  const existing = profileAnalysisCaches.get(profile);
  if (existing) return existing;

  const cache: KpiProfileAnalysisCache = {
    sums: new Map(),
    uniqueCounts: new Map(),
    groupedSums: new Map(),
    periodRevenue: new Map(),
    parsedDates: new WeakMap(),
  };
  profileAnalysisCaches.set(profile, cache);
  return cache;
}

function sum(profile: KpiDataProfile, field: KpiDataField) {
  const cache = getProfileAnalysisCache(profile);
  const cached = cache.sums.get(field);
  if (cached !== undefined) return cached;
  const value = (profile.numericValues[field] ?? []).reduce((total, item) => total + item, 0);
  cache.sums.set(field, value);
  return value;
}

function uniqueCount(profile: KpiDataProfile, field: KpiDataField) {
  const cache = getProfileAnalysisCache(profile);
  const cached = cache.uniqueCounts.get(field);
  if (cached !== undefined) return cached;
  const value = new Set(
    (profile.rawValues[field] ?? [])
      .map((item) => normalizeForComparison(item))
      .filter(Boolean),
  ).size;
  cache.uniqueCounts.set(field, value);
  return value;
}

function ratio(numerator: number, denominator: number, label: string) {
  const result = safeRatio(numerator, denominator);
  if (result === null) throw new Error(`${label} kan ikke beregnes ud fra det aktuelle grundlag.`);
  return result;
}

function documentedCosts(context: StandardKpiContext): number {
  if (context.totalCosts === null) throw new Error(context.costBasis?.reason ?? "Samlede omkostninger er ikke dokumenteret i den aktuelle visning.");
  return context.totalCosts;
}

function documentedResult(context: StandardKpiContext): number {
  if (context.actualResult === null) throw new Error(context.costBasis?.reason ?? "Resultat er ikke dokumenteret i den aktuelle visning.");
  return context.actualResult;
}

function documentedRevenueGrowth(context: StandardKpiContext) {
  if (!context.revenueGrowth) throw new Error(context.periodComparison?.reason ?? "Omsætningsvækst kræver to sammenlignelige kalendermåneder.");
  if (context.revenueGrowth.percentage === null) {
    throw new Error(`Procentvis vækst er utilgængelig ved baseline 0. Absolut ændring: ${context.revenueGrowth.absolute.toLocaleString("da-DK")} kr. (${context.revenueGrowth.label}).`);
  }
  return { value: context.revenueGrowth.percentage, detail: context.revenueGrowth.label };
}

function average(values: number[], label: string) {
  if (!values.length) throw new Error(`${label} kræver mindst én numerisk værdi.`);
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function rowNumber(row: KpiDataProfile["rows"][number], field: KpiDataField) {
  return toNumericValue(row.values[field], field);
}

function rowText(row: KpiDataProfile["rows"][number], field: KpiDataField) {
  const value = row.values[field];
  return value === "" || value === null || value === undefined ? null : String(value).trim();
}

function groupedSums(profile: KpiDataProfile, groupField: KpiDataField, valueField: KpiDataField) {
  const cache = getProfileAnalysisCache(profile);
  const cacheKey = `${groupField}:${valueField}`;
  const cached = cache.groupedSums.get(cacheKey);
  if (cached) return cached;

  const groups = new Map<string, { name: string; value: number }>();
  profile.rows.forEach((row) => {
    const group = rowText(row, groupField);
    const value = rowNumber(row, valueField);
    if (!group || value === null) return;
    const identity = comparableLabel(group);
    const current = groups.get(identity.key) ?? { name: identity.label, value: 0 };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.value += value;
    groups.set(identity.key, current);
  });
  const result = Array.from(groups, ([key, value]) => ({ key, ...value }));
  cache.groupedSums.set(cacheKey, result);
  return result;
}

function documentedProductRows(profile: KpiDataProfile, field: "grossProfit" | "netProfit") {
  const rows = profile.rows.filter((row) => rowText(row, "product") !== null);
  if (!rows.length || rows.some((row) => rowNumber(row, field) === null)) {
    throw new Error(field === "netProfit"
      ? "Nettoresultat skal være dokumenteret for alle produkter i det aktuelle scope."
      : "Dækningsbidrag skal være dokumenteret for alle produkter i det aktuelle scope.");
  }
  return rows;
}

function documentedVariableUnitCost(profile: KpiDataProfile) {
  const rows = profile.rows.filter((row) => rowNumber(row, "revenue") !== null || rowNumber(row, "units") !== null);
  if (!rows.length || rows.some((row) => rowNumber(row, "units") === null || rowNumber(row, "variableCost") === null)) {
    throw new Error("Antal og variable rækkeomkostninger skal være dokumenteret for alle salgsrækker.");
  }
  const variableCosts = rows.reduce((total, row) => total + rowNumber(row, "variableCost")!, 0);
  const units = rows.reduce((total, row) => total + rowNumber(row, "units")!, 0);
  return ratio(variableCosts, units, "Gennemsnitlig variabel kostpris");
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
    return { key, label: dayFormatter.format(date) };
  }
  if (unit === "week") {
    const value = isoWeek(date);
    return { key: `${value.year}-${String(value.week).padStart(2, "0")}`, label: `Uge ${value.week}, ${value.year}` };
  }
  if (unit === "month") {
    return { key: `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: monthFormatter.format(date) };
  }
  if (unit === "quarter") {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    return { key: `${year}-Q${quarter}`, label: `${quarter}. kvt. ${year}` };
  }
  return { key: String(year), label: String(year) };
}

function profileRowDate(
  profile: KpiDataProfile,
  row: KpiDataProfile["rows"][number],
) {
  const cache = getProfileAnalysisCache(profile).parsedDates;
  if (cache.has(row)) return cache.get(row) ?? null;
  const date = parseProfileDate(row.values.date);
  cache.set(row, date);
  return date;
}

type ProfileRow = KpiDataProfile["rows"][number];
type InventoryField = "inventoryValue" | "inventoryQuantity";
type Snapshot = { date: string; rows: ProfileRow[]; total: number; complete: boolean };
const inventoryDimensions = ["product", "category", "channel", "region"] as const;
const dayMillis = 86_400_000;

function dayKey(value: unknown): string | null {
  if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim()) &&
      !/^\d{1,2}[./-]\d{1,2}[./-]\d{4}$/.test(value.trim())) return null;
  const date = parseProfileDate(value);
  if (!date) return null;
  const key = date.toISOString().slice(0, 10);
  if (typeof value !== "string") return key;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text === key ? key : null;
  const danish = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  return danish && Number(danish[1]) === date.getUTCDate() && Number(danish[2]) === date.getUTCMonth() + 1 &&
    Number(danish[3]) === date.getUTCFullYear() ? key : null;
}

function monthOfDay(day: string) { return day.slice(0, 7); }
function requestedInventoryMonths(context: StandardKpiContext): readonly string[] {
  return context.selectedMonths?.length ? context.selectedMonths : context.inventoryFilters?.month ?? [];
}

function inRequestedMonths(day: string, context: StandardKpiContext) {
  const selected = requestedInventoryMonths(context);
  return !selected.length || selected.some((month) => monthSortKey(month) === monthSortKey(monthOfDay(day)));
}

function scopedInventoryRows(rows: ProfileRow[], context: StandardKpiContext, source: string) {
  return rows.filter((row) => {
    for (const field of inventoryDimensions) {
      const selected = context.inventoryFilters?.[field];
      if (!selected?.length) continue;
      const value = rowText(row, field);
      if (!value) throw new Error(`${source} kan ikke afgrænses efter ${kpiFieldRegistry[field].label.toLowerCase()}; feltet mangler på datarækkerne.`);
      if (!selected.some((item) => normalizeForComparison(item) === normalizeForComparison(value))) return false;
    }
    return true;
  });
}

function inventoryRows(profile: KpiDataProfile) {
  return profile.rows.filter((row) => row.fields.includes("inventoryValue") || row.fields.includes("inventoryQuantity"));
}

function inventoryMember(row: ProfileRow) {
  const name = inventoryDimensions.map((field) => rowText(row, field)).find(Boolean);
  return name ? comparableLabel(name).key : null;
}

function stockSnapshots(context: StandardKpiContext, profile: KpiDataProfile, field: InventoryField, bounds?: { start: string; end: string }) {
  const candidates = inventoryRows(profile);
  const dated = candidates.flatMap((row) => {
    const date = dayKey(row.values.snapshotDate);
    if (!date) throw new Error("Lagerdata kræver en dokumenteret snapshotdato på hver lagerrække.");
    return inRequestedMonths(date, context) && (!bounds || date >= bounds.start && date <= bounds.end)
      ? [{ row, date }] : [];
  });
  const scoped = scopedInventoryRows(dated.map((item) => item.row), context, "Lagerdata");
  const included = new Set(scoped);
  const byDate = new Map<string, ProfileRow[]>();
  dated.forEach(({ row, date }) => {
    if (!included.has(row)) return;
    const rows = byDate.get(date) ?? [];
    rows.push(row);
    byDate.set(date, rows);
  });
  const knownMembers = new Set(scoped.map(inventoryMember).filter((member): member is string => member !== null));
  return [...byDate].map(([date, rows]): Snapshot => {
    const values = rows.map((row) => rowNumber(row, field));
    const total = values.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
    const presentMembers = new Set(rows.map(inventoryMember).filter((member): member is string => member !== null));
    const completeMembers = knownMembers.size
      ? rows.every((row) => inventoryMember(row) !== null) && [...knownMembers].every((member) => presentMembers.has(member))
      : rows.length === 1;
    return { date, rows, total, complete: completeMembers && values.every((amount) => amount !== null) && isFiniteNumber(total) };
  }).sort((left, right) => left.date.localeCompare(right.date));
}

function latestSnapshot(context: StandardKpiContext, profile: KpiDataProfile, field: InventoryField) {
  const snapshot = stockSnapshots(context, profile, field).filter((item) => item.complete).at(-1);
  if (!snapshot) throw new Error("Der findes intet komplet lagersnapshot med dato og dokumenteret værdi i det valgte scope.");
  return snapshot;
}

function averageInventory(context: StandardKpiContext, profile: KpiDataProfile, bounds?: { start: string; end: string }, minimum = 1) {
  const snapshots = stockSnapshots(context, profile, "inventoryValue", bounds);
  if (snapshots.some((snapshot) => !snapshot.complete)) throw new Error("En lagersnapshotdato har ufuldstændige lagerværdier i perioden.");
  if (snapshots.length < minimum) throw new Error(`Mindst ${minimum} komplette lagersnapshots i samme periode og scope kræves.`);
  const total = snapshots.reduce((sum, snapshot) => sum + snapshot.total, 0);
  return { value: ratio(total, snapshots.length, "Gennemsnitlig lagerværdi"), snapshots };
}

function inventoryExtremum(context: StandardKpiContext, profile: KpiDataProfile, direction: "lowest" | "highest") {
  const snapshot = latestSnapshot(context, profile, "inventoryQuantity");
  const members = new Map<string, { name: string; quantity: number }>();
  snapshot.rows.forEach((row) => {
    const name = inventoryDimensions.map((field) => rowText(row, field)).find(Boolean);
    if (!name) throw new Error("Laveste/højeste lager kræver et navngivet produkt eller andet lagermedlem.");
    const identity = comparableLabel(name);
    const current = members.get(identity.key) ?? { name: identity.label, quantity: 0 };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.quantity += rowNumber(row, "inventoryQuantity")!;
    members.set(identity.key, current);
  });
  const ranked = [...members.values()].sort((a, b) => direction === "lowest" ? a.quantity - b.quantity : b.quantity - a.quantity)[0];
  if (!ranked || !isFiniteNumber(ranked.quantity)) throw new Error("Lagerantal pr. medlem kan ikke afstemmes.");
  return { value: ranked.name, detail: `${ranked.quantity.toLocaleString("da-DK")} enheder · snapshot ${snapshot.date}` };
}

function inventoryFlowPeriod(context: StandardKpiContext, rows: ProfileRow[]) {
  const selected = requestedInventoryMonths(context);
  const selectedKeys = selected.map(monthSortKey);
  if (selectedKeys.some((key) => key === null) || new Set(selectedKeys).size !== selected.length) {
    throw new Error("Lagerperioden indeholder en ugyldig eller dubleret kalendermåned.");
  }
  const orderedSelected = (selectedKeys as number[]).sort((a, b) => a - b).map((key) => {
    const date = new Date(key);
    return date.getFullYear() * 12 + date.getMonth();
  });
  if (orderedSelected.some((month, index) => index > 0 && month !== orderedSelected[index - 1] + 1)) {
    throw new Error("Lagerperioden kræver sammenhængende kalendermåneder.");
  }
  if (context.inventoryPeriod) {
    const start = dayKey(context.inventoryPeriod.start);
    const end = dayKey(context.inventoryPeriod.end);
    if (!start || !end || start > end) throw new Error("Lagerperioden kræver gyldig start- og slutdato.");
    if (selected.length && (!inRequestedMonths(start, context) || !inRequestedMonths(end, context))) {
      throw new Error("Lagerperiodens datoer skal ligge i det valgte kalenderscope.");
    }
    return { start, end, days: (Date.parse(end) - Date.parse(start)) / dayMillis + 1 };
  }
  const monthKeys = (selected.length ? selected : rows.map((row) => rowText(row, "month") ?? dayKey(row.values.date)?.slice(0, 7) ?? ""))
    .map(monthSortKey).filter((key): key is number => key !== null).sort((a, b) => a - b);
  if (!monthKeys.length) throw new Error("Vareforbrug kræver en dokumenteret periode.");
  const months = [...new Set(monthKeys.map((key) => {
    const date = new Date(key);
    return date.getFullYear() * 12 + date.getMonth();
  }))];
  if (months.some((month, index) => index > 0 && month !== months[index - 1] + 1)) {
    throw new Error("Lageromsætning kræver sammenhængende kalendermåneder uden skjulte perioder.");
  }
  const first = new Date(monthKeys[0]);
  const last = new Date(monthKeys.at(-1)!);
  let start = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`;
  let end = new Date(Date.UTC(last.getFullYear(), last.getMonth() + 1, 0)).toISOString().slice(0, 10);
  const partial = new Set((context.partialMonths ?? []).map(monthSortKey));
  if (partial.has(monthKeys[0]) || partial.has(monthKeys.at(-1)!)) {
    const datedRows = rows.map((row) => dayKey(row.values.date)).filter((date): date is string => date !== null);
    const boundaryDates = (month: number) => datedRows.filter((date) => monthSortKey(monthOfDay(date)) === month).sort();
    if (partial.has(monthKeys[0])) {
      const firstDates = boundaryDates(monthKeys[0]);
      if (!firstDates.length) throw new Error("Delperiodens første måned kræver dokumenterede datoer.");
      start = firstDates[0];
    }
    if (partial.has(monthKeys.at(-1)!)) {
      const lastDates = boundaryDates(monthKeys.at(-1)!);
      if (!lastDates.length) throw new Error("Delperiodens sidste måned kræver dokumenterede datoer.");
      end = lastDates.at(-1)!;
    }
  }
  return { start, end, days: (Date.parse(end) - Date.parse(start)) / dayMillis + 1 };
}

function inventoryTurnoverBasis(context: StandardKpiContext, profile: KpiDataProfile) {
  const salesRows = context.salesProfile?.rows ?? [];
  const candidates = salesRows.some((row) => row.fields.includes("cogs"))
    ? salesRows.filter((row) => row.fields.includes("revenue") || row.fields.includes("units") || row.fields.includes("cogs"))
    : profile.rows.filter((row) => row.fields.includes("cogs"));
  const scopedCandidates = scopedInventoryRows(candidates, context, "Vareforbrug");
  const period = inventoryFlowPeriod(context, scopedCandidates);
  const rows = scopedCandidates.filter((row) => {
    const date = dayKey(row.values.date);
    if (date) return date >= period.start && date <= period.end;
    const month = rowText(row, "month");
    if (!month) throw new Error("Vareforbrug kan ikke afgrænses uden dato eller måned.");
    if (period.start.slice(8) !== "01" || period.end !== new Date(Date.UTC(Number(period.end.slice(0, 4)), Number(period.end.slice(5, 7)), 0)).toISOString().slice(0, 10)) {
      throw new Error("Månedsdata uden dag kan ikke fordeles på en delperiode.");
    }
    const key = monthSortKey(month);
    return key !== null && key >= monthSortKey(period.start.slice(0, 7))! && key <= monthSortKey(period.end.slice(0, 7))!;
  });
  if (!rows.length || rows.some((row) => rowNumber(row, "cogs") === null)) {
    throw new Error("Dokumenteret COGS/vareforbrug mangler for en eller flere flowrækker i perioden.");
  }
  const coveredMonths = new Set(rows.map((row) => {
    const date = dayKey(row.values.date);
    return date ? monthOfDay(date) : rowText(row, "month") ?? "";
  }).map(monthSortKey));
  const startMonth = monthSortKey(period.start.slice(0, 7))!;
  const endMonth = monthSortKey(period.end.slice(0, 7))!;
  for (let month = new Date(startMonth); month.getTime() <= endMonth; month.setMonth(month.getMonth() + 1)) {
    if (!coveredMonths.has(month.getTime())) throw new Error("Vareforbrug mangler for en kalendermåned i det filtrerede periodescope.");
  }
  const cogs = rows.reduce((sum, row) => sum + rowNumber(row, "cogs")!, 0);
  if (!isFiniteNumber(cogs)) throw new Error("Vareforbrug gav ikke et endeligt tal.");
  const averageStock = averageInventory(context, profile, period, 2);
  return {
    value: ratio(cogs, averageStock.value, "Lageromsætningshastighed"),
    days: period.days,
    detail: `${cogs.toLocaleString("da-DK")} kr. dokumenteret vareforbrug / gennemsnit af ${averageStock.snapshots.length} snapshots · ${period.start} – ${period.end}`,
  };
}

type FinancialIdentity = { company: string; currency: string };
type FinancialFlow = FinancialIdentity & { value: number; start: string; end: string };
const completedFinancialStatuses = new Set(["komplet", "complete", "completed", "endelig", "final", "afstemt"]);

function financialIdentity(row: ProfileRow): FinancialIdentity {
  const company = rowText(row, "company");
  const currency = rowText(row, "currency");
  const status = rowText(row, "financialStatus");
  if (!company || !currency || !status) throw new Error("Finansielle data kræver virksomhed, valuta og eksplicit completeness/status på hver relevant række.");
  if (!completedFinancialStatuses.has(normalizeForComparison(status))) throw new Error("Det finansielle datagrundlag er ikke markeret komplet og afstemt.");
  return { company: normalizeForComparison(company), currency: currency.trim().toUpperCase() };
}

function sameFinancialIdentity(left: FinancialIdentity, right: FinancialIdentity) {
  if (left.company !== right.company || left.currency !== right.currency) {
    throw new Error("Finansielle poster har forskellig virksomhed eller valuta og kan ikke blandes.");
  }
}

function financialScope(context: StandardKpiContext): StandardKpiContext {
  return context.financialFilters ? { ...context, inventoryFilters: context.financialFilters } : context;
}

function financialRows(profile: KpiDataProfile, fields: readonly KpiDataField[]) {
  return profile.rows.filter((row) => fields.some((field) => row.fields.includes(field)));
}

function financialBalanceDate(row: ProfileRow) {
  const date = dayKey(row.values.snapshotDate);
  if (!date) throw new Error("Balanceposter kræver en gyldig balancedato/snapshotdato på hver række.");
  const period = financialPeriod(row);
  if (date < period.start || date > period.end) throw new Error("Balancedatoen ligger uden for den dokumenterede regnskabsperiode.");
  return date;
}

function financialSnapshot(context: StandardKpiContext, profile: KpiDataProfile, fields: readonly KpiDataField[]) {
  const dated = financialRows(profile, fields).map((row) => {
    const date = financialBalanceDate(row);
    return { row, date };
  }).filter(({ date }) => inRequestedMonths(date, financialScope(context)));
  const scoped = new Set(scopedInventoryRows(dated.map(({ row }) => row), financialScope(context), "Finansielle data"));
  const rows = dated.filter(({ row }) => scoped.has(row)).map((item) => ({ ...item, identity: financialIdentity(item.row) }));
  const date = rows.map((item) => item.date).sort().at(-1);
  if (!date) throw new Error("Ingen dokumenteret balance på en fælles snapshotdato i det valgte scope.");
  const latest = rows.filter((item) => item.date === date);
  const identity = latest[0].identity;
  latest.forEach((item) => sameFinancialIdentity(identity, item.identity));
  const values = Object.fromEntries(fields.map((field) => {
    const matching = latest.filter(({ row }) => row.fields.includes(field));
    if (matching.length !== 1) throw new Error(`${kpiFieldRegistry[field].label} skal være dokumenteret præcis én gang på balancedato ${date}; ukendt er ikke 0.`);
    const value = rowNumber(matching[0].row, field);
    if (value === null) throw new Error(`${kpiFieldRegistry[field].label} er ukendt på balancedato ${date}.`);
    return [field, value];
  })) as Partial<Record<KpiDataField, number>>;
  return { values, date, identity };
}

function financialStockRatio(context: StandardKpiContext, profile: KpiDataProfile, numerator: KpiDataField, denominator: KpiDataField, label: string) {
  const snapshot = financialSnapshot(context, profile, [numerator, denominator]);
  return { value: ratio(snapshot.values[numerator]!, snapshot.values[denominator]!, label), detail: `Samme dokumenterede balance · ${snapshot.date}` };
}

function financialPeriod(row: ProfileRow) {
  const explicitStart = dayKey(row.values.periodStart);
  const explicitEnd = dayKey(row.values.periodEnd);
  if (explicitStart && explicitEnd && explicitStart <= explicitEnd) return { start: explicitStart, end: explicitEnd };
  const period = rowText(row, "accountingPeriod");
  if (period && /^\d{4}-\d{2}$/.test(period) && monthSortKey(period) !== null) {
    const start = `${period}-01`;
    const end = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10);
    return { start, end };
  }
  if (period && /^\d{4}$/.test(period)) return { start: `${period}-01-01`, end: `${period}-12-31` };
  throw new Error("Finansielle poster kræver en eksplicit gyldig regnskabsperiode eller periodestart og -slut.");
}

function financialPeriodMonths(start: string, end: string) {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, 1));
  const last = end.slice(0, 7);
  while (cursor.toISOString().slice(0, 7) <= last) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function financialFlow(context: StandardKpiContext, profile: KpiDataProfile, field: KpiDataField): FinancialFlow {
  const candidates = financialRows(profile, [field]);
  const rows = field === "revenue" ? candidates.filter((row) =>
    row.fields.includes("accountingPeriod") || row.fields.includes("periodStart") || row.fields.includes("periodEnd") ||
    row.fields.includes("company") || row.fields.includes("currency") || row.fields.includes("financialStatus")) : candidates;
  if (!rows.length) throw new Error(`${kpiFieldRegistry[field].label} kræver dokumenteret regnskabsperiode i det valgte scope.`);
  let dated = rows.map((row) => ({ row, ...financialPeriod(row) }));
  const selected = requestedInventoryMonths(financialScope(context));
  if (selected.length) {
    dated = dated.filter((entry) => financialPeriodMonths(entry.start, entry.end).every((month) => selected.includes(month)));
    if (!dated.length) throw new Error("Ingen dokumenteret regnskabsperiode matcher det valgte periodescope.");
  }
  const scoped = new Set(scopedInventoryRows(dated.map(({ row }) => row), financialScope(context), "Finansielle data"));
  const entries = dated.filter(({ row }) => scoped.has(row)).map(({ row, start, end }) => {
    const identity = financialIdentity(row);
    const amount = rowNumber(row, field);
    if (amount === null) throw new Error(`${kpiFieldRegistry[field].label} er delvist ukendt; ukendt er ikke 0.`);
    return { start, end, ...identity, amount };
  });
  if (!entries.length) throw new Error("Ingen dokumenteret finansielt flow matcher det valgte dimensionsscope.");
  const identity = entries[0];
  entries.forEach((entry) => sameFinancialIdentity(identity, entry));
  const periods = [...new Set(entries.map(({ start, end }) => `${start}/${end}`))]
    .map((period) => ({ start: period.slice(0, 10), end: period.slice(11) }))
    .sort((left, right) => left.start.localeCompare(right.start));
  for (let index = 1; index < periods.length; index += 1) {
    const priorEnd = Date.parse(periods[index - 1].end);
    if (Date.parse(periods[index].start) !== priorEnd + dayMillis) {
      throw new Error("Finansielle flowperioder overlapper eller har manglende kalenderdage.");
    }
  }
  const start = periods[0].start;
  const end = periods.at(-1)!.end;
  if (selected.length) {
    const months = financialPeriodMonths(start, end);
    if (months.length !== selected.length || months.some((month) => !selected.includes(month))) {
      throw new Error("Regnskabsperioden matcher ikke det valgte periodescope.");
    }
  }
  if ((context.partialMonths ?? []).some((month) => month === start.slice(0, 7) || month === end.slice(0, 7)) &&
      (start.endsWith("-01") || end === new Date(Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)), 0)).toISOString().slice(0, 10))) {
    throw new Error("En delmåned kan ikke stiltiende sammenlignes med en fuld regnskabsmåned.");
  }
  const value = entries.reduce((sum, entry) => sum + entry.amount, 0);
  if (!isFiniteNumber(value)) throw new Error("Finansielt flow gav ikke et endeligt tal.");
  return { value, start, end, company: identity.company, currency: identity.currency };
}

function matchingFinancialFlows(left: FinancialFlow, right: FinancialFlow) {
  sameFinancialIdentity(left, right);
  if (left.start !== right.start || left.end !== right.end) throw new Error("Finansielle flow har ikke samme regnskabsperiode.");
}

function averageFinancialBalance(context: StandardKpiContext, profile: KpiDataProfile, field: KpiDataField, flow: FinancialFlow) {
  const dated = financialRows(profile, [field]).map((row) => ({ row, date: financialBalanceDate(row) }));
  const beforeStart = new Date(Date.parse(flow.start) - dayMillis).toISOString().slice(0, 10);
  const relevant = dated.filter((item) => item.date === flow.start || item.date === beforeStart || item.date === flow.end);
  const scoped = new Set(scopedInventoryRows(relevant.map(({ row }) => row), financialScope(context), "Finansielle data"));
  const rows = relevant.filter(({ row }) => scoped.has(row)).map((item) => ({ ...item, identity: financialIdentity(item.row) }));
  const opening = rows.filter((item) => item.date === flow.start || item.date === beforeStart);
  const closing = rows.filter((item) => item.date === flow.end);
  const openingDate = opening.some((item) => item.date === flow.start) ? flow.start : beforeStart;
  const endpoints = [opening.filter((item) => item.date === openingDate), closing];
  const values = endpoints.map((items) => {
    if (items.length !== 1) throw new Error(`${kpiFieldRegistry[field].label} kræver én komplet åbnings- og slutbalance for regnskabsperioden.`);
    sameFinancialIdentity(flow, items[0].identity);
    const value = rowNumber(items[0].row, field);
    if (value === null) throw new Error(`${kpiFieldRegistry[field].label} er ukendt på en af balancedatoerne.`);
    return value;
  });
  return ratio(values[0] + values[1], 2, `Gennemsnitlige ${kpiFieldRegistry[field].label.toLowerCase()}`);
}

function financialFlowRatio(context: StandardKpiContext, profile: KpiDataProfile, numerator: KpiDataField, denominator: KpiDataField, label: string) {
  const first = financialFlow(context, profile, numerator);
  const second = financialFlow(context, profile, denominator);
  matchingFinancialFlows(first, second);
  return { value: ratio(first.value, second.value, label), detail: `${first.start} – ${first.end} · ${first.currency}` };
}

function financialReturn(context: StandardKpiContext, profile: KpiDataProfile, flowField: KpiDataField, balanceField: KpiDataField, label: string) {
  const flow = financialFlow(context, profile, flowField);
  const balance = averageFinancialBalance(context, profile, balanceField, flow);
  return { value: ratio(flow.value, balance, label), detail: `${flow.start} – ${flow.end} · gennemsnitlig åbnings-/slutbalance · ${flow.currency}` };
}

function documentedEbitda(context: StandardKpiContext, profile: KpiDataProfile): FinancialFlow {
  if (hasField(profile, "ebitda")) return financialFlow(context, profile, "ebitda");
  const operating = financialFlow(context, profile, "operatingProfit");
  const depreciation = financialFlow(context, profile, "depreciation");
  matchingFinancialFlows(operating, depreciation);
  const value = operating.value + depreciation.value;
  if (!isFiniteNumber(value)) throw new Error("EBITDA gav ikke et endeligt tal.");
  return { ...operating, value };
}

function financialQuickRatio(context: StandardKpiContext, profile: KpiDataProfile) {
  const snapshot = financialSnapshot(context, profile, ["currentAssets", "inventoryValue", "currentLiabilities"]);
  return { value: ratio(snapshot.values.currentAssets! - snapshot.values.inventoryValue!, snapshot.values.currentLiabilities!, "Quick Ratio"), detail: `Samme dokumenterede balance · ${snapshot.date}` };
}

function fallbackPeriod(row: KpiDataProfile["rows"][number], unit: PeriodUnit) {
  const field = unit === "month" ? "month" : unit === "week" ? "week" : unit === "quarter" ? "quarter" : unit === "year" ? "year" : null;
  if (!field) return null;
  const label = rowText(row, field);
  return label ? { key: label, label } : null;
}

function periodRevenue(profile: KpiDataProfile, unit: PeriodUnit) {
  const cache = getProfileAnalysisCache(profile);
  const cached = cache.periodRevenue.get(unit);
  if (cached) return cached;

  const groups = new Map<string, { label: string; value: number; order: number }>();
  profile.rows.forEach((row, index) => {
    const revenue = rowNumber(row, "revenue");
    if (revenue === null) return;
    const date = profileRowDate(profile, row);
    const period = date ? datePeriod(date, unit) : fallbackPeriod(row, unit);
    if (!period) return;
    const current = groups.get(period.key);
    groups.set(period.key, { label: period.label, value: (current?.value ?? 0) + revenue, order: current?.order ?? index });
  });
  const result = Array.from(groups.entries())
    .map(([key, value]) => ({ key, name: value.label, ...value }))
    .sort((a, b) => a.key.localeCompare(b.key, "da") || a.order - b.order);
  cache.periodRevenue.set(unit, result);
  return result;
}

type GrowthRow = { month: string; date: Date | null; revenue: number; product: string | null };

function growthRows(profile: KpiDataProfile): GrowthRow[] {
  return profile.rows.flatMap((row) => {
    const revenue = rowNumber(row, "revenue");
    const date = profileRowDate(profile, row);
    const month = date ? datePeriod(date, "month").key : rowText(row, "month");
    return revenue === null || !month || monthSortKey(month) === null
      ? [] : [{ month, date, revenue, product: rowText(row, "product") }];
  });
}

function growthScope(context: StandardKpiContext, profile: KpiDataProfile) {
  const rows = growthRows(context.comparisonProfile ?? profile);
  const months = [...new Set(rows.map((row) => formatDanishMonth(row.month)))]
    .sort((left, right) => monthSortKey(left)! - monthSortKey(right)!);
  const partialMonths = context.partialMonths ?? inferBoundaryPartialMonths(rows);
  return { rows, months, partialMonths };
}

function monthlyGrowthRates(context: StandardKpiContext, profile: KpiDataProfile) {
  const { rows, months, partialMonths } = growthScope(context, profile);
  const selected = context.selectedMonths?.length ? context.selectedMonths : null;
  if (selected) {
    const selection = resolvePeriodComparison(months, { selectedMonths: selected, partialMonths });
    if (selection.status !== "available") throw new Error(selection.reason ?? "Periodevalget kan ikke sammenlignes.");
  }
  const candidates = selected ?? months;
  const rates = candidates.flatMap((month) => {
    const comparison = resolvePeriodComparison(months, { selectedMonths: [month], partialMonths });
    const growth = summarizeComparisonMetric(rows, comparison, (row) => row.revenue);
    return growth?.percentage === null || growth === null
      ? [] : [{ name: comparison.currentLabel!, value: growth.percentage, label: growth.label }];
  });
  if (!rates.length) throw new Error("Ingen sammenlignelige hele kalendermåneder med procentvis vækst; baseline 0, delmåneder eller manglende måneder kan være årsagen.");
  return rates;
}

function yearOverYearGrowth(context: StandardKpiContext, profile: KpiDataProfile) {
  const { rows, months, partialMonths } = growthScope(context, profile);
  const comparison = resolveYearOverYearComparison(months, { selectedMonths: context.selectedMonths, partialMonths });
  if (comparison.status !== "available") throw new Error(comparison.reason ?? "År-over-år-perioderne er ikke sammenlignelige.");
  const growth = summarizeComparisonMetric(rows, comparison, (row) => row.revenue);
  if (!growth || growth.percentage === null) throw new Error(`År-over-år-vækst er utilgængelig ved baseline 0 eller ufuldstændige perioder (${comparison.label}).`);
  return { value: growth.percentage, detail: growth.label };
}

function fastestGrowingProduct(context: StandardKpiContext, profile: KpiDataProfile) {
  const { rows, months, partialMonths } = growthScope(context, profile);
  const comparison = context.periodComparison ?? resolvePeriodComparison(months, {
    selectedMonths: context.selectedMonths, partialMonths,
  });
  if (comparison.status !== "available") throw new Error(comparison.reason ?? "Produktvækst kræver to sammenlignelige perioder.");
  const requiredMonths = [...comparison.previousMonths, ...comparison.currentMonths].map(monthSortKey);
  const products = new Map<string, { name: string; rows: GrowthRow[]; months: Set<number> }>();
  rows.forEach((row) => {
    if (!row.product) return;
    const identity = comparableLabel(row.product);
    const current = products.get(identity.key) ?? { name: identity.label, rows: [], months: new Set<number>() };
    current.name = chooseRepresentativeLabel(current.name, identity.label);
    current.rows.push(row);
    current.months.add(monthSortKey(row.month)!);
    products.set(identity.key, current);
  });
  const comparable = [...products.values()].flatMap((product) => {
    if (!requiredMonths.every((month) => month !== null && product.months.has(month))) return [];
    const growth = summarizeComparisonMetric(product.rows, comparison, (row) => row.revenue);
    return growth?.percentage === null || growth === null ? []
      : [{ name: product.name, value: growth.percentage, label: growth.label }];
  });
  const best = rankedGroup(comparable, "highest", "Produktvækst");
  return { value: best.name, detail: `${(best.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % omsætningsvækst · ${best.label}` };
}

function customerPurchaseRows(profile: KpiDataProfile) {
  return profile.rows.filter((row) => row.fields.includes("revenue") || row.fields.includes("orderId")
    || row.fields.includes("customerId") || row.fields.includes("customerName"));
}

function customerIdentity(row: ProfileRow) {
  const value = rowText(row, "customerId");
  if (!value || ["ukendt", "unknown", "n/a", "na", "null", "-"].includes(normalizeForComparison(value))) {
    throw new Error("Kunde-id mangler eller er ukendt på en købsrække; kundenavn bruges ikke som fallback.");
  }
  return normalizeForComparison(value);
}

function documentedCustomerOrders(profile: KpiDataProfile) {
  const rows = customerPurchaseRows(profile);
  if (!rows.length) throw new Error("Køb pr. kunde kræver dokumenterede kunder og ordrer i det aktuelle scope.");
  const ordersByCustomer = new Map<string, Set<string>>();
  const orderOwners = new Map<string, string>();
  rows.forEach((row) => {
    const customer = customerIdentity(row);
    const order = rowText(row, "orderId");
    if (!order) throw new Error("Ordre-id mangler på en eller flere købsrækker; salgsrækker tælles ikke som ordrer.");
    const orderKey = normalizeForComparison(order);
    const owner = orderOwners.get(orderKey);
    if (owner && owner !== customer) throw new Error("Samme ordre-id er knyttet til flere kunder og kan ikke afstemmes.");
    orderOwners.set(orderKey, customer);
    const customerOrders = ordersByCustomer.get(customer) ?? new Set<string>();
    customerOrders.add(orderKey);
    ordersByCustomer.set(customer, customerOrders);
  });
  return { ordersByCustomer, orderCount: orderOwners.size };
}

function documentedCustomerGroups(profile: KpiDataProfile, field: "revenue" | "grossProfit") {
  const rows = customerPurchaseRows(profile);
  if (!rows.length) throw new Error("Kunde-KPI'en kræver dokumenterede salgsrækker i det aktuelle scope.");
  const groups = new Map<string, { id: string; name: string | null; value: number }>();
  rows.forEach((row) => {
    const key = customerIdentity(row);
    const id = rowText(row, "customerId")!;
    const value = rowNumber(row, field);
    if (value === null) throw new Error(`${field === "grossProfit" ? "Dækningsbidrag" : "Omsætning"} skal være dokumenteret for alle kunderækker i samme scope.`);
    const name = rowText(row, "customerName");
    const current = groups.get(key) ?? { id, name, value: 0 };
    current.value += value;
    if (!isFiniteNumber(current.value)) throw new Error("Kunde-KPI'en gav ikke et endeligt tal.");
    if (name) current.name = current.name ? chooseRepresentativeLabel(current.name, name) : name;
    groups.set(key, current);
  });
  return [...groups.values()];
}

function highestDocumentedCustomer(profile: KpiDataProfile, field: "revenue" | "grossProfit") {
  const groups = documentedCustomerGroups(profile, field);
  const best = groups.sort((left, right) => right.value - left.value || left.id.localeCompare(right.id, "da"))[0];
  const label = best.name ? `${best.name} (${best.id})` : best.id;
  return { value: label, detail: `${best.value.toLocaleString("da-DK")} kr. i dokumenteret ${field === "grossProfit" ? "dækningsbidrag" : "omsætning"} · grupperet på kunde-id · lighed afgøres efter kunde-id` };
}

function newCustomersInPeriod(context: StandardKpiContext, profile: KpiDataProfile) {
  const history = context.customerHistoryProfile ?? context.comparisonProfile;
  if (!history && context.selectedMonths?.length) throw new Error("Nye kunder kræver ufiltreret kundehistorik før den valgte periode.");
  const historyProfile = history ?? profile;
  const historicalRows = customerPurchaseRows(historyProfile);
  const currentRows = customerPurchaseRows(profile);
  if (!historicalRows.length || !currentRows.length) throw new Error("Nye kunder kræver dokumenterede kunde- og datoværdier.");
  const firstPurchase = new Map<string, string>();
  historicalRows.forEach((row) => {
    const customer = customerIdentity(row);
    const date = dayKey(row.values.date);
    if (!date) throw new Error("Kundehistorikken mangler en gyldig købsdato; første køb kan ikke fastslås.");
    const current = firstPurchase.get(customer);
    if (!current || date < current) firstPurchase.set(customer, date);
  });
  const datedCustomers = currentRows.map((row) => {
    const customer = customerIdentity(row);
    const date = dayKey(row.values.date);
    if (!date) throw new Error("Den valgte periode indeholder en købsrække uden gyldig dato.");
    return { customer, date };
  });
  const selected = context.selectedMonths?.length
    ? context.selectedMonths.map(monthSortKey)
    : [monthSortKey(datedCustomers.map(({ date }) => date).sort().at(-1)!.slice(0, 7))];
  if (selected.some((month) => month === null)) throw new Error("Den valgte kundeperiode er ugyldig.");
  const activeCustomers = new Set(datedCustomers
    .filter(({ date }) => selected.includes(monthSortKey(date.slice(0, 7))))
    .map(({ customer }) => customer));
  if (!activeCustomers.size) throw new Error("Ingen dokumenterede kundekøb i den valgte periode.");
  const count = [...activeCustomers].filter((customer) => {
    const first = firstPurchase.get(customer);
    if (!first) throw new Error("Kundehistorikken dækker ikke alle kunder i den aktuelle visning.");
    return selected.includes(monthSortKey(first.slice(0, 7)));
  }).length;
  return { value: count, detail: `Første registrerede køb i ${context.selectedMonths?.length ? context.selectedMonths.join(", ") : selected[0]} · vurderet mod hele kundehistorikken i samme scope` };
}

function productRankingRows(context: StandardKpiContext, profile: KpiDataProfile) {
  const rows = (context.salesProfile ?? profile).rows.filter((row) =>
    row.fields.includes("revenue") || row.fields.includes("units") || row.fields.includes("grossProfit"));
  if (!rows.length) throw new Error("Produktranking kræver dokumenterede salgsrækker i det aktuelle scope.");
  return rows.map((row) => {
    const product = rowText(row, "product");
    const revenue = rowNumber(row, "revenue");
    if (!product || revenue === null) throw new Error("Produktranking kræver produkt og omsætning på alle salgsrækker; ukendt er ikke 0.");
    return { row, product: comparableLabel(product), revenue };
  });
}

function bestRankedProduct(groups: Array<{ name: string; value: number }>, label: string) {
  if (!groups.length || groups.some((group) => !isFiniteNumber(group.value))) throw new Error(`${label} har ikke et komplet, endeligt datagrundlag.`);
  return [...groups].sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "da"))[0];
}

function revenueProductRanking(context: StandardKpiContext, profile: KpiDataProfile) {
  const groups = new Map<string, { name: string; value: number }>();
  productRankingRows(context, profile).forEach(({ product, revenue }) => {
    const current = groups.get(product.key) ?? { name: product.label, value: 0 };
    current.name = chooseRepresentativeLabel(current.name, product.label);
    current.value += revenue;
    groups.set(product.key, current);
  });
  const best = bestRankedProduct([...groups.values()], "Produktomsætning");
  return { value: best.name, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning · lighed afgøres alfabetisk` };
}

function marginProductRanking(context: StandardKpiContext, profile: KpiDataProfile) {
  const rows = productRankingRows(context, profile);
  const hasCompleteDb = rows.every(({ row }) => rowNumber(row, "grossProfit") !== null);
  const hasCompleteMargin = rows.every(({ row }) => rowNumber(row, "grossMargin") !== null);
  if (!hasCompleteDb && !hasCompleteMargin) throw new Error("Alle produkter kræver komplet dækningsbidrag eller komplet dækningsgrad og omsætning på hver salgsrække.");
  const groups = new Map<string, { name: string; revenue: number; grossProfit: number }>();
  rows.forEach(({ row, product, revenue }) => {
    const current = groups.get(product.key) ?? { name: product.label, revenue: 0, grossProfit: 0 };
    current.name = chooseRepresentativeLabel(current.name, product.label);
    current.revenue += revenue;
    current.grossProfit += hasCompleteDb ? rowNumber(row, "grossProfit")! : revenue * rowNumber(row, "grossMargin")!;
    groups.set(product.key, current);
  });
  const ranked = [...groups.values()].map(({ name, revenue, grossProfit }) => ({ name, value: ratio(grossProfit, revenue, `Dækningsgrad for ${name}`) }));
  const best = bestRankedProduct(ranked, "Produktets dækningsgrad");
  return { value: best.name, detail: `${(best.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % dækningsgrad · ${hasCompleteDb ? "komplet DB-grundlag" : "omsætningsvægtet DG-grundlag"} · lighed afgøres alfabetisk` };
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
  defineKpi({ id: "gross-margin", name: "Dækningsgrad", description: "Dækningsbidrag / nettoomsætning for samme komplette scope", category: "Indtjening", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["grossProfit", "grossMargin"], label: "Dækningsbidrag eller dækningsgrad" }]), calculate: ({ context }) => { if (context.grossMargin === null) throw new Error(context.grossMarginReason ?? "Dækningsgrad er ikke tilgængelig i den aktuelle visning."); return { value: context.grossMargin, detail: "Dækningsbidrag / nettoomsætning for samme komplette scope" }; } }),
  defineKpi({ id: "total-costs", name: "Samlede omkostninger", description: "Registrerede omkostninger i den aktuelle visning", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements([], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: documentedCosts(context), detail: "Beregnet ud fra dokumenteret omkostningsgrundlag" }) }),
  defineKpi({ id: "result", name: "Resultat", description: "Omsætning minus registrerede omkostninger", category: "Indtjening", format: "currency", icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: documentedResult(context), detail: "Omsætning minus dokumenterede omkostninger" }) }),
  defineKpi({ id: "revenue-vs-budget", name: "Omsætning mod budget", description: "Forskel mellem faktisk og budgetteret omsætning", category: "Budget", placement: "primary", format: "currency", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget, detail: "Faktisk omsætning sammenholdt med budget" }) }),
  defineKpi({ id: "best-product", name: "Produkt med højest omsætning", description: "Produktet med størst dokumenteret omsætning i samme scope og periode", category: "Produkter", level: "recommended", format: "text", icon: "revenue", color: "cyan", requirements: requirements(["product", "revenue"]), calculate: ({ context, profile }) => revenueProductRanking(context, profile) }),
  defineKpi({ id: "best-category", name: "Bedste kategori", description: "Kategorien med den højeste omsætning", category: "Produkter", format: "text", icon: "target", color: "cyan", requirements: requirements(["category", "revenue"]), calculate: ({ context }) => { if (!context.bestCategory) throw new Error("Ingen kategorier i den aktuelle visning."); return { value: context.bestCategory.name, detail: "Kategorien med den højeste omsætning" }; } }),
  defineKpi({ id: "best-month", name: "Bedste måned", description: "Måneden med den højeste omsætning", category: "Tid og perioder", level: "recommended", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => { if (!context.bestMonth) throw new Error("Ingen måneder i den aktuelle visning."); return { value: context.bestMonth.name, detail: "Måneden med den højeste omsætning" }; } }),
  defineKpi({ id: "avg-revenue-row", name: "Gennemsnitlig omsætning pr. række", description: "Omsætning divideret med registrerede salgsrækker", category: "Salg", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.rowCount, "Gennemsnitlig omsætning pr. række"), detail: `Beregnet ud fra ${context.rowCount} rækker` }) }),
  defineKpi({ id: "gross-profit-unit", name: "Dækningsbidrag pr. solgt enhed", description: "Dækningsbidrag divideret med solgte enheder", category: "Indtjening", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["grossProfit", "units"]), calculate: ({ context }) => ({ value: ratio(context.totalGrossProfit, context.totalUnits, "Dækningsbidrag pr. enhed"), detail: "Dækningsbidrag pr. solgt enhed" }) }),
  defineKpi({ id: "row-count", name: "Antal registrerede salgsrækker", description: "Antallet af rækker i den aktuelle visning", category: "Salg", format: "count", icon: "units", color: "navy", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: context.rowCount, detail: "Filtrerede salgsrækker" }) }),
  defineKpi({ id: "average-order-value", name: "Gennemsnitlig ordreværdi", description: "Omsætning divideret med unikke ordrer", category: "Kunder", format: "currency", decimals: 2, icon: "calculator", color: "purple", requirements: requirements(["revenue", "orderId"]), calculate: ({ context, profile }) => ({ value: ratio(context.totalRevenue, context.orderCount ?? uniqueCount(profile, "orderId"), "Gennemsnitlig ordreværdi"), detail: "Omsætning pr. unik ordre" }) }),
  defineKpi({ id: "budget-revenue", name: "Budgetteret omsætning", description: "Budgetteret omsætning for den aktuelle visning", category: "Budget", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetRevenue"]), calculate: ({ context }) => ({ value: context.budgetRevenue, detail: "Budgetteret omsætning" }) }),
  defineKpi({ id: "budget-costs", name: "Budgetterede omkostninger", description: "Budgetterede omkostninger for den aktuelle visning", category: "Budget", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetCosts"]), calculate: ({ context }) => ({ value: context.budgetCosts, detail: "Budgetterede omkostninger" }) }),
  defineKpi({ id: "budget-result", name: "Budgetteret resultat", description: "Budgetteret omsætning minus omkostninger", category: "Budget", format: "currency", icon: "profit", color: "green", requirements: requirements(["budgetRevenue", "budgetCosts"]), calculate: ({ context }) => ({ value: context.budgetResult, detail: "Budgetteret omsætning minus omkostninger" }) }),
  defineKpi({ id: "equity-ratio", name: "Soliditetsgrad", description: "Egenkapital / aktiver på samme balancedato", category: "Finansielle nøgletal", format: "percent", decimals: 1, icon: "target", color: "navy", requirements: requirements(["equity", "assets"]), calculate: ({ context, profile }) => financialStockRatio(context, profile, "equity", "assets", "Soliditetsgrad") }),
  defineKpi({ id: "current-ratio", name: "Likviditetsgrad", description: "Omsætningsaktiver / kortfristet gæld på samme balancedato", category: "Likviditet", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "currentLiabilities"]), calculate: ({ context, profile }) => financialStockRatio(context, profile, "currentAssets", "currentLiabilities", "Likviditetsgrad") }),
  defineKpi({ id: "quick-ratio", name: "Quick Ratio", description: "Omsætningsaktiver uden lager / kortfristet gæld på samme balancedato", category: "Likviditet", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "inventoryValue", "currentLiabilities"]), calculate: ({ context, profile }) => financialQuickRatio(context, profile) }),
  defineKpi({ id: "gearing", name: "Gearing", description: "Rentebærende gæld / egenkapital på samme balancedato", category: "Finansielle nøgletal", format: "decimal", decimals: 2, icon: "target", color: "orange", requirements: requirements(["totalDebt", "equity"]), calculate: ({ context, profile }) => financialStockRatio(context, profile, "totalDebt", "equity", "Gearing") }),
  defineKpi({ id: "debt-ratio", name: "Gældsgrad", description: "Forpligtelser / aktiver på samme balancedato", category: "Finansielle nøgletal", format: "percent", decimals: 1, icon: "target", color: "orange", requirements: requirements(["liabilities", "assets"]), calculate: ({ context, profile }) => financialStockRatio(context, profile, "liabilities", "assets", "Gældsgrad") }),
  defineKpi({ id: "operating-margin", name: "Driftsmargin (EBIT-margin)", description: "Dokumenteret driftsresultat / omsætning i samme regnskabsperiode", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["operatingProfit", "revenue"]), calculate: ({ context, profile }) => financialFlowRatio(context, profile, "operatingProfit", "revenue", "Driftsmargin") }),
  defineKpi({ id: "return-on-assets", name: "Afkastningsgrad (ROA)", description: "Periodens nettoresultat / gennemsnitlige aktiver ved periodens start og slut", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "assets"]), calculate: ({ context, profile }) => financialReturn(context, profile, "netProfit", "assets", "Afkastningsgrad") }),
  defineKpi({ id: "return-on-equity", name: "Egenkapitalens forrentning (ROE)", description: "Periodens nettoresultat / gennemsnitlig egenkapital ved periodens start og slut", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "equity"]), calculate: ({ context, profile }) => financialReturn(context, profile, "netProfit", "equity", "Egenkapitalens forrentning") }),
  defineKpi({ id: "net-margin", name: "Nettomargin", description: "Nettoresultat / omsætning i samme regnskabsperiode", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "revenue"]), calculate: ({ context, profile }) => financialFlowRatio(context, profile, "netProfit", "revenue", "Nettomargin") }),
  defineKpi({ id: "working-capital", name: "Arbejdskapital", description: "Omsætningsaktiver minus kortfristet gæld på samme balancedato", category: "Likviditet", format: "currency", icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "currentLiabilities"]), calculate: ({ context, profile }) => { const snapshot = financialSnapshot(context, profile, ["currentAssets", "currentLiabilities"]); return { value: snapshot.values.currentAssets! - snapshot.values.currentLiabilities!, detail: `Samme dokumenterede balance · ${snapshot.date}` }; } }),
  defineKpi({ id: "revenue-growth", name: "Omsætningsvækst", description: "Udviklingen i den fælles sammenligningsperiode", category: "Salg", format: "percent", decimals: 1, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => documentedRevenueGrowth(context) }),
  defineKpi({ id: "inventory-value", name: "Lagerværdi", description: "Samlet lagerværdi på seneste komplette snapshotdato i scope", category: "Lager", format: "currency", icon: "units", color: "orange", requirements: requirements(["inventoryValue"]), calculate: ({ context, profile }) => { const snapshot = latestSnapshot(context, profile, "inventoryValue"); return { value: snapshot.total, detail: `Seneste komplette lagersnapshot · ${snapshot.date}` }; } }),
  defineKpi({ id: "inventory-turnover", name: "Lageromsætningshastighed", description: "Dokumenteret vareforbrug / gennemsnitlig lagerværdi i samme periode", category: "Lager", format: "decimal", decimals: 2, icon: "units", color: "orange", requirements: requirements(["cogs", "inventoryValue"]), calculate: ({ context, profile }) => { const basis = inventoryTurnoverBasis(context, profile); return { value: basis.value, detail: basis.detail }; } }),
  defineKpi({ id: "customer-count", name: "Antal kunder", description: "Antallet af unikke kunder i datagrundlaget", category: "Kunder", format: "count", icon: "units", color: "navy", requirements: requirements(["customerId"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "customerId"), detail: "Unikke registrerede kunder" }) }),
  defineKpi({ id: "revenue-per-day", name: "Omsætning pr. dag", description: "Gennemsnitlig omsætning pr. aktiv salgsdag", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue", "date"]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "day"); return { value: average(periods.map((period) => period.value), "Omsætning pr. dag"), detail: `Gennemsnit på tværs af ${periods.length} salgsdage` }; } }),
  defineKpi({ id: "revenue-per-week", name: "Omsætning pr. uge", description: "Gennemsnitlig omsætning pr. aktiv salgsuge", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "week"], label: "Dato eller uge" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "week"); return { value: average(periods.map((period) => period.value), "Omsætning pr. uge"), detail: `Gennemsnit på tværs af ${periods.length} salgsuger` }; } }),
  defineKpi({ id: "revenue-per-month", name: "Omsætning pr. måned", description: "Gennemsnitlig omsætning pr. aktiv måned", category: "Salg", level: "recommended", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "month"); return { value: average(periods.map((period) => period.value), "Omsætning pr. måned"), detail: `Gennemsnit på tværs af ${periods.length} måneder` }; } }),
  defineKpi({ id: "revenue-per-quarter", name: "Omsætning pr. kvartal", description: "Gennemsnitlig omsætning pr. aktivt kvartal", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "quarter"], label: "Dato eller kvartal" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "quarter"); return { value: average(periods.map((period) => period.value), "Omsætning pr. kvartal"), detail: `Gennemsnit på tværs af ${periods.length} kvartaler` }; } }),
  defineKpi({ id: "revenue-per-year", name: "Omsætning pr. år", description: "Gennemsnitlig omsætning pr. registreret år", category: "Salg", format: "currency", decimals: 2, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "year"], label: "Dato eller år" }]), calculate: ({ profile }) => { const periods = periodRevenue(profile, "year"); return { value: average(periods.map((period) => period.value), "Omsætning pr. år"), detail: `Gennemsnit på tværs af ${periods.length} år` }; } }),
  defineKpi({ id: "highest-sale", name: "Højeste omsætning", description: "Den højeste omsætning på en enkelt salgsrække", category: "Salg", format: "currency", icon: "revenue", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ profile }) => ({ value: Math.max(...(profile.numericValues.revenue ?? [])), detail: "Højeste registrerede salgsværdi" }) }),
  defineKpi({ id: "lowest-sale", name: "Laveste omsætning", description: "Den laveste omsætning på en enkelt salgsrække", category: "Salg", format: "currency", icon: "revenue", color: "navy", requirements: requirements(["revenue"]), calculate: ({ profile }) => ({ value: Math.min(...(profile.numericValues.revenue ?? [])), detail: "Laveste registrerede salgsværdi" }) }),
  defineKpi({ id: "order-count", name: "Antal ordrer", description: "Antallet af unikke registrerede ordrer", category: "Salg", format: "count", icon: "units", color: "navy", requirements: requirements(["orderId"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "orderId"), detail: "Unikke ordrenumre" }) }),
  defineKpi({ id: "avg-revenue-customer", name: "Gennemsnitlig omsætning pr. kunde", description: "Dokumenteret omsætning divideret med unikke kunde-id'er", category: "Kunder", format: "currency", decimals: 2, icon: "calculator", color: "purple", requirements: requirements(["revenue", "customerId"]), calculate: ({ profile }) => { const groups = documentedCustomerGroups(profile, "revenue"); return { value: ratio(groups.reduce((total, group) => total + group.value, 0), groups.length, "Omsætning pr. kunde"), detail: "Omsætning / unikke kunde-id'er i samme scope" }; } }),
  defineKpi({ id: "best-sales-day", name: "Bedste salgsdag", description: "Dagen med den højeste samlede omsætning", category: "Tid og perioder", level: "recommended", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue", "date"]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "day"), "highest", "Bedste salgsdag"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-sales-week", name: "Bedste uge", description: "Ugen med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "week"], label: "Dato eller uge" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "week"), "highest", "Bedste uge"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-quarter", name: "Bedste kvartal", description: "Kvartalet med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "quarter"], label: "Dato eller kvartal" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "quarter"), "highest", "Bedste kvartal"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "best-year", name: "Bedste år", description: "Året med den højeste samlede omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "year"], label: "Dato eller år" }]), calculate: ({ profile }) => { const best = rankedGroup(periodRevenue(profile, "year"), "highest", "Bedste år"); return { value: best.label, detail: `${best.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "fastest-growth-period", name: "Hurtigste vækstperiode", description: "Største vækst mellem to sammenlignelige hele kalendermåneder", category: "Tid og perioder", level: "advanced", format: "text", icon: "revenue", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context, profile }) => { const best = rankedGroup(monthlyGrowthRates(context, profile), "highest", "Hurtigste vækstperiode"); return { value: best.name, detail: `${(best.value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1 })} % vækst · ${best.label}` }; } }),
  defineKpi({ id: "slowest-period", name: "Langsomste periode", description: "Måneden med den laveste omsætning", category: "Tid og perioder", format: "text", icon: "target", color: "orange", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ profile }) => { const period = rankedGroup(periodRevenue(profile, "month"), "lowest", "Langsomste periode"); return { value: period.label, detail: `${period.value.toLocaleString("da-DK")} kr. i omsætning` }; } }),
  defineKpi({ id: "year-over-year-growth", name: "År-over-år-vækst", description: "Samme sammenhængende måneder i to på hinanden følgende år (YTD ved delår)", category: "Tid og perioder", level: "advanced", format: "percent", decimals: 1, icon: "revenue", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context, profile }) => yearOverYearGrowth(context, profile) }),
  defineKpi({ id: "average-monthly-growth", name: "Gennemsnitlig månedlig vækst", description: "Gennemsnit af sammenlignelige måned-til-måned-vækstrater", category: "Tid og perioder", level: "advanced", format: "percent", decimals: 1, icon: "calculator", color: "green", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context, profile }) => { const rates = monthlyGrowthRates(context, profile); return { value: average(rates.map((rate) => rate.value), "Gennemsnitlig månedlig vækst"), detail: `${rates.length} sammenlignelige månedsskift: ${rates.map((rate) => rate.label).join(", ")}` }; } }),
  defineKpi({ id: "most-profitable-product", name: "Produkt med højeste nettoresultat", description: "Produktet med det højeste dokumenterede nettoresultat", category: "Produkter", level: "recommended", format: "text", icon: "profit", color: "green", requirements: requirements(["product", "netProfit"]), calculate: ({ profile }) => { documentedProductRows(profile, "netProfit"); const product = rankedGroup(groupedSums(profile, "product", "netProfit"), "highest", "Produktets nettoresultat"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} kr. i dokumenteret nettoresultat` }; } }),
  defineKpi({ id: "most-sold-product", name: "Mest solgte produkt", description: "Produktet med flest solgte enheder", category: "Produkter", level: "recommended", format: "text", icon: "units", color: "cyan", requirements: requirements(["product", "units"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "units"), "highest", "Mest solgte produkt"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} solgte enheder` }; } }),
  defineKpi({ id: "least-sold-product", name: "Mindst solgte produkt", description: "Produktet med færrest solgte enheder", category: "Produkter", format: "text", icon: "units", color: "navy", requirements: requirements(["product", "units"]), calculate: ({ profile }) => { const product = rankedGroup(groupedSums(profile, "product", "units"), "lowest", "Mindst solgte produkt"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} solgte enheder` }; } }),
  defineKpi({ id: "fastest-growing-product", name: "Produkt med størst omsætningsvækst", description: "Størst vækst på samme fælles P0/P1-periodepar", category: "Produkter", level: "advanced", format: "text", icon: "revenue", color: "green", requirements: requirements(["product", "revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context, profile }) => fastestGrowingProduct(context, profile) }),
  defineKpi({ id: "highest-margin-product", name: "Produkt med højeste dækningsgrad", description: "Komplet DB / omsætning eller omsætningsvægtet DG på samme produktgrundlag", category: "Produkter", level: "advanced", format: "text", icon: "profit", color: "green", requirements: requirements(["product", "revenue"], [{ fields: ["grossProfit", "grossMargin"], label: "Dækningsbidrag eller dækningsgrad" }]), calculate: ({ context, profile }) => marginProductRanking(context, profile) }),
  defineKpi({ id: "highest-gross-profit-product", name: "Produkt med højeste dækningsbidrag", description: "Produktet med det højeste dokumenterede dækningsbidrag", category: "Produkter", level: "recommended", format: "text", icon: "profit", color: "green", requirements: requirements(["product", "grossProfit"]), calculate: ({ profile }) => { documentedProductRows(profile, "grossProfit"); const product = rankedGroup(groupedSums(profile, "product", "grossProfit"), "highest", "Produktets dækningsbidrag"); return { value: product.name, detail: `${product.value.toLocaleString("da-DK")} kr. i dækningsbidrag` }; } }),
  defineKpi({ id: "product-count", name: "Antal produkter", description: "Antallet af unikke produkter i datagrundlaget", category: "Produkter", format: "count", icon: "units", color: "navy", requirements: requirements(["product"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "product"), detail: "Unikke registrerede produkter" }) }),
  defineKpi({ id: "average-sales-price", name: "Gennemsnitlig salgspris pr. enhed", description: "Samlet omsætning divideret med samlet antal enheder", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["revenue", "units"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.totalUnits, "Gennemsnitlig salgspris"), detail: "Σ omsætning / Σ enheder" }) }),
  defineKpi({ id: "average-unit-cost", name: "Gennemsnitlig variabel kostpris pr. enhed", description: "Dokumenterede variable rækkeomkostninger divideret med antal enheder", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements(["units", "variableCost"]), calculate: ({ context, profile }) => ({ value: documentedVariableUnitCost(context.salesProfile ?? profile), detail: "Σ variable rækkeomkostninger / Σ enheder" }) }),
  defineKpi({ id: "average-revenue-product", name: "Omsætning pr. produkt", description: "Gennemsnitlig omsætning pr. unikt produkt", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["product", "revenue"]), calculate: ({ context, profile }) => ({ value: ratio(context.totalRevenue, uniqueCount(profile, "product"), "Omsætning pr. produkt"), detail: "Gennemsnit pr. unikt produkt" }) }),
  defineKpi({ id: "average-profit-product", name: "Gennemsnitligt nettoresultat pr. produkt", description: "Dokumenteret nettoresultat divideret med antal unikke produkter", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["product", "netProfit"]), calculate: ({ profile }) => { const rows = documentedProductRows(profile, "netProfit"); return { value: ratio(rows.reduce((total, row) => total + rowNumber(row, "netProfit")!, 0), uniqueCount(profile, "product"), "Nettoresultat pr. produkt"), detail: "Σ dokumenteret nettoresultat / antal produkter" }; } }),
  defineKpi({ id: "average-gross-profit-product", name: "Gennemsnitligt dækningsbidrag pr. produkt", description: "Dokumenteret dækningsbidrag divideret med antal unikke produkter", category: "Produkter", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["product", "grossProfit"]), calculate: ({ profile }) => { const rows = documentedProductRows(profile, "grossProfit"); return { value: ratio(rows.reduce((total, row) => total + rowNumber(row, "grossProfit")!, 0), uniqueCount(profile, "product"), "Dækningsbidrag pr. produkt"), detail: "Σ dækningsbidrag / antal produkter" }; } }),
  defineKpi({ id: "new-customers", name: "Nye kunder", description: "Første registrerede køb i valgt periode vurderet mod hele historikken i samme scope", category: "Kunder", level: "advanced", format: "count", icon: "units", color: "green", requirements: requirements(["date", "customerId"]), calculate: ({ context, profile }) => newCustomersInPeriod(context, profile) }),
  defineKpi({ id: "returning-customers", name: "Tilbagevendende kunder", description: "Kunder med mindst to forskellige dokumenterede ordrer", category: "Kunder", format: "count", icon: "units", color: "green", requirements: requirements(["orderId", "customerId"]), calculate: ({ profile }) => { const orders = documentedCustomerOrders(profile); return { value: [...orders.ordersByCustomer.values()].filter((customerOrders) => customerOrders.size >= 2).length, detail: "Mindst to unikke ordre-id'er pr. kunde i det aktuelle scope" }; } }),
  defineKpi({ id: "highest-gross-profit-customer", name: "Kunde med højeste dækningsbidrag", description: "Kunde-id med højeste komplette dokumenterede dækningsbidrag", category: "Kunder", level: "advanced", format: "text", icon: "profit", color: "green", requirements: requirements(["grossProfit", "customerId"]), calculate: ({ profile }) => highestDocumentedCustomer(profile, "grossProfit") }),
  defineKpi({ id: "highest-revenue-customer", name: "Kunde med størst omsætning", description: "Kunde-id med den højeste komplette dokumenterede omsætning", category: "Kunder", format: "text", icon: "revenue", color: "cyan", requirements: requirements(["revenue", "customerId"]), calculate: ({ profile }) => highestDocumentedCustomer(profile, "revenue") }),
  defineKpi({ id: "average-purchases-customer", name: "Gennemsnitligt antal køb pr. kunde", description: "Unikke dokumenterede ordrer divideret med unikke kunde-id'er", category: "Kunder", format: "decimal", decimals: 2, icon: "calculator", color: "purple", requirements: requirements(["orderId", "customerId"]), calculate: ({ profile }) => { const orders = documentedCustomerOrders(profile); return { value: ratio(orders.orderCount, orders.ordersByCustomer.size, "Køb pr. kunde"), detail: "Unikke ordre-id'er / unikke kunde-id'er i det aktuelle scope" }; } }),
  defineKpi({ id: "profit-margin", name: "Profitmargin", description: "Resultat som andel af omsætningen", category: "Indtjening", level: "recommended", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["cost", "grossProfit", "netProfit"], label: "Omkostninger, dækningsbidrag eller resultat" }]), calculate: ({ context }) => ({ value: ratio(documentedResult(context), context.totalRevenue, "Profitmargin"), detail: "Samme resultatgrundlag divideret med omsætning" }) }),
  defineKpi({ id: "ebit", name: "EBIT", description: "Dokumenteret driftsresultat i samme regnskabsperiode og finansielle scope", category: "Indtjening", level: "advanced", format: "currency", icon: "profit", color: "green", requirements: requirements(["operatingProfit"]), calculate: ({ context, profile }) => { const flow = financialFlow(context, profile, "operatingProfit"); return { value: flow.value, detail: `Dokumenteret driftsresultat · ${flow.start} – ${flow.end} · ${flow.currency}` }; } }),
  defineKpi({ id: "ebitda", name: "EBITDA", description: "Dokumenteret EBITDA eller EBIT plus dokumenterede afskrivninger i samme periode", category: "Indtjening", level: "advanced", format: "currency", icon: "profit", color: "green", requirements: requirements([], [{ fields: ["ebitda", "operatingProfit"], label: "EBITDA eller driftsresultat og afskrivninger" }]), calculate: ({ context, profile }) => { const flow = documentedEbitda(context, profile); return { value: flow.value, detail: `Dokumenteret regnskabsperiode · ${flow.start} – ${flow.end}` }; } }),
  defineKpi({ id: "ebitda-margin", name: "EBITDA-margin", description: "Dokumenteret EBITDA / omsætning i samme regnskabsperiode", category: "Indtjening", level: "advanced", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["ebitda", "operatingProfit"], label: "EBITDA eller driftsresultat og afskrivninger" }]), calculate: ({ context, profile }) => { const ebitda = documentedEbitda(context, profile); const revenue = financialFlow(context, profile, "revenue"); matchingFinancialFlows(ebitda, revenue); return { value: ratio(ebitda.value, revenue.value, "EBITDA-margin"), detail: `${ebitda.start} – ${ebitda.end} · ${ebitda.currency}` }; } }),
  defineKpi({ id: "variable-costs", name: "Variable omkostninger", description: "Summen af de registrerede variable omkostninger", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements(["variableCost"]), calculate: ({ profile }) => ({ value: sum(profile, "variableCost"), detail: "Samlede variable omkostninger" }) }),
  defineKpi({ id: "fixed-costs", name: "Faste omkostninger", description: "Summen af de registrerede faste omkostninger", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements(["fixedCost"]), calculate: ({ profile }) => ({ value: sum(profile, "fixedCost"), detail: "Samlede faste omkostninger" }) }),
  defineKpi({ id: "cost-per-unit", name: "Omkostning pr. enhed", description: "Samlede omkostninger divideret med solgte enheder", category: "Indtjening", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements(["units"], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: ratio(documentedCosts(context), context.totalUnits, "Omkostning pr. enhed"), detail: "Omkostninger pr. solgt enhed" }) }),
  defineKpi({ id: "average-profit-order", name: "Gennemsnitlig profit pr. ordre", description: "Resultat divideret med unikke ordrer", category: "Indtjening", level: "advanced", format: "currency", decimals: 2, icon: "calculator", color: "green", requirements: requirements(["orderId"], [{ fields: ["grossProfit", "netProfit", "cost"], label: "Dækningsbidrag, resultat eller omkostninger" }]), calculate: ({ context, profile }) => ({ value: ratio(documentedResult(context), uniqueCount(profile, "orderId"), "Profit pr. ordre"), detail: "Gennemsnitligt dokumenteret resultat pr. ordre" }) }),
  defineKpi({ id: "budget-variance-percent", name: "Budgetafvigelse %", description: "Omsætningsafvigelsen målt i procent af budgettet", category: "Budget", format: "percent", decimals: 1, icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: ratio(context.revenueVsBudget, context.budgetRevenue, "Budgetafvigelse"), detail: "Afvigelse i procent af budgettet" }) }),
  defineKpi({ id: "budget-attainment", name: "Budgetopfyldelse %", description: "Faktisk omsætning som andel af budgettet", category: "Budget", level: "recommended", format: "percent", decimals: 1, icon: "target", color: "green", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: ratio(context.totalRevenue, context.budgetRevenue, "Budgetopfyldelse"), detail: "Andel af omsætningsbudgettet realiseret" }) }),
  defineKpi({ id: "budget-vs-result", name: "Budget mod resultat", description: "Forskellen mellem faktisk og budgetteret resultat", category: "Budget", level: "advanced", format: "currency", icon: "target", color: "orange", requirements: requirements(["budgetRevenue", "budgetCosts"], [{ fields: ["cost", "grossProfit", "netProfit"], label: "Omkostninger, dækningsbidrag eller resultat" }]), calculate: ({ context }) => ({ value: documentedResult(context) - context.budgetResult, detail: "Faktisk resultat minus budgetteret resultat" }) }),
  defineKpi({ id: "over-budget-status", name: "Over budget", description: "Viser om omsætningen ligger over det budgetterede niveau", category: "Budget", format: "text", icon: "target", color: "green", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget > 0 ? "Ja" : "Nej", detail: context.revenueVsBudget > 0 ? "Omsætningen ligger over budgettet" : "Omsætningen ligger ikke over budgettet" }) }),
  defineKpi({ id: "under-budget-status", name: "Under budget", description: "Viser om omsætningen ligger under det budgetterede niveau", category: "Budget", format: "text", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget < 0 ? "Ja" : "Nej", detail: context.revenueVsBudget < 0 ? "Omsætningen ligger under budgettet" : "Omsætningen ligger ikke under budgettet" }) }),
  defineKpi({ id: "cash-ratio", name: "Cash Ratio", description: "Likvide beholdninger / kortfristet gæld på samme balancedato", category: "Likviditet", level: "advanced", format: "decimal", decimals: 2, icon: "calculator", color: "cyan", requirements: requirements(["cash", "currentLiabilities"]), calculate: ({ context, profile }) => financialStockRatio(context, profile, "cash", "currentLiabilities", "Cash Ratio") }),
  defineKpi({ id: "asset-turnover", name: "Aktivernes omsætningshastighed", description: "Periodens omsætning / gennemsnitlige aktiver ved periodens start og slut", category: "Finansielle nøgletal", level: "advanced", format: "decimal", decimals: 2, icon: "calculator", color: "navy", requirements: requirements(["revenue", "assets"]), calculate: ({ context, profile }) => financialReturn(context, profile, "revenue", "assets", "Aktivernes omsætningshastighed") }),
  defineKpi({ id: "average-inventory-value", name: "Gennemsnitlig lagerværdi", description: "Gennemsnit af komplette snapshot-totaler i det valgte scope", category: "Lager", format: "currency", decimals: 2, icon: "calculator", color: "orange", requirements: requirements(["inventoryValue"]), calculate: ({ context, profile }) => { const basis = averageInventory(context, profile); return { value: basis.value, detail: `Gennemsnit af ${basis.snapshots.length} komplette snapshots` }; } }),
  defineKpi({ id: "inventory-days", name: "Lagerdage", description: "Faktiske kalenderdage i perioden / lageromsætningshastighed", category: "Lager", level: "advanced", format: "decimal", decimals: 1, icon: "calculator", color: "orange", requirements: requirements(["cogs", "inventoryValue"]), calculate: ({ context, profile }) => { const basis = inventoryTurnoverBasis(context, profile); return { value: ratio(basis.days, basis.value, "Lagerdage"), detail: `${basis.days} kalenderdage / lageromsætningshastighed · ${basis.detail}` }; } }),
  defineKpi({ id: "inventory-item-count", name: "Antal varer på lager", description: "Summen af lagerantal på seneste komplette snapshotdato", category: "Lager", format: "integer", icon: "units", color: "navy", requirements: requirements(["inventoryQuantity"]), calculate: ({ context, profile }) => { const snapshot = latestSnapshot(context, profile, "inventoryQuantity"); return { value: snapshot.total, detail: `Seneste komplette lagersnapshot · ${snapshot.date}` }; } }),
  defineKpi({ id: "lowest-inventory", name: "Laveste lager", description: "Medlem med lavest lagerantal på seneste komplette snapshot", category: "Lager", format: "text", icon: "units", color: "orange", requirements: requirements(["inventoryQuantity"]), calculate: ({ context, profile }) => inventoryExtremum(context, profile, "lowest") }),
  defineKpi({ id: "highest-inventory", name: "Højeste lager", description: "Medlem med højest lagerantal på seneste komplette snapshot", category: "Lager", format: "text", icon: "units", color: "navy", requirements: requirements(["inventoryQuantity"]), calculate: ({ context, profile }) => inventoryExtremum(context, profile, "highest") }),
];

const standardKpiDefinitionMap = new Map(
  standardKpiDefinitions.map((definition) => [definition.id, definition]),
);

const registeredKpiAliases: Record<string, string> = {
  "ebit-margin": "operating-margin",
  "highest-revenue-product": "best-product",
  "gross-profit-margin": "gross-margin",
  "most-profitable-customer": "highest-gross-profit-customer",
  "avg-revenue-unit": "average-sales-price",
  "sales-count": "row-count",
  "month-over-month-growth": "revenue-growth",
  "budget-variance": "revenue-vs-budget",
  "gross-profit-total": "gross-profit",
};

export function isRetiredRegisteredKpiId(id: string) {
  return id === "inventory-binding";
}

export function canonicalRegisteredKpiId(id: string) {
  return registeredKpiAliases[id] ?? id;
}

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
  if (isRetiredRegisteredKpiId(id)) {
    const reason = "Lagerbinding er ikke selvstændigt defineret og er fjernet fra KPI-biblioteket.";
    return { available: false, value: null, detail: reason, reason };
  }
  const canonicalId = canonicalRegisteredKpiId(id);
  const definition = standardKpiDefinitionMap.get(canonicalId);
  if (!definition) return { available: false, value: null, detail: "Ukendt nøgletal", reason: "Ukendt nøgletal" };
  const status = requirementStatus(definition, profile);
  const usesDocumentedCost = id === "total-costs" || id === "result" || id === "profit-margin";
  if (usesDocumentedCost && context.totalCosts === null) {
    const reason = context.costBasis?.reason ?? "Samlede omkostninger er ikke dokumenteret i den aktuelle visning.";
    return { available: false, value: null, detail: reason, reason, missingFields: [], matchedFields: status.matched };
  }
  const missing = usesDocumentedCost && context.totalCosts !== null
    ? status.missing.filter((field) => field === kpiFieldRegistry.revenue.label)
    : status.missing;
  if (missing.length) {
    const reason = missing.length === 1
      ? `Mangler kolonnen '${missing[0]}'`
      : `Mangler: ${missing.join(" og ")}`;
    return { available: false, value: null, detail: reason, reason, missingFields: missing, matchedFields: status.matched };
  }
  try {
    const result = definition.calculate({ context, profile });
    if (typeof result.value === "number" && !isFiniteNumber(result.value)) {
      throw new Error("Beregningen gav ikke et gyldigt endeligt tal.");
    }
    return { available: true, value: result.value, detail: result.detail, missingFields: [], matchedFields: status.matched };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Beregningen kunne ikke udføres.";
    return { available: false, value: null, detail: reason, reason, missingFields: [], matchedFields: status.matched };
  }
}

export function evaluateRegisteredKpis(
  ids: Iterable<string>,
  context: StandardKpiContext,
  profile: KpiDataProfile,
) {
  const evaluations: Record<string, KpiEvaluation> = {};
  new Set(ids).forEach((id) => {
    evaluations[id] = evaluateRegisteredKpi(id, context, profile);
  });
  return evaluations;
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
    Lager: ["Lagerværdi", "Lagerantal", "Snapshotdato"],
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
