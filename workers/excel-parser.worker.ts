/// <reference lib="webworker" />

import { parseExcelWorkbook } from "@/lib/excel-workbook-parser";
import type { ExcelWorkerRequest, ExcelWorkerResponse } from "@/lib/excel-worker-types";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<ExcelWorkerRequest>) => {
  const request = event.data;
  if (request.type !== "parse") {
    return;
  }

  try {
    const parsedWorkbook = parseExcelWorkbook(request.buffer);
    const response: ExcelWorkerResponse = {
      type: "success",
      requestId: request.requestId,
      workbook: parsedWorkbook,
    };

    workerScope.postMessage(response);
  } catch {
    const response: ExcelWorkerResponse = {
      type: "error",
      requestId: request.requestId,
      message: request.errorMessage,
    };
    workerScope.postMessage(response);
  }
});

export {};
