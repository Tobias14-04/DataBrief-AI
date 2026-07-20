import type {
  KpiColor,
  KpiDefinition,
  KpiEvaluation,
  KpiFormat,
  KpiIcon,
  KpiSourceRow,
  StandardKpiContext,
} from "./kpi-customization";

export type KpiCategory =
  | "Salg"
  | "Indtjening"
  | "Budget"
  | "Produkter og perioder"
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
  | "orderId"
  | "customerId"
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
  | "netProfit";

type KpiFieldDefinition = {
  label: string;
  aliases: string[];
};

export const kpiFieldRegistry: Record<KpiDataField, KpiFieldDefinition> = {
  revenue: {
    label: "Omsætning",
    aliases: ["omsætning", "omsætning i alt", "nettoomsætning", "revenue", "sales", "net sales", "total sales", "sales amount", "salg", "salg i alt"],
  },
  units: {
    label: "Antal",
    aliases: ["antal", "units", "quantity", "qty", "solgt antal", "quantity sold", "stk", "pieces"],
  },
  grossProfit: {
    label: "Dækningsbidrag eller bruttofortjeneste",
    aliases: ["dækningsbidrag", "gross profit", "contribution margin", "bruttofortjeneste", "bruttoresultat"],
  },
  grossMargin: {
    label: "Dækningsgrad",
    aliases: ["dækningsgrad", "gross margin", "gross margin %", "margin %", "db %"],
  },
  cost: {
    label: "Omkostninger",
    aliases: ["omkostning", "omkostninger", "cost", "costs", "cogs", "cost of goods sold", "vareforbrug", "kostpris", "produktomkostning", "produktomkostninger", "total cost"],
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
    aliases: ["produkt", "product", "varenavn", "vare", "item", "item name", "product name", "sku"],
  },
  category: {
    label: "Kategori",
    aliases: ["kategori", "category", "produktkategori", "product category", "varegruppe", "segment"],
  },
  date: {
    label: "Dato",
    aliases: ["dato", "date", "salgsdato", "order date", "transaction date", "fakturadato"],
  },
  month: {
    label: "Måned",
    aliases: ["måned", "month", "periode", "period"],
  },
  orderId: {
    label: "Ordre-id",
    aliases: ["ordre-id", "ordre id", "ordrenummer", "order id", "order number", "invoice id", "fakturanummer"],
  },
  customerId: {
    label: "Kunde-id",
    aliases: ["kunde-id", "kunde id", "kundenummer", "customer id", "customer number", "client id", "account id"],
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
};

type KpiCalculationResult = {
  value: number | string;
  detail: string;
};

export type RegisteredKpiDefinition = KpiDefinition & {
  category: KpiCategory;
  requirements: KpiRequirement[];
  status: "dynamic";
  calculate: (input: { context: StandardKpiContext; profile: KpiDataProfile }) => KpiCalculationResult;
};

function normalizeColumnName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("da-DK")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

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

  return { columns, matchedColumns, rawValues, numericValues };
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
    requirements: definition.requirements ?? [],
    ...definition,
  };
}

export const standardKpiDefinitions: RegisteredKpiDefinition[] = [
  defineKpi({ id: "total-revenue", name: "Samlet omsætning", description: "Summen af den registrerede omsætning", category: "Salg", placement: "primary", format: "currency", icon: "revenue", color: "cyan", requirements: requirements(["revenue"]), calculate: ({ context }) => ({ value: context.totalRevenue, detail: "Beregnet ud fra omsætningskolonnen" }) }),
  defineKpi({ id: "total-units", name: "Samlet antal solgte enheder", description: "Summen af den registrerede antalskolonne", category: "Salg", placement: "primary", format: "integer", icon: "units", color: "navy", requirements: requirements(["units"]), calculate: ({ context }) => ({ value: context.totalUnits, detail: "Beregnet ud fra antalskolonnen" }) }),
  defineKpi({ id: "gross-profit", name: "Dækningsbidrag", description: "Omsætning efter variable omkostninger", category: "Indtjening", placement: "primary", format: "currency", icon: "profit", color: "green", requirements: requirements(["grossProfit"]), calculate: ({ context }) => ({ value: context.totalGrossProfit, detail: "Beregnet ud fra dækningsbidraget" }) }),
  defineKpi({ id: "gross-margin", name: "Dækningsgrad", description: "Dækningsbidrag som andel af omsætningen", category: "Indtjening", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["grossProfit", "grossMargin"], label: "Dækningsbidrag eller dækningsgrad" }]), calculate: ({ context }) => ({ value: context.grossMargin, detail: "Beregnet ud fra dækningsdata" }) }),
  defineKpi({ id: "total-costs", name: "Samlede omkostninger", description: "Registrerede omkostninger i den aktuelle visning", category: "Indtjening", format: "currency", icon: "target", color: "orange", requirements: requirements([], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: context.totalCosts, detail: "Beregnet ud fra omkostningsdata" }) }),
  defineKpi({ id: "result", name: "Resultat", description: "Omsætning minus registrerede omkostninger", category: "Indtjening", format: "currency", icon: "profit", color: "green", requirements: requirements(["revenue"], [{ fields: ["cost", "grossProfit"], label: "Omkostninger eller dækningsbidrag" }]), calculate: ({ context }) => ({ value: context.actualResult, detail: "Omsætning minus omkostninger" }) }),
  defineKpi({ id: "revenue-vs-budget", name: "Omsætning mod budget", description: "Forskel mellem faktisk og budgetteret omsætning", category: "Budget", placement: "primary", format: "currency", icon: "target", color: "orange", requirements: requirements(["revenue", "budgetRevenue"]), calculate: ({ context }) => ({ value: context.revenueVsBudget, detail: "Faktisk omsætning sammenholdt med budget" }) }),
  defineKpi({ id: "best-product", name: "Bedste produkt", description: "Produktet med den højeste omsætning", category: "Produkter og perioder", format: "text", icon: "units", color: "navy", requirements: requirements(["product", "revenue"]), calculate: ({ context }) => { if (!context.bestProduct) throw new Error("Ingen produkter i den aktuelle visning."); return { value: context.bestProduct.name, detail: "Produktet med den højeste omsætning" }; } }),
  defineKpi({ id: "best-category", name: "Bedste kategori", description: "Kategorien med den højeste omsætning", category: "Produkter og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["category", "revenue"]), calculate: ({ context }) => { if (!context.bestCategory) throw new Error("Ingen kategorier i den aktuelle visning."); return { value: context.bestCategory.name, detail: "Kategorien med den højeste omsætning" }; } }),
  defineKpi({ id: "best-month", name: "Bedste måned", description: "Måneden med den højeste omsætning", category: "Produkter og perioder", format: "text", icon: "target", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => { if (!context.bestMonth) throw new Error("Ingen måneder i den aktuelle visning."); return { value: context.bestMonth.name, detail: "Måneden med den højeste omsætning" }; } }),
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
  defineKpi({ id: "operating-margin", name: "Overskudsgrad", description: "Driftsresultat som andel af omsætningen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["operatingProfit", "revenue"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "operatingProfit"), sum(profile, "revenue"), "Overskudsgrad"), detail: "Driftsresultat divideret med omsætning" }) }),
  defineKpi({ id: "return-on-assets", name: "Afkastningsgrad (ROA)", description: "Årets resultat i forhold til de samlede aktiver", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "assets"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "netProfit"), sum(profile, "assets"), "Afkastningsgrad"), detail: "Årets resultat divideret med aktiver" }) }),
  defineKpi({ id: "return-on-equity", name: "Egenkapitalens forrentning (ROE)", description: "Årets resultat i forhold til egenkapitalen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "equity"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "netProfit"), sum(profile, "equity"), "Egenkapitalens forrentning"), detail: "Årets resultat divideret med egenkapital" }) }),
  defineKpi({ id: "gross-profit-margin", name: "Bruttoavance", description: "Bruttofortjeneste som andel af omsætningen", category: "Indtjening", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["grossProfit", "revenue"]), calculate: ({ profile, context }) => ({ value: ratio(context.totalGrossProfit || sum(profile, "grossProfit"), context.totalRevenue || sum(profile, "revenue"), "Bruttoavance"), detail: "Bruttofortjeneste divideret med omsætning" }) }),
  defineKpi({ id: "net-margin", name: "Nettomargin", description: "Årets resultat som andel af omsætningen", category: "Rentabilitet", format: "percent", decimals: 1, icon: "profit", color: "green", requirements: requirements(["netProfit", "revenue"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "netProfit"), sum(profile, "revenue"), "Nettomargin"), detail: "Årets resultat divideret med omsætning" }) }),
  defineKpi({ id: "working-capital", name: "Arbejdskapital", description: "Omsætningsaktiver minus kortfristet gæld", category: "Likviditet", format: "currency", icon: "calculator", color: "cyan", requirements: requirements(["currentAssets", "currentLiabilities"]), calculate: ({ profile }) => ({ value: sum(profile, "currentAssets") - sum(profile, "currentLiabilities"), detail: "Omsætningsaktiver minus kortfristet gæld" }) }),
  defineKpi({ id: "revenue-growth", name: "Omsætningsvækst", description: "Udviklingen fra første til seneste registrerede periode", category: "Salg", format: "percent", decimals: 1, icon: "revenue", color: "cyan", requirements: requirements(["revenue"], [{ fields: ["date", "month"], label: "Dato eller måned" }]), calculate: ({ context }) => { const periods = context.monthlyRevenue ?? []; if (periods.length < 2) throw new Error("Omsætningsvækst kræver mindst to perioder."); return { value: ratio(periods.at(-1)! - periods[0], periods[0], "Omsætningsvækst"), detail: "Udvikling fra første til seneste periode" }; } }),
  defineKpi({ id: "inventory-value", name: "Lagerværdi", description: "Den samlede registrerede værdi af lageret", category: "Lager", format: "currency", icon: "units", color: "orange", requirements: requirements(["inventory"]), calculate: ({ profile }) => ({ value: sum(profile, "inventory"), detail: "Summen af den registrerede lagerværdi" }) }),
  defineKpi({ id: "inventory-turnover", name: "Lageromsætningshastighed", description: "Vareforbrug i forhold til lagerværdien", category: "Lager", format: "decimal", decimals: 2, icon: "units", color: "orange", requirements: requirements(["cost", "inventory"]), calculate: ({ profile }) => ({ value: ratio(sum(profile, "cost"), sum(profile, "inventory"), "Lageromsætningshastighed"), detail: "Vareforbrug divideret med lagerværdi" }) }),
  defineKpi({ id: "customer-count", name: "Antal kunder", description: "Antallet af unikke kunder i datagrundlaget", category: "Kunder", format: "count", icon: "units", color: "navy", requirements: requirements(["customerId"]), calculate: ({ profile }) => ({ value: uniqueCount(profile, "customerId"), detail: "Unikke registrerede kunder" }) }),
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
    Budget: ["Budgetteret omsætning", "Budgetterede omkostninger"],
    "Finansielle nøgletal": ["Egenkapital", "Aktiver", "Rentebærende gæld", "Forpligtelser"],
    Likviditet: ["Omsætningsaktiver", "Kortfristet gæld", "Likvide beholdninger", "Tilgodehavender"],
    Rentabilitet: ["Driftsresultat", "Årets resultat", "Aktiver", "Egenkapital"],
    Lager: ["Lager"],
    Kunder: ["Ordre-id", "Kunde-id"],
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
