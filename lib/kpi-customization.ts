import {
  evaluateRegisteredKpi,
  type KpiCategory,
  type KpiDataProfile,
} from "./kpi-registry.ts";

export {
  buildKpiDataProfile,
  kpiFieldRegistry,
  matchKpiField,
  relevantKpiCategories,
  scoreKpiHeaders,
  standardKpiDefinitions,
  type KpiCategory,
  type KpiDataField,
  type KpiDataProfile,
  type RegisteredKpiDefinition,
} from "./kpi-registry.ts";

export const KPI_CONFIG_VERSION = 1;
export const MAX_PRIMARY_KPIS = 4;
export const MIN_PRIMARY_KPIS = 2;
export const MAX_SECONDARY_KPIS = 6;

export type KpiPlacement = "primary" | "secondary";
export type KpiLevel = "recommended" | "standard" | "advanced";
export type KpiFormat = "currency" | "percent" | "integer" | "decimal" | "count" | "text";
export type KpiColor = "cyan" | "green" | "orange" | "navy" | "purple";
export type KpiIcon = "revenue" | "profit" | "target" | "units" | "calculator";
export type AggregateFunction = "SUM" | "AVG" | "COUNT" | "COUNT_UNIQUE" | "MIN" | "MAX";
export type FormulaOperator = "+" | "-" | "*" | "/";

export type KpiFormula =
  | { type: "aggregate"; function: AggregateFunction; column: string }
  | { type: "number"; value: number }
  | { type: "binary"; operator: FormulaOperator; left: KpiFormula; right: KpiFormula };

export type KpiDefinition = {
  id: string;
  name: string;
  description: string;
  placement: KpiPlacement;
  format: KpiFormat;
  decimals: 0 | 1 | 2;
  icon: KpiIcon;
  color: KpiColor;
  category?: KpiCategory;
  level?: KpiLevel;
  requiredFields?: string[];
  formula?: KpiFormula;
  isCustom: boolean;
};

export type KpiConfiguration = {
  version: 1;
  primaryKpis: string[];
  secondaryKpis: string[];
  customKpis: KpiDefinition[];
};

export type KpiSourceRow = {
  sourceValues: Record<string, unknown>;
};

export type StandardKpiContext = {
  totalRevenue: number;
  totalUnits: number;
  totalGrossProfit: number;
  grossMargin: number;
  totalCosts: number;
  actualResult: number;
  revenueVsBudget: number;
  budgetRevenue: number;
  budgetCosts: number;
  budgetResult: number;
  rowCount: number;
  hasGrossProfit: boolean;
  hasGrossMargin: boolean;
  hasCosts: boolean;
  hasBudget: boolean;
  bestProduct?: { name: string; revenue: number };
  bestCategory?: { name: string; revenue: number };
  bestMonth?: { name: string; revenue: number };
  orderCount?: number;
  monthlyRevenue?: number[];
};

export type KpiEvaluation = {
  available: boolean;
  value: number | string | null;
  detail: string;
  reason?: string;
  missingFields?: string[];
  matchedFields?: string[];
};

export function defaultKpiConfiguration(context: Pick<StandardKpiContext, "hasBudget" | "hasGrossProfit" | "hasGrossMargin" | "hasCosts">): KpiConfiguration {
  const profitKpi = context.hasGrossProfit ? "gross-profit" : context.hasCosts ? "result" : context.hasGrossMargin ? "gross-margin" : "avg-revenue-row";
  const fourthKpi = context.hasBudget ? "revenue-vs-budget" : context.hasGrossMargin || context.hasGrossProfit ? "gross-margin" : "row-count";
  const primaryKpis = ["total-revenue", profitKpi, fourthKpi, "total-units"].filter((id, index, values) => values.indexOf(id) === index);
  const secondaryKpis = ["best-product", "best-category", "best-month"];
  if (context.hasCosts) secondaryKpis.push("total-costs", "result");

  return {
    version: KPI_CONFIG_VERSION,
    primaryKpis: primaryKpis.slice(0, MAX_PRIMARY_KPIS),
    secondaryKpis: secondaryKpis.slice(0, MAX_SECONDARY_KPIS),
    customKpis: [],
  };
}

export function evaluateStandardKpi(
  id: string,
  context: StandardKpiContext,
  profile: KpiDataProfile,
): KpiEvaluation {
  return evaluateRegisteredKpi(id, context, profile);
}

function toNumericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "")
    : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return value.includes("%") ? parsed / 100 : parsed;
}

export function getNumericColumns(rows: KpiSourceRow[]) {
  const columns = new Map<string, { populated: number; numeric: number }>();
  rows.forEach((row) => {
    Object.entries(row.sourceValues).forEach(([column, value]) => {
      if (value === "" || value === null || value === undefined) return;
      const status = columns.get(column) ?? { populated: 0, numeric: 0 };
      status.populated += 1;
      if (toNumericValue(value) !== null) status.numeric += 1;
      columns.set(column, status);
    });
  });
  return Array.from(columns.entries())
    .filter(([, status]) => status.populated > 0 && status.numeric === status.populated)
    .map(([column]) => column)
    .sort((a, b) => a.localeCompare(b, "da"));
}

function evaluateAggregate(formula: Extract<KpiFormula, { type: "aggregate" }>, rows: KpiSourceRow[]): number {
  const columnExists = rows.some((row) => Object.prototype.hasOwnProperty.call(row.sourceValues, formula.column));
  if (!columnExists) throw new Error(`Dette nøgletal bruger kolonnen ‘${formula.column}’, som ikke findes i den aktuelle fil.`);
  const populatedValues = rows
    .map((row) => row.sourceValues[formula.column])
    .filter((value) => value !== "" && value !== null && value !== undefined);
  const numericValues = populatedValues.map(toNumericValue).filter((value): value is number => value !== null);
  if (populatedValues.length && numericValues.length !== populatedValues.length) {
    throw new Error(`Kolonnen ‘${formula.column}’ kan ikke bruges med ${formula.function}, da den ikke indeholder numeriske værdier.`);
  }
  if (!numericValues.length) return 0;
  switch (formula.function) {
    case "SUM": return numericValues.reduce((sum, value) => sum + value, 0);
    case "AVG": return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
    case "COUNT": return numericValues.length;
    case "COUNT_UNIQUE": return new Set(numericValues).size;
    case "MIN": return Math.min(...numericValues);
    case "MAX": return Math.max(...numericValues);
  }
}

export function evaluateFormula(formula: KpiFormula, rows: KpiSourceRow[], depth = 0): number {
  if (depth > 8) throw new Error("Formlen er for kompleks.");
  if (!formula || typeof formula !== "object") throw new Error("Formlen er ugyldig.");
  if (formula.type === "number") {
    if (!Number.isFinite(formula.value)) throw new Error("Formlen indeholder et ugyldigt tal.");
    return formula.value;
  }
  if (formula.type === "aggregate") return evaluateAggregate(formula, rows);
  if (formula.type !== "binary" || !["+", "-", "*", "/"].includes(formula.operator)) throw new Error("Formlen er ugyldig.");
  const left = evaluateFormula(formula.left, rows, depth + 1);
  const right = evaluateFormula(formula.right, rows, depth + 1);
  if (formula.operator === "/" && right === 0) throw new Error("Beregningen kan ikke udføres, fordi nævneren er 0 i den aktuelle visning.");
  if (formula.operator === "+") return left + right;
  if (formula.operator === "-") return left - right;
  if (formula.operator === "*") return left * right;
  return left / right;
}

export function formulaToText(formula: KpiFormula): string {
  if (formula.type === "number") return String(formula.value);
  if (formula.type === "aggregate") return `${formula.function}(${formula.column})`;
  return `(${formulaToText(formula.left)} ${formula.operator} ${formulaToText(formula.right)})`;
}

export function formulaToDanishText(formula: KpiFormula): string {
  const aggregateNames: Record<AggregateFunction, string> = {
    SUM: "summen af",
    AVG: "gennemsnittet af",
    COUNT: "antallet af værdier i",
    COUNT_UNIQUE: "antallet af unikke værdier i",
    MIN: "den laveste værdi i",
    MAX: "den højeste værdi i",
  };
  const operatorNames: Record<FormulaOperator, string> = {
    "+": "plus",
    "-": "minus",
    "*": "ganget med",
    "/": "divideret med",
  };

  if (formula.type === "number") return new Intl.NumberFormat("da-DK").format(formula.value);
  if (formula.type === "aggregate") return `${aggregateNames[formula.function]} ${formula.column}`;
  return `${formulaToDanishText(formula.left)} ${operatorNames[formula.operator]} ${formulaToDanishText(formula.right)}`;
}

export function formatNumber(value: number | string, format: KpiFormat, decimals: number) {
  if (typeof value === "string" || format === "text") return String(value);
  if (format === "currency") {
    return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  if (format === "percent") {
    return new Intl.NumberFormat("da-DK", { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  return new Intl.NumberFormat("da-DK", { minimumFractionDigits: format === "decimal" ? decimals : 0, maximumFractionDigits: decimals }).format(value);
}

export function parseStoredKpiConfiguration(value: string | null): KpiConfiguration | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== KPI_CONFIG_VERSION || !Array.isArray(record.primaryKpis) || !Array.isArray(record.secondaryKpis) || !Array.isArray(record.customKpis)) return null;
    return {
      version: KPI_CONFIG_VERSION,
      primaryKpis: record.primaryKpis.filter((id): id is string => typeof id === "string").slice(0, MAX_PRIMARY_KPIS),
      secondaryKpis: record.secondaryKpis.filter((id): id is string => typeof id === "string").slice(0, MAX_SECONDARY_KPIS),
      customKpis: record.customKpis.filter(isKpiDefinition),
    };
  } catch {
    return null;
  }
}

function isKpiDefinition(value: unknown): value is KpiDefinition {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.description === "string" &&
    record.isCustom === true &&
    (record.placement === "primary" || record.placement === "secondary") &&
    ["currency", "percent", "integer", "decimal", "count"].includes(String(record.format)) &&
    [0, 1, 2].includes(Number(record.decimals)) &&
    ["revenue", "profit", "target", "units", "calculator"].includes(String(record.icon)) &&
    ["cyan", "green", "orange", "navy", "purple"].includes(String(record.color)) &&
    isKpiFormula(record.formula)
  );
}

function isKpiFormula(value: unknown, depth = 0): value is KpiFormula {
  if (!value || typeof value !== "object" || depth > 8) return false;
  const record = value as Record<string, unknown>;
  if (record.type === "number") return typeof record.value === "number" && Number.isFinite(record.value);
  if (record.type === "aggregate") {
    return ["SUM", "AVG", "COUNT", "COUNT_UNIQUE", "MIN", "MAX"].includes(String(record.function)) && typeof record.column === "string" && record.column.length > 0;
  }
  return record.type === "binary" && ["+", "-", "*", "/"].includes(String(record.operator)) && isKpiFormula(record.left, depth + 1) && isKpiFormula(record.right, depth + 1);
}

export function normalizeKpiConfiguration(config: KpiConfiguration, availableIds: Set<string>, defaults: KpiConfiguration) {
  const primary = config.primaryKpis.filter((id, index, ids) => availableIds.has(id) && ids.indexOf(id) === index).slice(0, MAX_PRIMARY_KPIS);
  for (const id of defaults.primaryKpis) {
    if (primary.length >= MIN_PRIMARY_KPIS) break;
    if (availableIds.has(id) && !primary.includes(id)) primary.push(id);
  }
  const secondary = config.secondaryKpis
    .filter((id, index, ids) => availableIds.has(id) && !primary.includes(id) && ids.indexOf(id) === index)
    .slice(0, MAX_SECONDARY_KPIS);
  return { ...config, primaryKpis: primary, secondaryKpis: secondary };
}
