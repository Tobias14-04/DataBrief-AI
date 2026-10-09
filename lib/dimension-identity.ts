import { chooseRepresentativeLabel, comparableLabel, displayLabel } from "./data-labels.ts";

export type SalesDimension = "product" | "category" | "channel" | "region";
export const missingDimensionLabels: Record<SalesDimension, string> = {
  product: "Produkt ikke registreret",
  category: "Ikke kategoriseret",
  channel: "Kanal ikke registreret",
  region: "Region ikke registreret",
};

// Reserved filter identity, never written into source cells or transaction names.
export function missingDimensionKey(dimension: SalesDimension) {
  return `\u0000senvoriq:missing:${dimension}`;
}
export function dimensionIdentity(value: unknown, dimension: SalesDimension) {
  const raw = displayLabel(value, "");
  if (!raw || raw === missingDimensionKey(dimension)) {
    return { key: missingDimensionKey(dimension), label: missingDimensionLabels[dimension], missing: true };
  }
  const identity = comparableLabel(raw);
  return { ...identity, label: raw === missingDimensionLabels[dimension] ? `${identity.label} (registreret)` : identity.label, missing: false };
}
export function dimensionFilterValue(value: unknown, dimension: SalesDimension) {
  return dimensionIdentity(value, dimension).missing ? missingDimensionKey(dimension) : displayLabel(value, "");
}
export function dimensionFilterLabel(value: string, field: string) {
  return field in missingDimensionLabels && value === missingDimensionKey(field as SalesDimension)
    ? missingDimensionLabels[field as SalesDimension]
    : field in missingDimensionLabels ? dimensionIdentity(value, field as SalesDimension).label : value;
}

export function dimensionFilterOptions(values: Iterable<unknown>, dimension: SalesDimension) {
  const options = new Map<string, string>();
  for (const value of values) {
    const identity = dimensionIdentity(value, dimension);
    const filterValue = dimensionFilterValue(value, dimension);
    options.set(identity.key, identity.missing ? filterValue
      : chooseRepresentativeLabel(options.get(identity.key) ?? filterValue, filterValue));
  }
  return [...options.values()].sort((a, b) => a.localeCompare(b, "da"));
}
