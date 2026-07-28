const MAX_COMPARISON_KEY_CACHE_SIZE = 8_192;
const comparisonKeyCache = new Map<string, string>();

export const UTF8_BOM = "\uFEFF";

export type ComparableLabel = {
  key: string;
  label: string;
};

export function displayLabel(value: unknown, fallback = "Ukategoriseret") {
  const label = String(value ?? "").trim().normalize("NFC");
  return label || fallback;
}

export function normalizeForComparison(value: unknown) {
  const source = displayLabel(value, "");
  const cached = comparisonKeyCache.get(source);
  if (cached !== undefined) return cached;

  const key = source
    .toLocaleLowerCase("da-DK")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/\s+/g, " ");

  if (comparisonKeyCache.size >= MAX_COMPARISON_KEY_CACHE_SIZE) {
    comparisonKeyCache.clear();
  }
  comparisonKeyCache.set(source, key);
  return key;
}

export function comparableLabel(value: unknown, fallback = "Ukategoriseret"): ComparableLabel {
  const label = displayLabel(value, fallback);
  return { key: normalizeForComparison(label), label };
}

function representativeScore(label: string) {
  const lower = label.toLocaleLowerCase("da-DK");
  const upper = label.toLocaleUpperCase("da-DK");
  const firstLetterIndex = label.search(/\p{L}/u);
  const naturalCase = firstLetterIndex >= 0
    && label[firstLetterIndex] === upper[firstLetterIndex]
    && label.slice(firstLetterIndex + 1) === lower.slice(firstLetterIndex + 1);
  const caseScore = naturalCase ? 4 : label === lower ? 3 : label === upper ? 2 : 3.5;
  const unicodeScore = (label.match(/[^\u0000-\u007f]/g) ?? []).length;
  return caseScore + Math.min(unicodeScore, 4) * 0.25;
}

export function chooseRepresentativeLabel(current: string, candidate: string) {
  const normalizedCurrent = displayLabel(current);
  const normalizedCandidate = displayLabel(candidate);
  return representativeScore(normalizedCandidate) > representativeScore(normalizedCurrent)
    ? normalizedCandidate
    : normalizedCurrent;
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

export function buildExcelCompatibleCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>) {
  const content = rows
    .map((row) => row.map(escapeCsvCell).join(";"))
    .join("\r\n");
  return `${UTF8_BOM}${content}`;
}
