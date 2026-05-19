import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { DeskView, TicketFilter } from "./components/layout/Sidebar";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { WelcomeScreen } from "./components/dashboard/WelcomeScreen";
import { AdminUsers } from "./components/admin/AdminUsers";
import { TicketBoard } from "./components/board/TicketBoard";
import { FirstRunOnboarding } from "./components/onboarding/FirstRunOnboarding";
import { ProfileSettingsDialog } from "./components/profile/ProfileSettingsDialog";
import { CreateTicketDialog } from "./components/tickets/CreateTicketDialog";
import { TicketDetail } from "./components/tickets/TicketDetail";
import { TicketList } from "./components/tickets/TicketList";
import type { TicketListMode } from "./components/tickets/TicketList";
import { completeProfileOnboarding, getCurrentProfile, getProfiles, signOut, updateProfileRole } from "./lib/auth";
import { demoProfiles, demoTickets, demoUser, previewUser } from "./lib/mockData";
import { onboardingKey } from "./lib/onboarding";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { createTicket, deleteTicket, fetchTickets, updateTicket } from "./lib/tickets";
import { sendTicketEmail, uniqueEmails } from "./lib/notifications";
import { canCloseTicket, canEditTicket, canMarkFixed, canReopenTicket, canVerifyTicket } from "./lib/permissions";
import {
  getAttention,
  isUnresolved,
  needsAttention,
  sortTickets,
  type TicketSort,
} from "./lib/attention";
import type { CreateTicketInput, Ticket, TicketStatus } from "./types/ticket";
import type { Department, Profile, UserRole, WorkRole } from "./types/user";
import { LoginScreen } from "./LoginScreen";
import { KeyboardShortcutsModal } from "./components/ui/KeyboardShortcutsModal";

function ticketMatchesSearch(ticket: Ticket, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    ticket.id,
    ticket.title,
    ticket.description,
    ticket.module,
    ticket.dependency_note,
    ticket.assignee?.name,
    ticket.reporter?.name,
    ...(ticket.comments ?? []).map((comment) => comment.comment),
    ...(ticket.comments ?? []).map((comment) => comment.user?.name),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function ticketMatchesFilter(ticket: Ticket, filter: TicketFilter, profile: Profile) {
  if (filter === "all") return true;
  if (filter === "mine") return ticket.created_by === profile.id;
  if (filter === "assigned") return ticket.assigned_to === profile.id;
  if (filter === "needs_attention") return needsAttention(ticket);
  if (filter === "unassigned") return isUnresolved(ticket) && !ticket.assigned_to;
  if (filter === "stale") {
    const level = getAttention(ticket).attentionLevel;
    return level === "stale" || level === "critical";
  }
  if (filter === "aging") return getAttention(ticket).attentionLevel === "aging";
  if (filter === "waiting_verification") return ticket.status === "fixed";
  if (filter === "being_fixed") return ticket.status === "in_progress" || ticket.status === "fixed";
  if (["open", "assigned", "in_progress", "blocked", "fixed", "verified", "closed"].includes(filter)) {
    return ticket.status === filter;
  }
  return ticket.category === filter;
}

function replaceTicket(tickets: Ticket[], ticket: Ticket) {
  return tickets.map((item) => (item.id === ticket.id ? ticket : item));
}

function countsFor(tickets: Ticket[], profile: Profile) {
  const counts: Record<string, number> = {
    all: tickets.length,
    mine: tickets.filter((ticket) => ticket.created_by === profile.id).length,
    assigned: tickets.filter((ticket) => ticket.assigned_to === profile.id).length,
    needs_attention: tickets.filter(needsAttention).length,
    unassigned: tickets.filter((ticket) => isUnresolved(ticket) && !ticket.assigned_to).length,
    stale: tickets.filter((ticket) => {
      const level = getAttention(ticket).attentionLevel;
      return level === "stale" || level === "critical";
    }).length,
    aging: tickets.filter((ticket) => getAttention(ticket).attentionLevel === "aging").length,
    waiting_verification: tickets.filter((ticket) => ticket.status === "fixed").length,
    being_fixed: tickets.filter((ticket) => ticket.status === "in_progress" || ticket.status === "fixed").length,
  };

  for (const ticket of tickets) {
    counts[ticket.status] = (counts[ticket.status] ?? 0) + 1;
    counts[ticket.category] = (counts[ticket.category] ?? 0) + 1;
  }

  return counts;
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [activeFilter, setActiveFilter] = useState<TicketFilter>("all");
  const [listMode, setListMode] = useState<TicketListMode>(() => {
    const saved = localStorage.getItem("stilldesk:list-mode");
    return saved === "ledger" ? "ledger" : "comfortable";
  });
  const [sort, setSort] = useState<TicketSort>("needs_attention");
  const [view, setView] = useState<DeskView>("welcome");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("stilldesk:theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ticketLimit, setTicketLimit] = useState(50);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDesk = useCallback(async function loadDesk() {
    setLoading(true);
    setError("");

    try {
      const current = await getCurrentProfile();
      setProfile(current);

      if (!current) {
        setTickets([]);
        setLoading(false);
        return;
      }

      const [team, loadedTickets] = await Promise.all([getProfiles(), fetchTickets(ticketLimit)]);
      setProfiles(team);
      setTickets(loadedTickets);
      setSelectedId((existing) => existing ?? loadedTickets[0]?.id);
      setOnboardingOpen(!current.onboarding_completed && localStorage.getItem(onboardingKey(current.id)) !== "true");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load StillDesk.");
    } finally {
      setLoading(false);
    }
  }, [ticketLimit]);

  useEffect(() => {
    void loadDesk();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadDesk();
    });

    return () => subscription.unsubscribe();
  }, [loadDesk]);

  useEffect(() => {
    localStorage.setItem("stilldesk:list-mode", listMode);
  }, [listMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("stilldesk:theme", theme);
  }, [theme]);

  const roleScopedTickets = useMemo(() => (profile ? tickets : []), [profile, tickets]);

  const visibleTickets = useMemo(() => {
    if (!profile) return [];

    const filtered = roleScopedTickets
      .filter((ticket) => ticketMatchesFilter(ticket, activeFilter, profile))
      .filter((ticket) => ticketMatchesSearch(ticket, query));

    return sortTickets(filtered, sort);
  }, [activeFilter, profile, query, roleScopedTickets, sort]);

  const boardTickets = useMemo(() => {
    return sortTickets(roleScopedTickets, "needs_attention");
  }, [roleScopedTickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? visibleTickets[0],
    [selectedId, tickets, visibleTickets],
  );

  const counts = useMemo(() => (profile ? countsFor(tickets, profile) : {}), [profile, tickets]);

  const listSummary = useMemo(() => {
    const open = tickets.filter((ticket) => isUnresolved(ticket)).length;
    const blocked = tickets.filter((ticket) => ticket.status === "blocked").length;
    const attention = tickets.filter(needsAttention).length;
    return `${open} open · ${blocked} blocked · ${attention} need attention`;
  }, [tickets]);

  useEffect(() => {
    function isTyping(target: EventTarget | null) {
      const element = target as HTMLElement | null;
      return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("ticket-search")?.focus();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (isTyping(event.target)) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setDialogOpen(true);
      }

      if (!visibleTickets.length) return;

      const index = Math.max(
        0,
        visibleTickets.findIndex((ticket) => ticket.id === selectedId),
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedId(visibleTickets[Math.min(index + 1, visibleTickets.length - 1)]?.id);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedId(visibleTickets[Math.max(index - 1, 0)]?.id);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, visibleTickets]);

  async function handleCreateTicket(input: CreateTicketInput) {
    if (!profile) return;

    const created = await createTicket(input, profile);
    const assignee = profiles.find((item) => item.id === created.assigned_to) ?? null;
    const hydrated = { ...created, assignee };

    setTickets((current) => [hydrated, ...current]);
    setSelectedId(hydrated.id);
    setView("tickets");
  }

  async function handleLoadMoreTickets() {
    const nextLimit = ticketLimit + 50;
    setTicketLimit(nextLimit);
    const loadedTickets = await fetchTickets(nextLimit);
    setTickets(loadedTickets);
  }

  function handleTicketChange(ticket: Ticket) {
    const assignee = profiles.find((item) => item.id === ticket.assigned_to) ?? null;
    const reporter = profiles.find((item) => item.id === ticket.created_by) ?? ticket.reporter;
    setTickets((current) => replaceTicket(current, { ...ticket, assignee, reporter }));
    setSelectedId(ticket.id);
  }

  async function handleBoardStatusChange(ticket: Ticket, status: TicketStatus) {
    if (!profile || ticket.status === status) return;

    const canMove =
      status === "fixed"
        ? canMarkFixed(profile, ticket)
        : status === "verified"
          ? canVerifyTicket(profile, ticket)
          : status === "closed"
            ? canCloseTicket(profile)
            : status === "open" && ["fixed", "verified", "closed"].includes(ticket.status)
              ? canReopenTicket(profile, ticket)
              : canEditTicket(profile, ticket);

    if (!canMove || (status === "blocked" && !ticket.dependency_note?.trim())) {
      setSelectedId(ticket.id);
      setView("tickets");
      return;
    }

    const updated = await updateTicket(ticket, { status }, profile);
    const assignee = profiles.find((item) => item.id === updated.assigned_to) ?? updated.assignee;
    const reporter = profiles.find((item) => item.id === updated.created_by) ?? updated.reporter;
    const hydrated = { ...updated, assignee, reporter };

    setTickets((current) => replaceTicket(current, hydrated));
    setSelectedId(updated.id);

    if (["fixed", "verified", "closed"].includes(status)) {
      void sendTicketEmail({
        eventType: "resolved",
        actor: profile,
        ticket: hydrated,
        recipients: uniqueEmails([reporter?.email, assignee?.email].filter((email) => email !== profile.email)),
      }).catch(console.warn);
    }
  }

  function handleProfileChange(updated: Profile) {
    setProfile(updated);
    setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function handleRoleChange(id: string, role: UserRole) {
    const updated = await updateProfileRole(id, role);
    setProfiles((current) => current.map((item) => (item.id === id ? { ...item, ...updated } : item)));
    if (profile?.id === id) setProfile({ ...profile, ...updated });
  }

  async function handleDeleteTicket(ticket: Ticket) {
    await deleteTicket(ticket.id);
    setTickets((current) => current.filter((item) => item.id !== ticket.id));
    setSelectedId(undefined);
  }

  async function handleSignOut() {
    if (isSupabaseConfigured) await signOut();
    setProfile(null);
    setTickets([]);
    setSelectedId(undefined);
    setOnboardingOpen(false);
  }

  async function handleOnboardingComplete(input: {
    department: Department;
    preferred_filters: string[];
    preferred_view: "welcome" | "tickets" | "board" | "dashboard";
    work_role: WorkRole;
  }) {
    if (!profile) return;

    localStorage.setItem("stilldesk:visible-filters", JSON.stringify(input.preferred_filters));
    localStorage.setItem(onboardingKey(profile.id), "true");

    const updated = await completeProfileOnboarding({
      id: profile.id,
      ...input,
    });

    const onboardedProfile = { ...profile, ...updated };

    setProfile(onboardedProfile);
    setProfiles((current) => current.map((item) => (item.id === profile.id ? { ...item, ...updated } : item)));
    setOnboardingOpen(false);

    if (input.preferred_view === "tickets") {
      const primaryFilter = input.preferred_filters[0] as TicketFilter | undefined;
      if (primaryFilter) {
        setActiveFilter(primaryFilter);
        const matchingTickets = sortTickets(
          tickets.filter((ticket) => ticketMatchesFilter(ticket, primaryFilter, onboardedProfile)),
          sort,
        );
        setSelectedId(matchingTickets[0]?.id ?? tickets[0]?.id);
      }
    }

    setView(input.preferred_view);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-desk-bg text-sm text-desk-muted">
        Opening the desk...
      </main>
    );
  }

  if (!profile) {
    return (
      <LoginScreen
        onDemo={() => {
          setProfile(demoUser);
          setProfiles(demoProfiles);
          setTickets(demoTickets);
          setSelectedId(demoTickets[0]?.id);
          setOnboardingOpen(localStorage.getItem(onboardingKey(demoUser.id)) !== "true");
        }}
        onPreview={() => {
          setProfile(previewUser);
          setProfiles([previewUser]);
          setTickets([]);
          setSelectedId(undefined);
          setOnboardingOpen(localStorage.getItem(onboardingKey(previewUser.id)) !== "true");
        }}
      />
    );
  }

  if (onboardingOpen) {
    return <FirstRunOnboarding onComplete={handleOnboardingComplete} profile={profile} />;
  }

  return (
    <AppShell
      activeFilter={activeFilter}
      counts={counts}
      currentUser={profile}
      onAdmin={() => setView("admin")}
      onFilterChange={setActiveFilter}
      onNewIssue={() => setDialogOpen(true)}
      onProfile={() => setProfileOpen(true)}
      onSignOut={handleSignOut}
      onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      onViewChange={setView}
      theme={theme}
      view={view}
    >
      {error ? (
        <div className="m-4 rounded-xl border border-desk-red bg-desk-red px-4 py-3 text-sm text-desk-redText">
          {error}
        </div>
      ) : null}

      {view === "welcome" ? (
        <WelcomeScreen
          assignedCount={tickets.filter((ticket) => ticket.assigned_to === profile.id).length}
          fixingCount={tickets.filter((ticket) => ticket.status === "in_progress" || ticket.status === "fixed").length}
          onAssigned={() => {
            setActiveFilter("assigned");
            setView("tickets");
          }}
          onDashboard={() => setView("dashboard")}
          onFixing={() => {
            setActiveFilter("being_fixed");
            setView("tickets");
          }}
        />
      ) : view === "admin" ? (
        <AdminUsers profiles={profiles} onRoleChange={handleRoleChange} />
      ) : view === "dashboard" ? (
        <DashboardOverview
          onNewIssue={() => setDialogOpen(true)}
          onSelect={(ticket) => {
            setSelectedId(ticket.id);
            setView("tickets");
          }}
          profiles={profiles}
          tickets={tickets}
        />
      ) : view === "board" ? (
        <TicketBoard
          onSelect={(ticket) => {
            setSelectedId(ticket.id);
            setView("tickets");
          }}
          onStatusChange={handleBoardStatusChange}
          tickets={boardTickets}
        />
      ) : (
        <div
          className={`grid h-full min-h-0 grid-cols-1 ${
            listMode === "ledger"
              ? "md:grid-cols-[minmax(32rem,36rem)_1fr]"
              : "md:grid-cols-[minmax(21rem,26rem)_1fr]"
          }`}
        >
          <TicketList
            hasMore={isSupabaseConfigured && tickets.length >= ticketLimit}
            mode={listMode}
            onLoadMore={handleLoadMoreTickets}
            onModeChange={setListMode}
            onNewIssue={() => setDialogOpen(true)}
            onQueryChange={setQuery}
            onSelect={(ticket) => setSelectedId(ticket.id)}
            onSortChange={setSort}
            query={query}
            selectedId={selectedTicket?.id}
            sort={sort}
            summary={listSummary}
            tickets={visibleTickets}
            totalCount={tickets.length}
          />
          <TicketDetail
            allTickets={tickets}
            currentUser={profile}
            onDeleteTicket={handleDeleteTicket}
            onSelectTicket={(ticket) => setSelectedId(ticket.id)}
            onTicketChange={handleTicketChange}
            profiles={profiles}
            ticket={selectedTicket}
          />
        </div>
      )}

      <CreateTicketDialog
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateTicket}
        open={dialogOpen}
        profiles={profiles}
      />
      <ProfileSettingsDialog
        onClose={() => setProfileOpen(false)}
        onProfileChange={handleProfileChange}
        open={profileOpen}
        profile={profile}
      />
      <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
    </AppShell>
  );
}
