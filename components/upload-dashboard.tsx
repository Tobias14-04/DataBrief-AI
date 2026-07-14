"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChangeEvent, useMemo, useState } from "react";

type SaleRow = {
  date: Date | null;
  month: string;
  product: string;
  category: string;
  channel: string;
  region: string;
  revenue: number;
  units: number;
  grossProfit: number | null;
  grossMargin: number | null;
  cost: number | null;
};

type GroupedValue = {
  name: string;
  revenue: number;
  units: number;
  grossProfit: number;
  cost: number;
};

type MonthValue = GroupedValue & {
  sortKey: number;
};

type OptionalSheetSummary = {
  sheetName: string;
  total: number;
  byCategory: GroupedValue[];
};

type BudgetSummary = {
  sheetName: string;
  revenue: number;
  costs: number;
  result: number;
};

type DashboardFilterKey = "month" | "product" | "category" | "channel" | "region";
type DashboardFilters = Record<DashboardFilterKey, string>;

type MappingStatus = "success" | "warning" | "manual";

type MappingFeedback = {
  salesSheetName: string;
  detectedSheets: string[];
  headerRow: number;
  mappedColumns: Record<string, string>;
  optionalColumns: Record<string, string>;
  revenueSource: string;
  status: MappingStatus;
  warnings: string[];
  costs?: OptionalSheetSummary;
  budget?: BudgetSummary;
};

type ParseResult = {
  rows: SaleRow[];
  fileName: string;
  feedback: MappingFeedback;
};

type FieldKey =
  | "date"
  | "month"
  | "product"
  | "category"
  | "channel"
  | "region"
  | "units"
  | "netRevenue"
  | "grossRevenue"
  | "revenue"
  | "grossProfit"
  | "grossMargin"
  | "cost"
  | "unitPrice";

type RequiredManualField = "dateOrMonth" | "product" | "category" | "units" | "revenue";
type OptionalManualField = "cost" | "grossProfit" | "grossMargin";
type ManualField = RequiredManualField | OptionalManualField;
type FieldMappings = Partial<Record<FieldKey, string>>;
type ManualMappings = Record<ManualField, string>;

type SheetCandidate = {
  name: string;
  rows: unknown[][];
  headers: string[];
  headerIndex: number;
  mappings: FieldMappings;
  score: number;
  confidence: number;
  missingFields: string[];
};

type WorkbookAnalysis = {
  fileName: string;
  detectedSheets: string[];
  candidates: SheetCandidate[];
  costs?: OptionalSheetSummary;
  budget?: BudgetSummary;
};

const emptyManualMappings: ManualMappings = {
  dateOrMonth: "",
  product: "",
  category: "",
  units: "",
  revenue: "",
  cost: "",
  grossProfit: "",
  grossMargin: "",
};

const emptyDashboardFilters: DashboardFilters = {
  month: "",
  product: "",
  category: "",
  channel: "",
  region: "",
};

const chartCardClass =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(16,32,51,0.055)]";
const chartTooltipStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 14px 36px rgba(16,32,51,0.14)",
  color: "#102033",
  fontSize: "12px",
};

const fieldLabels: Record<FieldKey, string> = {
  date: "Dato",
  month: "Måned",
  product: "Produkt",
  category: "Kategori",
  channel: "Kanal",
  region: "Region",
  units: "Antal",
  netRevenue: "Nettoomsætning",
  grossRevenue: "Bruttoomsætning",
  revenue: "Omsætning",
  grossProfit: "Dækningsbidrag",
  grossMargin: "Dækningsgrad",
  cost: "Omkostning",
  unitPrice: "Pris pr. enhed",
};

const aliases: Record<FieldKey, string[]> = {
  date: ["date", "dato", "salgsdato", "order date", "transaction date", "fakturadato"],
  month: ["month", "maaned", "m\u00e5ned", "periode", "period"],
  product: ["product", "produkt", "varenavn", "item", "item name", "product name", "sku", "vare"],
  category: ["category", "kategori", "produktkategori", "product category", "varegruppe", "segment"],
  channel: ["channel", "kanal", "sales channel", "salgskanal", "order channel"],
  region: ["region", "omraade", "omr\u00e5de", "district", "territory", "sales region", "salgsregion"],
  units: ["units", "antal", "quantity", "qty", "solgt antal", "quantity sold", "stk", "pieces"],
  netRevenue: ["nettoomsaetning", "nettooms\u00e6tning", "net revenue"],
  grossRevenue: ["bruttoomsaetning", "bruttooms\u00e6tning", "gross revenue"],
  revenue: [
    "omsaetning",
    "oms\u00e6tning",
    "revenue",
    "sales",
    "salg",
    "total sales",
    "amount",
    "beloeb",
    "bel\u00f8b",
    "sales amount",
    "salg ekskl moms",
    "salg inkl moms",
    "budget revenue",
    "budget omsaetning",
    "budget oms\u00e6tning",
  ],
  grossProfit: [
    "daekningsbidrag",
    "d\u00e6kningsbidrag",
    "gross profit",
    "contribution margin",
    "profit",
    "bruttofortjeneste",
  ],
  grossMargin: ["daekningsgrad", "d\u00e6kningsgrad", "gross margin", "margin", "margin %", "db %"],
  cost: [
    "omkostninger",
    "omkostning",
    "cost",
    "costs",
    "vareforbrug",
    "cogs",
    "cost of goods sold",
    "kostpris",
    "kostpris pr stk",
    "kostpris pr. stk.",
    "total cost",
    "budget costs",
    "budget cost",
    "budget omkostninger",
  ],
  unitPrice: ["price", "unit price", "pris", "pris pr stk", "pris pr. stk.", "sales price"],
};

const demoProducts = [
  { product: "Morgenmenu", category: "Menu", price: 96, unitCost: 39, baseUnits: 42 },
  { product: "Kyllingesandwich", category: "Sandwich", price: 84, unitCost: 34, baseUnits: 38 },
  { product: "Caf\u00e9 latte", category: "Drikke", price: 46, unitCost: 13, baseUnits: 72 },
  { product: "Cappuccino", category: "Drikke", price: 44, unitCost: 12, baseUnits: 62 },
  { product: "Croissant", category: "Bagv\u00e6rk", price: 32, unitCost: 11, baseUnits: 48 },
  { product: "Salat bowl", category: "Salat", price: 92, unitCost: 37, baseUnits: 30 },
  { product: "Smoothie", category: "Drikke", price: 54, unitCost: 18, baseUnits: 36 },
  { product: "Vand", category: "Drikke", price: 24, unitCost: 7, baseUnits: 58 },
  { product: "Juice", category: "Drikke", price: 38, unitCost: 12, baseUnits: 44 },
  { product: "Cookie", category: "Bagv\u00e6rk", price: 28, unitCost: 8, baseUnits: 52 },
];

const demoMonths = [
  { month: "jan. 2026", monthIndex: 0, factor: 0.88 },
  { month: "feb. 2026", monthIndex: 1, factor: 0.94 },
  { month: "mar. 2026", monthIndex: 2, factor: 1 },
  { month: "apr. 2026", monthIndex: 3, factor: 1.08 },
  { month: "maj 2026", monthIndex: 4, factor: 1.15 },
  { month: "jun. 2026", monthIndex: 5, factor: 1.24 },
];

const sampleRows = demoMonths.flatMap((month, monthOffset) =>
  demoProducts.flatMap((item, productOffset) =>
    [0, 1].map((batch) => {
      const day = 3 + batch * 14 + ((productOffset * 2 + monthOffset) % 9);
      const date = `2026-${String(month.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const units = Math.round(item.baseUnits * month.factor + ((productOffset % 4) - 1) * 3 + batch * 5);
      const revenue = units * item.price;
      const cost = units * item.unitCost;
      const grossProfit = revenue - cost;
      const grossMargin = revenue ? `${((grossProfit / revenue) * 100).toFixed(1)}%` : "0%";

      return {
        Dato: date,
        "M\u00e5ned": month.month,
        Produkt: item.product,
        Kategori: item.category,
        Kanal: batch === 0 ? "Caf\u00e9" : productOffset % 3 === 0 ? "Takeaway" : "Online",
        Region: productOffset % 2 === 0 ? "K\u00f8benhavn" : "Nordsj\u00e6lland",
        Antal: units,
        Nettooms\u00e6tning: revenue,
        "Kostpris pr. stk.": item.unitCost,
        Vareforbrug: cost,
        D\u00e6kningsbidrag: grossProfit,
        D\u00e6kningsgrad: grossMargin,
      };
    }),
  ),
);

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const isPercent = text.includes("%");
  const normalized = text
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return isPercent && parsed > 1 ? parsed / 100 : parsed;
}

function toDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    if (value < 20000 || value > 80000) {
      return null;
    }

    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return null;
  }

  const localDate = /^(\d{1,2})[.-/](\d{1,2})[.-/](\d{2,4})$/.exec(text);
  if (localDate) {
    const [, day, month, rawYear] = localDate;
    const year = rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
    return new Date(year, Number(month) - 1, Number(day));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("da-DK", { month: "short", year: "numeric" }).format(date);
}

function cleanMonth(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Ukendt måned";
}

function currency(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("da-DK", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("da-DK").format(value);
}

function getCell(row: Record<string, unknown>, mappings: FieldMappings, field: FieldKey) {
  const header = mappings[field];
  return header ? row[header] : undefined;
}

function findMatchingHeader(headers: string[], field: FieldKey) {
  const normalizedAliases = aliases[field].map(normalizeHeader);
  return headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function buildMappings(headers: string[]) {
  return (Object.keys(aliases) as FieldKey[]).reduce<FieldMappings>((result, field) => {
    const match = findMatchingHeader(headers, field);
    if (match) {
      result[field] = match;
    }
    return result;
  }, {});
}

function scoreMappings(mappings: FieldMappings) {
  let score = 0;
  if (mappings.date) score += 3;
  if (mappings.month) score += 2;
  if (mappings.product) score += 4;
  if (mappings.category) score += 3;
  if (mappings.channel) score += 1;
  if (mappings.region) score += 1;
  if (mappings.units) score += 4;
  if (mappings.netRevenue) score += 5;
  if (mappings.grossRevenue) score += 4;
  if (mappings.revenue) score += 4;
  if (mappings.unitPrice) score += 2;
  if (mappings.grossProfit) score += 1;
  if (mappings.grossMargin) score += 1;
  if (mappings.cost) score += 1;
  return score;
}

function sheetToRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
}

function rowToHeaders(row: unknown[]) {
  return row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
}

function detectHeaderRow(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 40).forEach((row, index) => {
    const headers = rowToHeaders(row);
    const mappings = buildMappings(headers);
    const uniqueHeaders = new Set(headers.map(normalizeHeader)).size;
    const textCells = headers.filter((header) => Number.isNaN(Number(header))).length;
    const tableShapeBonus = uniqueHeaders >= 4 && textCells >= 3 ? 2 : 0;
    const score = scoreMappings(mappings) + tableShapeBonus;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function rowsToRecords(rows: unknown[][], headerIndex: number, headers: string[]) {
  return rows.slice(headerIndex + 1).map((row) =>
    headers.reduce<Record<string, unknown>>((record, header, index) => {
      if (header) {
        record[header] = row[index];
      }
      return record;
    }, {}),
  );
}

function getMissingFields(mappings: FieldMappings) {
  const missing: string[] = [];
  if (!mappings.product) missing.push("Produkt / Product");
  if (!mappings.category) missing.push("Kategori / Category");
  if (!mappings.units) missing.push("Antal / Units");
  if (!mappings.date && !mappings.month) missing.push("Dato / Date eller Måned / Month");
  if (!mappings.netRevenue && !mappings.grossRevenue && !mappings.revenue && !mappings.unitPrice) {
    missing.push("Omsætning / Revenue eller Antal × Pris");
  }
  return missing;
}

function buildCandidates(workbook: XLSX.WorkBook) {
  return workbook.SheetNames.map((name) => {
    const rows = sheetToRows(workbook.Sheets[name]);
    const headerIndex = detectHeaderRow(rows);
    const headers = rowToHeaders(rows[headerIndex] ?? []);
    const mappings = buildMappings(headers);
    const nameBonus = normalizeHeader(name).includes("salg") || normalizeHeader(name).includes("sales") ? 3 : 0;
    const score = scoreMappings(mappings) + nameBonus;
    const missingFields = getMissingFields(mappings);
    const confidence = Math.min(100, Math.round((score / 27) * 100));

    return {
      name,
      rows,
      headers,
      headerIndex,
      mappings,
      score,
      confidence,
      missingFields,
    };
  }).sort((a, b) => b.score - a.score);
}

function getRevenue(row: Record<string, unknown>, mappings: FieldMappings) {
  const netRevenue = toNumber(getCell(row, mappings, "netRevenue"));
  if (netRevenue !== null) {
    return { value: netRevenue, source: mappings.netRevenue ?? "Nettoomsætning" };
  }

  const grossRevenue = toNumber(getCell(row, mappings, "grossRevenue"));
  if (grossRevenue !== null) {
    return { value: grossRevenue, source: mappings.grossRevenue ?? "Bruttoomsætning" };
  }

  const revenue = toNumber(getCell(row, mappings, "revenue"));
  if (revenue !== null) {
    return { value: revenue, source: mappings.revenue ?? "Omsætning" };
  }

  const units = toNumber(getCell(row, mappings, "units"));
  const unitPrice = toNumber(getCell(row, mappings, "unitPrice"));
  if (units !== null && unitPrice !== null) {
    return { value: units * unitPrice, source: `${mappings.units ?? "Antal"} × ${mappings.unitPrice ?? "Pris"}` };
  }

  return { value: null, source: "" };
}

function manualToFieldMappings(manual: ManualMappings): FieldMappings {
  return {
    product: manual.product || undefined,
    category: manual.category || undefined,
    units: manual.units || undefined,
    revenue: manual.revenue || undefined,
    date: manual.dateOrMonth || undefined,
    month: manual.dateOrMonth || undefined,
    cost: manual.cost || undefined,
    grossProfit: manual.grossProfit || undefined,
    grossMargin: manual.grossMargin || undefined,
  };
}

function manualToFieldMappingsForCandidate(manual: ManualMappings, candidate: SheetCandidate): FieldMappings {
  const mappings = manualToFieldMappings(manual);
  mappings.channel = candidate.mappings.channel;
  mappings.region = candidate.mappings.region;

  if (manual.dateOrMonth) {
    const sampleRecord = rowsToRecords(candidate.rows, candidate.headerIndex, candidate.headers)[0] ?? {};
    const sampleValue = sampleRecord[manual.dateOrMonth];
    const selectedColumnLooksLikeDate = toDate(sampleValue) !== null;

    mappings.date = selectedColumnLooksLikeDate ? manual.dateOrMonth : undefined;
    mappings.month = selectedColumnLooksLikeDate ? undefined : manual.dateOrMonth;
  }

  return mappings;
}

function initialManualMappings(candidate: SheetCandidate): ManualMappings {
  return {
    dateOrMonth: candidate.mappings.date ?? candidate.mappings.month ?? "",
    product: candidate.mappings.product ?? "",
    category: candidate.mappings.category ?? "",
    units: candidate.mappings.units ?? "",
    revenue: candidate.mappings.netRevenue ?? candidate.mappings.grossRevenue ?? candidate.mappings.revenue ?? "",
    cost: candidate.mappings.cost ?? "",
    grossProfit: candidate.mappings.grossProfit ?? "",
    grossMargin: candidate.mappings.grossMargin ?? "",
  };
}

function getStatus(candidate: SheetCandidate, rows: SaleRow[]): MappingStatus {
  if (candidate.missingFields.length) {
    return "manual";
  }

  if (candidate.confidence < 70 || rows.length < 2) {
    return "warning";
  }

  return "success";
}

function parseSalesRows(candidate: SheetCandidate, mappings = candidate.mappings) {
  const records = rowsToRecords(candidate.rows, candidate.headerIndex, candidate.headers);
  const skippedRows: number[] = [];
  let revenueSource = "";

  const rows = records
    .map((row, index) => {
      const rawDate = getCell(row, mappings, "date");
      const date = toDate(rawDate);
      const mappedMonth = cleanMonth(getCell(row, mappings, "month"));
      const month = mappedMonth !== "Ukendt måned" ? mappedMonth : date ? monthLabel(date) : mappedMonth;
      const product = String(getCell(row, mappings, "product") ?? "").trim();
      const category = String(getCell(row, mappings, "category") ?? "").trim();
      const channel = String(getCell(row, mappings, "channel") ?? "").trim();
      const region = String(getCell(row, mappings, "region") ?? "").trim();
      const units = toNumber(getCell(row, mappings, "units"));
      const revenue = getRevenue(row, mappings);
      const grossProfit = toNumber(getCell(row, mappings, "grossProfit"));
      const rawGrossMargin = toNumber(getCell(row, mappings, "grossMargin"));
      const grossMargin = rawGrossMargin !== null && rawGrossMargin > 1 ? rawGrossMargin / 100 : rawGrossMargin;
      const cost = toNumber(getCell(row, mappings, "cost"));

      const isBlankRow = !rawDate && !product && !category && units === null && revenue.value === null;
      const looksLikeSummaryRow = product && /total|sum|i alt|subtotal|grand total/i.test(product);
      if (isBlankRow || looksLikeSummaryRow) {
        return null;
      }

      if (!product || !category || units === null || revenue.value === null || (!date && !month)) {
        skippedRows.push(candidate.headerIndex + index + 2);
        return null;
      }

      revenueSource ||= revenue.source;

      return {
        date,
        month,
        product,
        category,
        channel,
        region,
        revenue: revenue.value,
        units,
        grossProfit,
        grossMargin,
        cost,
      };
    })
    .filter((row): row is SaleRow => Boolean(row));

  return { rows, revenueSource, skippedRows };
}

function buildMappedColumns(mappings: FieldMappings) {
  const required: FieldKey[] = ["date", "month", "product", "category", "units", "netRevenue", "grossRevenue", "revenue", "unitPrice"];
  return required.reduce<Record<string, string>>((result, field) => {
    const column = mappings[field];
    if (column) {
      result[fieldLabels[field]] = column;
    }
    return result;
  }, {});
}

function buildOptionalColumns(mappings: FieldMappings) {
  const optional: FieldKey[] = ["channel", "region", "grossProfit", "grossMargin", "cost"];
  return optional.reduce<Record<string, string>>((result, field) => {
    const column = mappings[field];
    if (column) {
      result[fieldLabels[field]] = column;
    }
    return result;
  }, {});
}

function buildParseResult({
  fileName,
  analysis,
  candidate,
  mappings,
  manual,
}: {
  fileName: string;
  analysis: WorkbookAnalysis;
  candidate: SheetCandidate;
  mappings: FieldMappings;
  manual: boolean;
}) {
  const missingFields = manual ? getMissingFields(mappings) : candidate.missingFields;

  if (missingFields.length) {
    throw new Error(`Følgende obligatoriske kolonner mangler: ${missingFields.join(", ")}.`);
  }

  const parsed = parseSalesRows(candidate, mappings);

  if (!parsed.rows.length) {
    throw new Error(`Der blev ikke fundet gyldige salgsrækker i "${candidate.name}". Vælg eventuelt ark og kolonner manuelt.`);
  }

  const status = manual ? "warning" : getStatus(candidate, parsed.rows);
  const warnings = [
    ...(manual ? ["Manuel kolonnetilknytning anvendes."] : []),
    ...(status === "warning" && !manual ? ["Den automatiske kolonnetilknytning kan bruges, men sikkerheden er lavere end normalt."] : []),
    ...(parsed.skippedRows.length ? [`${parsed.skippedRows.length} ufuldstændige rækker eller opsummeringsrækker blev ignoreret.`] : []),
  ];

  return {
    rows: parsed.rows,
    fileName,
    feedback: {
      salesSheetName: candidate.name,
      detectedSheets: analysis.detectedSheets,
      headerRow: candidate.headerIndex + 1,
      mappedColumns: buildMappedColumns(mappings),
      optionalColumns: buildOptionalColumns(mappings),
      revenueSource: parsed.revenueSource || "Valgt omsætningskolonne",
      status,
      warnings,
      costs: analysis.costs,
      budget: analysis.budget,
    },
  };
}

function groupRows(rows: SaleRow[], keyGetter: (row: SaleRow) => string) {
  const groups = new Map<string, GroupedValue>();

  rows.forEach((row) => {
    const key = keyGetter(row) || "Ukategoriseret";
    const current = groups.get(key) ?? { name: key, revenue: 0, units: 0, grossProfit: 0, cost: 0 };
    current.revenue += row.revenue;
    current.units += row.units;
    current.grossProfit += row.grossProfit ?? 0;
    current.cost += row.grossProfit !== null ? row.revenue - row.grossProfit : (row.cost ?? 0);
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function uniqueValues(rows: SaleRow[], field: DashboardFilterKey) {
  if (field === "month") {
    return groupRowsByMonth(rows).map((month) => month.name);
  }

  return Array.from(new Set(rows.map((row) => row[field]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function applyDashboardFilters(rows: SaleRow[], filters: DashboardFilters, ignoredField?: DashboardFilterKey) {
  return rows.filter((row) =>
    (Object.entries(filters) as Array<[DashboardFilterKey, string]>).every(
      ([field, value]) => !value || field === ignoredField || row[field] === value,
    ),
  );
}

function getActiveFilterLabels(filters: DashboardFilters) {
  return Object.values(filters).filter(Boolean);
}

function groupRowsByMonth(rows: SaleRow[]) {
  const groups = new Map<string, MonthValue>();

  rows.forEach((row, index) => {
    const sortKey = row.date ? new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime() : index;
    const key = row.date ? String(sortKey) : row.month;
    const displayMonth = row.month || (row.date ? monthLabel(row.date) : "Ukendt måned");
    const current = groups.get(key) ?? {
      name: displayMonth,
      revenue: 0,
      units: 0,
      grossProfit: 0,
      cost: 0,
      sortKey,
    };
    current.revenue += row.revenue;
    current.units += row.units;
    current.grossProfit += row.grossProfit ?? 0;
    current.cost += row.cost ?? 0;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function parseCostSheet(workbook: XLSX.WorkBook) {
  const costSheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes("omkost") || normalizeHeader(name).includes("cost"));
  if (!costSheetName) {
    return undefined;
  }

  const rows = sheetToRows(workbook.Sheets[costSheetName]);
  const headerIndex = detectHeaderRow(rows);
  const headers = rowToHeaders(rows[headerIndex] ?? []);
  const categoryHeader =
    findMatchingHeader(headers, "category") ??
    headers.find((header) => ["type", "omkostningskategori", "costcategory"].includes(normalizeHeader(header)));
  const costHeader = findMatchingHeader(headers, "cost");

  if (!costHeader) {
    return undefined;
  }

  const groups = new Map<string, GroupedValue>();
  let total = 0;

  rowsToRecords(rows, headerIndex, headers).forEach((row) => {
    const value = toNumber(row[costHeader]);
    if (value === null) {
      return;
    }

    const category = categoryHeader ? String(row[categoryHeader] ?? "Omkostninger").trim() || "Omkostninger" : "Omkostninger";
    const current = groups.get(category) ?? { name: category, revenue: 0, units: 0, grossProfit: 0, cost: 0 };
    current.cost += Math.abs(value);
    groups.set(category, current);
    total += Math.abs(value);
  });

  return {
    sheetName: costSheetName,
    total,
    byCategory: Array.from(groups.values()).sort((a, b) => b.cost - a.cost),
  };
}

function parseBudgetSheet(workbook: XLSX.WorkBook) {
  const budgetSheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes("budget"));
  if (!budgetSheetName) {
    return undefined;
  }

  const rows = sheetToRows(workbook.Sheets[budgetSheetName]);
  const headerIndex = detectHeaderRow(rows);
  const headers = rowToHeaders(rows[headerIndex] ?? []);
  const mappings = buildMappings(headers);
  const records = rowsToRecords(rows, headerIndex, headers);

  let revenue = 0;
  let costs = 0;

  records.forEach((row) => {
    const rowRevenue =
      toNumber(getCell(row, mappings, "netRevenue")) ??
      toNumber(getCell(row, mappings, "grossRevenue")) ??
      toNumber(getCell(row, mappings, "revenue"));
    const rowCosts = toNumber(getCell(row, mappings, "cost"));

    revenue += rowRevenue ?? 0;
    costs += Math.abs(rowCosts ?? 0);
  });

  if (!revenue && !costs) {
    return undefined;
  }

  return {
    sheetName: budgetSheetName,
    revenue,
    costs,
    result: revenue - costs,
  };
}

function analyzeWorkbook(file: File): Promise<{ analysis: WorkbookAnalysis; autoResult: ParseResult | null }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const candidates = buildCandidates(workbook);

        if (!candidates.length) {
          reject(new Error("Excel-filen indeholder ingen regneark."));
          return;
        }

        const analysis = {
          fileName: file.name,
          detectedSheets: workbook.SheetNames,
          candidates,
          costs: parseCostSheet(workbook),
          budget: parseBudgetSheet(workbook),
        };

        const best = candidates[0];
        let autoResult: ParseResult | null = null;

        if (!best.missingFields.length) {
          autoResult = buildParseResult({
            fileName: file.name,
            analysis,
            candidate: best,
            mappings: best.mappings,
            manual: false,
          });
        }

        resolve({ analysis, autoResult });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Den uploadede fil kunne ikke læses."));
    reader.readAsArrayBuffer(file);
  });
}

function calculateMetrics(
  rows: SaleRow[],
  feedback?: MappingFeedback,
  options: { useWorkbookTotals?: boolean; budgetScale?: number } = {},
) {
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const totalGrossProfit = rows.reduce((sum, row) => sum + (row.grossProfit ?? 0), 0);
  const hasGrossProfit = rows.some((row) => row.grossProfit !== null);
  const hasGrossMargin = rows.some((row) => row.grossMargin !== null);
  const weightedGrossMargin = totalRevenue ? totalGrossProfit / totalRevenue : 0;
  const averageGrossMargin =
    rows.reduce((sum, row) => sum + (row.grossMargin ?? 0), 0) / Math.max(rows.filter((row) => row.grossMargin !== null).length, 1);
  const hasRowCosts = rows.some((row) => row.cost !== null || row.grossProfit !== null);
  const rowCosts = rows.reduce(
    (sum, row) => sum + (row.grossProfit !== null ? row.revenue - row.grossProfit : (row.cost ?? 0)),
    0,
  );
  const totalCosts = options.useWorkbookTotals !== false && feedback?.costs ? feedback.costs.total : rowCosts;
  const actualResult = totalRevenue - totalCosts;
  const productsByRevenue = groupRows(rows, (row) => row.product).sort((a, b) => b.revenue - a.revenue);
  const productsByUnits = groupRows(rows, (row) => row.product).sort((a, b) => b.units - a.units);
  const categories = groupRows(rows, (row) => row.category).sort((a, b) => b.revenue - a.revenue);
  const grossProfitByCategory = categories.filter((category) => category.grossProfit !== 0).sort((a, b) => b.grossProfit - a.grossProfit);
  const costsByCategory = categories.filter((category) => category.cost !== 0).sort((a, b) => b.cost - a.cost);
  const monthly = groupRowsByMonth(rows);
  const monthsByRevenue = [...monthly].sort((a, b) => b.revenue - a.revenue);
  const budgetScale = options.budgetScale ?? 1;
  const budgetRevenue = (feedback?.budget?.revenue ?? 0) * budgetScale;
  const budgetCosts = (feedback?.budget?.costs ?? 0) * budgetScale;

  return {
    totalRevenue,
    totalUnits,
    totalGrossProfit,
    grossMargin: hasGrossProfit ? weightedGrossMargin : averageGrossMargin,
    hasGrossProfit,
    hasGrossMargin,
    hasCosts: Boolean((options.useWorkbookTotals !== false && feedback?.costs) || hasRowCosts),
    totalCosts,
    actualResult,
    budgetRevenue,
    budgetCosts,
    budgetResult: budgetRevenue - budgetCosts,
    revenueVsBudget: feedback?.budget ? totalRevenue - budgetRevenue : 0,
    bestProduct: productsByRevenue[0],
    bestCategory: categories[0],
    bestMonth: monthsByRevenue[0],
    monthly,
    productsByUnits: productsByUnits.slice(0, 8),
    categories: categories.slice(0, 8),
    grossProfitByCategory: grossProfitByCategory.slice(0, 8),
    costsByCategory: costsByCategory.slice(0, 8),
    rowCount: rows.length,
  };
}

function buildExecutiveSummary(
  metrics: ReturnType<typeof calculateMetrics>,
  feedback?: MappingFeedback,
  context: { totalRows?: number; activeFilters?: string[] } = {},
) {
  if (!metrics.rowCount || !metrics.bestProduct || !metrics.bestCategory || !metrics.bestMonth) {
    return {
      insights: [
        "Ingen salgsrækker passer til de valgte filtre.",
        "Det uploadede regneark er fortsat tilgængeligt.",
        "Nulstil eller tilpas filtrene for at få vist data igen.",
      ],
      conclusion: "Der er ikke nok data i den valgte visning til at danne en konklusion.",
      status: "Ingen rækker i den valgte visning",
    };
  }

  const isFiltered = Boolean(context.activeFilters?.length);
  const profitabilityInsight = metrics.hasGrossProfit
    ? `Dækningsbidraget er ${currency(metrics.totalGrossProfit)} med en dækningsgrad på ${percent(metrics.grossMargin)}.`
    : metrics.hasCosts
      ? `Det aktuelle resultat er ${currency(metrics.actualResult)} efter omkostninger på ${currency(metrics.totalCosts)}.`
      : `${metrics.bestMonth.name} er den stærkeste måned med en omsætning på ${currency(metrics.bestMonth.revenue)}.`;
  const conclusion = feedback?.budget
    ? `Omsætningen ligger ${currency(Math.abs(metrics.revenueVsBudget))} ${metrics.revenueVsBudget >= 0 ? "over" : "under"} budgettet i denne visning.`
    : `${metrics.bestMonth.name} er den stærkeste periode med ${metrics.bestCategory.name} som førende kategori.`;

  return {
    insights: [
      `${currency(metrics.totalRevenue)} i omsætning fra ${number(metrics.totalUnits)} enheder fordelt på ${number(metrics.rowCount)} rækker.`,
      `${metrics.bestProduct.name} er det førende produkt, mens ${metrics.bestCategory.name} er den største kategori.`,
      profitabilityInsight,
    ],
    conclusion,
    status: isFiltered
      ? `Opdateret for ${context.activeFilters?.join(", ")}`
      : `Baseret på ${number(context.totalRows ?? metrics.rowCount)} rækker fra ${feedback?.salesSheetName ?? "salgsarket"}`,
  };
}

function createSampleWorkbook() {
  const workbook = XLSX.utils.book_new();
  const totalRevenue = sampleRows.reduce((sum, row) => sum + row["Nettooms\u00e6tning"], 0);
  const operatingCosts = [
    { Kategori: "Lon", Omkostninger: Math.round(totalRevenue * 0.22) },
    { Kategori: "Raavarer", Omkostninger: Math.round(totalRevenue * 0.18) },
    { Kategori: "Lokale", Omkostninger: Math.round(totalRevenue * 0.09) },
    { Kategori: "Marketing", Omkostninger: Math.round(totalRevenue * 0.035) },
    { Kategori: "Drift", Omkostninger: Math.round(totalRevenue * 0.045) },
  ];
  const totalCosts = operatingCosts.reduce((sum, row) => sum + row.Omkostninger, 0);

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleRows), "Salgsdata");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(operatingCosts),
    "Omkostninger",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([{ Nettoomsaetning: Math.round(totalRevenue * 1.04), Omkostninger: Math.round(totalCosts * 1.03) }]),
    "Budget",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Beskrivelse"], ["Eksempelregneark til DataBrief AI"]]), "Beskrivelse");
  return workbook;
}

function downloadSampleExcel() {
  const workbook = createSampleWorkbook();
  XLSX.writeFile(workbook, "databrief-ai-eksempelregneark.xlsx");
}

function KpiCard({
  label,
  value,
  detail,
  emphasis = false,
  icon: Icon = CircleDollarSign,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
  icon?: LucideIcon;
  tone?: "brand" | "positive" | "warning" | "neutral";
}) {
  const styles = {
    brand: {
      card: "border-brand-100 bg-[#f4fbfc]",
      icon: "bg-brand-600 text-white shadow-[0_8px_18px_rgba(8,145,178,0.2)]",
      accent: "bg-brand-500",
      detail: "border-brand-100/80 text-brand-700",
    },
    positive: {
      card: "border-emerald-100 bg-[#f5fbf8]",
      icon: "bg-emerald-600 text-white shadow-[0_8px_18px_rgba(5,150,105,0.18)]",
      accent: "bg-emerald-500",
      detail: "border-emerald-100 text-emerald-700",
    },
    warning: {
      card: "border-orange-100 bg-[#fff9f4]",
      icon: "bg-accent-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.18)]",
      accent: "bg-accent-500",
      detail: "border-orange-100 text-orange-700",
    },
    neutral: {
      card: "border-slate-200 bg-white",
      icon: "bg-ink text-white shadow-[0_8px_18px_rgba(16,32,51,0.16)]",
      accent: "bg-slate-400",
      detail: "border-slate-200 text-slate-500",
    },
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${styles.card} ${
        emphasis ? "min-h-44 p-5 shadow-[0_14px_38px_rgba(16,32,51,0.09)]" : "min-h-32 p-4 shadow-[0_5px_18px_rgba(16,32,51,0.045)]"
      }`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <div className={`grid shrink-0 place-items-center rounded-md ${styles.icon} ${emphasis ? "h-10 w-10" : "h-8 w-8"}`}>
          <Icon className={emphasis ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
        </div>
        <p className="text-right text-[11px] font-semibold text-slate-500">{label}</p>
      </div>
      <p className={`mt-5 break-words font-semibold tracking-normal text-ink ${emphasis ? "text-2xl sm:text-[1.8rem]" : "text-xl"}`}>{value}</p>
      <p className={`mt-4 border-t pt-3 text-[11px] font-medium leading-5 ${styles.detail}`}>{detail}</p>
    </div>
  );
}

function SecondaryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1.5 truncate text-base font-semibold text-ink" title={value}>{value}</p>
      {detail ? <p className="mt-1 truncate text-[11px] text-slate-500" title={detail}>{detail}</p> : null}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function StatusBox({ feedback, analysis }: { feedback?: MappingFeedback; analysis?: WorkbookAnalysis | null }) {
  const status = feedback?.status ?? (analysis ? "manual" : undefined);
  if (!status) {
    return null;
  }

  const label =
    status === "success" ? "Kolonner blev registreret automatisk" : status === "warning" ? "Kolonner blev registreret med forbehold" : "Manuel kolonnetilknytning er nødvendig";
  const classes =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm ${classes}`}>
      {status === "success" ? (
        <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {feedback?.warnings.length ? <p className="mt-0.5 text-xs leading-5">{feedback.warnings.join(" ")}</p> : null}
        {!feedback && analysis ? <p className="mt-0.5 text-xs leading-5">Vælg et ark, og tilknyt de obligatoriske kolonner nedenfor.</p> : null}
      </div>
    </div>
  );
}

function DataDetectedCard({
  feedback,
  rowCount,
  onEdit,
}: {
  feedback?: MappingFeedback;
  rowCount: number;
  onEdit: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const statusText =
    feedback.status === "success"
      ? "Kolonner blev registreret automatisk"
      : feedback.status === "warning"
        ? "Kolonner blev registreret med forbehold"
        : "Manuel kolonnetilknytning anvendt";

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.035] px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2 font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          Data registreret
        </span>
        <span><span className="font-medium text-slate-400">Ark</span> <strong className="ml-1 font-semibold text-white">{feedback.salesSheetName}</strong></span>
        <span><span className="font-medium text-slate-400">Overskriftsrække</span> <strong className="ml-1 font-semibold text-white">{feedback.headerRow}</strong></span>
        <span><span className="font-medium text-slate-400">Rækker</span> <strong className="ml-1 font-semibold text-white">{number(rowCount)}</strong></span>
        <span className="truncate"><span className="font-medium text-slate-400">Status</span> <strong className="ml-1 font-semibold text-white">{statusText}</strong></span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-400 hover:bg-white/15"
        >
          Rediger kolonnetilknytning
        </button>
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback?: MappingFeedback }) {
  if (!feedback) {
    return null;
  }

  const optionalEntries = Object.entries(feedback.optionalColumns);

  return (
    <details className="rounded-lg border border-slate-200/70 bg-white/45 px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600 transition hover:text-ink">Vis detaljer om dataregistrering</summary>
      <div className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4">
        <Info className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">Registrerede data</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Salgsark: <span className="font-semibold text-ink">{feedback.salesSheetName}</span>. Overskriftsrække:{" "}
            <span className="font-semibold text-ink">{feedback.headerRow}</span>. Fundne ark:{" "}
            {feedback.detectedSheets.join(", ")}.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Tilknyttede kolonner</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {Object.entries(feedback.mappedColumns).map(([field, column]) => (
                  <li key={field}>
                    {field}: <span className="font-medium text-ink">{column}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Omsætningskilde: {feedback.revenueSource}</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Valgfrie data</p>
              {optionalEntries.length ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {optionalEntries.map(([field, column]) => (
                    <li key={field}>
                      {field}: <span className="font-medium text-ink">{column}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Der blev ikke fundet kolonner for dækningsbidrag, dækningsgrad eller omkostninger.</p>
              )}
              {feedback.costs ? <p className="mt-2 text-xs text-slate-500">Omkostningsark: {feedback.costs.sheetName}</p> : null}
              {feedback.budget ? <p className="mt-1 text-xs text-slate-500">Budgetark: {feedback.budget.sheetName}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

function ManualMappingPanel({
  analysis,
  selectedSheet,
  mappings,
  onSheetChange,
  onMappingChange,
  onApply,
}: {
  analysis: WorkbookAnalysis | null;
  selectedSheet: string;
  mappings: ManualMappings;
  onSheetChange: (sheetName: string) => void;
  onMappingChange: (field: ManualField, column: string) => void;
  onApply: () => void;
}) {
  if (!analysis) {
    return null;
  }

  const candidate = analysis.candidates.find((sheet) => sheet.name === selectedSheet) ?? analysis.candidates[0];
  const fields: Array<{ key: ManualField; label: string; required: boolean }> = [
    { key: "dateOrMonth", label: "Dato eller måned", required: true },
    { key: "product", label: "Produkt", required: true },
    { key: "category", label: "Kategori", required: true },
    { key: "units", label: "Antal", required: true },
    { key: "revenue", label: "Omsætning", required: true },
    { key: "cost", label: "Omkostning", required: false },
    { key: "grossProfit", label: "Dækningsbidrag", required: false },
    { key: "grossMargin", label: "Dækningsgrad", required: false },
  ];

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-ink">Manuel kolonnetilknytning</h3>
          <p className="mt-1 text-sm text-slate-500">
            Ark kan have forskellige overskriftsrækker. Den aktuelle overskriftsrække er {candidate.headerIndex + 1}.
          </p>
        </div>
        <div className="text-sm text-slate-500">Registreringssikkerhed: {candidate.confidence} %</div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Regneark
          <select
            value={selectedSheet}
            onChange={(event) => onSheetChange(event.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
          >
            {analysis.candidates.map((sheet) => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name} - række {sheet.headerIndex + 1} - {sheet.confidence} %
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <label key={field.key} className="block text-sm font-semibold text-ink">
            {field.label} {field.required ? <span className="text-red-600">*</span> : null}
            <select
              value={mappings[field.key]}
              onChange={(event) => onMappingChange(field.key, event.target.value)}
              className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
            >
              <option value="">Ikke tilknyttet</option>
              {candidate.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onApply}
        className="mt-5 inline-flex items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Anvend valgte kolonnetilknytninger
      </button>
    </div>
  );
}

function DashboardFilterBar({
  rows,
  filteredRowCount,
  filters,
  onChange,
  onReset,
}: {
  rows: SaleRow[];
  filteredRowCount: number;
  filters: DashboardFilters;
  onChange: (field: DashboardFilterKey, value: string) => void;
  onReset: () => void;
}) {
  const definitions: Array<{ field: DashboardFilterKey; label: string; allLabel: string }> = [
    { field: "month", label: "Måned", allLabel: "Alle måneder" },
    { field: "product", label: "Produkt", allLabel: "Alle produkter" },
    { field: "category", label: "Kategori", allLabel: "Alle kategorier" },
    { field: "channel", label: "Kanal", allLabel: "Alle kanaler" },
    { field: "region", label: "Region", allLabel: "Alle regioner" },
  ];
  const controls = definitions
    .map((definition) => ({ ...definition, options: uniqueValues(rows, definition.field) }))
    .filter((definition) => definition.options.length > 0);
  const activeFilters = getActiveFilterLabels(filters);

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(16,32,51,0.07)] sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="flex shrink-0 items-center gap-2 pb-0.5 xl:pr-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-50 text-brand-700">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <span className="block text-xs font-semibold text-ink">Filtrer visning</span>
            <span className="block text-[10px] text-slate-400">Afgræns analysen</span>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {controls.map((control) => (
            <label key={control.field} className="block min-w-0 text-[11px] font-semibold text-slate-500">
              {control.label}
              <span className="relative mt-1 block">
                <select
                  value={filters[control.field]}
                  onChange={(event) => onChange(control.field, event.target.value)}
                  className="w-full appearance-none rounded-md border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-xs font-semibold text-ink outline-none transition hover:border-brand-200 hover:bg-white focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">{control.allLabel}</option>
                  {control.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!activeFilters.length}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Nulstil filtre
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">
          Viser <span className="font-semibold text-ink">{number(filteredRowCount)}</span> af {number(rows.length)} rækker
        </p>
        <p className="truncate">
          {activeFilters.length ? (
            <>
              Filtreret efter: <span className="font-semibold text-ink">{activeFilters.join(", ")}</span>
            </>
          ) : (
            "Alle tilgængelige salgsdata er medtaget"
          )}
        </p>
      </div>
    </section>
  );
}

function MonthlyReportCard({
  rows,
  filters,
  feedback,
  preferredMonth,
  selectedMonth,
  onMonthChange,
}: {
  rows: SaleRow[];
  filters: DashboardFilters;
  feedback?: MappingFeedback;
  preferredMonth?: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}) {
  const monthOptions = uniqueValues(rows, "month");
  const reportMonth = monthOptions.includes(selectedMonth)
    ? selectedMonth
    : filters.month || (preferredMonth && monthOptions.includes(preferredMonth) ? preferredMonth : monthOptions.at(-1) ?? "");
  const rowsWithoutMonthFilter = applyDashboardFilters(rows, filters, "month");
  const reportRows = rowsWithoutMonthFilter.filter((row) => row.month === reportMonth);
  const allRowsForMonth = rows.filter((row) => row.month === reportMonth);
  const monthCount = Math.max(monthOptions.length, 1);
  const segmentShare = allRowsForMonth.length ? reportRows.length / allRowsForMonth.length : 0;
  const budgetScale = (1 / monthCount) * segmentShare;
  const reportMetrics = calculateMetrics(reportRows, feedback, { useWorkbookTotals: false, budgetScale });
  const hasBudget = Boolean(feedback?.budget && reportRows.length);
  const deviation = reportMetrics.revenueVsBudget;
  const tolerance = Math.max(1, reportMetrics.budgetRevenue * 0.01);
  const budgetStatus = Math.abs(deviation) <= tolerance ? "På budget" : deviation > 0 ? "Over budgettet" : "Under budgettet";
  const budgetStatusClasses =
    budgetStatus === "På budget"
      ? "bg-emerald-50 text-emerald-700"
      : budgetStatus === "Over budgettet"
        ? "bg-brand-50 text-brand-700"
        : "bg-amber-50 text-amber-700";
  const resultLabel = reportMetrics.hasGrossProfit ? "Dækningsbidrag" : reportMetrics.hasCosts ? "Resultat" : "Solgte enheder";
  const resultValue = reportMetrics.hasGrossProfit
    ? currency(reportMetrics.totalGrossProfit)
    : reportMetrics.hasCosts
      ? currency(reportMetrics.actualResult)
      : number(reportMetrics.totalUnits);
  const profitSentence = reportMetrics.hasGrossProfit
    ? `, dækningsbidraget var ${currency(reportMetrics.totalGrossProfit)}`
    : reportMetrics.hasCosts
      ? `, resultatet var ${currency(reportMetrics.actualResult)}`
      : "";
  const budgetSentence = hasBudget
    ? `, og omsætningen lå ${currency(Math.abs(deviation))} ${deviation >= 0 ? "over" : "under"} det fordelte månedsbudget`
    : "";

  return (
    <section className="overflow-hidden rounded-lg border border-orange-100 bg-white shadow-[0_12px_30px_rgba(16,32,51,0.08)]">
      <div className="flex flex-col gap-3 border-b border-orange-100 bg-[#fff9f4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.2)]">
            <CalendarRange className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-600">Periodeanalyse</p>
            <h2 className="mt-0.5 text-base font-semibold text-ink">Månedsrapport</h2>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Rapportmåned</span>
          <span className="relative block">
            <select
              value={reportMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              className="appearance-none rounded-md border border-orange-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-ink shadow-sm outline-none transition hover:border-orange-300 focus:border-accent-500 focus:ring-2 focus:ring-orange-100"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className="grid sm:grid-cols-3">
        {[
          ["Omsætning", currency(reportMetrics.totalRevenue)],
          [resultLabel, resultValue],
          [hasBudget ? "Budgetstatus" : "Medtagne rækker", hasBudget ? budgetStatus : number(reportMetrics.rowCount)],
        ].map(([label, value], index) => (
          <div key={label} className={`px-4 py-4 sm:px-5 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
            <p
              className={`mt-2 text-xl font-semibold text-ink ${hasBudget && label === "Budgetstatus" ? `inline-flex rounded-md px-2.5 py-1.5 text-xs ${budgetStatusClasses}` : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
        <p className="border-l-2 border-accent-500 pl-3 text-xs font-semibold leading-5 text-slate-700">
          {reportRows.length
            ? `I ${reportMonth} var omsætningen ${currency(reportMetrics.totalRevenue)}${profitSentence}${budgetSentence}.`
            : `Ingen rækker matcher de aktuelle filtre for ${reportMonth}.`}
        </p>
      </div>
    </section>
  );
}

export default function UploadDashboard() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [analysis, setAnalysis] = useState<WorkbookAnalysis | null>(null);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [manualMappings, setManualMappings] = useState<ManualMappings>(emptyManualMappings);
  const [showManualMapping, setShowManualMapping] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(emptyDashboardFilters);
  const [reportMonth, setReportMonth] = useState("");

  const allRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const activeFilterLabels = useMemo(() => getActiveFilterLabels(filters), [filters]);
  const isFiltered = activeFilterLabels.length > 0;
  const filteredRows = useMemo(() => applyDashboardFilters(allRows, filters), [allRows, filters]);
  const budgetScale = allRows.length && isFiltered ? filteredRows.length / allRows.length : 1;
  const baseMetrics = useMemo(() => calculateMetrics(allRows, data?.feedback), [allRows, data?.feedback]);
  const metrics = useMemo(
    () => calculateMetrics(filteredRows, data?.feedback, { useWorkbookTotals: !isFiltered, budgetScale }),
    [budgetScale, data?.feedback, filteredRows, isFiltered],
  );
  const executiveSummary = useMemo(
    () => buildExecutiveSummary(metrics, data?.feedback, { totalRows: allRows.length, activeFilters: activeFilterLabels }),
    [activeFilterLabels, allRows.length, data?.feedback, metrics],
  );
  const hasData = allRows.length > 0;
  const hasFilteredData = metrics.rowCount > 0;
  const showGrossProfit = hasData && baseMetrics.hasGrossProfit;
  const showCosts = hasData && (Boolean(data?.feedback.costs) || baseMetrics.hasCosts);
  const showBudget = hasData && Boolean(data?.feedback.budget);
  const costsByCategory = isFiltered
    ? metrics.costsByCategory
    : (data?.feedback.costs?.byCategory ?? metrics.costsByCategory);
  const manualMappingRequired = Boolean(analysis && !data);
  const shouldShowManualMapping = manualMappingRequired || showManualMapping;
  const hasWorkbook = Boolean(analysis || data);
  const primaryProfitLabel = showGrossProfit ? "Dækningsbidrag" : "Resultat";
  const primaryProfitValue = showGrossProfit
    ? currency(metrics.totalGrossProfit)
    : showCosts
      ? currency(metrics.actualResult)
      : "Ikke tilgængeligt";
  const primaryProfitDetail = showGrossProfit
    ? `Dækningsgrad: ${percent(metrics.grossMargin)}`
    : showCosts
      ? "Omsætning minus omkostninger"
      : "Kræver omkostnings- eller dækningsdata";
  const secondaryMetrics = [
    {
      label: "Bedste produkt",
      value: metrics.bestProduct?.name ?? "Ingen data",
      detail: metrics.bestProduct ? `${currency(metrics.bestProduct.revenue)} i omsætning` : undefined,
    },
    {
      label: "Bedste kategori",
      value: metrics.bestCategory?.name ?? "Ingen data",
      detail: metrics.bestCategory ? `${currency(metrics.bestCategory.revenue)} i omsætning` : undefined,
    },
    {
      label: "Bedste måned",
      value: metrics.bestMonth?.name ?? "Ingen data",
      detail: metrics.bestMonth ? `${currency(metrics.bestMonth.revenue)} i omsætning` : undefined,
    },
    ...(hasData && baseMetrics.hasGrossMargin
      ? [{ label: "Dækningsgrad", value: percent(metrics.grossMargin), detail: "Beregnet ud fra dækningsgraden" }]
      : []),
    ...(showCosts
      ? [{ label: "Samlede omkostninger", value: currency(metrics.totalCosts), detail: "Aktuelle omkostninger" }]
      : []),
  ];

  function resetDashboardView() {
    setFilters(emptyDashboardFilters);
    setReportMonth("");
  }

  function selectSheet(sheetName: string, workbookAnalysis = analysis) {
    if (!workbookAnalysis) {
      return;
    }

    const candidate = workbookAnalysis.candidates.find((sheet) => sheet.name === sheetName) ?? workbookAnalysis.candidates[0];
    setSelectedSheet(candidate.name);
    setManualMappings(initialManualMappings(candidate));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const parsed = await analyzeWorkbook(file);
      const best = parsed.analysis.candidates[0];
      setAnalysis(parsed.analysis);
      selectSheet(best.name, parsed.analysis);
      setData(parsed.autoResult);
      setShowManualMapping(!parsed.autoResult);
      resetDashboardView();

      if (!parsed.autoResult) {
        setError(
          `Manuel kolonnetilknytning er nødvendig. Det bedst egnede ark, "${best.name}", mangler: ${best.missingFields.join(
            ", ",
          )}. Fundne kolonner: ${best.headers.join(", ") || "ingen"}.`,
        );
      }
    } catch (error) {
      setData(null);
      setAnalysis(null);
      setSelectedSheet("");
      setManualMappings(emptyManualMappings);
      setShowManualMapping(false);
      setError(error instanceof Error ? error.message : "Regnearket kunne ikke behandles.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  }

  async function loadDemoDataset() {
    setIsLoading(true);
    setError("");

    try {
      const workbook = createSampleWorkbook();
      const workbookData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new File([workbookData], "DataBrief AI demodata.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const parsed = await analyzeWorkbook(file);
      const best = parsed.analysis.candidates[0];

      setAnalysis(parsed.analysis);
      selectSheet(best.name, parsed.analysis);
      setData(parsed.autoResult);
      setShowManualMapping(!parsed.autoResult);
      resetDashboardView();

      if (!parsed.autoResult) {
        setError(
          `Manuel kolonnetilknytning er nødvendig. Det bedst egnede ark, "${best.name}", mangler: ${best.missingFields.join(
            ", ",
          )}. Fundne kolonner: ${best.headers.join(", ") || "ingen"}.`,
        );
      }
    } catch (error) {
      setData(null);
      setAnalysis(null);
      setSelectedSheet("");
      setManualMappings(emptyManualMappings);
      setShowManualMapping(false);
      setError(error instanceof Error ? error.message : "Demodata kunne ikke indlæses.");
    } finally {
      setIsLoading(false);
    }
  }

  function applyManualMappings() {
    if (!analysis) {
      return;
    }

    const candidate = analysis.candidates.find((sheet) => sheet.name === selectedSheet) ?? analysis.candidates[0];
    const mappings = manualToFieldMappingsForCandidate(manualMappings, candidate);

    try {
      const result = buildParseResult({
        fileName: analysis.fileName,
        analysis,
        candidate,
        mappings,
        manual: true,
      });
      setData(result);
      setShowManualMapping(false);
      setError("");
      resetDashboardView();
    } catch (error) {
      setData(null);
      setError(error instanceof Error ? error.message : "Den manuelle kolonnetilknytning mislykkedes. Kontrollér de valgte kolonner.");
    }
  }

  if (!hasWorkbook) {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fbfc_0%,#f1fbfc_46%,#fff8f3_100%)]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(8,145,178,0.14),transparent_28%),radial-gradient(circle_at_10%_85%,rgba(249,115,22,0.09),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(16,32,51,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(16,32,51,0.035)_1px,transparent_1px)] [background-size:48px_48px]" />

        <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Forside
            </Link>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-[0_10px_24px_rgba(16,32,51,0.18)]">
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-semibold text-ink">DataBrief AI</span>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16 lg:px-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white/85 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Regnearksanalyse uden opsætning
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">Upload salgsdata</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Vælg en Excel-fil, eller brug demodata til at oprette et dashboard og et ledelsesresume.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {["Danske og engelske kolonnenavne", "Ingen skabelon nødvendig", "Behandles i din browser"].map((item) => (
              <div
                key={item}
                className="inline-flex items-center gap-2 rounded-lg border border-white/90 bg-white/75 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur"
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-lg border border-white/90 bg-white/90 shadow-[0_28px_80px_rgba(16,32,51,0.14),0_6px_20px_rgba(16,32,51,0.06)] backdrop-blur">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-white via-white to-brand-50/45 px-5 py-4 sm:px-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-ink">Vælg dit salgsregneark</h2>
                  <p className="text-sm text-slate-500">Filen behandles lokalt i denne browser.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <label className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-8 text-center shadow-inner transition hover:border-brand-500 hover:bg-brand-50/35">
                  <span className="grid h-14 w-14 place-items-center rounded-lg border border-brand-100 bg-white text-brand-700 shadow-[0_8px_22px_rgba(8,145,178,0.12)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(8,145,178,0.18)]">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-base font-semibold text-ink">
                    {isLoading ? "Læser regnearket..." : "Vælg en Excel-fil"}
                  </span>
                  <span className="mt-1.5 text-sm text-slate-500">Vælg en .xlsx-fil fra din enhed</span>
                  <span className="mt-3 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    Fleksible danske og engelske kolonnenavne
                  </span>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>

                {error ? (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-500 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4 text-brand-700" aria-hidden="true" />
                    Hent eksempelfil
                  </button>
                  <button
                    type="button"
                    onClick={loadDemoDataset}
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4 text-accent-600" aria-hidden="true" />
                    Brug demodata
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/90 bg-white/80 p-5 shadow-[0_12px_34px_rgba(16,32,51,0.06)] backdrop-blur sm:p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                  <Info className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-ink">Understøttede regneark</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    DataBrief AI finder den mest sandsynlige overskriftsrække og tilknytter almindelige salgskolonner automatisk,
                    også når regnearket har danske kolonnenavne eller starter under en titelrække.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600 sm:grid-cols-3">
                {["Automatisk registrering af regneark", "Fleksible overskriftsrækker", "Mulighed for manuel kolonnetilknytning"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf3f5]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Forside
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-[0_10px_24px_rgba(16,32,51,0.18)]">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-ink">DataBrief AI</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1480px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[184px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="self-start lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(16,32,51,0.07)]">
            <div className="h-1 bg-brand-600" aria-hidden="true" />
            <div className="p-3">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-50 text-brand-700">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-ink">Skift salgsdata</h1>
                <p className="text-[11px] text-slate-500">Vælg en ny fil</p>
              </div>
            </div>

            <label className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2.5 text-center transition hover:border-brand-500 hover:bg-brand-50/60">
              <Upload className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <span className="text-xs font-semibold text-ink">
                {isLoading ? "Læser regnearket..." : "Vælg en Excel-fil"}
              </span>
              <input
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{error}</p>
            ) : null}

            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink"
                title="Hent eksempelfil"
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Eksempelfil
              </button>
              <button
                type="button"
                onClick={loadDemoDataset}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-600" aria-hidden="true" />
                Demodata
              </button>
            </div>

            <details className="mt-1.5 border-t border-slate-200/70 pt-1.5">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-500 transition hover:text-ink">Understøttede regneark</summary>
              <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                Fleksible danske og engelske kolonnenavne, automatisk registrering af overskriftsrækker og manuel kolonnetilknytning.
              </p>
            </details>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-9">
          <section className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#102033] shadow-[0_24px_60px_rgba(16,32,51,0.18)]">
            <div className="flex flex-col gap-5 px-5 py-6 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:32px_32px] sm:px-7 sm:py-7 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">{data?.fileName ?? analysis?.fileName ?? "Ingen fil uploadet endnu"}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Salgsdashboard</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {hasData ? `${number(allRows.length)} rækker er klar til analyse.` : "Upload en Excel-fil for at udfylde dashboardet."}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <StatusBox feedback={data?.feedback} analysis={analysis} />
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
                  {hasData ? "Ledelsesresume oprettet" : "Afventer upload"}
                </div>
              </div>
            </div>
            <DataDetectedCard feedback={data?.feedback} rowCount={allRows.length} onEdit={() => setShowManualMapping(true)} />
          </div>

          {shouldShowManualMapping ? (
            <ManualMappingPanel
              analysis={analysis}
              selectedSheet={selectedSheet}
              mappings={manualMappings}
              onSheetChange={(sheetName) => selectSheet(sheetName)}
              onMappingChange={(field, column) => setManualMappings((current) => ({ ...current, [field]: column }))}
              onApply={applyManualMappings}
            />
          ) : null}

          {hasData ? (
            <DashboardFilterBar
              rows={allRows}
              filteredRowCount={metrics.rowCount}
              filters={filters}
              onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
              onReset={() => setFilters(emptyDashboardFilters)}
            />
          ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">Resultatoverblik</p>
                <h2 className="mt-1.5 text-2xl font-semibold text-ink">Centrale nøgletal</h2>
              </div>
              <p className="text-xs text-slate-500">Beregnet ud fra de registrerede data</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Samlet omsætning"
                value={hasData ? currency(metrics.totalRevenue) : "Ingen data"}
                detail={hasData ? `Kilde: ${data?.feedback.revenueSource}` : "Upload et regneark"}
                emphasis
                icon={CircleDollarSign}
                tone="brand"
              />
              <KpiCard
                label={primaryProfitLabel}
                value={primaryProfitValue}
                detail={primaryProfitDetail}
                emphasis
                icon={TrendingUp}
                tone="positive"
              />
              <KpiCard
                label="Omsætning mod budget"
                value={showBudget ? currency(metrics.revenueVsBudget) : "Ikke tilgængeligt"}
                detail={showBudget ? `Budgetteret omsætning: ${currency(metrics.budgetRevenue)}` : "Kræver budgetdata"}
                emphasis
                icon={Target}
                tone="warning"
              />
              <KpiCard
                label="Samlet antal solgte enheder"
                value={hasData ? number(metrics.totalUnits) : "Ingen data"}
                detail={hasData ? "Beregnet ud fra antalskolonnen" : "Upload et regneark"}
                emphasis
                icon={PackageCheck}
                tone="neutral"
              />
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_26px_rgba(16,32,51,0.045)] sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
              {secondaryMetrics.map((metric) => (
                <SecondaryMetric key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
              ))}
            </div>
          </section>

          <section className="space-y-6 border-y border-brand-100 bg-[#e8f4f5] px-4 py-7 sm:px-6 sm:py-8">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">Ledelsesanalyse</p>
                <h2 className="mt-1.5 text-2xl font-semibold text-ink">Omsætningsudvikling og indsigt</h2>
              </div>
              <p className="max-w-sm text-xs leading-5 text-slate-600 sm:text-right">Hovedtendenser og beslutningsstøtte samlet i én ledelsesvisning</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] xl:items-start">
              <div className="overflow-hidden rounded-lg border border-brand-100 bg-white shadow-[0_18px_48px_rgba(16,32,51,0.11)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(90deg,#ffffff_0%,#f5fbfc_100%)] px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-700">Primær udvikling</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">Omsætning pr. måned</h3>
                    <p className="text-xs leading-5 text-slate-500">Omsætningsudvikling i den valgte periode</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-600 text-white shadow-[0_8px_18px_rgba(8,145,178,0.2)]">
                    <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="p-4 sm:p-6">
                {hasFilteredData ? (
                  <div className="h-[380px] sm:h-[460px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsAreaChart data={metrics.monthly} margin={{ top: 12, right: 20, bottom: 10, left: 0 }}>
                        <defs>
                          <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0891b2" stopOpacity={0.28} />
                            <stop offset="90%" stopColor="#0891b2" stopOpacity={0.025} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#dcebed" strokeDasharray="4 5" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} dy={8} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} width={56} tickFormatter={(value) => `${number(value / 1000)} t.kr.`} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => currency(value)} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#0891b2"
                          strokeWidth={3}
                          fill="url(#revenueAreaFill)"
                          dot={{ r: 3, fill: "#ffffff", stroke: "#0891b2", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#0891b2", stroke: "#ffffff", strokeWidth: 3 }}
                        />
                      </RechartsAreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart message="Ingen rækker matcher de aktuelle filtre for dette diagram." />
                )}
                </div>
              </div>

              <div className="space-y-4">
                {hasData ? (
                  <MonthlyReportCard
                    rows={allRows}
                    filters={filters}
                    feedback={data?.feedback}
                    preferredMonth={baseMetrics.bestMonth?.name}
                    selectedMonth={reportMonth}
                    onMonthChange={setReportMonth}
                  />
                ) : null}

                <section className="rounded-lg border border-slate-800 bg-[#102033] p-5 text-white shadow-[0_16px_38px_rgba(16,32,51,0.18)] sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan-200">Beslutningsgrundlag</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">Ledelsesresume</h2>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10 text-cyan-200">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>

                  <ul className="mt-5 space-y-3.5">
                    {executiveSummary.insights.map((insight, index) => (
                      <li key={insight} className="grid grid-cols-[22px_1fr] gap-3 text-xs leading-5 text-slate-200">
                        <span className="text-[10px] font-semibold text-cyan-300">0{index + 1}</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-xs font-semibold leading-5 text-white">{executiveSummary.conclusion}</p>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      {executiveSummary.status}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="space-y-5 border-t border-brand-100/90 pt-7">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-brand-700">Supplerende analyse</p>
                  <h2 className="mt-1.5 text-xl font-semibold text-ink">Fordeling på produkter og kategorier</h2>
                </div>
                <p className="text-xs text-slate-500">Rangerede visninger af de registrerede data</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-12">
                <div className={`${chartCardClass} lg:col-span-7`}>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="font-semibold text-ink">Antal solgte pr. produkt</h3>
                      <p className="text-xs leading-5 text-slate-500">Produkter rangeret efter solgte enheder</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                  {hasFilteredData ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.productsByUnits} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                          <CartesianGrid stroke="#e7eef2" strokeDasharray="3 4" horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                          <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => `${number(value)} enheder`} />
                          <Bar dataKey="units" fill="#0891b2" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="Ingen rækker matcher de aktuelle filtre for dette diagram." />
                  )}
                  </div>
                </div>

                <div className={`${chartCardClass} lg:col-span-5`}>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="font-semibold text-ink">Omsætning pr. kategori</h3>
                      <p className="text-xs leading-5 text-slate-500">Kategorier rangeret efter omsætning</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                  {hasFilteredData ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.categories} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
                          <CartesianGrid stroke="#e7eef2" strokeDasharray="3 4" horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(value) => `${number(value / 1000)} t.kr.`} />
                          <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => currency(value)} />
                          <Bar dataKey="revenue" fill="#0891b2" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="Ingen rækker matcher de aktuelle filtre for dette diagram." />
                  )}
                  </div>
                </div>

                <div className={`${chartCardClass} lg:col-span-6`}>
                  <div className="flex items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="font-semibold text-ink">Dækningsbidrag pr. kategori</h3>
                      <p className="text-xs leading-5 text-slate-500">Vises, når dækningsbidrag er fundet</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-700">
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                  {showGrossProfit && metrics.grossProfitByCategory.length ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.grossProfitByCategory} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
                          <CartesianGrid stroke="#e7eef2" strokeDasharray="3 4" horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(value) => `${number(value / 1000)} t.kr.`} />
                          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => currency(value)} />
                          <Bar dataKey="grossProfit" fill="#22c55e" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="Upload data med dækningsbidrag for at vise dette diagram." />
                  )}
                  </div>
                </div>

                <div className={`${chartCardClass} lg:col-span-6`}>
                  <div className="flex items-center justify-between gap-4 border-b border-orange-100 bg-orange-50/70 px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="font-semibold text-ink">Omkostninger pr. kategori</h3>
                      <p className="text-xs leading-5 text-slate-500">Vises, når omkostningsdata er fundet</p>
                    </div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-orange-100 text-orange-700">
                      <WalletCards className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                  {showCosts && costsByCategory.length ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costsByCategory} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
                          <CartesianGrid stroke="#e7eef2" strokeDasharray="3 4" horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(value) => `${number(value / 1000)} t.kr.`} />
                          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "#64748b" }} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f8fafc" }} formatter={(value: number) => currency(value)} />
                          <Bar dataKey="cost" fill="#f97316" radius={[0, 5, 5, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart message="Upload et regneark med omkostningsdata for at vise fordelingen." />
                  )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {showBudget ? (
            <section className="space-y-5 border-y border-orange-100 bg-[#fff8f2] px-4 py-6 sm:px-6 sm:py-7">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-orange-700">Økonomisk pejlemærke</p>
                  <h2 className="mt-1.5 text-2xl font-semibold text-ink">Budgetoverblik</h2>
                </div>
                <p className="text-xs text-slate-500">Budgettal for den aktuelle visning</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Budgetteret omsætning"
                  value={currency(metrics.budgetRevenue)}
                  detail={isFiltered ? "Fordelt efter andelen af filtrerede rækker" : (data?.feedback.budget?.sheetName ?? "Budget")}
                  icon={WalletCards}
                  tone="brand"
                />
                <KpiCard
                  label="Budgetterede omkostninger"
                  value={currency(metrics.budgetCosts)}
                  detail={isFiltered ? "Fordelt efter andelen af filtrerede rækker" : "Fundne budgetomkostninger"}
                  icon={Target}
                  tone="warning"
                />
                <KpiCard
                  label="Budgetteret resultat"
                  value={currency(metrics.budgetResult)}
                  detail="Budgetteret omsætning minus omkostninger"
                  icon={TrendingUp}
                  tone="positive"
                />
              </div>
            </section>
          ) : null}

          <div className="border-t border-slate-200/70 pt-5">
            <FeedbackPanel feedback={data?.feedback} />
          </div>
        </section>
      </section>
    </main>
  );
}
