export type AmountDisplayPreference = "auto" | "kr" | "thousand" | "million";
export type ResolvedAmountUnit = Exclude<AmountDisplayPreference, "auto">;

export const AMOUNT_DISPLAY_STORAGE_KEY = "databrief.dashboard.amount-display.v1";

export const AMOUNT_DISPLAY_OPTIONS = [
  { value: "auto", label: "Automatisk" },
  { value: "kr", label: "kr." },
  { value: "thousand", label: "t.kr." },
  { value: "million", label: "mio. kr." },
] as const satisfies ReadonlyArray<{
  value: AmountDisplayPreference;
  label: string;
}>;

const preferenceValues = new Set<AmountDisplayPreference>(
  AMOUNT_DISPLAY_OPTIONS.map((option) => option.value),
);

const unitDefinitions: Record<ResolvedAmountUnit, {
  divisor: number;
  maximumFractionDigits: number;
  suffix: string;
}> = {
  kr: {
    divisor: 1,
    maximumFractionDigits: 0,
    suffix: "kr.",
  },
  thousand: {
    divisor: 1_000,
    maximumFractionDigits: 1,
    suffix: "t.kr.",
  },
  million: {
    divisor: 1_000_000,
    maximumFractionDigits: 2,
    suffix: "mio. kr.",
  },
};

export function parseAmountDisplayPreference(
  value: string | null | undefined,
): AmountDisplayPreference {
  return value && preferenceValues.has(value as AmountDisplayPreference)
    ? value as AmountDisplayPreference
    : "auto";
}

export function resolveAmountUnit(
  preference: AmountDisplayPreference,
  values: Iterable<number | null | undefined>,
): ResolvedAmountUnit {
  if (preference !== "auto") return preference;

  let largestAbsoluteValue = 0;
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    largestAbsoluteValue = Math.max(largestAbsoluteValue, Math.abs(value));
  }

  if (largestAbsoluteValue >= 1_000_000) return "million";
  if (largestAbsoluteValue >= 1_000) return "thousand";
  return "kr";
}

export function formatAmount(
  value: number | null | undefined,
  unit: ResolvedAmountUnit,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "–";
  const definition = unitDefinitions[unit];
  const formatted = new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: definition.maximumFractionDigits,
  }).format(value / definition.divisor);
  return `${formatted} ${definition.suffix}`;
}

export function amountUnitLabel(unit: ResolvedAmountUnit) {
  return unitDefinitions[unit].suffix;
}
