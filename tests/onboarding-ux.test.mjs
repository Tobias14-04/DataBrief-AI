import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DATA_RETENTION_NOTICE,
  formatAnalysisReadySummary,
  resetViewScroll,
} from "../lib/auto-mapping-flow.ts";
import { INVALID_EXCEL_ERROR_MESSAGE } from "../lib/excel-worker-types.ts";

const uploadSource = readFileSync(
  new URL("../components/upload-dashboard.tsx", import.meta.url),
  "utf8",
);
const shellSource = readFileSync(
  new URL("../components/dashboard-command-shell.tsx", import.meta.url),
  "utf8",
);
const workerSource = readFileSync(
  new URL("../workers/excel-parser.worker.ts", import.meta.url),
  "utf8",
);

test("view-skift nulstiller den centrale dokument-scroll uden at koble sig til filtre", () => {
  let receivedOptions;
  const target = {
    scrollTo(options) {
      receivedOptions = options;
    },
  };

  assert.equal(resetViewScroll(target), true);
  assert.deepEqual(receivedOptions, { top: 0, left: 0, behavior: "auto" });
  assert.equal(resetViewScroll(null), false);
  assert.match(shellSource, /resetViewScroll\(document\.scrollingElement/u);
  assert.match(shellSource, /\}, \[activeView, mappingMode\]\);/u);
  assert.doesNotMatch(shellSource, /resetViewScroll[\s\S]*filters/u);
});

test("klar til analyse bruger faktiske rækker og mappingstatus", () => {
  assert.equal(
    formatAnalysisReadySummary({
      rowCount: 7_500,
      matchedRequiredFields: 5,
      totalRequiredFields: 5,
      manualReview: false,
    }),
    "7.500 rækker · 5/5 nødvendige felter matchet automatisk",
  );
  assert.equal(
    formatAnalysisReadySummary({
      rowCount: 120,
      matchedRequiredFields: 5,
      totalRequiredFields: 5,
      manualReview: true,
    }),
    "120 rækker · 5/5 nødvendige felter matchet efter kontrol",
  );
  assert.match(uploadSource, /Klar til analyse/u);
  assert.match(uploadSource, /Se kolonnetilknytning/u);
  assert.match(uploadSource, /Regneark fundet[\s\S]*rækker valideret[\s\S]*klar til analyse/u);
});

test("success-status genåbnes ikke ved almindelig intern navigation", () => {
  assert.match(
    uploadSource,
    /const changeActiveView = useCallback\(\(view: DashboardView\) => \{[\s\S]*setAnalysisReadyNotice\(null\);[\s\S]*setActiveView\(view\);/u,
  );
  assert.match(uploadSource, /onViewChange=\{changeActiveView\}/u);
  assert.match(uploadSource, /onNavigate=\{changeActiveView\}/u);
});

test("manglende nødvendige felter prioriteres, mens valgfrie felter er sammenfoldede", () => {
  assert.match(uploadSource, /nødvendige \$\{missingRequiredFields\.length === 1 \? "felt mangler" : "felter mangler"\}/u);
  assert.match(uploadSource, /Tilknyt dem for at fortsætte\./u);
  assert.match(uploadSource, /Anbefalede match er markeret nedenfor\./u);
  assert.match(uploadSource, /Valgfrie kolonner \(\{optionalMappingFields\.length\}\)/u);
  assert.match(uploadSource, /Vis valgfrie felter/u);
  assert.match(uploadSource, /Du kan fortsætte uden valgfrie felter\./u);
  assert.doesNotMatch(uploadSource, /<details[^>]*open=/u);
});

test("annulleret eller afvist filskift bevarer det aktive datasæt", () => {
  assert.match(shellSource, /label="Skift fil…"/u);
  assert.match(shellSource, /Det nuværende datasæt erstattes først, når den nye fil er indlæst\./u);
  assert.match(uploadSource, /if \(!file \|\| isLoading\) \{\s*return;/u);
  assert.match(uploadSource, /if \(!hadWorkbook\) \{\s*clearImportedWorkbook\(\);/u);
  assert.match(uploadSource, /replacementBackupRef/u);
  assert.match(uploadSource, /if \(backup\) \{[\s\S]*setAnalysis\(backup\.analysis\)/u);
});

test("ugyldige Excel-filer får en handlingsanvisende fejl uden tekniske detaljer", () => {
  assert.equal(
    INVALID_EXCEL_ERROR_MESSAGE,
    "Filen kunne ikke læses som en Excel-fil.\nDen kan være beskadiget eller blot omdøbt til .xlsx. Prøv en anden fil, eller hent vores eksempelfil.",
  );
  assert.match(uploadSource, /errorMessage: INVALID_EXCEL_ERROR_MESSAGE/u);
  assert.match(workerSource, /message: request\.errorMessage/u);
  assert.match(uploadSource, /<WorkbookErrorNotice message=\{error\} onDownloadSample=\{downloadSampleExcel\}/u);
  assert.match(uploadSource, /Hent eksempelfil/u);
  assert.doesNotMatch(workerSource, /Filen er ikke en gyldig Excel \.xlsx-fil/u);
});

test("upload-flowet forklarer den faktiske manglende datapersistence", () => {
  assert.equal(
    DATA_RETENTION_NOTICE,
    "Data behandles lokalt og gemmes ikke permanent. Din analyse forsvinder, hvis siden genindlæses eller lukkes.",
  );
  assert.match(uploadSource, /\{DATA_RETENTION_NOTICE\}/u);
});
