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
  return dashboardFilterKeys.every((field) => {
    const values = filters[field];
    return field === ignoredField || !values.length || values.includes(row[field]);
  });
}

export function applyDashboardFilters<T extends DashboardFilterRow>(
  rows: T[],
  filters: DashboardFilters,
  ignoredField?: DashboardFilterKey,
) {
  return rows.filter((row) => rowMatchesDashboardFilters(row, filters, ignoredField));
}
