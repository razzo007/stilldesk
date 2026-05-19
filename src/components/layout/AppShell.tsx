import type { ReactNode } from "react";
import { useState } from "react";
import type { Profile } from "../../types/user";
import { Header } from "./Header";
import { Sidebar, type DeskView, type TicketFilter } from "./Sidebar";

interface AppShellProps {
  activeFilter: TicketFilter;
  children: ReactNode;
  counts: Record<string, number>;
  currentUser: Profile;
  theme: "light" | "dark";
  view: DeskView;
  onAdmin: () => void;
  onFilterChange: (filter: TicketFilter) => void;
  onNewIssue: () => void;
  onProfile: () => void;
  onSignOut: () => void;
  onToggleTheme: () => void;
  onViewChange: (view: DeskView) => void;
}

export function AppShell({
  activeFilter,
  children,
  counts,
  currentUser,
  onAdmin,
  onFilterChange,
  onNewIssue,
  onProfile,
  onSignOut,
  onToggleTheme,
  onViewChange,
  theme,
  view,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("stilldesk:sidebar") === "collapsed";
  });

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("stilldesk:sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  function handleSearch() {
    onViewChange("tickets");
    setTimeout(() => {
      document.getElementById("ticket-search")?.focus();
    }, 0);
  }

  return (
    <div className="flex h-screen min-h-[640px] flex-col overflow-hidden text-desk-text">
      <Header
        currentUser={currentUser}
        onAdmin={onAdmin}
        onNewIssue={onNewIssue}
        onProfile={onProfile}
        onSignOut={onSignOut}
        onToggleTheme={onToggleTheme}
        theme={theme}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeFilter={activeFilter}
          collapsed={sidebarCollapsed}
          counts={counts}
          onFilterChange={onFilterChange}
          onSearch={handleSearch}
          onToggleCollapse={toggleSidebar}
          onViewChange={onViewChange}
          view={view}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
