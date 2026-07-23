export const importProcessingSteps = [
  { status: "reading", label: "Læser Excel-filen" },
  { status: "detectingSheets", label: "Finder relevante regneark" },
  { status: "detectingHeaders", label: "Registrerer overskrifter" },
  { status: "matchingColumns", label: "Tilknytter kolonner" },
  { status: "validating", label: "Validerer datagrundlaget" },
  { status: "calculating", label: "Beregner nøgletal" },
  { status: "buildingDashboard", label: "Bygger dashboardet" },
] as const;

export type ImportProcessingStep = (typeof importProcessingSteps)[number]["status"];
export type ImportProcessingStatus =
  | "idle"
  | ImportProcessingStep
  | "success"
  | "needsReview"
  | "error";

export type ImportProcessingState = {
  status: ImportProcessingStatus;
  requestId: number;
  fileName: string;
  errorMessage: string;
};

export type ImportProcessingAction =
  | { type: "start"; requestId: number; fileName: string }
  | { type: "progress"; requestId: number; status: ImportProcessingStep }
  | { type: "complete"; requestId: number; needsReview: boolean }
  | { type: "fail"; requestId: number; message: string }
  | { type: "reset" };

export const initialImportProcessingState: ImportProcessingState = {
  status: "idle",
  requestId: 0,
  fileName: "",
  errorMessage: "",
};

const processingStatuses = new Set<ImportProcessingStatus>(
  importProcessingSteps.map((step) => step.status),
);

export function isImportProcessing(status: ImportProcessingStatus) {
  return processingStatuses.has(status);
}

export function importStatusLabel(status: ImportProcessingStatus) {
  return importProcessingSteps.find((step) => step.status === status)?.label ?? "";
}

export function importProcessingReducer(
  state: ImportProcessingState,
  action: ImportProcessingAction,
): ImportProcessingState {
  if (action.type === "reset") {
    return initialImportProcessingState;
  }

  if (action.type === "start") {
    return {
      status: "reading",
      requestId: action.requestId,
      fileName: action.fileName,
      errorMessage: "",
    };
  }

  if (action.requestId !== state.requestId) {
    return state;
  }

  if (action.type === "progress") {
    return { ...state, status: action.status, errorMessage: "" };
  }

  if (action.type === "complete") {
    return {
      ...state,
      status: action.needsReview ? "needsReview" : "success",
      errorMessage: "",
    };
  }

  return {
    ...state,
    status: "error",
    errorMessage: action.message,
  };
}
