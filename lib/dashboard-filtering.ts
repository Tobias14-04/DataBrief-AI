import { normalizeForComparison } from "./data-labels.ts";

export const dashboardFilterKeys = [
  "month",
  "product",
  "category",
  "channel",
  "region",
] as const;

export type DashboardFilterKey = (typeof dashboardFilterKeys)[number];
export type DashboardFilters = Record<DashboardFilterKey, string[]>;

export type DashboardFilterRow = Record<DashboardFilterKey, string>;

export function reconcileDashboardFilterDraft(
  appliedFilters: DashboardFilters,
  draftFilters: DashboardFilters,
  hasPendingDraft: boolean,
) {
  if (appliedFilters === draftFilters) {
    return { filters: draftFilters, hasPendingDraft: false };
  }
  if (hasPendingDraft) {
    return { filters: draftFilters, hasPendingDraft: true };
  }
  return { filters: appliedFilters, hasPendingDraft: false };
}

export function toggleDashboardFilterValue(
  filters: DashboardFilters,
  field: DashboardFilterKey,
  value: string,
): DashboardFilters {
  const comparisonKey = normalizeForComparison(value);
  const isSelected = filters[field].some(
    (selected) => normalizeForComparison(selected) === comparisonKey,
  );

  if (field === "month") {
    return {
      ...filters,
      month: isSelected ? [] : [value],
    };
  }

  return {
    ...filters,
    [field]: isSelected
      ? filters[field].filter(
          (selected) => normalizeForComparison(selected) !== comparisonKey,
        )
      : [...filters[field], value],
  };
}

export function rowMatchesDashboardFilters(
  row: DashboardFilterRow,
  filters: DashboardFilters,
  ignoredField?: DashboardFilterKey,
) {
  for (const field of dashboardFilterKeys) {
    const values = filters[field];
    if (field === ignoredField || !values.length) continue;
    const rowKey = normalizeForComparison(row[field]);
    if (!values.some((value) => normalizeForComparison(value) === rowKey)) {
      return false;
    }
  }

  return true;
}

export function applyDashboardFilters<T extends DashboardFilterRow>(
  rows: T[],
  filters: DashboardFilters,
  ignoredField?: DashboardFilterKey,
) {
  const activeFields = dashboardFilterKeys
    .filter((field) => field !== ignoredField && filters[field].length)
    .map((field) => ({
      field,
      values: new Set(filters[field].map(normalizeForComparison)),
    }));

  if (!activeFields.length) return rows;

  return rows.filter((row) =>
    activeFields.every(({ field, values }) => values.has(normalizeForComparison(row[field]))),
  );
}
