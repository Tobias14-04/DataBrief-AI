"use client";

import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BarChart3,
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

const chartColors = ["#0891b2", "#f97316", "#22c55e", "#6366f1", "#e11d48", "#14b8a6"];

const demoRows: SaleRow[] = [
  { date: new Date("2026-01-06"), product: "Analytics Starter", category: "Software", revenue: 4200, units: 12 },
  { date: new Date("2026-01-19"), product: "Insight Pack", category: "Add-ons", revenue: 2100, units: 14 },
  { date: new Date("2026-02-08"), product: "Team Onboarding", category: "Services", revenue: 7600, units: 5 },
  { date: new Date("2026-02-21"), product: "Analytics Starter", category: "Software", revenue: 5100, units: 15 },
  { date: new Date("2026-03-04"), product: "Forecast Pro", category: "Software", revenue: 9800, units: 9 },
  { date: new Date("2026-03-24"), product: "Insight Pack", category: "Add-ons", revenue: 3300, units: 21 },
  { date: new Date("2026-04-10"), product: "Forecast Pro", category: "Software", revenue: 11800, units: 11 },
  { date: new Date("2026-04-27"), product: "Team Onboarding", category: "Services", revenue: 8400, units: 6 },
  { date: new Date("2026-05-12"), product: "Analytics Starter", category: "Software", revenue: 6400, units: 19 },
  { date: new Date("2026-05-22"), product: "Insight Pack", category: "Add-ons", revenue: 4200, units: 28 },
  { date: new Date("2026-06-09"), product: "Forecast Pro", category: "Software", revenue: 13600, units: 13 },
  { date: new Date("2026-06-25"), product: "Team Onboarding", category: "Services", revenue: 10100, units: 7 },
];

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const match = Object.keys(row).find((key) => normalizedAliases.includes(normalizeHeader(key)));
  return match ? row[match] : undefined;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value ?? "")
    .replace(/[$€£,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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
    const key = keyGetter(row) || "Uncategorized";
    const current = groups.get(key) ?? { name: key, revenue: 0, units: 0 };
    current.revenue += row.revenue;
    current.units += row.units;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildSummary(rows: SaleRow[]) {
  if (!rows.length) {
    return "Upload an Excel file to generate a concise business summary from your sales data.";
  }

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const byProduct = groupRows(rows, (row) => row.product);
  const byCategory = groupRows(rows, (row) => row.category);
  const byMonth = groupRows(rows, (row) => monthLabel(row.date));
  const bestProduct = byProduct[0];
  const bestCategory = byCategory[0];
  const bestMonth = byMonth[0];
  const averageOrder = totalRevenue / rows.length;

  return `DataBrief AI reviewed ${number(rows.length)} sales rows totaling ${currency(totalRevenue)} and ${number(
    totalUnits,
  )} units. ${bestProduct.name} is the leading product with ${currency(
    bestProduct.revenue,
  )} in revenue, while ${bestCategory.name} is the strongest category. The best month is ${
    bestMonth.name
  }, generating ${currency(
    bestMonth.revenue,
  )}. Average revenue per row is ${currency(
    averageOrder,
  )}. A practical next step is to protect momentum in the top performer while investigating whether lower-revenue products need pricing, promotion, or bundling support.`;
}

function parseWorkbook(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
          raw: false,
        });

        const rows = rawRows
          .map((row) => {
            const date = toDate(findValue(row, ["date", "order date", "sale date", "month"]));
            const product = String(findValue(row, ["product", "item", "sku", "product name"]) ?? "").trim();
            const category = String(findValue(row, ["category", "segment", "product category"]) ?? "").trim();
            const revenue = toNumber(findValue(row, ["revenue", "sales", "amount", "total", "total revenue"]));
            const units = toNumber(findValue(row, ["units", "quantity", "qty", "units sold"]));

            if (!date || !product || revenue <= 0) {
              return null;
            }

            return {
              date,
              product,
              category: category || "Uncategorized",
              revenue,
              units,
            };
          })
          .filter((row): row is SaleRow => Boolean(row));

        resolve({ rows, fileName: file.name });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Unable to read the uploaded file."));
    reader.readAsArrayBuffer(file);
  });
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

export default function UploadDashboard() {
  const [data, setData] = useState<ParseResult>({ rows: demoRows, fileName: "Demo sales sample" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const metrics = useMemo(() => {
    const rows = data.rows;
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
    const byProduct = groupRows(rows, (row) => row.product);
    const byCategory = groupRows(rows, (row) => row.category);
    const byMonth = groupRows(rows, (row) => monthLabel(row.date));
    const monthly = [...byMonth].sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    return {
      totalRevenue,
      totalUnits,
      bestProduct: byProduct[0],
      bestCategory: byCategory[0],
      bestMonth: byMonth[0],
      monthly,
      products: byProduct.slice(0, 6),
      categories: byCategory.slice(0, 6),
      summary: buildSummary(rows),
      rowCount: rows.length,
    };
  }, [data.rows]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const parsed = await parseWorkbook(file);
      if (!parsed.rows.length) {
        setError("No usable rows found. Check that your file includes Date, Product, Revenue, and Units columns.");
        return;
      }

      setData(parsed);
    } catch {
      setError("The spreadsheet could not be parsed. Try a standard .xlsx or .xls file.");
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
              <span className="mt-1 text-xs text-slate-500">.xlsx or .xls with one sale per row</span>
              <input
                type="file"
                accept=".xlsx,.xls"
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
              onClick={() => {
                setData({ rows: demoRows, fileName: "Demo sales sample" });
                setError("");
              }}
              className="mt-4 w-full rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-500"
            >
              Load demo sample
            </button>
          </div>

          <div className="rounded-lg border border-line bg-white p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-ink">Expected columns</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use columns such as Date, Product, Category, Revenue, and Units. The parser also accepts aliases like
                  Sales, Amount, Quantity, SKU, and Order Date.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-700">{data.fileName}</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Sales dashboard</h2>
                <p className="mt-2 text-sm text-slate-500">{number(metrics.rowCount)} rows included in this report.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Business summary generated
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              value={currency(metrics.totalRevenue)}
              detail={`Across ${number(metrics.rowCount)} sales rows`}
            />
            <KpiCard label="Total units sold" value={number(metrics.totalUnits)} detail="Summed from Units column" />
            <KpiCard
              label="Best product/category"
              value={metrics.bestProduct?.name ?? "N/A"}
              detail={`${metrics.bestCategory?.name ?? "N/A"} leads categories`}
            />
            <KpiCard
              label="Best month"
              value={metrics.bestMonth?.name ?? "N/A"}
              detail={`${currency(metrics.bestMonth?.revenue ?? 0)} revenue`}
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
            </div>

            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">Top products</h3>
                  <p className="text-sm text-slate-500">Revenue ranked by product</p>
                </div>
                <BarChart3 className="h-5 w-5 text-brand-700" aria-hidden="true" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.products} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip formatter={(value: number) => currency(value)} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {metrics.products.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold text-ink">Revenue by category</h3>
                <p className="text-sm text-slate-500">Share of sales by category</p>
              </div>
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
              <p className="text-base leading-8 text-slate-700">{metrics.summary}</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
