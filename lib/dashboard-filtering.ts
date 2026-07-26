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

export function rowMatchesDashboardFilters(
  row: DashboardFilterRow,
  filters: DashboardFilters,
  ignoredField?: DashboardFilterKey,
) {
  for (const field of dashboardFilterKeys) {
    const values = filters[field];
    if (field === ignoredField || !values.length) continue;
    if (values.length === 1 ? row[field] !== values[0] : !values.includes(row[field])) {
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
      values: new Set(filters[field]),
    }));

  if (!activeFields.length) return rows;

  return rows.filter((row) =>
    activeFields.every(({ field, values }) => values.has(row[field])),
  );
}
