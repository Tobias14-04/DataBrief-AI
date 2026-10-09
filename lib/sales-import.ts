import { parseBusinessDate } from "./business-date.ts";
import { formatDanishMonth } from "./dashboard-insights.ts";
import { displayLabel } from "./data-labels.ts";
import { isFiniteNumber, parseNumericValue, parsePercentageValue } from "./numeric-foundation.ts";
import { deriveSaleRowCosts } from "./sales-cost.ts";
import type { SalesFieldKey, SalesFieldMappings } from "./spreadsheet-fields.ts";
import { createImportRejections, recordImportRejection } from "./import-rejections.ts";

function getCell(row: Record<string, unknown>, mappings: SalesFieldMappings, field: SalesFieldKey) {
  const header = mappings[field];
  return header ? row[header] : undefined;
}
function cleanMonth(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? formatDanishMonth(text) : "Ukendt måned";
}
export function rowsToRecords(rows: unknown[][], headerIndex: number, headers: string[]) {
  return rows.slice(headerIndex + 1).map((row) =>
    headers.reduce<Record<string, unknown>>((record, header, index) => {
      if (header) {
        record[header] = row[index];
      }
      return record;
    }, {}),
  );
}


function getRevenue(row: Record<string, unknown>, mappings: SalesFieldMappings) {
  const netRevenue = parseNumericValue(getCell(row, mappings, "netRevenue"));
  if (netRevenue !== null) {
    return { value: netRevenue, source: mappings.netRevenue ?? "Nettoomsætning" };
  }

  const grossRevenue = parseNumericValue(getCell(row, mappings, "grossRevenue"));
  if (grossRevenue !== null) {
    return { value: grossRevenue, source: mappings.grossRevenue ?? "Bruttoomsætning" };
  }

  const revenue = parseNumericValue(getCell(row, mappings, "revenue"));
  if (revenue !== null) {
    return { value: revenue, source: mappings.revenue ?? "Omsætning" };
  }

  const units = parseNumericValue(getCell(row, mappings, "units"));
  const unitPrice = parseNumericValue(getCell(row, mappings, "unitPrice"));
  if (units !== null && unitPrice !== null) {
    const calculatedRevenue = units * unitPrice;
    if (isFiniteNumber(calculatedRevenue)) {
      return { value: calculatedRevenue, source: `${mappings.units ?? "Antal"} × ${mappings.unitPrice ?? "Pris"}` };
    }
  }

  return { value: null, source: "" };
}


export function parseSalesRows(candidate: { rows: unknown[][]; headerIndex: number; headers: string[]; mappings: SalesFieldMappings }, mappings = candidate.mappings) {
  const records = rowsToRecords(candidate.rows, candidate.headerIndex, candidate.headers);
  const skippedRows: number[] = [];
  const rejections = createImportRejections();
  const classification = { count: 0, product: 0, category: 0, details: [] as Array<{ excelRow: number; product: boolean; category: boolean }> };
  let revenueSource = "";

  const rows = records
    .map((row, index) => {
      const rawDate = getCell(row, mappings, "date");
      const date = parseBusinessDate(rawDate);
      const mappedMonth = cleanMonth(getCell(row, mappings, "month"));
      // A valid transaction date owns periodization in all consumers. The month
      // column is a fallback only when no calendar date is documented.
      const month = date ? formatDanishMonth(date) : mappedMonth;
      const product = displayLabel(getCell(row, mappings, "product"), "");
      const category = displayLabel(getCell(row, mappings, "category"), "");
      const channel = displayLabel(getCell(row, mappings, "channel"), "");
      const region = displayLabel(getCell(row, mappings, "region"), "");
      const units = parseNumericValue(getCell(row, mappings, "units"));
      const revenue = getRevenue(row, mappings);
      const grossProfit = parseNumericValue(getCell(row, mappings, "grossProfit"));
      const grossMargin = parsePercentageValue(getCell(row, mappings, "grossMargin"));
      const rowCost = parseNumericValue(getCell(row, mappings, "cost"));
      const unitCost = parseNumericValue(getCell(row, mappings, "unitCost"));

      const isBlankRow = !rawDate && !product && !category && units === null && revenue.value === null;
      const looksLikeSummaryRow = product && /total|sum|i alt|subtotal|grand total/i.test(product);
      if (isBlankRow || looksLikeSummaryRow) {
        return null;
      }

      if (units === null || revenue.value === null || (!date && !month)) {
        const excelRow = candidate.headerIndex + index + 2;
        skippedRows.push(excelRow);
        recordImportRejection(rejections, { excelRow, reasons: [
          ...(units === null ? ["Antal mangler eller er ugyldigt"] : []),
          ...(revenue.value === null ? ["Omsætning mangler eller er ugyldig"] : []),
          ...(!date && !month ? ["Periode mangler"] : []),
        ], revenue: revenue.value, units });
        return null;
      }

      revenueSource ||= revenue.source;
      const excelRow = candidate.headerIndex + index + 2;
      if (!product || !category) {
        classification.count += 1;
        if (!product) classification.product += 1;
        if (!category) classification.category += 1;
        if (classification.details.length < 100) classification.details.push({ excelRow, product: !product, category: !category });
      }
      const economics = deriveSaleRowCosts({
        revenue: revenue.value, units, unitCost, rowCost,
        rowCostHeader: mappings.cost, grossProfit,
      });

      return {
        date,
        month,
        product,
        category,
        channel,
        region,
        revenue: revenue.value,
        units,
        grossProfit: economics.grossProfit,
        grossMargin,
        cost: economics.cost,
        costScope: economics.costScope,
        unitCost,
        variableCost: economics.variableCost,
        sourceValues: row,
        excelRow,
      };
    })
    .filter((row) => row !== null);

  return { rows, revenueSource, skippedRows, rejections, classification };
}
