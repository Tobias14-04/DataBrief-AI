export type ParsedWorkbookRows = {
  sheetNames: string[];
  sheets: Record<string, unknown[][]>;
};

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
