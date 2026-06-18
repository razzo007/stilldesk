import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DeskView, TicketFilter } from "../components/layout/Sidebar";
import type { TicketListMode } from "../components/tickets/TicketList";
import type { TicketSort } from "../lib/attention";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UIState {
  theme: "light" | "dark";
  view: DeskView;
  activeFilter: TicketFilter;
  sort: TicketSort;
  listMode: TicketListMode;
  query: string;
  createDialogOpen: boolean;
  profileDialogOpen: boolean;
  shortcutsOpen: boolean;
  onboardingOpen: boolean;
}

interface UIActions {
  setTheme(theme: "light" | "dark"): void;
  toggleTheme(): void;
  setView(view: DeskView): void;
  setActiveFilter(filter: TicketFilter): void;
  setSort(sort: TicketSort): void;
  setListMode(mode: TicketListMode): void;
  setQuery(query: string): void;
  setCreateDialogOpen(open: boolean): void;
  setProfileDialogOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
  setOnboardingOpen(open: boolean): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readTheme(): "light" | "dark" {
  const saved = localStorage.getItem("stilldesk:theme");
  return saved === "dark" ? "dark" : "light";
}

function readListMode(): TicketListMode {
  return localStorage.getItem("stilldesk:list-mode") === "ledger" ? "ledger" : "comfortable";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("stilldesk:theme", theme);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialTheme = readTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    (set, get) => ({
      theme: initialTheme,
      view: "welcome",
      activeFilter: "all",
      sort: "needs_attention",
      listMode: readListMode(),
      query: "",
      createDialogOpen: false,
      profileDialogOpen: false,
      shortcutsOpen: false,
      onboardingOpen: false,

      setTheme(theme) {
        applyTheme(theme);
        set({ theme }, false, "ui/theme");
      },

      toggleTheme() {
        get().setTheme(get().theme === "dark" ? "light" : "dark");
      },

      setView: (view) => set({ view }, false, "ui/view"),

      setActiveFilter: (activeFilter) => set({ activeFilter }, false, "ui/filter"),

      setSort: (sort) => set({ sort }, false, "ui/sort"),

      setListMode(mode) {
        localStorage.setItem("stilldesk:list-mode", mode);
        set({ listMode: mode }, false, "ui/listMode");
      },

      setQuery: (query) => set({ query }, false, "ui/query"),

      setCreateDialogOpen: (createDialogOpen) =>
        set({ createDialogOpen }, false, "ui/createDialog"),

      setProfileDialogOpen: (profileDialogOpen) =>
        set({ profileDialogOpen }, false, "ui/profileDialog"),

      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }, false, "ui/shortcuts"),

      setOnboardingOpen: (onboardingOpen) => set({ onboardingOpen }, false, "ui/onboarding"),
    }),
    { name: "StillDesk/ui" },
  ),
);
