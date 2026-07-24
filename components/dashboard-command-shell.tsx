"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FolderKanban,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  TableProperties,
  Upload,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getDashboardView, type DashboardView } from "@/lib/dashboard-navigation";

const viewIcons: Record<DashboardView, LucideIcon> = {
  overview: LayoutDashboard,
  analysis: ChartNoAxesCombined,
  products: Boxes,
  categories: FolderKanban,
  costs: WalletCards,
  insights: BrainCircuit,
  reports: ReceiptText,
  dataset: TableProperties,
};

const primaryViewIds: DashboardView[] = [
  "overview",
  "analysis",
  "products",
  "categories",
  "costs",
  "insights",
  "reports",
];

type DashboardCommandShellProps = {
  activeView: DashboardView;
  fileName: string;
  rowCount: number;
  statusLabel: string;
  mappingMode?: boolean;
  children: ReactNode;
  onViewChange: (view: DashboardView) => void;
  onUpload: () => void;
  onEditMapping: () => void;
};

function NavigationButton({
  view,
  active,
  collapsed,
  disabled,
  onClick,
}: {
  view: DashboardView;
  active: boolean;
  collapsed: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const definition = getDashboardView(view);
  const Icon = viewIcons[view];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      title={collapsed ? definition.label : undefined}
      className={`group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-cyan-400/10 text-cyan-200 shadow-[inset_2px_0_0_#22d3ee]"
          : "text-slate-400 hover:bg-white/[0.055] hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`} aria-hidden="true" />
      {!collapsed ? <span className="truncate">{definition.label}</span> : null}
    </button>
  );
}

function ShellSidebar({
  activeView,
  collapsed,
  mobile,
  navigationLocked,
  onViewChange,
  onUpload,
  onEditMapping,
  onCollapse,
  onClose,
}: {
  activeView: DashboardView;
  collapsed: boolean;
  mobile?: boolean;
  navigationLocked?: boolean;
  onViewChange: (view: DashboardView) => void;
  onUpload: () => void;
  onEditMapping: () => void;
  onCollapse: () => void;
  onClose?: () => void;
}) {
  const navigationCollapsed = mobile ? false : collapsed;

  function selectView(view: DashboardView) {
    onViewChange(view);
    onClose?.();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#071625] text-white">
      <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.07] ${navigationCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <div className={`flex min-w-0 items-center ${navigationCollapsed ? "" : "gap-2.5"}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          {!navigationCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">DataBrief AI</p>
              <p className="text-[10px] font-medium text-slate-500">Sales intelligence</p>
            </div>
          ) : null}
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            aria-label="Luk navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : !navigationCollapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            aria-label="Fold navigationen sammen"
            title="Fold navigationen sammen"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-4" aria-label="Dashboardnavigation">
        {!navigationCollapsed ? (
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Analyse</p>
        ) : null}
        <div className="space-y-1">
          {primaryViewIds.map((view) => (
            <NavigationButton
              key={view}
              view={view}
              active={activeView === view}
              collapsed={navigationCollapsed}
              disabled={navigationLocked}
              onClick={() => selectView(view)}
            />
          ))}
        </div>

        <div className="my-4 h-px bg-white/[0.07]" />
        {!navigationCollapsed ? (
          <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">Datakilde</p>
        ) : null}
        <div className="space-y-1">
          <NavigationButton
            view="dataset"
            active={activeView === "dataset"}
            collapsed={navigationCollapsed}
            disabled={navigationLocked}
            onClick={() => selectView("dataset")}
          />
          <button
            type="button"
            onClick={() => {
              onUpload();
              onClose?.();
            }}
            title={navigationCollapsed ? "Upload ny fil" : undefined}
            className={`group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-slate-400 transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
              navigationCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <Upload className="h-[17px] w-[17px] shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden="true" />
            {!navigationCollapsed ? <span>Upload ny fil</span> : null}
          </button>
          <button
            type="button"
            onClick={() => {
              onEditMapping();
              onClose?.();
            }}
            title={navigationCollapsed ? "Kolonnetilknytning" : undefined}
            className={`group flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-slate-400 transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
              navigationCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <TableProperties className="h-[17px] w-[17px] shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden="true" />
            {!navigationCollapsed ? <span>Kolonnetilknytning</span> : null}
          </button>
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-2.5">
        {navigationCollapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-10 w-full place-items-center rounded-md text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            aria-label="Fold navigationen ud"
            title="Fold navigationen ud"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href="/"
            className="flex h-10 items-center gap-3 rounded-md px-3 text-xs font-semibold text-slate-500 transition hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Forside
          </Link>
        )}
      </div>
    </div>
  );
}

export function DashboardCommandShell({
  activeView,
  fileName,
  rowCount,
  statusLabel,
  mappingMode = false,
  children,
  onViewChange,
  onUpload,
  onEditMapping,
}: DashboardCommandShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const activeDefinition = mappingMode
    ? {
        title: "Kolonnetilknytning",
        description: "Kontrollér datagrundlaget, før dashboardet vises.",
      }
    : getDashboardView(activeView);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavigationOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavigationOpen]);

  return (
    <main className="min-h-screen bg-[#edf3f6] text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] shadow-[12px_0_40px_rgba(7,22,37,0.12)] lg:block ${
          sidebarCollapsed ? "w-[72px]" : "w-[72px] xl:w-[220px]"
        }`}
      >
        <ShellSidebar
          activeView={activeView}
          collapsed={sidebarCollapsed}
          navigationLocked={mappingMode}
          onViewChange={onViewChange}
          onUpload={onUpload}
          onEditMapping={onEditMapping}
          onCollapse={() => setSidebarCollapsed((current) => !current)}
        />
      </aside>

      {mobileNavigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#071625]/65 backdrop-blur-sm"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Luk navigation"
          />
          <aside className="relative h-full w-[min(86vw,280px)] shadow-2xl">
            <ShellSidebar
              activeView={activeView}
              collapsed={false}
              mobile
              navigationLocked={mappingMode}
              onViewChange={onViewChange}
              onUpload={onUpload}
              onEditMapping={onEditMapping}
              onCollapse={() => undefined}
              onClose={() => setMobileNavigationOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[72px] xl:pl-[220px]"}`}>
        <header className="sticky top-0 z-30 h-16 border-b border-white/[0.07] bg-[#0b1c2d]/95 text-white shadow-[0_8px_30px_rgba(7,22,37,0.12)] backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-5 xl:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 lg:hidden"
                aria-label="Åbn navigation"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-white sm:text-lg">{activeDefinition.title}</h1>
                <p className="hidden truncate text-[11px] text-slate-400 sm:block">{activeDefinition.description}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2.5">
              <div className="hidden min-w-0 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.045] px-3 py-2 md:flex">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="max-w-[230px] truncate text-[11px] font-semibold text-slate-200" title={fileName}>{fileName}</p>
                  <p className="text-[9px] text-slate-500">{rowCount.toLocaleString("da-DK")} rækker · {statusLabel}</p>
                </div>
              </div>
              <Link
                href="/"
                className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                aria-label="Gå til forsiden"
                title="Forside"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="min-w-0 px-3 py-3 sm:px-4 sm:py-4 xl:px-5">{children}</div>
      </div>
    </main>
  );
}

export function ViewAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition hover:text-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
