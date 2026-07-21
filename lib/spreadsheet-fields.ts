export const salesColumnAliases = {
  date: [
    "date",
    "dato",
    "salgsdato",
    "salgsdag",
    "salgs dag",
    "sales date",
    "order date",
    "ordredato",
    "ordredag",
    "invoice date",
    "fakturadato",
    "transaction date",
    "handelsdato",
    "kobsdato",
    "købsdato",
  ],
  month: ["month", "maaned", "måned", "periode", "period"],
  product: [
    "product",
    "produkt",
    "produktnavn",
    "produkt navn",
    "varenavn",
    "vare navn",
    "artikel",
    "artikelnavn",
    "product name",
    "item",
    "item name",
    "sku",
    "vare",
  ],
  category: ["category", "kategori", "produktkategori", "product category", "varegruppe", "segment"],
  channel: ["channel", "kanal", "sales channel", "salgskanal", "order channel"],
  region: ["region", "omraade", "område", "district", "territory", "sales region", "salgsregion"],
  units: ["units", "antal", "quantity", "qty", "solgt antal", "quantity sold", "stk", "pieces"],
  netRevenue: ["nettoomsaetning", "nettoomsætning", "net revenue"],
  grossRevenue: ["bruttoomsaetning", "bruttoomsætning", "gross revenue"],
  revenue: [
    "omsaetning",
    "omsætning",
    "revenue",
    "sales",
    "salg",
    "total sales",
    "amount",
    "beloeb",
    "beløb",
    "sales amount",
    "salg ekskl moms",
    "salg inkl moms",
    "budget revenue",
    "budget omsaetning",
    "budget omsætning",
  ],
  grossProfit: [
    "daekningsbidrag",
    "dækningsbidrag",
    "gross profit",
    "contribution margin",
    "profit",
    "bruttofortjeneste",
  ],
  grossMargin: ["daekningsgrad", "dækningsgrad", "gross margin", "margin", "margin %", "db %"],
  cost: [
    "omkostninger",
    "omkostning",
    "cost",
    "costs",
    "vareforbrug",
    "cogs",
    "cost of goods sold",
    "kostpris",
    "kostpris pr stk",
    "kostpris pr. stk.",
    "total cost",
    "budget costs",
    "budget cost",
    "budget omkostninger",
  ],
  unitPrice: ["price", "unit price", "pris", "pris pr stk", "pris pr. stk.", "sales price"],
} as const;

export type SalesFieldKey = keyof typeof salesColumnAliases;
export type SalesFieldMappings = Partial<Record<SalesFieldKey, string>>;

const mappingPriority: SalesFieldKey[] = [
  "date",
  "month",
  "product",
  "category",
  "channel",
  "region",
  "units",
  "netRevenue",
  "grossRevenue",
  "revenue",
  "grossProfit",
  "grossMargin",
  "cost",
  "unitPrice",
];

export function normalizeColumnHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("da-DK")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function findSalesColumnMatches(headers: string[], field: SalesFieldKey) {
  const normalizedAliases = new Set(salesColumnAliases[field].map(normalizeColumnHeader));
  return headers.filter((header) => normalizedAliases.has(normalizeColumnHeader(header)));
}

export function buildSalesColumnMappings(headers: string[]): SalesFieldMappings {
  const usedHeaders = new Set<string>();
  const mappings: SalesFieldMappings = {};

  mappingPriority.forEach((field) => {
    const match = findSalesColumnMatches(headers, field).find((header) => !usedHeaders.has(header));
    if (match) {
      mappings[field] = match;
      usedHeaders.add(match);
    }
  });

  return mappings;
}

export function scoreSalesMappings(mappings: SalesFieldMappings) {
  let score = 0;
  if (mappings.date) score += 3;
  if (mappings.month) score += 2;
  if (mappings.product) score += 4;
  if (mappings.category) score += 3;
  if (mappings.channel) score += 1;
  if (mappings.region) score += 1;
  if (mappings.units) score += 4;
  if (mappings.netRevenue) score += 5;
  if (mappings.grossRevenue) score += 4;
  if (mappings.revenue) score += 4;
  if (mappings.unitPrice) score += 2;
  if (mappings.grossProfit) score += 1;
  if (mappings.grossMargin) score += 1;
  if (mappings.cost) score += 1;
  return score;
}

function rowToHeaders(row: unknown[]) {
  return row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
}

export function detectSalesHeaderRow(rows: unknown[][]) {
  const candidates = rows.slice(0, 40).map((row, index) => {
    const headers = rowToHeaders(row);
    const mappings = buildSalesColumnMappings(headers);
    const uniqueHeaders = new Set(headers.map(normalizeColumnHeader)).size;
    const textCells = headers.filter((header) => Number.isNaN(Number(header))).length;
    const tableShapeBonus = uniqueHeaders >= 4 && textCells >= 3 ? 2 : 0;

    return { index, score: scoreSalesMappings(mappings) + tableShapeBonus };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const best = candidates[0] ?? { index: 0, score: -1 };
  const runnerUpScore = candidates[1]?.score ?? -1;
  return { index: best.index, score: best.score, scoreGap: best.score - runnerUpScore };
}

export function getMissingRequiredSalesFields(mappings: SalesFieldMappings) {
  const missing: string[] = [];
  if (!mappings.product) missing.push("Produkt / Product");
  if (!mappings.category) missing.push("Kategori / Category");
  if (!mappings.units) missing.push("Antal / Units");
  if (!mappings.date && !mappings.month) missing.push("Dato / Date eller Måned / Month");
  if (!mappings.netRevenue && !mappings.grossRevenue && !mappings.revenue && !mappings.unitPrice) {
    missing.push("Omsætning / Revenue eller Antal × Pris");
  }
  return missing;
}

export function analyzeSalesSheetStructure(name: string, rows: unknown[][]) {
  const headerDetection = detectSalesHeaderRow(rows);
  const headers = rowToHeaders(rows[headerDetection.index] ?? []);
  const mappings = buildSalesColumnMappings(headers);
  const missingFields = getMissingRequiredSalesFields(mappings);
  const requiredMatches = [
    Boolean(mappings.date || mappings.month),
    Boolean(mappings.product),
    Boolean(mappings.category),
    Boolean(mappings.units),
    Boolean(mappings.netRevenue || mappings.grossRevenue || mappings.revenue || (mappings.units && mappings.unitPrice)),
  ];
  const nameBonus = normalizeColumnHeader(name).includes("salg") || normalizeColumnHeader(name).includes("sales") ? 3 : 0;

  return {
    headers,
    headerIndex: headerDetection.index,
    headerScore: headerDetection.score,
    headerScoreGap: headerDetection.scoreGap,
    mappings,
    score: scoreSalesMappings(mappings) + nameBonus,
    confidence: Math.round((requiredMatches.filter(Boolean).length / requiredMatches.length) * 100),
    missingFields,
  };
}
