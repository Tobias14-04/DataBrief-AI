/// <reference lib="webworker" />

import * as XLSX from "xlsx";
import type {
  ExcelWorkerRequest,
  ExcelWorkerResponse,
  ParsedWorkbookRows,
} from "@/lib/excel-worker-types";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<ExcelWorkerRequest>) => {
  const request = event.data;
  if (request.type !== "parse") {
    return;
  }

  try {
    const signature = new Uint8Array(request.buffer, 0, Math.min(4, request.buffer.byteLength));
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
      throw new Error("Filen er ikke en gyldig Excel .xlsx-fil.");
    }

    const workbook = XLSX.read(request.buffer, { type: "array", cellDates: true });
    const parsedWorkbook: ParsedWorkbookRows = {
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
    const response: ExcelWorkerResponse = {
      type: "success",
      requestId: request.requestId,
      workbook: parsedWorkbook,
    };

    workerScope.postMessage(response);
  } catch (error) {
    const response: ExcelWorkerResponse = {
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Excel-filen kunne ikke læses.",
    };
    workerScope.postMessage(response);
  }
});

export {};
