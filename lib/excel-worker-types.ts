export type ParsedWorkbookRows = {
  sheetNames: string[];
  sheets: Record<string, unknown[][]>;
};

export const INVALID_EXCEL_ERROR_MESSAGE =
  "Filen kunne ikke læses som en Excel-fil.\nDen kan være beskadiget eller blot omdøbt til .xlsx. Prøv en anden fil, eller hent vores eksempelfil.";

export type ExcelWorkerRequest = {
  type: "parse";
  requestId: number;
  buffer: ArrayBuffer;
};

export type ExcelWorkerResponse =
  | {
      type: "success";
      requestId: number;
      workbook: ParsedWorkbookRows;
    }
  | {
      type: "error";
      requestId: number;
      message: string;
    };
