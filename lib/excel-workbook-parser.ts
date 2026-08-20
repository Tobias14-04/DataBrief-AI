import * as XLSX from "xlsx/xlsx.js";

import type { ParsedWorkbookRows } from "@/lib/excel-worker-types";

export function parseExcelWorkbook(buffer: ArrayBuffer): ParsedWorkbookRows {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  if (!workbook.SheetNames.length || !workbook.Workbook) {
    throw new Error("Det valgte indhold er ikke en læsbar Excel-projektmappe.");
  }

  return {
    sheetNames: workbook.SheetNames,
    sheets: workbook.SheetNames.reduce<Record<string, unknown[][]>>((sheets, sheetName) => {
      sheets[sheetName] = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: true,
      });
      return sheets;
    }, {}),
  };
}
