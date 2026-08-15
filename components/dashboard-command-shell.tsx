"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FolderKanban,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  TableProperties,
  Upload,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getDashboardView, type DashboardView } from "@/lib/dashboard-navigation";

const viewIcons: Record<DashboardView, LucideIcon> = {
  overview: LayoutDashboard,
  analysis: ChartNoAxesCombined,
  products: Boxes,
  categories: FolderKanban,
  costs: WalletCards,
  insights: BrainCircuit,
  dataset: TableProperties,
};

const primaryViewIds: DashboardView[] = [
  "overview",
  "analysis",
  "products",
  "categories",
  "costs",
  "insights",
];

type DashboardCommandShellProps = {
  activeView: DashboardView;
  fileName: string;
  sheetName?: string;
  rowCount: number;
  statusLabel: string;
  warning?: string;
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
      aria-label={collapsed ? definition.label : undefined}
      title={collapsed ? definition.label : undefined}
      className={`app-navigation-item group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-left text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-cyan-300/[0.09] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-cyan-300"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
          active ? "text-cyan-300" : "text-slate-400 group-hover:text-slate-200"
        }`}
        aria-hidden="true"
      />
      {!collapsed ? <span className="truncate">{definition.label}</span> : null}
    </button>
  );
}

function SidebarAction({
  icon: Icon,
  label,
  collapsed,
  active = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-left text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
        active
          ? "bg-cyan-300/[0.09] text-cyan-50 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-cyan-300"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-slate-200" aria-hidden="true" />
      {!collapsed ? <span>{label}</span> : null}
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
    <div className="app-sidebar flex h-full min-h-0 flex-col text-white">
      <div className={`flex h-[76px] shrink-0 items-center border-b border-white/[0.07] ${navigationCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <div className={`flex min-w-0 items-center ${navigationCollapsed ? "" : "gap-3"}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_8px_22px_rgba(0,0,0,0.16)]">
            <BarChart3 className="h-[19px] w-[19px]" aria-hidden="true" />
          </span>
          {!navigationCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">DataBrief AI</p>
              <p className="mt-0.5 text-xs font-medium text-slate-400">Sales intelligence</p>
            </div>
          ) : null}
        </div>
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            aria-label="Luk navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : !navigationCollapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            aria-label="Fold navigationen sammen"
            title="Fold navigationen sammen"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-5" aria-label="Dashboardnavigation">
        {!navigationCollapsed ? (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Analyse</p>
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
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Datakilde</p>
        ) : null}
        <div className="space-y-1">
          <NavigationButton
            view="dataset"
            active={activeView === "dataset"}
            collapsed={navigationCollapsed}
            disabled={navigationLocked}
            onClick={() => selectView("dataset")}
          />
          <SidebarAction
            icon={Upload}
            label="Upload ny fil"
            collapsed={navigationCollapsed}
            onClick={() => {
              onUpload();
              onClose?.();
            }}
          />
          <SidebarAction
            icon={TableProperties}
            label="Kolonnetilknytning"
            collapsed={navigationCollapsed}
            active={navigationLocked}
            onClick={() => {
              onEditMapping();
              onClose?.();
            }}
          />
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-2.5">
        {navigationCollapsed ? (
          <button
            type="button"
            onClick={onCollapse}
            className="grid h-11 w-full place-items-center rounded-lg text-slate-300 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            aria-label="Fold navigationen ud"
            title="Fold navigationen ud"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        ) : (
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:bg-white/[0.065] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            Forside
          </Link>
        )}
      </div>
    </div>
  );
}

function DatasetContext({
  fileName,
  sheetName,
  rowCount,
  statusLabel,
  warning,
}: {
  fileName: string;
  sheetName?: string;
  rowCount: number;
  statusLabel: string;
  warning?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-200/15 bg-cyan-200/[0.08] text-cyan-200">
        <FileSpreadsheet className="h-[17px] w-[17px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-4 text-white" title={fileName}>{fileName}</p>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-4 text-slate-300">
          <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${warning ? "text-amber-300" : "text-emerald-300"}`} aria-hidden="true" />
          <span className="shrink-0 tabular-nums">{rowCount.toLocaleString("da-DK")} rækker</span>
          <span aria-hidden="true">·</span>
          <span className="truncate" title={warning ?? statusLabel}>{warning ?? statusLabel}</span>
          {sheetName ? <span className="hidden truncate 2xl:inline" title={sheetName}>· {sheetName}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function DashboardCommandShell({
  activeView,
  fileName,
  sheetName,
  rowCount,
  statusLabel,
  warning,
  mappingMode = false,
  children,
  onViewChange,
  onUpload,
  onEditMapping,
}: DashboardCommandShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [datasetMenuOpen, setDatasetMenuOpen] = useState(false);
  const datasetMenuRef = useRef<HTMLDivElement>(null);
  const activeDefinition = mappingMode
    ? {
        title: "Kolonnetilknytning",
        description: "Kontrollér datagrundlaget, før dashboardet vises.",
      }
    : getDashboardView(activeView);

  useEffect(() => {
    const mediumViewport = window.matchMedia("(min-width: 1024px) and (max-width: 1279px)");
    if (mediumViewport.matches) setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (!mobileNavigationOpen && !datasetMenuOpen) return;

    function closeOnKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileNavigationOpen(false);
      setDatasetMenuOpen(false);
    }

    function closeDatasetMenu(event: PointerEvent) {
      if (datasetMenuRef.current && !datasetMenuRef.current.contains(event.target as Node)) {
        setDatasetMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnKeyDown);
    window.addEventListener("pointerdown", closeDatasetMenu);
    return () => {
      window.removeEventListener("keydown", closeOnKeyDown);
      window.removeEventListener("pointerdown", closeDatasetMenu);
    };
  }, [datasetMenuOpen, mobileNavigationOpen]);

  return (
    <main className="app-workspace min-h-screen overflow-x-clip text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-x-hidden border-r border-white/[0.06] shadow-[12px_0_38px_rgba(5,18,30,0.14)] transition-[width] duration-200 lg:block ${
          sidebarCollapsed ? "w-[76px]" : "w-[228px]"
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
            className="absolute inset-0 bg-[#06131f]/72 backdrop-blur-sm"
            onClick={() => setMobileNavigationOpen(false)}
            aria-label="Luk navigation"
          />
          <aside className="relative h-full w-[min(86vw,288px)] shadow-2xl">
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

      <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[228px]"}`}>
        <header className="app-topbar sticky top-0 z-30 border-b text-white">
          <div className="flex min-h-[76px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-5 xl:flex-nowrap xl:px-7">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavigationOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-200 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 lg:hidden"
                aria-label="Åbn navigation"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-semibold leading-7 tracking-[-0.015em] text-white sm:text-[24px]">{activeDefinition.title}</h1>
                <p className="mt-0.5 hidden truncate text-sm leading-5 text-slate-300 sm:block">{activeDefinition.description}</p>
              </div>
            </div>

            <div className="flex min-w-0 basis-full items-center gap-2 pl-[52px] sm:basis-auto sm:pl-0 xl:ml-auto">
              <button
                type="button"
                onClick={() => onViewChange("dataset")}
                className="flex min-w-0 flex-1 items-center rounded-xl border border-white/[0.09] bg-white/[0.045] px-2.5 py-2 text-left transition-colors duration-200 hover:border-cyan-200/20 hover:bg-white/[0.075] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 sm:max-w-[330px] xl:w-[280px]"
                aria-label={`Åbn datasættet ${fileName}`}
              >
                <DatasetContext
                  fileName={fileName}
                  sheetName={sheetName}
                  rowCount={rowCount}
                  statusLabel={statusLabel}
                  warning={warning}
                />
              </button>

              <div className="hidden shrink-0 items-center gap-2 xl:flex">
                <button
                  type="button"
                  onClick={onEditMapping}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.055] px-3.5 text-[13px] font-semibold text-slate-100 transition-colors duration-200 hover:border-cyan-200/25 hover:bg-white/[0.095] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                >
                  Rediger kolonnetilknytning
                </button>
                <button
                  type="button"
                  onClick={onUpload}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3.5 text-[13px] font-semibold text-[#062031] shadow-[0_8px_20px_rgba(6,182,212,0.18)] transition-colors duration-200 hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Skift fil
                </button>
              </div>

              <div ref={datasetMenuRef} className="relative shrink-0 xl:hidden">
                <button
                  type="button"
                  onClick={() => setDatasetMenuOpen((current) => !current)}
                  aria-expanded={datasetMenuOpen}
                  aria-haspopup="menu"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition-colors duration-200 hover:bg-white/[0.09] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                  aria-label="Åbn filhandlinger"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </button>
                {datasetMenuOpen ? (
                  <div className="premium-popover absolute right-0 top-[calc(100%+8px)] z-50 w-[min(280px,calc(100vw-32px))] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-ink shadow-[0_22px_55px_rgba(5,18,30,0.22)]" role="menu">
                    <button
                      type="button"
                      onClick={() => {
                        onEditMapping();
                        setDatasetMenuOpen(false);
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                      role="menuitem"
                    >
                      <TableProperties className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                      Rediger kolonnetilknytning
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpload();
                        setDatasetMenuOpen(false);
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                      role="menuitem"
                    >
                      <Upload className="h-4 w-4 text-cyan-700" aria-hidden="true" />
                      Skift fil
                    </button>
                    <Link
                      href="/"
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                      role="menuitem"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      Forside
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="app-workspace-content min-w-0 px-4 py-5 sm:px-5 sm:py-6 xl:px-7 xl:py-7 2xl:px-8">{children}</div>
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
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
    >
      {label}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
