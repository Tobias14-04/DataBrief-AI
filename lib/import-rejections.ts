import { isFiniteNumber } from "./numeric-foundation.ts";

export type ImportRejection = { excelRow: number; reasons: string[]; revenue: number | null; units: number | null };
export type ImportRejections = {
  count: number;
  details: ImportRejection[];
  reasonCounts: Record<string, number>;
  revenue: number | null;
  revenueCount: number;
  units: number | null;
  unitsCount: number;
  revenueOverflow: boolean;
  unitsOverflow: boolean;
};
export const MAX_REJECTION_DETAILS = 100;
export function createImportRejections(): ImportRejections {
  return { count: 0, details: [], reasonCounts: {}, revenue: null, revenueCount: 0, units: null, unitsCount: 0, revenueOverflow: false, unitsOverflow: false };
}
export function recordImportRejection(summary: ImportRejections, row: ImportRejection): void {
  summary.count += 1;
  row.reasons.forEach((reason) => { summary.reasonCounts[reason] = (summary.reasonCounts[reason] ?? 0) + 1; });
  if (summary.details.length < MAX_REJECTION_DETAILS) summary.details.push(row);
  for (const field of ["revenue", "units"] as const) {
    if (isFiniteNumber(row[field])) {
      const overflowKey = field === "revenue" ? "revenueOverflow" : "unitsOverflow";
      const value = (summary[field] ?? 0) + row[field];
      summary[overflowKey] ||= !isFiniteNumber(value);
      summary[field] = summary[overflowKey] ? null : value;
      summary[field === "revenue" ? "revenueCount" : "unitsCount"] += 1;
    }
  }
}
