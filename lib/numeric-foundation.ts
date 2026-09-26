export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return isFiniteNumber(result) ? result : null;
}

export function parseNumericValue(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const isPercent = text.includes("%");
  const cleaned = text.replace(/[−–]/gu, "-").replace(/\s/gu, "").replace(/[^\d,.-]/gu, "");
  if (!cleaned || !/^-?\d[\d,.-]*$/u.test(cleaned)) return null;
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./gu, "").replace(",", ".")
      : cleaned.replace(/,/gu, "")
    : cleaned.includes(",")
      ? cleaned.replace(",", ".")
      : /^-?\d{1,3}(?:\.\d{3})+$/u.test(cleaned)
        ? cleaned.replace(/\./gu, "")
        : cleaned;
  const parsed = Number(normalized);
  if (!isFiniteNumber(parsed)) return null;
  return isPercent ? safeRatio(parsed, 100) : parsed;
}

export function parsePercentageValue(value: unknown): number | null {
  const parsed = parseNumericValue(value);
  if (parsed === null) return null;
  if (typeof value === "string" && value.includes("%")) return parsed;
  return Math.abs(parsed) > 1 ? safeRatio(parsed, 100) : parsed;
}
