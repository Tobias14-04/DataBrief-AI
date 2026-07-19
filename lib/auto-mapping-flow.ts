export const AUTO_MAPPING_CONFIDENCE_THRESHOLD = 85;

export type MappingAmbiguity = {
  field: string;
  columns: string[];
};

export type AutoMappingAssessment = {
  confidence: number;
  headerIsSecure: boolean;
  validRowCount: number;
  skippedRowCount: number;
  missingFields: string[];
  duplicateColumns: string[];
  ambiguities: MappingAmbiguity[];
  competingSheets: string[];
  hasRevenueSource: boolean;
};

export type AutoMappingDecision = {
  canOpenDashboard: boolean;
  reasons: string[];
};

export function assessAutoMapping(assessment: AutoMappingAssessment): AutoMappingDecision {
  const reasons: string[] = [];
  const missingRevenue = assessment.missingFields.some((field) => field.includes("Omsætning") || field.includes("Revenue"));
  const otherMissingFields = assessment.missingFields.filter((field) => !field.includes("Omsætning") && !field.includes("Revenue"));

  if (otherMissingFields.length) {
    reasons.push(`Følgende nødvendige felter mangler: ${otherMissingFields.join(", ")}.`);
  }

  if (missingRevenue || !assessment.hasRevenueSource) {
    reasons.push("Vi kunne ikke finde en sikker omsætningskolonne eller en gyldig kombination af Antal og Pris pr. enhed.");
  }

  assessment.ambiguities.forEach((ambiguity) => {
    const columns = ambiguity.columns.map((column) => `“${column}”`).join(" og ");
    reasons.push(`Kontrollér hvilken af kolonnerne ${columns} der skal bruges som ${ambiguity.field.toLocaleLowerCase("da-DK")}.`);
  });

  if (assessment.duplicateColumns.length) {
    reasons.push(`De samme kildekolonner er foreslået flere gange: ${assessment.duplicateColumns.join(", ")}.`);
  }

  if (assessment.competingSheets.length) {
    reasons.push(`Flere regneark kan indeholde salgsdata: ${assessment.competingSheets.join(", ")}.`);
  }

  if (!assessment.headerIsSecure) {
    reasons.push("Overskriftsrækken blev fundet med forbehold.");
  }

  if (!assessment.missingFields.length && assessment.validRowCount === 0) {
    reasons.push("Der blev ikke fundet gyldige datarækker med de registrerede kolonner.");
  }

  if (!assessment.missingFields.length && assessment.skippedRowCount > 0) {
    reasons.push("Nogle datarækker passer ikke til de forventede datatyper og skal kontrolleres.");
  }

  if (assessment.confidence < AUTO_MAPPING_CONFIDENCE_THRESHOLD) {
    reasons.push(`Kolonnerne blev fundet med ${assessment.confidence} % sikkerhed og bør kontrolleres.`);
  }

  return {
    canOpenDashboard: reasons.length === 0,
    reasons,
  };
}

export function mappingStatusForSource(manual: boolean) {
  return manual ? "manual" : "success";
}

export function shouldShowColumnReview({
  hasWorkbookAnalysis,
  hasDashboardData,
  reviewRequested,
}: {
  hasWorkbookAnalysis: boolean;
  hasDashboardData: boolean;
  reviewRequested: boolean;
}) {
  return hasWorkbookAnalysis && (!hasDashboardData || reviewRequested);
}
