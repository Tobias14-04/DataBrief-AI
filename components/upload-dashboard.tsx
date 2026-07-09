"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileSpreadsheet,
  Info,
  LineChart,
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

type MappingFeedback = {
  salesSheetName: string;
  detectedSheets: string[];
  mappedColumns: Record<string, string>;
  optionalColumns: Record<string, string>;
  revenueSource: string;
  costs?: OptionalSheetSummary;
  budget?: BudgetSummary;
};

type ParseResult = {
  rows: SaleRow[];
  fileName: string;
  feedback: MappingFeedback;
};

type SheetCandidate = {
  name: string;
  rows: unknown[][];
  headers: string[];
  headerIndex: number;
  mappings: FieldMappings;
  score: number;
};

type FieldKey =
  | "date"
  | "month"
  | "product"
  | "category"
  | "units"
  | "netRevenue"
  | "grossRevenue"
  | "revenue"
  | "grossProfit"
  | "grossMargin"
  | "cost"
  | "unitPrice";

type FieldMappings = Partial<Record<FieldKey, string>>;

const chartColors = ["#0891b2", "#f97316", "#22c55e", "#6366f1", "#e11d48", "#14b8a6"];

const fieldLabels: Record<FieldKey, string> = {
  date: "Date",
  month: "Month",
  product: "Product",
  category: "Category",
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
  date: ["Date", "Dato"],
  month: ["Month", "Måned", "Maaned"],
  product: ["Product", "Produkt"],
  category: ["Category", "Kategori"],
  units: ["Units", "Antal", "Quantity", "Qty"],
  netRevenue: ["Nettoomsætning", "Nettoomsaetning", "Net revenue"],
  grossRevenue: ["Bruttoomsætning", "Bruttoomsaetning", "Gross revenue"],
  revenue: ["Revenue", "Sales", "Budget revenue", "Budget omsætning", "Budget omsaetning"],
  grossProfit: ["Gross profit", "Dækningsbidrag", "Daekningsbidrag", "Contribution margin"],
  grossMargin: ["Gross margin", "Dækningsgrad", "Daekningsgrad", "Margin %"],
  cost: [
    "Cost",
    "Costs",
    "Vareforbrug",
    "Kostpris pr. stk.",
    "Omkostning",
    "Omkostninger",
    "Budget costs",
    "Budget cost",
    "Budget omkostninger",
    "Amount",
    "Beløb",
  ],
  unitPrice: ["Price", "Unit price", "Pris pr. stk.", "Pris", "Sales price"],
};

const sampleRows = [
  {
    Dato: "2026-01-12",
    "Måned": "Januar",
    Produkt: "Cortado",
    Kategori: "Kaffe",
    Antal: 120,
    "Pris pr. stk.": 42,
    "Nettoomsætning": 5040,
    "Dækningsbidrag": 3100,
    "Dækningsgrad": "61.5%",
  },
  {
    Dato: "2026-02-03",
    "Måned": "Februar",
    Produkt: "Surdejsbolle",
    Kategori: "Bageri",
    Antal: 84,
    "Pris pr. stk.": 38,
    "Nettoomsætning": 3192,
    "Dækningsbidrag": 1760,
    "Dækningsgrad": "55.1%",
  },
  {
    Dato: "2026-03-18",
    "Måned": "Marts",
    Produkt: "Morgenmenu",
    Kategori: "Menu",
    Antal: 64,
    "Pris pr. stk.": 89,
    "Nettoomsætning": 5696,
    "Dækningsbidrag": 3410,
    "Dækningsgrad": "59.9%",
  },
];

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
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const danishDate = /^(\d{1,2})[.-/](\d{1,2})[.-/](\d{2,4})$/.exec(text);
  if (danishDate) {
    const [, day, month, rawYear] = danishDate;
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

function detectHeaderRow(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 10).forEach((row, index) => {
    const headers = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    const mappings = buildMappings(headers);
    const score = scoreMappings(mappings);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function scoreMappings(mappings: FieldMappings) {
  let score = 0;
  if (mappings.date) score += 3;
  if (mappings.month) score += 1;
  if (mappings.product) score += 3;
  if (mappings.category) score += 2;
  if (mappings.units) score += 3;
  if (mappings.netRevenue) score += 4;
  if (mappings.grossRevenue) score += 3;
  if (mappings.revenue) score += 3;
  if (mappings.unitPrice) score += 1;
  if (mappings.grossProfit) score += 1;
  if (mappings.grossMargin) score += 1;
  return score;
}

function sheetToRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
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

function findSalesSheet(workbook: XLSX.WorkBook) {
  const candidates = workbook.SheetNames.map((name) => {
    const rows = sheetToRows(workbook.Sheets[name]);
    const headerIndex = detectHeaderRow(rows);
    const headers = (rows[headerIndex] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
    const mappings = buildMappings(headers);
    const nameBonus = normalizeHeader(name).includes("salg") || normalizeHeader(name).includes("sales") ? 2 : 0;

    return {
      name,
      rows,
      headers,
      headerIndex,
      mappings,
      score: scoreMappings(mappings) + nameBonus,
    };
  }).sort((a, b) => b.score - a.score);

  return candidates[0] ?? null;
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

function getMissingFields(candidate: SheetCandidate) {
  const missing: string[] = [];
  if (!candidate.mappings.product) missing.push("Product / Produkt");
  if (!candidate.mappings.category) missing.push("Category / Kategori");
  if (!candidate.mappings.units) missing.push("Units / Antal");
  if (!candidate.mappings.date && !candidate.mappings.month) missing.push("Date / Dato or Month / Måned");
  if (!candidate.mappings.netRevenue && !candidate.mappings.grossRevenue && !candidate.mappings.revenue && !candidate.mappings.unitPrice) {
    missing.push("Revenue / Nettoomsætning / Bruttoomsætning or Units x Price");
  }
  return missing;
}

function parseSalesRows(candidate: SheetCandidate) {
  const missingFields = getMissingFields(candidate);
  if (missingFields.length) {
    throw new Error(
      `Could not map the required sales fields. Missing: ${missingFields.join(
        ", ",
      )}. Columns found on "${candidate.name}": ${candidate.headers.join(", ") || "none"}.`,
    );
  }

  const records = rowsToRecords(candidate.rows, candidate.headerIndex, candidate.headers);
  const skippedRows: number[] = [];
  let revenueSource = "";

  const rows = records
    .map((row, index) => {
      const date = toDate(getCell(row, candidate.mappings, "date"));
      const month = date ? monthLabel(date) : cleanMonth(getCell(row, candidate.mappings, "month"));
      const product = String(getCell(row, candidate.mappings, "product") ?? "").trim();
      const category = String(getCell(row, candidate.mappings, "category") ?? "").trim();
      const units = toNumber(getCell(row, candidate.mappings, "units"));
      const revenue = getRevenue(row, candidate.mappings);
      const grossProfit = toNumber(getCell(row, candidate.mappings, "grossProfit"));
      const rawGrossMargin = toNumber(getCell(row, candidate.mappings, "grossMargin"));
      const grossMargin = rawGrossMargin !== null && rawGrossMargin > 1 ? rawGrossMargin / 100 : rawGrossMargin;
      const cost = toNumber(getCell(row, candidate.mappings, "cost"));

      const isBlankRow = !date && !product && !category && units === null && revenue.value === null;
      if (isBlankRow) {
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
        revenue: revenue.value,
        units,
        grossProfit,
        grossMargin,
        cost,
      };
    })
    .filter((row): row is SaleRow => Boolean(row));

  if (!rows.length) {
    throw new Error(`No valid sales rows found on "${candidate.name}". Check that mapped columns contain values.`);
  }

  if (skippedRows.length) {
    throw new Error(
      `Rows ${skippedRows.slice(0, 8).join(", ")} on "${candidate.name}" have invalid or missing values. Fix those rows and upload again.`,
    );
  }

  return { rows, revenueSource };
}

function groupRows(rows: SaleRow[], keyGetter: (row: SaleRow) => string) {
  const groups = new Map<string, GroupedValue>();

  rows.forEach((row) => {
    const key = keyGetter(row) || "Uncategorized";
    const current = groups.get(key) ?? { name: key, revenue: 0, units: 0, grossProfit: 0, cost: 0 };
    current.revenue += row.revenue;
    current.units += row.units;
    current.grossProfit += row.grossProfit ?? 0;
    current.cost += row.cost ?? 0;
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function groupRowsByMonth(rows: SaleRow[]) {
  const groups = new Map<string, MonthValue>();

  rows.forEach((row, index) => {
    const sortKey = row.date ? new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime() : index;
    const key = row.date ? String(sortKey) : row.month;
    const current = groups.get(key) ?? {
      name: row.date ? monthLabel(row.date) : row.month,
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
  const headers = (rows[headerIndex] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
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
  const headers = (rows[headerIndex] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
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

function mappedColumnsFor(candidate: SheetCandidate) {
  const required: FieldKey[] = ["date", "month", "product", "category", "units", "netRevenue", "grossRevenue", "revenue", "unitPrice"];
  return required.reduce<Record<string, string>>((result, field) => {
    const column = candidate.mappings[field];
    if (column) {
      result[fieldLabels[field]] = column;
    }
    return result;
  }, {});
}

function optionalColumnsFor(candidate: SheetCandidate) {
  const optional: FieldKey[] = ["grossProfit", "grossMargin", "cost"];
  return optional.reduce<Record<string, string>>((result, field) => {
    const column = candidate.mappings[field];
    if (column) {
      result[fieldLabels[field]] = column;
    }
    return result;
  }, {});
}

function parseWorkbook(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const salesSheet = findSalesSheet(workbook);

        if (!salesSheet) {
          reject(new Error("No worksheets found in this Excel file."));
          return;
        }

        const { rows, revenueSource } = parseSalesRows(salesSheet);
        const costs = parseCostSheet(workbook);
        const budget = parseBudgetSheet(workbook);

        resolve({
          rows,
          fileName: file.name,
          feedback: {
            salesSheetName: salesSheet.name,
            detectedSheets: workbook.SheetNames,
            mappedColumns: mappedColumnsFor(salesSheet),
            optionalColumns: optionalColumnsFor(salesSheet),
            revenueSource,
            costs,
            budget,
          },
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Unable to read the uploaded file."));
    reader.readAsArrayBuffer(file);
  });
}

function calculateMetrics(rows: SaleRow[], feedback?: MappingFeedback) {
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const totalGrossProfit = rows.reduce((sum, row) => sum + (row.grossProfit ?? 0), 0);
  const hasGrossProfit = rows.some((row) => row.grossProfit !== null);
  const hasGrossMargin = rows.some((row) => row.grossMargin !== null);
  const weightedGrossMargin = totalRevenue ? totalGrossProfit / totalRevenue : 0;
  const averageGrossMargin =
    rows.reduce((sum, row) => sum + (row.grossMargin ?? 0), 0) / Math.max(rows.filter((row) => row.grossMargin !== null).length, 1);
  const totalCosts = feedback?.costs?.total ?? rows.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const actualResult = totalRevenue - totalCosts;
  const productsByRevenue = groupRows(rows, (row) => row.product).sort((a, b) => b.revenue - a.revenue);
  const productsByUnits = groupRows(rows, (row) => row.product).sort((a, b) => b.units - a.units);
  const categories = groupRows(rows, (row) => row.category).sort((a, b) => b.revenue - a.revenue);
  const grossProfitByCategory = categories.filter((category) => category.grossProfit !== 0).sort((a, b) => b.grossProfit - a.grossProfit);
  const monthly = groupRowsByMonth(rows);
  const monthsByRevenue = [...monthly].sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalUnits,
    totalGrossProfit,
    grossMargin: hasGrossProfit ? weightedGrossMargin : averageGrossMargin,
    hasGrossProfit,
    hasGrossMargin,
    totalCosts,
    actualResult,
    budgetRevenue: feedback?.budget?.revenue ?? 0,
    budgetCosts: feedback?.budget?.costs ?? 0,
    budgetResult: feedback?.budget?.result ?? 0,
    revenueVsBudget: feedback?.budget ? totalRevenue - feedback.budget.revenue : 0,
    bestProduct: productsByRevenue[0],
    bestCategory: categories[0],
    bestMonth: monthsByRevenue[0],
    monthly,
    productsByUnits: productsByUnits.slice(0, 8),
    categories: categories.slice(0, 8),
    grossProfitByCategory: grossProfitByCategory.slice(0, 8),
    rowCount: rows.length,
  };
}

function buildSummary(metrics: ReturnType<typeof calculateMetrics>, feedback?: MappingFeedback) {
  if (!metrics.rowCount || !metrics.bestProduct || !metrics.bestCategory || !metrics.bestMonth) {
    return "Upload an Excel file to generate a concise business summary from your sales data.";
  }

  const profitText = metrics.hasGrossProfit
    ? ` Gross profit is ${currency(metrics.totalGrossProfit)}, with a gross margin of ${percent(metrics.grossMargin)}.`
    : "";
  const costText = feedback?.costs
    ? ` The ${feedback.costs.sheetName} sheet shows ${currency(metrics.totalCosts)} in costs, giving an actual result of ${currency(
        metrics.actualResult,
      )}.`
    : "";
  const budgetText = feedback?.budget
    ? ` Against budget, actual revenue is ${currency(Math.abs(metrics.revenueVsBudget))} ${
        metrics.revenueVsBudget >= 0 ? "above" : "below"
      } budget revenue.`
    : "";

  return `DataBrief AI analyzed ${number(metrics.rowCount)} sales rows from ${
    feedback?.salesSheetName ?? "the detected sales sheet"
  }, totaling ${currency(metrics.totalRevenue)} and ${number(metrics.totalUnits)} units sold. The best product is ${
    metrics.bestProduct.name
  }, and ${metrics.bestCategory.name} is the leading category by revenue. ${
    metrics.bestMonth.name
  } is the strongest month with ${currency(metrics.bestMonth.revenue)}.${profitText}${costText}${budgetText}`;
}

function downloadSampleExcel() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleRows), "Salgsdata");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { Kategori: "Løn", Omkostninger: 8200 },
      { Kategori: "Råvarer", Omkostninger: 5100 },
      { Kategori: "Lokale", Omkostninger: 3400 },
    ]),
    "Omkostninger",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([{ "Nettoomsætning": 18000, Omkostninger: 12000 }]),
    "Budget",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Brief"], ["Sample workbook for DataBrief AI"]]), "Brief");
  XLSX.writeFile(workbook, "databrief-ai-cafe-nord-sample.xlsx");
}

function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
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

function FeedbackPanel({ feedback }: { feedback?: MappingFeedback }) {
  if (!feedback) {
    return null;
  }

  const optionalEntries = Object.entries(feedback.optionalColumns);

  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-ink">Workbook detection</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sales worksheet: <span className="font-semibold text-ink">{feedback.salesSheetName}</span>. Detected sheets:{" "}
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
    </div>
  );
}

export default function UploadDashboard() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const metrics = useMemo(() => calculateMetrics(data?.rows ?? [], data?.feedback), [data?.rows, data?.feedback]);
  const summary = useMemo(() => buildSummary(metrics, data?.feedback), [metrics, data?.feedback]);
  const hasData = metrics.rowCount > 0;
  const showGrossProfit = hasData && metrics.hasGrossProfit;
  const showCosts = hasData && Boolean(data?.feedback.costs);
  const showBudget = hasData && Boolean(data?.feedback.budget);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const parsed = await parseWorkbook(file);
      setData(parsed);
    } catch (error) {
      setData(null);
      setError(error instanceof Error ? error.message : "The spreadsheet could not be parsed.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-white">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">DataBrief AI</span>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-5">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-brand-50 text-brand-700">
                <Upload className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Upload sales data</h1>
                <p className="text-sm text-slate-500">Excel is parsed in your browser.</p>
              </div>
            </div>

            <label className="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-brand-500 hover:bg-brand-50/50">
              <Upload className="h-8 w-8 text-brand-700" aria-hidden="true" />
              <span className="mt-3 text-sm font-semibold text-ink">
                {isLoading ? "Reading spreadsheet..." : "Choose an Excel file"}
              </span>
              <span className="mt-1 text-xs text-slate-500">.xlsx with English or Danish sales columns</span>
              <input
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={downloadSampleExcel}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-500"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download sample Excel file
            </button>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-ink">Supported columns</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The app detects English and Danish headers including Dato, Produkt, Kategori, Antal, Nettoomsætning,
                  Bruttoomsætning, Dækningsbidrag, and Dækningsgrad.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-700">{data?.fileName ?? "No file uploaded yet"}</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Sales dashboard</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {hasData ? `${number(metrics.rowCount)} rows included in this report.` : "Upload an Excel file to populate this dashboard."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {hasData ? "Business summary generated" : "Waiting for upload"}
              </div>
            </div>
          </div>

          <FeedbackPanel feedback={data?.feedback} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              value={hasData ? currency(metrics.totalRevenue) : "No data"}
              detail={hasData ? `Source: ${data?.feedback.revenueSource}` : "Upload a workbook"}
            />
            <KpiCard
              label="Total units sold"
              value={hasData ? number(metrics.totalUnits) : "No data"}
              detail={hasData ? "Summed from detected units column" : "Upload a workbook"}
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
              <KpiCard
                label="Gross profit"
                value={currency(metrics.totalGrossProfit)}
                detail="From Dækningsbidrag / gross profit"
              />
            ) : null}
            {hasData && metrics.hasGrossMargin ? (
              <KpiCard label="Gross margin" value={percent(metrics.grossMargin)} detail="From Dækningsgrad / margin" />
            ) : null}
            {showCosts ? <KpiCard label="Total costs" value={currency(metrics.totalCosts)} detail="From Omkostninger sheet" /> : null}
            {showCosts ? <KpiCard label="Result" value={currency(metrics.actualResult)} detail="Revenue minus costs" /> : null}
            {showBudget ? (
              <KpiCard
                label="Revenue vs budget"
                value={currency(metrics.revenueVsBudget)}
                detail={`Budget revenue: ${currency(metrics.budgetRevenue)}`}
              />
            ) : null}
          </div>

          {showBudget ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Budget revenue" value={currency(metrics.budgetRevenue)} detail={data?.feedback.budget?.sheetName ?? "Budget"} />
              <KpiCard label="Budget costs" value={currency(metrics.budgetCosts)} detail="Detected budget costs" />
              <KpiCard label="Budget result" value={currency(metrics.budgetResult)} detail="Budget revenue minus costs" />
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">Revenue by month</h3>
                  <p className="text-sm text-slate-500">Uses Date, or Month when dates cannot be parsed</p>
                </div>
                <LineChart className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </div>
              {hasData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={metrics.monthly} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Line type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} dot={{ r: 4 }} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload an Excel file to chart revenue by month." />
              )}
            </div>

            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">Units by product</h3>
                  <p className="text-sm text-slate-500">Units sold ranked by product</p>
                </div>
                <BarChart3 className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </div>
              {hasData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.productsByUnits} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip formatter={(value: number) => `${number(value)} units`} />
                      <Bar dataKey="units" radius={[6, 6, 0, 0]}>
                        {metrics.productsByUnits.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload an Excel file to chart units by product." />
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold text-ink">Revenue by category</h3>
                <p className="text-sm text-slate-500">Share of sales by category</p>
              </div>
              {hasData ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={metrics.categories} dataKey="revenue" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                        {metrics.categories.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload an Excel file to chart revenue by category." />
              )}
            </div>

            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold text-ink">Gross profit by category</h3>
                <p className="text-sm text-slate-500">Shown when Dækningsbidrag is detected</p>
              </div>
              {showGrossProfit && metrics.grossProfitByCategory.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.grossProfitByCategory} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Bar dataKey="grossProfit" radius={[6, 6, 0, 0]}>
                        {metrics.grossProfitByCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload data with Dækningsbidrag / gross profit to show this chart." />
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold text-ink">Costs by category</h3>
                <p className="text-sm text-slate-500">Shown when an Omkostninger sheet is detected</p>
              </div>
              {showCosts && data?.feedback.costs?.byCategory.length ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.feedback.costs.byCategory} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                        {data.feedback.costs.byCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart message="Upload a workbook with an Omkostninger / Costs sheet to show costs by category." />
              )}
            </div>

            <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-brand-50 text-brand-700">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">AI-style business report</h3>
                  <p className="text-sm text-slate-500">Rule-based demo summary generated from the uploaded data</p>
                </div>
              </div>
              <p className="text-base leading-8 text-slate-700">{summary}</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
