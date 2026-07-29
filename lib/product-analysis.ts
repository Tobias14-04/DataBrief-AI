import {
  formatDanishCurrencyPrecise,
} from "./dashboard-insights.ts";
import {
  displayLabel,
  normalizeForComparison,
} from "./data-labels.ts";

export type ProductMetricKey = "revenue" | "units" | "averagePrice" | "share";
export type ProductTableColumnKey = "name" | ProductMetricKey;
export type ProductSortDirection = "asc" | "desc";

export type ProductMetricInput = {
  name: string;
  revenue: number | null;
  units: number | null;
};

export type ProductAnalysisRow = {
  name: string;
  revenue: number | null;
  units: number | null;
  averagePrice: number | null;
  share: number | null;
};

export const PRODUCT_TABLE_COLUMN_ORDER = [
  "name",
  "revenue",
  "units",
  "averagePrice",
  "share",
] as const satisfies ReadonlyArray<ProductTableColumnKey>;

export const PRODUCT_TABLE_PRIMARY_COLUMNS = [
  "name",
  "revenue",
] as const satisfies ReadonlyArray<ProductTableColumnKey>;

export const PRODUCT_TABLE_OPTIONAL_COLUMNS = [
  "units",
  "averagePrice",
  "share",
] as const satisfies ReadonlyArray<ProductTableColumnKey>;

export const PRODUCT_TABLE_COLUMN_LABELS: Record<ProductTableColumnKey, string> = {
  name: "Produkt",
  revenue: "Omsætning",
  units: "Solgte enheder",
  averagePrice: "Gennemsnitspris",
  share: "Andel",
};

export const PRODUCT_METRIC_LABELS: Record<ProductMetricKey, {
  selectLabel: string;
  title: string;
  description: string;
}> = {
  revenue: {
    selectLabel: "Omsætning",
    title: "Topprodukter efter omsætning",
    description: "Rangeret efter registreret produktomsætning",
  },
  units: {
    selectLabel: "Solgte enheder",
    title: "Topprodukter efter solgte enheder",
    description: "Rangeret efter registreret salgsvolumen",
  },
  averagePrice: {
    selectLabel: "Gennemsnitspris",
    title: "Topprodukter efter gennemsnitspris",
    description: "Omsætning divideret med solgte enheder",
  },
  share: {
    selectLabel: "Andel af samlet omsætning",
    title: "Topprodukter efter omsætningsandel",
    description: "Rangeret efter andel af den filtrerede omsætning",
  },
};

const columnKeySet = new Set<string>(PRODUCT_TABLE_COLUMN_ORDER);
const danishProductCollator = new Intl.Collator("da-DK", {
  numeric: true,
  sensitivity: "base",
});

function finiteOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function highestBy(
  rows: ReadonlyArray<ProductAnalysisRow>,
  key: ProductMetricKey,
) {
  return rows.reduce<ProductAnalysisRow | null>((highest, row) => {
    const value = row[key];
    if (value === null) return highest;
    if (key === "units" && value <= 0) return highest;
    if (!highest) return row;
    const highestValue = highest[key];
    if (highestValue === null || value > highestValue) return row;
    return highest;
  }, null);
}

export function buildProductAnalysis(
  products: ReadonlyArray<ProductMetricInput>,
  options: {
    hasRevenue?: boolean;
    hasUnits?: boolean;
  } = {},
) {
  const hasRevenue = options.hasRevenue
    ?? products.some((product) => finiteOrNull(product.revenue) !== null);
  const hasUnits = options.hasUnits
    ?? products.some((product) => finiteOrNull(product.units) !== null);
  const normalized = products
    .map((product) => ({
      name: displayLabel(product.name, ""),
      revenue: hasRevenue ? finiteOrNull(product.revenue) : null,
      units: hasUnits ? finiteOrNull(product.units) : null,
    }))
    .filter((product) => product.name);
  const totalRevenue = hasRevenue
    ? normalized.reduce((sum, product) => sum + (product.revenue ?? 0), 0)
    : 0;
  const rows: ProductAnalysisRow[] = normalized.map((product) => ({
    ...product,
    averagePrice: product.revenue !== null
      && product.units !== null
      && product.units > 0
      ? product.revenue / product.units
      : null,
    share: product.revenue !== null && totalRevenue !== 0
      ? product.revenue / totalRevenue
      : null,
  }));

  return {
    rows,
    totalRevenue,
    hasProducts: rows.length > 0,
    hasRevenue,
    hasUnits,
    highestRevenue: hasRevenue ? highestBy(rows, "revenue") : null,
    mostUnits: hasUnits ? highestBy(rows, "units") : null,
    highestAveragePrice: hasRevenue && hasUnits
      ? highestBy(rows, "averagePrice")
      : null,
  };
}

export type ProductAnalysis = ReturnType<typeof buildProductAnalysis>;

export function buildProductInsight(analysis: ProductAnalysis) {
  const revenueLeader = analysis.highestRevenue;
  if (!revenueLeader || revenueLeader.revenue === null) return null;

  const unitsLeader = analysis.mostUnits;
  if (!unitsLeader || unitsLeader.units === null) {
    return `${revenueLeader.name} har den højeste omsætning. Enhedsbaseret sammenligning er ikke tilgængelig i det aktuelle datagrundlag.`;
  }

  if (unitsLeader.name === revenueLeader.name) {
    const price = revenueLeader.averagePrice;
    return price === null
      ? `${revenueLeader.name} har både den højeste omsætning og flest solgte enheder.`
      : `${revenueLeader.name} har både den højeste omsætning og flest solgte enheder med en gennemsnitspris på ${formatDanishCurrencyPrecise(price)}.`;
  }

  let priceComparison = "";
  if (
    revenueLeader.averagePrice !== null
    && unitsLeader.averagePrice !== null
  ) {
    if (revenueLeader.averagePrice > unitsLeader.averagePrice) {
      priceComparison = ` Det hænger sammen med en højere gennemsnitspris for ${revenueLeader.name}.`;
    } else if (revenueLeader.averagePrice < unitsLeader.averagePrice) {
      priceComparison = ` ${unitsLeader.name} har samtidig den højere gennemsnitspris af de to.`;
    } else {
      priceComparison = " De to produkter har samme gennemsnitspris.";
    }
  }

  return `${revenueLeader.name} har den højeste omsætning, mens ${unitsLeader.name} sælger flest enheder.${priceComparison}`;
}

export function productMetricValue(
  row: ProductAnalysisRow,
  key: ProductMetricKey,
) {
  return row[key];
}

export function compareNullableProductNumbers(
  left: number | null,
  right: number | null,
  direction: ProductSortDirection,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = left === right ? 0 : left < right ? -1 : 1;
  return direction === "asc" ? comparison : -comparison;
}

export function sortProductRows(
  rows: ReadonlyArray<ProductAnalysisRow>,
  key: ProductTableColumnKey,
  direction: ProductSortDirection,
) {
  return [...rows].sort((left, right) => {
    if (key === "name") {
      const comparison = danishProductCollator.compare(left.name, right.name);
      return direction === "asc" ? comparison : -comparison;
    }
    return compareNullableProductNumbers(left[key], right[key], direction)
      || danishProductCollator.compare(left.name, right.name);
  });
}

export function rankProductRows(
  rows: ReadonlyArray<ProductAnalysisRow>,
  key: ProductMetricKey,
  limit = 10,
) {
  return sortProductRows(
    rows.filter((row) => (
      row[key] !== null && (key !== "units" || (row.units ?? -1) >= 0)
    )),
    key,
    "desc",
  ).slice(0, Math.max(0, limit));
}

export function filterProductRows(
  rows: ReadonlyArray<ProductAnalysisRow>,
  query: string,
) {
  const normalizedQuery = normalizeForComparison(query);
  if (!normalizedQuery) return [...rows];
  return rows.filter((row) => (
    normalizeForComparison(row.name).includes(normalizedQuery)
  ));
}

export function getAvailableProductTableColumns(
  analysis: Pick<ProductAnalysis, "hasProducts" | "hasRevenue" | "hasUnits">,
) {
  return PRODUCT_TABLE_COLUMN_ORDER.filter((key) => {
    if (key === "name") return analysis.hasProducts;
    if (key === "revenue") return analysis.hasRevenue;
    if (key === "units") return analysis.hasUnits;
    if (key === "averagePrice") {
      return analysis.hasRevenue && analysis.hasUnits;
    }
    return analysis.hasRevenue;
  });
}

export function isProductTableColumnKey(
  value: unknown,
): value is ProductTableColumnKey {
  return typeof value === "string" && columnKeySet.has(value);
}

export function normalizeProductTableColumnSelection(
  selectedColumns: Iterable<ProductTableColumnKey>,
  availableColumns: Iterable<ProductTableColumnKey>,
) {
  const selected = new Set(selectedColumns);
  const available = new Set(availableColumns);
  PRODUCT_TABLE_PRIMARY_COLUMNS.forEach((key) => {
    if (available.has(key)) selected.add(key);
  });
  return PRODUCT_TABLE_COLUMN_ORDER.filter((key) => (
    available.has(key) && selected.has(key)
  ));
}

export function parseProductTableColumnSelection(
  serializedValue: string | null | undefined,
  availableColumns: Iterable<ProductTableColumnKey>,
) {
  const available = [...availableColumns];
  if (!serializedValue) return available;

  try {
    const parsed: unknown = JSON.parse(serializedValue);
    if (!Array.isArray(parsed)) return available;
    return normalizeProductTableColumnSelection(
      parsed.filter(isProductTableColumnKey),
      available,
    );
  } catch {
    return available;
  }
}

export function serializeProductTableColumnSelection(
  selectedColumns: Iterable<ProductTableColumnKey>,
  availableColumns: Iterable<ProductTableColumnKey>,
) {
  return JSON.stringify(normalizeProductTableColumnSelection(
    selectedColumns,
    availableColumns,
  ));
}
