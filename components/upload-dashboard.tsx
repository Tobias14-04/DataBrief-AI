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
  date: Date;
  product: string;
  category: string;
  revenue: number;
  units: number;
};

type ParseResult = {
  rows: SaleRow[];
  fileName: string;
};

type GroupedValue = {
  name: string;
  revenue: number;
  units: number;
};

type MonthValue = GroupedValue & {
  sortKey: number;
};

const requiredColumns = ["Date", "Product", "Category", "Revenue", "Units"] as const;
const chartColors = ["#0891b2", "#f97316", "#22c55e", "#6366f1", "#e11d48", "#14b8a6"];

const sampleRows = [
  { Date: "2026-01-12", Product: "Analytics Starter", Category: "Software", Revenue: 4900, Units: 14 },
  { Date: "2026-01-28", Product: "Insight Pack", Category: "Add-ons", Revenue: 2700, Units: 18 },
  { Date: "2026-02-03", Product: "Team Onboarding", Category: "Services", Revenue: 8400, Units: 6 },
  { Date: "2026-02-19", Product: "Analytics Starter", Category: "Software", Revenue: 5200, Units: 16 },
  { Date: "2026-03-10", Product: "Forecast Pro", Category: "Software", Revenue: 11800, Units: 11 },
  { Date: "2026-03-22", Product: "Insight Pack", Category: "Add-ons", Revenue: 3900, Units: 26 },
  { Date: "2026-04-07", Product: "Forecast Pro", Category: "Software", Revenue: 13600, Units: 13 },
  { Date: "2026-04-23", Product: "Team Onboarding", Category: "Services", Revenue: 10100, Units: 7 },
];

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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

  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(date);
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function groupRows(rows: SaleRow[], keyGetter: (row: SaleRow) => string) {
  const groups = new Map<string, GroupedValue>();

  rows.forEach((row) => {
    const key = keyGetter(row);
    const current = groups.get(key) ?? { name: key, revenue: 0, units: 0 };
    current.revenue += row.revenue;
    current.units += row.units;
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function groupRowsByMonth(rows: SaleRow[]) {
  const groups = new Map<number, MonthValue>();

  rows.forEach((row) => {
    const sortKey = new Date(row.date.getFullYear(), row.date.getMonth(), 1).getTime();
    const current = groups.get(sortKey) ?? { name: monthLabel(row.date), revenue: 0, units: 0, sortKey };
    current.revenue += row.revenue;
    current.units += row.units;
    groups.set(sortKey, current);
  });

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function buildSummary(metrics: ReturnType<typeof calculateMetrics>) {
  if (!metrics.rowCount || !metrics.bestProduct || !metrics.bestCategory || !metrics.bestMonth) {
    return "Upload an Excel file to generate a concise business summary from your sales data.";
  }

  return `DataBrief AI analyzed ${number(metrics.rowCount)} sales rows totaling ${currency(
    metrics.totalRevenue,
  )} and ${number(metrics.totalUnits)} units sold. The best product is ${
    metrics.bestProduct.name
  }, contributing ${currency(metrics.bestProduct.revenue)} in revenue. ${
    metrics.bestCategory.name
  } is the leading category by revenue, and ${metrics.bestMonth.name} is the strongest month with ${currency(
    metrics.bestMonth.revenue,
  )}. The immediate business takeaway is to protect the top product and category while reviewing lower-performing products for pricing, promotion, or bundling opportunities.`;
}

function calculateMetrics(rows: SaleRow[]) {
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const productsByRevenue = groupRows(rows, (row) => row.product).sort((a, b) => b.revenue - a.revenue);
  const productsByUnits = groupRows(rows, (row) => row.product).sort((a, b) => b.units - a.units);
  const categories = groupRows(rows, (row) => row.category).sort((a, b) => b.revenue - a.revenue);
  const monthly = groupRowsByMonth(rows);
  const monthsByRevenue = [...monthly].sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalUnits,
    bestProduct: productsByRevenue[0],
    bestCategory: categories[0],
    bestMonth: monthsByRevenue[0],
    monthly,
    productsByUnits: productsByUnits.slice(0, 8),
    categories: categories.slice(0, 8),
    rowCount: rows.length,
  };
}

function getColumnMap(rawRows: Record<string, unknown>[]) {
  const availableColumns = Object.keys(rawRows[0] ?? {});
  const columnMap = new Map<string, string>();

  requiredColumns.forEach((column) => {
    const match = availableColumns.find((available) => normalizeHeader(available) === normalizeHeader(column));
    if (match) {
      columnMap.set(column, match);
    }
  });

  const missingColumns = requiredColumns.filter((column) => !columnMap.has(column));
  return { columnMap, missingColumns };
}

function parseWorkbook(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          reject(new Error("No worksheet found in this Excel file."));
          return;
        }

        const firstSheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
          raw: true,
        });

        if (!rawRows.length) {
          reject(new Error("The first worksheet is empty."));
          return;
        }

        const { columnMap, missingColumns } = getColumnMap(rawRows);

        if (missingColumns.length) {
          reject(new Error(`Missing required columns: ${missingColumns.join(", ")}.`));
          return;
        }

        const skippedRows: number[] = [];
        const rows = rawRows
          .map((row, index) => {
            const date = toDate(row[columnMap.get("Date") as string]);
            const product = String(row[columnMap.get("Product") as string] ?? "").trim();
            const category = String(row[columnMap.get("Category") as string] ?? "").trim();
            const revenue = toNumber(row[columnMap.get("Revenue") as string]);
            const units = toNumber(row[columnMap.get("Units") as string]);

            const isBlankRow = !date && !product && !category && revenue === null && units === null;
            if (isBlankRow) {
              return null;
            }

            if (!date || !product || !category || revenue === null || units === null) {
              skippedRows.push(index + 2);
              return null;
            }

            return {
              date,
              product,
              category,
              revenue,
              units,
            };
          })
          .filter((row): row is SaleRow => Boolean(row));

        if (!rows.length) {
          reject(new Error("No valid sales rows found. Check that Date, Product, Category, Revenue, and Units contain values."));
          return;
        }

        if (skippedRows.length) {
          reject(
            new Error(
              `Rows ${skippedRows.slice(0, 8).join(", ")} have invalid or missing values. Fix those rows and upload again.`,
            ),
          );
          return;
        }

        resolve({ rows, fileName: file.name });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Unable to read the uploaded file."));
    reader.readAsArrayBuffer(file);
  });
}

function downloadSampleExcel() {
  const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: [...requiredColumns] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Data");
  XLSX.writeFile(workbook, "databrief-ai-sample-sales.xlsx");
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

export default function UploadDashboard() {
  const [data, setData] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const metrics = useMemo(() => calculateMetrics(data?.rows ?? []), [data?.rows]);
  const summary = useMemo(() => buildSummary(metrics), [metrics]);
  const hasData = metrics.rowCount > 0;

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
              <span className="mt-1 text-xs text-slate-500">.xlsx with Date, Product, Category, Revenue, Units</span>
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
                <h2 className="font-semibold text-ink">Required columns</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The first worksheet must include Date, Product, Category, Revenue, and Units. Keep one sale per row.
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Total revenue"
              value={hasData ? currency(metrics.totalRevenue) : "No data"}
              detail={hasData ? `Across ${number(metrics.rowCount)} sales rows` : "Upload a workbook"}
            />
            <KpiCard
              label="Total units sold"
              value={hasData ? number(metrics.totalUnits) : "No data"}
              detail={hasData ? "Summed from Units column" : "Upload a workbook"}
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
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">Revenue by month</h3>
                  <p className="text-sm text-slate-500">Trend view from sales dates</p>
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

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
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
