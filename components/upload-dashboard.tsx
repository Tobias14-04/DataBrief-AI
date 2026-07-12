"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  LineChart,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
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

const chartColors = ["#0891b2", "#f97316", "#22c55e", "#6366f1", "#e11d48", "#14b8a6"];
const chartCardClass =
  "rounded-lg border border-slate-200/70 bg-white/70 p-5 shadow-[0_1px_3px_rgba(16,32,51,0.035)] backdrop-blur-sm sm:p-6";
const chartTooltipStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 10px 28px rgba(16,32,51,0.1)",
  color: "#102033",
};

const fieldLabels: Record<FieldKey, string> = {
  date: "Date",
  month: "Month",
  product: "Product",
  category: "Category",
  channel: "Channel",
  region: "Region",
  units: "Units",
  netRevenue: "Net revenue",
  grossRevenue: "Gross revenue",
  revenue: "Revenue",
  grossProfit: "Gross profit",
  grossMargin: "Gross margin",
  cost: "Cost",
  unitPrice: "Unit price",
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
  { month: "Jan 2026", monthIndex: 0, factor: 0.88 },
  { month: "Feb 2026", monthIndex: 1, factor: 0.94 },
  { month: "Mar 2026", monthIndex: 2, factor: 1 },
  { month: "Apr 2026", monthIndex: 3, factor: 1.08 },
  { month: "May 2026", monthIndex: 4, factor: 1.15 },
  { month: "Jun 2026", monthIndex: 5, factor: 1.24 },
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
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function cleanMonth(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "Unknown month";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
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
  if (!mappings.product) missing.push("Product / Produkt");
  if (!mappings.category) missing.push("Category / Kategori");
  if (!mappings.units) missing.push("Units / Antal");
  if (!mappings.date && !mappings.month) missing.push("Date / Dato or Month / Maaned");
  if (!mappings.netRevenue && !mappings.grossRevenue && !mappings.revenue && !mappings.unitPrice) {
    missing.push("Revenue / Nettoomsaetning / Bruttoomsaetning or Units x Price");
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
    return { value: netRevenue, source: mappings.netRevenue ?? "Net revenue" };
  }

  const grossRevenue = toNumber(getCell(row, mappings, "grossRevenue"));
  if (grossRevenue !== null) {
    return { value: grossRevenue, source: mappings.grossRevenue ?? "Gross revenue" };
  }

  const revenue = toNumber(getCell(row, mappings, "revenue"));
  if (revenue !== null) {
    return { value: revenue, source: mappings.revenue ?? "Revenue" };
  }

  const units = toNumber(getCell(row, mappings, "units"));
  const unitPrice = toNumber(getCell(row, mappings, "unitPrice"));
  if (units !== null && unitPrice !== null) {
    return { value: units * unitPrice, source: `${mappings.units ?? "Units"} x ${mappings.unitPrice ?? "Price"}` };
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
      const month = mappedMonth !== "Unknown month" ? mappedMonth : date ? monthLabel(date) : mappedMonth;
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
    throw new Error(`Missing required mappings: ${missingFields.join(", ")}.`);
  }

  const parsed = parseSalesRows(candidate, mappings);

  if (!parsed.rows.length) {
    throw new Error(`No valid sales rows found on "${candidate.name}". Try selecting the worksheet and columns manually.`);
  }

  const status = manual ? "warning" : getStatus(candidate, parsed.rows);
  const warnings = [
    ...(manual ? ["Manual column mapping is being used."] : []),
    ...(status === "warning" && !manual ? ["Auto mapping looks usable, but confidence is below the ideal threshold."] : []),
    ...(parsed.skippedRows.length ? [`Ignored ${parsed.skippedRows.length} incomplete or non-data rows.`] : []),
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
      revenueSource: parsed.revenueSource || "Selected revenue column",
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
    const key = keyGetter(row) || "Uncategorized";
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
    const displayMonth = row.month || (row.date ? monthLabel(row.date) : "Unknown month");
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

    const category = categoryHeader ? String(row[categoryHeader] ?? "Costs").trim() || "Costs" : "Costs";
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
          reject(new Error("No worksheets found in this Excel file."));
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

    reader.onerror = () => reject(new Error("Unable to read the uploaded file."));
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

function buildSummary(
  metrics: ReturnType<typeof calculateMetrics>,
  feedback?: MappingFeedback,
  context: { totalRows?: number; activeFilters?: string[] } = {},
) {
  if (!metrics.rowCount || !metrics.bestProduct || !metrics.bestCategory || !metrics.bestMonth) {
    return "No sales rows match the current filters. Reset or adjust the filters to update this summary.";
  }

  const isFiltered = Boolean(context.activeFilters?.length);

  const profitText = metrics.hasGrossProfit
    ? ` Gross profit is ${currency(metrics.totalGrossProfit)}, with a gross margin of ${percent(metrics.grossMargin)}.`
    : "";
  const costText = metrics.hasCosts
    ? ` ${isFiltered ? "For this selection, estimated" : "Workbook"} costs are ${currency(
        metrics.totalCosts,
      )}, giving a result of ${currency(metrics.actualResult)}.`
    : "";
  const budgetText = feedback?.budget
    ? ` Against budget, actual revenue is ${currency(Math.abs(metrics.revenueVsBudget))} ${
        metrics.revenueVsBudget >= 0 ? "above" : "below"
      } budget revenue.`
    : "";

  const scopeText = isFiltered
    ? `For ${context.activeFilters?.join(", ")}, DataBrief AI analyzed ${number(metrics.rowCount)} of ${number(
        context.totalRows ?? metrics.rowCount,
      )} sales rows`
    : `DataBrief AI analyzed ${number(metrics.rowCount)} sales rows`;

  return `${scopeText} from ${
    feedback?.salesSheetName ?? "the detected sales sheet"
  }, totaling ${currency(metrics.totalRevenue)} and ${number(metrics.totalUnits)} units sold. The best product is ${
    metrics.bestProduct.name
  }, and ${metrics.bestCategory.name} is the leading category by revenue. ${
    metrics.bestMonth.name
  } is the strongest month with ${currency(metrics.bestMonth.revenue)}.${profitText}${costText}${budgetText}`;
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
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Brief"], ["Sample workbook for DataBrief AI"]]), "Brief");
  return workbook;
}

function downloadSampleExcel() {
  const workbook = createSampleWorkbook();
  XLSX.writeFile(workbook, "databrief-ai-sample-workbook.xlsx");
}

function KpiCard({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`relative min-h-36 overflow-hidden rounded-lg border p-4 transition-shadow sm:p-5 ${
        emphasis
          ? "border-brand-100 bg-[linear-gradient(145deg,#ffffff_0%,#f2fbfc_100%)] shadow-[0_10px_28px_rgba(8,145,178,0.08)]"
          : "border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(16,32,51,0.03)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`h-1.5 w-1.5 rounded-full ${emphasis ? "bg-brand-500" : "bg-slate-300"}`} aria-hidden="true" />
      </div>
      <p className={`mt-3 break-words font-semibold text-ink ${emphasis ? "text-[1.7rem]" : "text-2xl"}`}>{value}</p>
      <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs leading-5 text-slate-500">{detail}</p>
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
    status === "success" ? "Auto-mapped successfully" : status === "warning" ? "Auto-mapped with warnings" : "Manual mapping required";
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
        {!feedback && analysis ? <p className="mt-0.5 text-xs leading-5">Choose a worksheet and map the required columns below.</p> : null}
      </div>
    </div>
  );
}

function mappedColumn(feedback: MappingFeedback, label: string) {
  return feedback.mappedColumns[label] ?? feedback.optionalColumns[label] ?? "Not mapped";
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
      ? "Auto-mapped successfully"
      : feedback.status === "warning"
        ? "Auto-mapped with warnings"
        : "Manual mapping applied";

  return (
    <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Data detected</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {feedback.salesSheetName}, header row {feedback.headerRow}, {number(rowCount)} valid rows
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:border-brand-500 hover:text-brand-700"
        >
          Edit column mapping
        </button>
      </div>

      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Mapping status", statusText],
          ["Revenue column", feedback.revenueSource],
          ["Units column", mappedColumn(feedback, "Units")],
          ["Product column", mappedColumn(feedback, "Product")],
          ["Category column", mappedColumn(feedback, "Category")],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 border-l border-slate-200 pl-3">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="mt-1 truncate text-xs font-semibold text-ink" title={value}>{value}</p>
          </div>
        ))}
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
      <summary className="cursor-pointer text-xs font-semibold text-slate-600 transition hover:text-ink">View detection details</summary>
      <div className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4">
        <Info className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">Workbook detection</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sales worksheet: <span className="font-semibold text-ink">{feedback.salesSheetName}</span>. Header row:{" "}
            <span className="font-semibold text-ink">{feedback.headerRow}</span>. Detected sheets:{" "}
            {feedback.detectedSheets.join(", ")}.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Mapped columns</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {Object.entries(feedback.mappedColumns).map(([field, column]) => (
                  <li key={field}>
                    {field}: <span className="font-medium text-ink">{column}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Revenue source: {feedback.revenueSource}</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Optional data</p>
              {optionalEntries.length ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {optionalEntries.map(([field, column]) => (
                    <li key={field}>
                      {field}: <span className="font-medium text-ink">{column}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No gross profit, gross margin, or cost columns found.</p>
              )}
              {feedback.costs ? <p className="mt-2 text-xs text-slate-500">Costs sheet: {feedback.costs.sheetName}</p> : null}
              {feedback.budget ? <p className="mt-1 text-xs text-slate-500">Budget sheet: {feedback.budget.sheetName}</p> : null}
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
    { key: "dateOrMonth", label: "Date or Month", required: true },
    { key: "product", label: "Product", required: true },
    { key: "category", label: "Category", required: true },
    { key: "units", label: "Units", required: true },
    { key: "revenue", label: "Revenue", required: true },
    { key: "cost", label: "Cost", required: false },
    { key: "grossProfit", label: "Gross profit", required: false },
    { key: "grossMargin", label: "Gross margin", required: false },
  ];

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-ink">Manual column mapping</h3>
          <p className="mt-1 text-sm text-slate-500">
            Worksheet candidates can use different header rows. Current header row: {candidate.headerIndex + 1}.
          </p>
        </div>
        <div className="text-sm text-slate-500">Confidence: {candidate.confidence}%</div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Worksheet
          <select
            value={selectedSheet}
            onChange={(event) => onSheetChange(event.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink"
          >
            {analysis.candidates.map((sheet) => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name} - row {sheet.headerIndex + 1} - {sheet.confidence}%
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
              <option value="">Not mapped</option>
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
        Apply selected mappings
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
    { field: "month", label: "Month", allLabel: "All months" },
    { field: "product", label: "Product", allLabel: "All products" },
    { field: "category", label: "Category", allLabel: "All categories" },
    { field: "channel", label: "Channel", allLabel: "All channels" },
    { field: "region", label: "Region", allLabel: "All regions" },
  ];
  const controls = definitions
    .map((definition) => ({ ...definition, options: uniqueValues(rows, definition.field) }))
    .filter((definition) => definition.options.length > 0);
  const activeFilters = getActiveFilterLabels(filters);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/75 shadow-[0_1px_3px_rgba(16,32,51,0.04)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Filter className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand-700">Explore your dashboard</p>
            <h2 className="mt-0.5 text-lg font-semibold text-ink">Filter the current view</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!activeFilters.length}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset filters
        </button>
      </div>

      <div className="grid gap-3 px-5 pb-5 pt-2 sm:grid-cols-2 sm:px-6 xl:grid-cols-3 2xl:grid-cols-5">
        {controls.map((control) => (
          <label key={control.field} className="block min-w-0 text-xs font-semibold text-slate-500">
            {control.label}
            <span className="relative mt-1.5 block">
              <select
                value={filters[control.field]}
                onChange={(event) => onChange(control.field, event.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(16,32,51,0.03)] outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">{control.allLabel}</option>
                {control.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium">
          Showing <span className="font-semibold text-ink">{number(filteredRowCount)}</span> of {number(rows.length)} rows
        </p>
        <p className="truncate">
          {activeFilters.length ? (
            <>
              Filtered by: <span className="font-semibold text-ink">{activeFilters.join(", ")}</span>
            </>
          ) : (
            "All available sales data is included"
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
  const budgetStatus = Math.abs(deviation) <= tolerance ? "On budget" : deviation > 0 ? "Over budget" : "Under budget";
  const budgetStatusClasses =
    budgetStatus === "On budget"
      ? "bg-emerald-50 text-emerald-700"
      : budgetStatus === "Over budget"
        ? "bg-brand-50 text-brand-700"
        : "bg-amber-50 text-amber-700";
  const resultLabel = reportMetrics.hasGrossProfit ? "Gross profit" : reportMetrics.hasCosts ? "Result" : "Units sold";
  const resultValue = reportMetrics.hasGrossProfit
    ? currency(reportMetrics.totalGrossProfit)
    : reportMetrics.hasCosts
      ? currency(reportMetrics.actualResult)
      : number(reportMetrics.totalUnits);
  const profitSentence = reportMetrics.hasGrossProfit
    ? `, gross profit was ${currency(reportMetrics.totalGrossProfit)}`
    : reportMetrics.hasCosts
      ? `, result was ${currency(reportMetrics.actualResult)}`
      : "";
  const budgetSentence = hasBudget
    ? `, and revenue was ${currency(Math.abs(deviation))} ${deviation >= 0 ? "above" : "below"} the allocated monthly budget`
    : "";

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/85 shadow-[0_6px_22px_rgba(16,32,51,0.045)]">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-50 text-accent-600">
            <CalendarRange className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-accent-600">Period analysis</p>
            <h2 className="mt-0.5 text-lg font-semibold text-ink">Monthly report</h2>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Report month</span>
          <span className="relative block">
            <select
              value={reportMonth}
              onChange={(event) => onMonthChange(event.target.value)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(16,32,51,0.03)] outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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

      <div className="grid border-y border-slate-100 sm:grid-cols-3">
        {[
          ["Revenue", currency(reportMetrics.totalRevenue)],
          [resultLabel, resultValue],
          [hasBudget ? "Budget status" : "Rows included", hasBudget ? budgetStatus : number(reportMetrics.rowCount)],
        ].map(([label, value], index) => (
          <div key={label} className={`px-5 py-4 sm:px-6 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p
              className={`mt-2 text-2xl font-semibold text-ink ${hasBudget && label === "Budget status" ? `inline-flex rounded-md px-2.5 py-1 text-base ${budgetStatusClasses}` : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50/65 px-5 py-5 sm:px-6">
        <p className="border-l-2 border-brand-400 pl-4 text-sm font-medium leading-7 text-slate-700">
          {reportRows.length
            ? `In ${reportMonth}, revenue was ${currency(reportMetrics.totalRevenue)}${profitSentence}${budgetSentence}.`
            : `No rows match the current filters for ${reportMonth}.`}
        </p>
        {hasBudget ? <p className="mt-1 text-xs text-slate-500">Budget comparison uses an allocated monthly benchmark for this selection.</p> : null}
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
  const summary = useMemo(
    () => buildSummary(metrics, data?.feedback, { totalRows: allRows.length, activeFilters: activeFilterLabels }),
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
          `Manual mapping required. Best worksheet "${best.name}" is missing: ${best.missingFields.join(
            ", ",
          )}. Columns found: ${best.headers.join(", ") || "none"}.`,
        );
      }
    } catch (error) {
      setData(null);
      setAnalysis(null);
      setSelectedSheet("");
      setManualMappings(emptyManualMappings);
      setShowManualMapping(false);
      setError(error instanceof Error ? error.message : "The spreadsheet could not be parsed.");
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
      const file = new File([workbookData], "DataBrief AI demo dataset.xlsx", {
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
          `Manual mapping required. Best worksheet "${best.name}" is missing: ${best.missingFields.join(
            ", ",
          )}. Columns found: ${best.headers.join(", ") || "none"}.`,
        );
      }
    } catch (error) {
      setData(null);
      setAnalysis(null);
      setSelectedSheet("");
      setManualMappings(emptyManualMappings);
      setShowManualMapping(false);
      setError(error instanceof Error ? error.message : "The demo dataset could not be loaded.");
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
      setError(error instanceof Error ? error.message : "Manual mapping failed. Check the selected columns.");
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
              Home
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
              Spreadsheet analysis, without the setup
            </div>
            <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">Upload sales data</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Choose an Excel file or use the demo dataset to generate a dashboard and business summary.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            {["Danish & English headers supported", "No template required", "Browser-based analysis"].map((item) => (
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
                  <h2 className="font-semibold text-ink">Choose your sales workbook</h2>
                  <p className="text-sm text-slate-500">Your file is processed locally in this browser.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <label className="group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-8 text-center shadow-inner transition hover:border-brand-500 hover:bg-brand-50/35">
                  <span className="grid h-14 w-14 place-items-center rounded-lg border border-brand-100 bg-white text-brand-700 shadow-[0_8px_22px_rgba(8,145,178,0.12)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(8,145,178,0.18)]">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="mt-4 text-base font-semibold text-ink">
                    {isLoading ? "Reading spreadsheet..." : "Choose an Excel file"}
                  </span>
                  <span className="mt-1.5 text-sm text-slate-500">Select an .xlsx workbook from your device</span>
                  <span className="mt-3 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    Flexible Danish and English columns
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
                    Download sample Excel file
                  </button>
                  <button
                    type="button"
                    onClick={loadDemoDataset}
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4 text-accent-600" aria-hidden="true" />
                    Use demo dataset
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
                  <h2 className="font-semibold text-ink">Supported columns and layouts</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">
                    DataBrief AI finds likely header rows and maps common sales fields automatically, even when the
                    worksheet uses Danish names or starts below a title row.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600 sm:grid-cols-3">
                {["Worksheet detection", "Flexible header rows", "Manual fallback available"].map((item) => (
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbfc_0%,#f8fafc_28%,#f8fafc_100%)]">
      <header className="border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-white shadow-[0_10px_24px_rgba(16,32,51,0.18)]">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold text-ink">DataBrief AI</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="self-start space-y-3 lg:sticky lg:top-6 lg:space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(16,32,51,0.06)] lg:p-4">
            <div className="mb-2 flex items-center gap-3 lg:mb-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-ink">Change sales data</h1>
                <p className="text-xs text-slate-500">Replace the current workbook</p>
              </div>
            </div>

            <label className="group flex cursor-pointer flex-row items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center transition hover:border-brand-500 hover:bg-brand-50/50 lg:min-h-28 lg:flex-col lg:gap-0 lg:py-4">
              <Upload className="h-5 w-5 text-brand-700 lg:h-6 lg:w-6" aria-hidden="true" />
              <span className="text-xs font-semibold text-ink lg:mt-2">
                {isLoading ? "Reading spreadsheet..." : "Choose an Excel file"}
              </span>
              <span className="mt-1 hidden text-[11px] text-slate-500 lg:block">English or Danish .xlsx</span>
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

            <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-3 lg:grid-cols-1">
              <button
                type="button"
                onClick={downloadSampleExcel}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-ink transition hover:border-brand-500 lg:px-3"
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Download sample
              </button>
              <button
                type="button"
                onClick={loadDemoDataset}
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-ink transition hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 lg:px-3"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-600" aria-hidden="true" />
                Use demo dataset
              </button>
            </div>
          </div>

          <details className="hidden rounded-lg border border-slate-200 bg-white/80 px-4 py-3 shadow-sm lg:block">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600">Workbook support</summary>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
              Flexible English and Danish aliases, header-row detection, and manual mapping fallback.
            </p>
          </details>
        </aside>

        <section className="min-w-0 space-y-8">
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(16,32,51,0.055)]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-700">{data?.fileName ?? analysis?.fileName ?? "No file uploaded yet"}</p>
                <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">Sales dashboard</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {hasData ? `${number(allRows.length)} rows available for analysis.` : "Upload an Excel file to populate this dashboard."}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <StatusBox feedback={data?.feedback} analysis={analysis} />
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  {hasData ? "Business summary generated" : "Waiting for upload"}
                </div>
              </div>
            </div>
            <DataDetectedCard feedback={data?.feedback} rowCount={allRows.length} onEdit={() => setShowManualMapping(true)} />
          </div>

          <FeedbackPanel feedback={data?.feedback} />

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

          <section className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-700">Performance overview</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Key business metrics</h2>
              </div>
              <p className="text-xs text-slate-500">Calculated from the detected workbook data</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <KpiCard
                label="Total revenue"
                value={hasData ? currency(metrics.totalRevenue) : "No data"}
                detail={hasData ? `Source: ${data?.feedback.revenueSource}` : "Upload a workbook"}
                emphasis
              />
              <KpiCard
                label="Total units sold"
                value={hasData ? number(metrics.totalUnits) : "No data"}
                detail={hasData ? "Summed from detected units column" : "Upload a workbook"}
                emphasis
              />
              <KpiCard
                label="Best product"
                value={metrics.bestProduct?.name ?? "No data"}
                detail={metrics.bestProduct ? `${currency(metrics.bestProduct.revenue)} revenue` : "Calculated after upload"}
              />
              <KpiCard
                label="Best category"
                value={metrics.bestCategory?.name ?? "No data"}
                detail={metrics.bestCategory ? `${currency(metrics.bestCategory.revenue)} revenue` : "Calculated after upload"}
              />
              <KpiCard
                label="Best month"
                value={metrics.bestMonth?.name ?? "No data"}
                detail={metrics.bestMonth ? `${currency(metrics.bestMonth.revenue)} revenue` : "Calculated after upload"}
              />
              {showGrossProfit ? (
                <KpiCard label="Gross profit" value={currency(metrics.totalGrossProfit)} detail="From gross profit / contribution margin" />
              ) : null}
              {hasData && baseMetrics.hasGrossMargin ? <KpiCard label="Gross margin" value={percent(metrics.grossMargin)} detail="From margin column" /> : null}
              {showCosts ? (
                <KpiCard
                  label="Total costs"
                  value={currency(metrics.totalCosts)}
                  detail={isFiltered ? "Derived from the filtered sales rows" : data?.feedback.costs ? "From costs sheet" : "From mapped sales costs"}
                />
              ) : null}
              {showCosts ? <KpiCard label="Result" value={currency(metrics.actualResult)} detail="Revenue minus costs" /> : null}
              {showBudget ? (
                <KpiCard
                  label="Revenue vs budget"
                  value={currency(metrics.revenueVsBudget)}
                  detail={`Budget revenue: ${currency(metrics.budgetRevenue)}`}
                />
              ) : null}
            </div>
          </section>

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

          {showBudget ? (
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-brand-700">Plan comparison</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Budget overview</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Budget revenue"
                  value={currency(metrics.budgetRevenue)}
                  detail={isFiltered ? "Allocated to the current filtered row share" : (data?.feedback.budget?.sheetName ?? "Budget")}
                />
                <KpiCard
                  label="Budget costs"
                  value={currency(metrics.budgetCosts)}
                  detail={isFiltered ? "Allocated to the current filtered row share" : "Detected budget costs"}
                />
                <KpiCard label="Budget result" value={currency(metrics.budgetResult)} detail="Budget revenue minus costs" />
              </div>
            </section>
          ) : null}

          <section className="space-y-5 border-t border-slate-200/70 pt-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-brand-700">Visual analysis</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Trends and breakdowns</h2>
              </div>
              <p className="text-xs text-slate-500">Interactive views generated from the mapped data</p>
            </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className={chartCardClass}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-ink">Revenue by month</h3>
                  <p className="text-xs leading-5 text-slate-500">Uses Date, or Month when dates cannot be parsed</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                  <LineChart className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              {hasFilteredData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={metrics.monthly} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf2f7" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => currency(value)} />
                      <Line type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No rows match the current filters for this chart." />
              )}
            </div>

            <div className={chartCardClass}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-ink">Units by product</h3>
                  <p className="text-xs leading-5 text-slate-500">Units sold ranked by product</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-orange-100 bg-orange-50 text-accent-600">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              {hasFilteredData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.productsByUnits} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf2f7" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
                      <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => `${number(value)} units`} />
                      <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                        {metrics.productsByUnits.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No rows match the current filters for this chart." />
              )}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className={chartCardClass}>
              <div className="mb-4">
                <h3 className="font-semibold text-ink">Revenue by category</h3>
                <p className="text-xs leading-5 text-slate-500">Share of sales by category</p>
              </div>
              {hasFilteredData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.categories} dataKey="revenue" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                        {metrics.categories.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => currency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="No rows match the current filters for this chart." />
              )}
            </div>

            <div className={chartCardClass}>
              <div className="mb-4">
                <h3 className="font-semibold text-ink">Gross profit by category</h3>
                <p className="text-xs leading-5 text-slate-500">Shown when gross profit is mapped</p>
              </div>
              {showGrossProfit && metrics.grossProfitByCategory.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.grossProfitByCategory} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf2f7" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => currency(value)} />
                      <Bar dataKey="grossProfit" radius={[6, 6, 0, 0]}>
                        {metrics.grossProfitByCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload data with gross profit / contribution margin to show this chart." />
              )}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className={chartCardClass}>
              <div className="mb-4">
                <h3 className="font-semibold text-ink">Costs by category</h3>
                <p className="text-xs leading-5 text-slate-500">Shown when a costs sheet is detected</p>
              </div>
              {showCosts && costsByCategory.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costsByCategory} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#edf2f7" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "#64748b" }} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "#f1f5f9" }} formatter={(value: number) => currency(value)} />
                      <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                        {costsByCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload a workbook with a Costs / Omkostninger sheet to show costs by category." />
              )}
            </div>

            <div className="relative h-full overflow-hidden rounded-lg border border-brand-100/80 bg-white/90 p-6 shadow-[0_8px_28px_rgba(8,145,178,0.07)] sm:p-7">
              <div className="absolute inset-y-0 left-0 w-1 bg-brand-500" aria-hidden="true" />
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-700">Generated insight</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-ink">Executive summary</h3>
                  <p className="text-xs leading-5 text-slate-500">Rule-based summary from the current dashboard view</p>
                </div>
              </div>
              <p className="border-l-2 border-slate-200 pl-4 text-[15px] font-medium leading-8 text-slate-700 sm:text-base">{summary}</p>
              <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {isFiltered ? "Updated for the active filters" : "Based on all available sales rows"}
              </div>
            </div>
          </div>
          </section>
        </section>
      </section>
    </main>
  );
}
