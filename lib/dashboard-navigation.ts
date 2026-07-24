export type DashboardView =
  | "overview"
  | "analysis"
  | "products"
  | "categories"
  | "costs"
  | "insights"
  | "reports"
  | "dataset";

export type DashboardViewDefinition = {
  id: DashboardView;
  label: string;
  title: string;
  description: string;
};

export const dashboardViews: DashboardViewDefinition[] = [
  {
    id: "overview",
    label: "Overblik",
    title: "Kommandocenter",
    description: "De vigtigste resultater og indsigter samlet ét sted.",
  },
  {
    id: "analysis",
    label: "Analyse",
    title: "Udvikling",
    description: "Undersøg salgets udvikling på tværs af perioder.",
  },
  {
    id: "products",
    label: "Produkter",
    title: "Produktanalyse",
    description: "Sammenlign produkter efter omsætning og solgte enheder.",
  },
  {
    id: "categories",
    label: "Kategorier",
    title: "Kategorianalyse",
    description: "Se fordelingen af omsætning, indtjening og omkostninger.",
  },
  {
    id: "costs",
    label: "Omkostninger",
    title: "Omkostningsanalyse",
    description: "Følg de registrerede omkostninger og deres fordeling.",
  },
  {
    id: "insights",
    label: "AI-indsigter",
    title: "Ledelsesindsigter",
    description: "Et regelbaseret beslutningsgrundlag fra den aktuelle visning.",
  },
  {
    id: "reports",
    label: "Rapporter",
    title: "Rapporter",
    description: "Månedsrapport og ledelsesresume for den valgte periode.",
  },
  {
    id: "dataset",
    label: "Datasæt",
    title: "Datasæt",
    description: "Registrerede ark, kolonner og datagrundlag.",
  },
];

export function getDashboardView(view: DashboardView) {
  return dashboardViews.find((definition) => definition.id === view) ?? dashboardViews[0];
}
