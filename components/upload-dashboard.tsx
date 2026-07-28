"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  CalendarRange,
  Calculator,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Rows3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChangeEvent,
  memo,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ExcelProcessingView } from "@/components/excel-processing-view";
import { KpiCustomizer } from "@/components/kpi-customizer";
import { PremiumSelect } from "@/components/premium-select";
import { SmoothMetricValue } from "@/components/smooth-metric-value";
import { DashboardCommandShell } from "@/components/dashboard-command-shell";
import {
  DashboardControlBar,
  type DashboardControlOptions,
} from "@/components/dashboard-control-bar";
import {
  CommandEmptyState,
  CommandPanel,
  CompactKpiCard,
  CompactSecondaryMetric,
  DatasetCommandCenter,
  RankedMetricList,
  commandCardClass,
  commandSectionLabelClass,
} from "@/components/command-center-ui";
import {
  OverviewAnalysisPreviewGrid,
  OverviewSectionHeader,
  OverviewTrendPanel,
} from "@/components/overview-dashboard";
import {
  dashboardCardClass,
  dashboardEyebrowClass,
  dashboardIconClass,
  dashboardUtilityCardClass,
  DatasetHeader,
  ExecutiveSummaryCard,
} from "@/components/dashboard-ui";
import {
  AUTO_MAPPING_CONFIDENCE_THRESHOLD,
  assessAutoMapping,
  mappingStatusForSource,
  shouldShowColumnReview,
} from "@/lib/auto-mapping-flow";
import {
  buildKpiDataProfile,
  defaultKpiConfiguration,
  evaluateFormula,
  evaluateStandardKpis,
  formatNumber,
  getNumericColumns,
  normalizeKpiConfiguration,
  parseStoredKpiConfiguration,
  scoreKpiHeaders,
  standardKpiDefinitions,
  type KpiColor,
  type KpiConfiguration,
  type KpiDefinition,
  type KpiEvaluation,
  type KpiIcon,
  type KpiSourceRow,
} from "@/lib/kpi-customization";
import {
  buildMonthlyReport,
  formatDanishCurrency as currency,
  formatDanishMonth,
  formatDanishNumber as number,
  formatDanishPercent as percent,
  formatMetricTooltip,
  getAdaptiveMarginChartMode,
  monthSortKey,
} from "@/lib/dashboard-insights";
import {
  analyzeSalesSheetStructure,
  buildSalesColumnMappings,
  detectSalesHeaderRow,
  findSalesColumnMatches,
  getMissingRequiredSalesFields,
  normalizeColumnHeader as normalizeHeader,
  salesColumnAliases,
  type SalesFieldKey,
  type SalesFieldMappings,
} from "@/lib/spreadsheet-fields";
import type {
  ExcelWorkerRequest,
  ExcelWorkerResponse,
  ParsedWorkbookRows,
} from "@/lib/excel-worker-types";
import {
  importProcessingReducer,
  importStatusLabel,
  initialImportProcessingState,
  isImportProcessing,
  type ImportProcessingStep,
} from "@/lib/import-processing";
import {
  applyDashboardFilters,
  rowMatchesDashboardFilters,
  type DashboardFilterKey,
  type DashboardFilters,
} from "@/lib/dashboard-filtering";
import { calculateDashboardMetrics } from "@/lib/dashboard-metrics";
import type { DashboardView } from "@/lib/dashboard-navigation";

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
  sourceValues: Record<string, unknown>;
};

type GroupedValue = {
  name: string;
  revenue: number;
  units: number;
  grossProfit: number;
  cost: number;
  grossMargin?: number;
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

type TrendMetric = "revenue" | "grossProfit" | "units" | "cost";

type ActiveFilter = {
  field: DashboardFilterKey;
  label: string;
  value: string;
};

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

type FieldKey = SalesFieldKey;

type RequiredManualField = "dateOrMonth" | "product" | "category" | "units" | "revenue";
type OptionalManualField = "channel" | "region" | "cost" | "grossProfit" | "grossMargin" | "unitPrice";
type ManualField = RequiredManualField | OptionalManualField;
type FieldMappings = SalesFieldMappings;
type ManualMappings = Record<ManualField, string>;

type SheetCandidate = {
  name: string;
  rows: unknown[][];
  headers: string[];
  headerIndex: number;
  headerScore: number;
  headerScoreGap: number;
  mappings: FieldMappings;
  fieldMatches: Partial<Record<FieldKey, string[]>>;
  score: number;
  confidence: number;
  missingFields: string[];
};

type WorkbookAnalysis = {
  fileName: string;
  detectedSheets: string[];
  candidates: SheetCandidate[];
  kpiSourceRows: KpiSourceRow[];
  costs?: OptionalSheetSummary;
  budget?: BudgetSummary;
};

const emptyManualMappings: ManualMappings = {
  dateOrMonth: "",
  product: "",
  category: "",
  units: "",
  revenue: "",
  channel: "",
  region: "",
  cost: "",
  grossProfit: "",
  grossMargin: "",
  unitPrice: "",
};

const emptyDashboardFilters: DashboardFilters = {
  month: [],
  product: [],
  category: [],
  channel: [],
  region: [],
};

const KPI_STORAGE_KEY = "databrief-kpi-configuration";
const initialKpiConfiguration = defaultKpiConfiguration({
  hasBudget: false,
  hasGrossProfit: false,
  hasGrossMargin: false,
  hasCosts: false,
});

const dashboardFilterLabels: Record<DashboardFilterKey, string> = {
  month: "MÃ¥ned",
  product: "Produkt",
  category: "Kategori",
  channel: "Kanal",
  region: "Region",
};

const chartGridColor = "#e8eef1";
const chartAxisTick = { fill: "#526779", fontWeight: 500 };
const chartTooltipStyle = {
  border: "1px solid #cfdee5",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  boxShadow: "0 16px 38px rgba(16,32,51,0.14)",
  color: "#102033",
  fontSize: "13px",
};

const trendMetricDefinitions: Record<TrendMetric, {
  label: string;
  shortLabel: string;
  color: string;
  tone: "brand" | "positive" | "warning" | "neutral";
}> = {
  revenue: {
    label: "OmsÃ¦tning pr. mÃ¥ned",
    shortLabel: "OmsÃ¦tning",
    color: "#0891b2",
    tone: "brand",
  },
  grossProfit: {
    label: "DÃ¦kningsbidrag pr. mÃ¥ned",
    shortLabel: "DÃ¦kningsbidrag",
    color: "#10b981",
    tone: "positive",
  },
  units: {
    label: "Solgte enheder pr. mÃ¥ned",
    shortLabel: "Solgte enheder",
    color: "#334155",
    tone: "neutral",
  },
  cost: {
    label: "Omkostninger pr. mÃ¥ned",
    shortLabel: "Omkostninger",
    color: "#f97316",
    tone: "warning",
  },
};

function formatTrendValue(metric: TrendMetric, value: number) {
  return metric === "units" ? number(value) : currency(value);
}

function formatTrendAxis(metric: TrendMetric, value: number) {
  return metric === "units" ? number(value) : `${number(value / 1000)} t.kr.`;
}

const fieldLabels: Record<FieldKey, string> = {
  date: "Dato",
  month: "MÃ¥ned",
  product: "Produkt",
  category: "Kategori",
  channel: "Kanal",
  region: "Region",
  units: "Antal",
  netRevenue: "NettoomsÃ¦tning",
  grossRevenue: "BruttoomsÃ¦tning",
  revenue: "OmsÃ¦tning",
  grossProfit: "DÃ¦kningsbidrag",
  grossMargin: "DÃ¦kningsgrad",
  cost: "Omkostning",
  unitPrice: "Pris pr. enhed",
};

const aliases = salesColumnAliases;

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
  return formatDanishMonth(date);
}

function cleanMonth(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? formatDanishMonth(text) : "Ukendt mÃ¥ned";
}

function paddedChartDomain(values: number[]): [number, number] {
  if (!values.length) {
    return [0, 1];
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum;
  const padding = spread > 0 ? spread * 0.12 : Math.max(Math.abs(maximum) * 0.1, 1);
  const rawMinimum = minimum - padding;
  const rawMaximum = maximum + padding;
  const targetStep = Math.max((rawMaximum - rawMinimum) / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalizedStep = targetStep / magnitude;
  const niceStep = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude;
  const domainMinimum = minimum >= 0
    ? Math.max(0, Math.floor(rawMinimum / niceStep) * niceStep)
    : Math.floor(rawMinimum / niceStep) * niceStep;
  const domainMaximum = maximum <= 0
    ? Math.min(0, Math.ceil(rawMaximum / niceStep) * niceStep)
    : Math.ceil(rawMaximum / niceStep) * niceStep;

  return domainMinimum === domainMaximum
    ? [domainMinimum - niceStep, domainMaximum + niceStep]
    : [domainMinimum, domainMaximum];
}

function getCell(row: Record<string, unknown>, mappings: FieldMappings, field: FieldKey) {
  const header = mappings[field];
  return header ? row[header] : undefined;
}

function findMatchingHeader(headers: string[], field: FieldKey) {
  return findMatchingHeaders(headers, field)[0];
}

function findMatchingHeaders(headers: string[], field: FieldKey) {
  return findSalesColumnMatches(headers, field);
}

function buildMappings(headers: string[]) {
  return buildSalesColumnMappings(headers);
}

function rowToHeaders(row: unknown[]) {
  return row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
}

function detectHeaderRow(rows: unknown[][]) {
  return detectSalesHeaderRow(rows);
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

function collectWorkbookKpiRows(workbook: ParsedWorkbookRows): KpiSourceRow[] {
  return workbook.sheetNames.flatMap((sheetName) => {
    const rows = workbook.sheets[sheetName] ?? [];
    const headerCandidate = rows
      .slice(0, 40)
      .map((row, index) => {
        const headers = rowToHeaders(row);
        return { index, score: scoreKpiHeaders(headers), headerCount: headers.length };
      })
      .sort((a, b) => b.score - a.score || b.headerCount - a.headerCount || a.index - b.index)[0];

    if (!headerCandidate?.score) return [];
    const headers = rowToHeaders(rows[headerCandidate.index] ?? []);
    return rowsToRecords(rows, headerCandidate.index, headers)
      .filter((record) => Object.values(record).some((value) => value !== "" && value !== null && value !== undefined))
      .map((record) => ({ sourceValues: { ...record, __sheet: sheetName } }));
  });
}

function getMissingFields(mappings: FieldMappings) {
  return getMissingRequiredSalesFields(mappings);
}

function buildCandidates(workbook: ParsedWorkbookRows) {
  return workbook.sheetNames.map((name) => {
    const rows = workbook.sheets[name] ?? [];
    const structure = analyzeSalesSheetStructure(name, rows);
    const { headers, headerIndex, mappings } = structure;
    const fieldMatches = (Object.keys(aliases) as FieldKey[]).reduce<Partial<Record<FieldKey, string[]>>>((matches, field) => {
      const matchingHeaders = findMatchingHeaders(headers, field);
      if (matchingHeaders.length) {
        matches[field] = matchingHeaders;
      }
      return matches;
    }, {});

    return {
      name,
      rows,
      headers,
      headerIndex,
      headerScore: structure.headerScore,
      headerScoreGap: structure.headerScoreGap,
      mappings,
      fieldMatches,
      score: structure.score,
      confidence: structure.confidence,
      missingFields: structure.missingFields,
    };
  }).sort((a, b) => b.score - a.score);
}

function getEffectiveRevenueField(mappings: FieldMappings): FieldKey | undefined {
  if (mappings.netRevenue) return "netRevenue";
  if (mappings.grossRevenue) return "grossRevenue";
  if (mappings.revenue) return "revenue";
  if (mappings.unitPrice) return "unitPrice";
  return undefined;
}

function getRequiredMappingAmbiguities(candidate: SheetCandidate) {
  const requiredFields: Array<{ field: FieldKey | undefined; label: string }> = [
    { field: candidate.mappings.date ? "date" : "month", label: "Dato eller mÃ¥ned" },
    { field: "product", label: "Produkt" },
    { field: "category", label: "Kategori" },
    { field: "units", label: "Antal" },
    { field: getEffectiveRevenueField(candidate.mappings), label: "OmsÃ¦tning" },
  ];

  return requiredFields.flatMap(({ field, label }) => {
    const matches = field ? candidate.fieldMatches[field] ?? [] : [];
    return matches.length > 1 ? [{ field: label, columns: matches }] : [];
  });
}

function getDuplicateMappedColumns(mappings: FieldMappings) {
  const assignments = Object.values(mappings).reduce<Record<string, number>>((counts, column) => {
    if (column) {
      counts[column] = (counts[column] ?? 0) + 1;
    }
    return counts;
  }, {});

  return Object.entries(assignments)
    .filter(([, count]) => count > 1)
    .map(([column]) => column);
}

function getCompetingSalesSheets(candidates: SheetCandidate[], best: SheetCandidate) {
  const competing = candidates.filter(
    (candidate) =>
      candidate.name !== best.name &&
      !candidate.missingFields.length &&
      candidate.confidence >= AUTO_MAPPING_CONFIDENCE_THRESHOLD &&
      best.score - candidate.score <= 3,
  );

  return competing.length ? [best.name, ...competing.map((candidate) => candidate.name)] : [];
}

function getRevenue(row: Record<string, unknown>, mappings: FieldMappings) {
  const netRevenue = toNumber(getCell(row, mappings, "netRevenue"));
  if (netRevenue !== null) {
    return { value: netRevenue, source: mappings.netRevenue ?? "NettoomsÃ¦tning" };
  }

  const grossRevenue = toNumber(getCell(row, mappings, "grossRevenue"));
  if (grossRevenue !== null) {
    return { value: grossRevenue, source: mappings.grossRevenue ?? "BruttoomsÃ¦tning" };
  }

  const revenue = toNumber(getCell(row, mappings, "revenue"));
  if (revenue !== null) {
    return { value: revenue, source: mappings.revenue ?? "OmsÃ¦tning" };
  }

  const units = toNumber(getCell(row, mappings, "units"));
  const unitPrice = toNumber(getCell(row, mappings, "unitPrice"));
  if (units !== null && unitPrice !== null) {
    return { value: units * unitPrice, source: `${mappings.units ?? "Antal"} Ã— ${mappings.unitPrice ?? "Pris"}` };
  }

  return { value: null, source: "" };
}

function manualToFieldMappings(manual: ManualMappings): FieldMappings {
  return {
 …30356 tokens truncated…MonthChange={setReportMonth}
                  variant="analysis"
                />
              </div>

              <CommandPanel
                eyebrow="Periodetabel"
                title="MÃ¥nedlige resultater"
                description="Samme datagrundlag som grafen ovenfor"
                icon={Rows3}
                variant="analysis"
              >
                <div className="overflow-x-auto">
                  <table className="analysis-table-numbers w-full min-w-[720px] border-separate border-spacing-0 text-left">
                    <thead className="bg-[#f3f8fa] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th scope="col" className="border-b border-[#d8e5ea] px-5 py-4 sm:px-6">MÃ¥ned</th>
                        <th scope="col" className="border-b border-[#d8e5ea] px-5 py-4 text-right">OmsÃ¦tning</th>
                        <th scope="col" className="border-b border-[#d8e5ea] px-5 py-4 text-right">Solgte enheder</th>
                        <th scope="col" className="border-b border-[#d8e5ea] px-5 py-4 text-right">DÃ¦kningsbidrag</th>
                        <th scope="col" className="border-b border-[#d8e5ea] px-5 py-4 text-right sm:px-6">Omkostninger</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {metrics.monthly.map((month) => (
                        <tr key={month.sortKey} className="bg-white transition-colors even:bg-[#fbfdfe] hover:bg-cyan-50/55">
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-ink sm:px-6">{formatDanishMonth(month.name)}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right font-medium text-slate-700">{currency(month.revenue)}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right font-medium text-slate-700">{number(month.units)}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right font-medium text-slate-700">{baseMetrics.hasGrossProfit ? currency(month.grossProfit) : "â€“"}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-right font-medium text-slate-700 sm:px-6">{baseMetrics.hasCosts ? currency(month.cost) : "â€“"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CommandPanel>
            </section>
          ) : null}

          {activeView === "products" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="products-view">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`${commandSectionLabelClass} text-brand-700`}>Produktperformance</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">Produkter</h2>
                  <p className="mt-1 text-xs text-slate-500">{number(productViewData.length)} produkter i den aktuelle visning.</p>
                </div>
                <label className="relative block min-w-[180px]">
                  <span className="sr-only">SortÃ©r produkter</span>
                  <select
                    value={productSort}
                    onChange={(event) => setProductSort(event.target.value as "revenue" | "units")}
                    className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white py-1 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="revenue">SortÃ©r efter omsÃ¦tning</option>
                    <option value="units">SortÃ©r efter antal</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
                <CommandPanel
                  eyebrow="Rangering"
                  title={productSort === "revenue" ? "Topprodukter efter omsÃ¦tning" : "Topprodukter efter antal"}
                  description="De stÃ¦rkeste produkter i den aktuelle visning"
                  icon={PackageCheck}
                >
                  <RankedMetricList
                    items={productViewData.map((product) => ({
                      name: product.name,
                      value: productSort === "revenue" ? product.revenue : product.units,
                    }))}
                    valueFormatter={productSort === "revenue" ? currency : number}
                    limit={10}
                  />
                </CommandPanel>

                <CommandPanel
                  eyebrow="Produktdata"
                  title="OmsÃ¦tning, enheder og andel"
                  description="Rangeret efter det valgte nÃ¸gletal"
                  icon={Rows3}
                >
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full min-w-[620px] text-left">
                      <thead className="sticky top-0 bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Produkt</th>
                          <th className="px-4 py-3 text-right">OmsÃ¦tning</th>
                          <th className="px-4 py-3 text-right">Enheder</th>
                          <th className="px-4 py-3 text-right">Andel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {productViewData.map((product) => (
                          <tr key={product.name} className="transition hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-semibold text-ink">{product.name}</td>
                            <td className="px-4 py-3 text-right text-slate-700">{currency(product.revenue)}</td>
                            <td className="px-4 py-3 text-right text-slate-700">{number(product.units)}</td>
                            <td className="px-4 py-3 text-right text-slate-700">{percent(metrics.totalRevenue ? product.revenue / metrics.totalRevenue : 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CommandPanel>
              </div>
            </section>
          ) : null}

          {activeView === "categories" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="categories-view">
              <div>
                <p className={`${commandSectionLabelClass} text-brand-700`}>Kategorifordeling</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Kategorier</h2>
                <p className="mt-1 text-xs text-slate-500">OmsÃ¦tning, indtjening og omkostninger samlet pr. kategori.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <CommandPanel title="OmsÃ¦tning pr. kategori" description="Andel af den samlede omsÃ¦tning" icon={CircleDollarSign}>
                  <RankedMetricList
                    items={categoryViewData.map((category) => ({ name: category.name, value: category.revenue }))}
                    valueFormatter={currency}
                    limit={10}
                  />
                </CommandPanel>
                <CommandPanel
                  title={marginChartMode === "grossMargin" ? "DÃ¦kningsgrad pr. kategori" : "DÃ¦kningsbidrag pr. kategori"}
                  description="Indtjening fordelt pÃ¥ kategorier"
                  icon={TrendingUp}
                  tone="positive"
                >
                  {marginChartMode !== "empty" ? (
                    <RankedMetricList
                      items={marginChartData.map((category) => ({
                        name: category.name,
                        value: marginChartMode === "grossMargin" ? (category.grossMargin ?? 0) : category.grossProfit,
                      }))}
                      valueFormatter={marginChartMode === "grossMargin" ? percent : currency}
                      tone="positive"
                      limit={10}
                    />
                  ) : (
                    <CommandEmptyState
                      title="Indtjeningsdata mangler"
                      message="TilfÃ¸j dÃ¦kningsbidrag eller dÃ¦kningsgrad for at se fordelingen."
                      tone="positive"
                    />
                  )}
                </CommandPanel>
              </div>
              <CommandPanel title="Kategoritabel" description="Det samlede datagrundlag pr. kategori" icon={Rows3}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-slate-50 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Kategori</th>
                        <th className="px-4 py-3 text-right">OmsÃ¦tning</th>
                        <th className="px-4 py-3 text-right">Andel</th>
                        <th className="px-4 py-3 text-right">DÃ¦kningsbidrag</th>
                        <th className="px-4 py-3 text-right">Omkostninger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {categoryViewData.map((category) => (
                        <tr key={category.name} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-ink">{category.name}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{currency(category.revenue)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{percent(metrics.totalRevenue ? category.revenue / metrics.totalRevenue : 0)}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{baseMetrics.hasGrossProfit ? currency(category.grossProfit) : "â€“"}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{baseMetrics.hasCosts ? currency(category.cost) : "â€“"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CommandPanel>
            </section>
          ) : null}

          {activeView === "costs" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="costs-view">
              <div>
                <p className={`${commandSectionLabelClass} text-orange-700`}>Omkostningsstyring</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Omkostninger</h2>
                <p className="mt-1 text-xs text-slate-500">Registrerede omkostninger i den aktuelle filtrerede visning.</p>
              </div>
              {showCosts ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <CommandPanel
                    title="Omkostninger pr. kategori"
                    description="Kategorier rangeret efter omkostninger"
                    icon={WalletCards}
                    tone="warning"
                  >
                    <RankedMetricList
                      items={costsByCategory.map((category) => ({ name: category.name, value: category.cost }))}
                      valueFormatter={currency}
                      tone="warning"
                      limit={12}
                    />
                  </CommandPanel>
                  <div className="space-y-3">
                    <CompactKpiCard
                      label="Samlede omkostninger"
                      value={currency(metrics.totalCosts)}
                      detail="Beregnet ud fra omkostningsdata"
                      icon={WalletCards}
                      tone="warning"
                    />
                    <CompactKpiCard
                      label="Resultat"
                      value={currency(metrics.actualResult)}
                      detail="OmsÃ¦tning minus omkostninger"
                      icon={TrendingUp}
                      tone={metrics.actualResult >= 0 ? "positive" : "warning"}
                    />
                  </div>
                </div>
              ) : (
                <CommandPanel title="Omkostningsdata" icon={WalletCards} tone="warning">
                  <CommandEmptyState
                    title="Omkostningsdata mangler"
                    message="TilfÃ¸j en kolonne med omkostning eller kostpris for at Ã¥bne omkostningsanalysen."
                    tone="warning"
                  />
                </CommandPanel>
              )}
            </section>
          ) : null}

          {activeView === "insights" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="insights-view">
              <div>
                <p className={`${commandSectionLabelClass} text-brand-700`}>Beslutningsgrundlag</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Ledelsesindsigter</h2>
                <p className="mt-1 text-xs text-slate-500">Regelbaserede forklaringer ud fra de registrerede og filtrerede data.</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <ExecutiveSummaryCard
                  insights={executiveSummary.insights}
                  conclusion={executiveSummary.conclusion}
                  status={executiveSummary.status}
                />
                <MonthlyReportCard
                  rows={allRows}
                  filters={filters}
                  feedback={data?.feedback}
                  preferredMonth={baseMetrics.bestMonth?.name}
                  selectedMonth={reportMonth}
                  onMonthChange={setReportMonth}
                />
              </div>
              <CommandPanel title="Datagrundlag for indsigterne" description="Indsigterne Ã¦ndres sammen med dashboardfiltrene" icon={Info}>
                <div className="grid gap-2 p-4 sm:grid-cols-3">
                  <CompactSecondaryMetric label="Medtagne rÃ¦kker" value={number(metrics.rowCount)} />
                  <CompactSecondaryMetric label="Aktive filtre" value={activeFilters.length ? number(activeFilters.length) : "Ingen"} />
                  <CompactSecondaryMetric label="Salgsark" value={data?.feedback.salesSheetName ?? selectedSheet} />
                </div>
              </CommandPanel>
            </section>
          ) : null}

          {activeView === "reports" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="reports-view">
              <div>
                <p className={`${commandSectionLabelClass} text-brand-700`}>Aktuel rapport</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">Rapporter</h2>
                <p className="mt-1 text-xs text-slate-500">MÃ¥nedsrapport og ledelsesresume for den valgte visning.</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
                <MonthlyReportCard
                  rows={allRows}
                  filters={filters}
                  feedback={data?.feedback}
                  preferredMonth={baseMetrics.bestMonth?.name}
                  selectedMonth={reportMonth}
                  onMonthChange={setReportMonth}
                />
                <ExecutiveSummaryCard
                  insights={executiveSummary.insights}
                  conclusion={executiveSummary.conclusion}
                  status={executiveSummary.status}
                />
              </div>
            </section>
          ) : null}

          {activeView === "dataset" ? (
            <section className="min-w-0 space-y-4 min-[1360px]:col-span-2" data-testid="dataset-view">
              <div>
                <p className={`${commandSectionLabelClass} text-brand-700`}>Datakilde</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">DatasÃ¦t og registrering</h2>
                <p className="mt-1 text-xs text-slate-500">KontrollÃ©r ark, overskriftsrÃ¦kke og de kolonner, der driver dashboardet.</p>
              </div>
              <FeedbackPanel feedback={data?.feedback} rowCount={allRows.length} />
              <CommandPanel title="Arbejd med datasÃ¦ttet" description="Skift fil eller brug et kontrolleret eksempel" icon={FileSpreadsheet}>
                <div className="flex flex-wrap gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => commandFileInputRef.current?.click()}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0b1c2d] px-4 text-xs font-semibold text-white transition hover:bg-[#15334d]"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Upload ny fil
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleExcel}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Hent eksempelfil
                  </button>
                  <button
                    type="button"
                    onClick={loadDemoDataset}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Brug demodata
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualMapping(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Rediger kolonnetilknytning
                  </button>
                </div>
              </CommandPanel>
            </section>
          ) : null}
          </div>
          ) : null}
        </section>
      </section>
      <KpiCustomizer
        open={isKpiCustomizerOpen}
        configuration={kpiConfiguration}
        defaults={defaultKpis}
        evaluations={kpiEvaluations}
        libraryEvaluations={baseStandardKpiEvaluations}
        rows={filteredRows}
        numericColumns={numericColumns}
        onClose={() => setIsKpiCustomizerOpen(false)}
        onSave={saveKpiConfiguration}
      />
    </DashboardCommandShell>
  );
}

