export type DashboardView =
  | "overview"
  | "analysis"
  | "products"
  | "categories"
  | "costs"
  | "insights"
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
    label: "Indsigter",
    title: "Indsigter & rapporter",
    description: "Forstå udviklingen, find de vigtigste drivere og læs ledelsesrapporten.",
  },
  {
    id: "dataset",
    label: "Datasæt",
    title: "Datasæt",
    description: "Registrerede ark, kolonner og datagrundlag.",
  },
];

export function resolveDashboardView(view: string | null | undefined): DashboardView {
  if (view === "reports") return "insights";
  return dashboardViews.some((definition) => definition.id === view)
    ? view as DashboardView
    : "overview";
}

export function getDashboardView(view: string | null | undefined) {
  const resolvedView = resolveDashboardView(view);
  return dashboardViews.find((definition) => definition.id === resolvedView) ?? dashboardViews[0];
}
