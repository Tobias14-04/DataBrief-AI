export type DashboardView =
  | "overview"
  | "analysis"
  | "products"
  | "categories"
  | "channels"
  | "regions"
  | "costs"
  | "insights"
  | "dataset";

export type ManagementTab = "insights" | "report" | "strategy";
export type DashboardMainView = "overview" | "analysis" | "economy" | "management" | "data";

export type DashboardViewDefinition = {
  id: DashboardView;
  label: string;
  title: string;
  description: string;
};

export const dashboardViews: DashboardViewDefinition[] = [
  { id: "overview", label: "Overblik", title: "Kommandocenter", description: "De vigtigste resultater og indsigter samlet ét sted." },
  { id: "analysis", label: "Analyse", title: "Analyse", description: "Undersøg udvikling og fordelinger i det aktuelle scope." },
  { id: "products", label: "Produkter", title: "Analyse", description: "Sammenlign produkter efter omsætning og solgte enheder." },
  { id: "categories", label: "Kategorier", title: "Analyse", description: "Se fordelingen af omsætning, indtjening og omkostninger." },
  { id: "channels", label: "Kanaler", title: "Analyse", description: "Se hvor ændringer er registreret på tværs af kanaler." },
  { id: "regions", label: "Regioner", title: "Analyse", description: "Se hvor ændringer er registreret på tværs af regioner." },
  { id: "costs", label: "Økonomi", title: "Økonomi", description: "Omkostninger, resultat, budget og effektivitet på dokumenteret grundlag." },
  { id: "insights", label: "Ledelse", title: "Ledelse", description: "Indsigter, ledelsesrapport og strategisk opsamling." },
  { id: "dataset", label: "Data / opsætning", title: "Data / opsætning", description: "Datasæt, filskift og kolonnetilknytning." },
];

export function resolveDashboardView(view: string | null | undefined): DashboardView {
  if (view === "reports" || view === "management") return "insights";
  if (view === "economy") return "costs";
  if (view === "data") return "dataset";
  return dashboardViews.some((definition) => definition.id === view)
    ? view as DashboardView
    : "overview";
}

export function getDashboardView(view: string | null | undefined) {
  const resolvedView = resolveDashboardView(view);
  return dashboardViews.find((definition) => definition.id === resolvedView) ?? dashboardViews[0];
}

export function mainDashboardView(view: DashboardView): DashboardMainView {
  if (["analysis", "products", "categories", "channels", "regions"].includes(view)) return "analysis";
  if (view === "costs") return "economy";
  if (view === "insights") return "management";
  if (view === "dataset") return "data";
  return "overview";
}

export function parseDashboardLocation(search: string): { view: DashboardView; managementTab: ManagementTab } {
  const params = new URLSearchParams(search);
  const requestedView = params.get("view");
  const tab = params.get("tab");
  const view = requestedView === "analysis"
    ? (["products", "categories", "channels", "regions"].includes(tab ?? "") ? tab as DashboardView : "analysis")
    : resolveDashboardView(requestedView);
  return {
    view,
    managementTab: view === "insights" && (tab === "report" || tab === "strategy") ? tab : "insights",
  };
}

export function dashboardLocationSearch(
  view: DashboardView,
  managementTab: ManagementTab = "insights",
  existingSearch = "",
): string {
  const params = new URLSearchParams(existingSearch);
  const main = mainDashboardView(view);
  params.set("view", main);
  if (main === "analysis" && view !== "analysis") params.set("tab", view);
  else if (main === "management" && managementTab !== "insights") params.set("tab", managementTab);
  else params.delete("tab");
  return `?${params.toString()}`;
}
