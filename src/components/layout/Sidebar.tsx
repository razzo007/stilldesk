import {
  AlertTriangle,
  Box,
  CheckCheck,
  CircleDot,
  Clock3,
  Columns3,
  Home,
  Inbox,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Paintbrush,
  Server,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { categoryLabels } from "../../lib/constants";
import type { TicketCategory, TicketStatus } from "../../types/ticket";

export type DeskView = "tickets" | "board" | "dashboard" | "admin" | "welcome";

export type TicketFilter =
  | "all"
  | "mine"
  | "assigned"
  | "needs_attention"
  | "unassigned"
  | "stale"
  | "aging"
  | "waiting_verification"
  | "being_fixed"
  | TicketStatus
  | TicketCategory;

interface SidebarProps {
  activeFilter: TicketFilter;
  collapsed: boolean;
  view: DeskView;
  counts: Record<string, number>;
  onFilterChange: (filter: TicketFilter) => void;
  onToggleCollapse: () => void;
  onViewChange: (view: DeskView) => void;
}

type SidebarFilter = { id: TicketFilter; label: string; icon: LucideIcon };

const filters: SidebarFilter[] = [
  { id: "all", label: "All", icon: Box },
  { id: "mine", label: "My tickets", icon: CircleDot },
  { id: "assigned", label: "Assigned to me", icon: UserCheck },
  { id: "open", label: "Open", icon: CircleDot },
  { id: "in_progress", label: "In progress", icon: Wrench },
  { id: "fixed", label: "Fixed", icon: Wrench },
  { id: "verified", label: "Verified", icon: CheckCheck },
  { id: "closed", label: "Closed", icon: CheckCheck },
  { id: "design", label: categoryLabels.design, icon: Paintbrush },
  { id: "frontend", label: categoryLabels.frontend, icon: Sparkles },
  { id: "backend", label: categoryLabels.backend, icon: Server },
  { id: "ai_agent", label: categoryLabels.ai_agent, icon: Sparkles },
  { id: "infra", label: categoryLabels.infra, icon: Server },
  { id: "data", label: categoryLabels.data, icon: Box },
  { id: "copy", label: categoryLabels.copy, icon: Paintbrush },
  { id: "other", label: categoryLabels.other, icon: CircleDot },
];

const attentionFilters: SidebarFilter[] = [
  { id: "needs_attention", label: "Needs attention", icon: AlertTriangle },
  { id: "unassigned", label: "Unassigned", icon: UserCheck },
  { id: "stale", label: "Stale", icon: Clock3 },
  { id: "aging", label: "Aging", icon: Clock3 },
  { id: "blocked", label: "Blocked", icon: AlertTriangle },
  { id: "waiting_verification", label: "Waiting verification", icon: CheckCheck },
  { id: "being_fixed", label: "Being fixed", icon: Wrench },
];

const defaultVisibleFilters: TicketFilter[] = [
  "needs_attention",
  "unassigned",
  "stale",
  "blocked",
  "waiting_verification",
  "being_fixed",
  "all",
  "mine",
  "assigned",
  "open",
  "in_progress",
  "fixed",
];

const filterStorageKey = "stilldesk:visible-filters";

function navClass(active: boolean, collapsed: boolean) {
  return `flex min-h-10 items-center rounded-xl text-sm transition ${
    collapsed ? "justify-center px-0" : "justify-between gap-2 px-3"
  } ${
    active
      ? "glass-panel font-medium text-desk-text"
      : "text-desk-muted hover:bg-desk-surface/50 hover:text-desk-text"
  }`;
}

export function Sidebar({
  activeFilter,
  collapsed,
  counts,
  onFilterChange,
  onToggleCollapse,
  onViewChange,
  view,
}: SidebarProps) {
  const [editingFilters, setEditingFilters] = useState(false);
  const [visibleFilterIds, setVisibleFilterIds] = useState<TicketFilter[]>(() => {
    const saved = localStorage.getItem(filterStorageKey);
    if (!saved) return defaultVisibleFilters;

    try {
      const parsed = JSON.parse(saved) as TicketFilter[];
      return Array.isArray(parsed) && parsed.length ? parsed : defaultVisibleFilters;
    } catch {
      return defaultVisibleFilters;
    }
  });

  const visibleFilters = useMemo(() => {
    const visible = new Set(visibleFilterIds);
    return {
      attention: attentionFilters.filter((filter) => visible.has(filter.id) || activeFilter === filter.id),
      regular: filters.filter((filter) => visible.has(filter.id) || activeFilter === filter.id),
    };
  }, [activeFilter, visibleFilterIds]);

  function toggleFilter(id: TicketFilter) {
    setVisibleFilterIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      localStorage.setItem(filterStorageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <aside
      className={`hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-desk-border bg-desk-bg/72 px-3 py-4 backdrop-blur-xl transition-[width] duration-300 md:flex ${
        collapsed ? "w-20" : "w-60"
      }`}
    >
      <nav className="shrink-0 grid gap-1">
        <div className="flex items-center gap-1">
          <button
            className={`${navClass(view === "welcome", collapsed)} flex-1`}
            onClick={() => onViewChange("welcome")}
            type="button"
            title="Home"
          >
            <span className="inline-flex items-center gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              {!collapsed ? "Home" : null}
            </span>
          </button>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-desk-border/70 bg-desk-surface/35 text-desk-muted transition hover:bg-desk-surface/70 hover:text-desk-text ${
              collapsed ? "w-8" : "w-9"
            }`}
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <button
          className={navClass(view === "tickets", collapsed)}
          onClick={() => onViewChange("tickets")}
          type="button"
          title="Tickets"
        >
          <span className="inline-flex items-center gap-2">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            {!collapsed ? "Tickets" : null}
          </span>
        </button>
        <button
          className={navClass(view === "board", collapsed)}
          onClick={() => onViewChange("board")}
          type="button"
          title="Board"
        >
          <span className="inline-flex items-center gap-2">
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            {!collapsed ? "Board" : null}
          </span>
        </button>
        <button
          className={navClass(view === "dashboard", collapsed)}
          onClick={() => onViewChange("dashboard")}
          type="button"
          title="Overview"
        >
          <span className="inline-flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            {!collapsed ? "Overview" : null}
          </span>
        </button>
      </nav>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        <div className="mb-4 h-px bg-desk-border" />

        {!collapsed ? (
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-desk-muted/70">
              Needs attention
            </p>
            <button
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-desk-muted transition hover:bg-desk-surface/55 hover:text-desk-text"
              onClick={() => setEditingFilters((current) => !current)}
              title="Choose filters"
              type="button"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {!collapsed && editingFilters ? (
          <div className="mb-3 rounded-2xl border border-desk-border/75 bg-desk-surface/35 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-desk-text">Shown filters</p>
              <button
                className="text-xs text-desk-muted transition hover:text-desk-text"
                onClick={() => {
                  setVisibleFilterIds(defaultVisibleFilters);
                  localStorage.setItem(filterStorageKey, JSON.stringify(defaultVisibleFilters));
                }}
                type="button"
              >
                Reset
              </button>
            </div>
            <div className="grid max-h-64 gap-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {[...attentionFilters, ...filters].map((filter) => {
                const Icon = filter.icon;
                const checked = visibleFilterIds.includes(filter.id);

                return (
                  <button
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-desk-muted transition hover:bg-desk-surface/55 hover:text-desk-text"
                    key={`${filter.id}-${filter.label}`}
                    onClick={() => toggleFilter(filter.id)}
                    type="button"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{filter.label}</span>
                    </span>
                    <span className={checked ? "text-desk-accent" : "text-desk-muted/45"}>
                      {checked ? "Shown" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-1">
          {visibleFilters.attention.map((filter) => (
            <SidebarFilterButton
              active={activeFilter === filter.id && view === "tickets"}
              collapsed={collapsed}
              count={counts[filter.id] ?? 0}
              filter={filter}
              key={filter.id}
              onClick={() => {
                onViewChange("tickets");
                onFilterChange(filter.id);
              }}
            />
          ))}
        </div>

        <div className="my-4 h-px bg-desk-border" />

        <div className="grid gap-1">
          {visibleFilters.regular.map((filter) => (
            <SidebarFilterButton
              active={activeFilter === filter.id && view === "tickets"}
              collapsed={collapsed}
              count={counts[filter.id] ?? 0}
              filter={filter}
              key={filter.id}
              onClick={() => {
                onViewChange("tickets");
                onFilterChange(filter.id);
              }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function SidebarFilterButton({
  active,
  collapsed,
  count,
  filter,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  count: number;
  filter: SidebarFilter;
  onClick: () => void;
}) {
  const Icon = filter.icon;

  return (
    <button
      className={navClass(active, collapsed)}
      onClick={onClick}
      title={`${filter.label} (${count})`}
      type="button"
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed ? <span className="truncate">{filter.label}</span> : null}
      </span>
      {!collapsed ? <span className="text-xs text-desk-muted">{count}</span> : null}
    </button>
  );
}
