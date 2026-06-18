import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "./components/layout/AppShell";
import type { TicketFilter } from "./components/layout/Sidebar";
import { AdminUsers } from "./components/admin/AdminUsers";
import { TicketBoard } from "./components/board/TicketBoard";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { WelcomeScreen } from "./components/dashboard/WelcomeScreen";
import { FirstRunOnboarding } from "./components/onboarding/FirstRunOnboarding";
import { ProfileSettingsDialog } from "./components/profile/ProfileSettingsDialog";
import { CreateTicketDialog } from "./components/tickets/CreateTicketDialog";
import { TicketDetail } from "./components/tickets/TicketDetail";
import { TicketList } from "./components/tickets/TicketList";
import { KeyboardShortcutsModal } from "./components/ui/KeyboardShortcutsModal";
import { LoginScreen } from "./LoginScreen";
import { useAuthStore, selectOnboardingPending } from "./store/authStore";
import { useTicketStore } from "./store/ticketStore";
import { useUIStore } from "./store/uiStore";
import { useCurrentProfile, useProfiles, useUpdateProfileRole, useCompleteOnboarding } from "./queries/auth";
import { useTickets, useCreateTicket, useDeleteTicket } from "./queries/tickets";
import { authKeys, ticketKeys } from "./queries/keys";
import { onboardingKey } from "./lib/onboarding";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { acceptInvitation } from "./lib/auth";
import { updateTicket } from "./lib/tickets";
import { sendTicketEmail, uniqueEmails } from "./lib/notifications";
import { canCloseTicket, canEditTicket, canMarkFixed, canReopenTicket, canVerifyTicket } from "./lib/permissions";
import { getAttention, isUnresolved, needsAttention, sortTickets } from "./lib/attention";
import type { Ticket, TicketStatus } from "./types/ticket";
import type { Department, Profile, WorkRole } from "./types/user";

// ---------------------------------------------------------------------------
// Pure helpers (no state, no side-effects)
// ---------------------------------------------------------------------------

function matchesSearch(ticket: Ticket, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    ticket.id,
    ticket.title,
    ticket.description,
    ticket.module,
    ticket.dependency_note,
    ticket.assignee?.name,
    ticket.reporter?.name,
    ...(ticket.comments ?? []).map((c) => c.comment),
    ...(ticket.comments ?? []).map((c) => c.user?.name),
  ]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

function matchesFilter(ticket: Ticket, filter: TicketFilter, profile: Profile): boolean {
  if (filter === "all") return true;
  if (filter === "mine") return ticket.created_by === profile.id;
  if (filter === "assigned") return ticket.assigned_to === profile.id;
  if (filter === "needs_attention") return needsAttention(ticket);
  if (filter === "unassigned") return isUnresolved(ticket) && !ticket.assigned_to;
  if (filter === "stale") {
    const lvl = getAttention(ticket).attentionLevel;
    return lvl === "stale" || lvl === "critical";
  }
  if (filter === "aging") return getAttention(ticket).attentionLevel === "aging";
  if (filter === "waiting_verification") return ticket.status === "fixed";
  if (filter === "being_fixed") return ticket.status === "in_progress" || ticket.status === "fixed";
  const statuses = ["open", "assigned", "in_progress", "blocked", "fixed", "verified", "closed"];
  return statuses.includes(filter) ? ticket.status === filter : ticket.category === filter;
}

function buildCounts(tickets: Ticket[], profile: Profile): Record<string, number> {
  const counts: Record<string, number> = {
    all: tickets.length,
    mine: tickets.filter((t) => t.created_by === profile.id).length,
    assigned: tickets.filter((t) => t.assigned_to === profile.id).length,
    needs_attention: tickets.filter(needsAttention).length,
    unassigned: tickets.filter((t) => isUnresolved(t) && !t.assigned_to).length,
    stale: tickets.filter((t) => {
      const lvl = getAttention(t).attentionLevel;
      return lvl === "stale" || lvl === "critical";
    }).length,
    aging: tickets.filter((t) => getAttention(t).attentionLevel === "aging").length,
    waiting_verification: tickets.filter((t) => t.status === "fixed").length,
    being_fixed: tickets.filter((t) => t.status === "in_progress" || t.status === "fixed").length,
  };
  for (const t of tickets) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const qc = useQueryClient();

  // ── stores (client/session state) ──────────────────────────────────────────
  const {
    recoveryMode, authError, pendingInviteToken, demoData,
    setRecoveryMode, setAuthError, enterDemo, enterPreview, signOut,
    patchDemoProfile, patchDemoTicket,
  } = useAuthStore();

  const { selectedId, limit, select, loadMore, resetSelection } = useTicketStore();

  const {
    theme, view, activeFilter, sort, listMode, query,
    createDialogOpen, profileDialogOpen, shortcutsOpen, onboardingOpen,
    toggleTheme, setView, setActiveFilter, setSort, setListMode, setQuery,
    setCreateDialogOpen, setProfileDialogOpen, setShortcutsOpen, setOnboardingOpen,
  } = useUIStore();

  // ── server state via TanStack Query ────────────────────────────────────────
  const isDemo = demoData !== null;

  const { data: realProfile, isLoading: profileLoading, error: profileError } =
    useCurrentProfile(!isDemo);
  const { data: realProfiles = [] } =
    useProfiles(!isDemo && !!realProfile);
  const { data: realTickets = [] } =
    useTickets(limit, !isDemo && !!realProfile);

  const profile = demoData?.profile ?? realProfile ?? null;
  const profiles = demoData?.profiles ?? realProfiles;
  const tickets = demoData?.tickets ?? realTickets;
  const loading = !isDemo && profileLoading;

  // ── mutations ───────────────────────────────────────────────────────────────
  const createTicketMutation = useCreateTicket();
  const deleteTicketMutation = useDeleteTicket();
  const updateRoleMutation = useUpdateProfileRole();
  const completeOnboardingMutation = useCompleteOnboarding();

  // ── suspended account error ─────────────────────────────────────────────────
  useEffect(() => {
    if (profileError instanceof Error) {
      setAuthError(profileError.message);
    }
  }, [profileError, setAuthError]);

  // ── invitation token consumption ────────────────────────────────────────────
  useEffect(() => {
    if (!pendingInviteToken) return;
    void acceptInvitation(pendingInviteToken)
      .catch(() => null)
      .finally(() => {
        useAuthStore.setState({ pendingInviteToken: null });
        void qc.invalidateQueries({ queryKey: authKeys.currentProfile() });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auth lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setRecoveryMode(false);
        void qc.invalidateQueries({ queryKey: authKeys.currentProfile() });
        void qc.invalidateQueries({ queryKey: authKeys.profiles() });
      }
      if (event === "SIGNED_OUT") {
        setRecoveryMode(false);
        qc.removeQueries({ queryKey: authKeys.currentProfile() });
        qc.removeQueries({ queryKey: authKeys.profiles() });
        qc.removeQueries({ queryKey: ticketKeys.all });
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── onboarding check when profile first arrives ─────────────────────────────
  useEffect(() => {
    if (profile) {
      setOnboardingOpen(selectOnboardingPending(profile));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ── keyboard shortcuts ──────────────────────────────────────────────────────
  const visibleRef = useRef<Ticket[]>([]);
  const selectedIdRef = useRef<string | undefined>(undefined);

  const visibleTickets = useMemo(() => {
    if (!profile) return [];
    const result = sortTickets(
      tickets
        .filter((t) => matchesFilter(t, activeFilter, profile))
        .filter((t) => matchesSearch(t, query)),
      sort,
    );
    visibleRef.current = result;
    return result;
  }, [tickets, activeFilter, query, sort, profile]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    function isInputFocused(target: EventTarget | null) {
      return Boolean(
        (target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable='true']"),
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("ticket-search")?.focus();
        return;
      }
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); return; }
      if (isInputFocused(e.target)) return;
      if (e.key.toLowerCase() === "n") { e.preventDefault(); setCreateDialogOpen(true); return; }

      const list = visibleRef.current;
      if (!list.length) return;
      const idx = Math.max(0, list.findIndex((t) => t.id === selectedIdRef.current));
      if (e.key.toLowerCase() === "j") { e.preventDefault(); select(list[Math.min(idx + 1, list.length - 1)]?.id); }
      if (e.key.toLowerCase() === "k") { e.preventDefault(); select(list[Math.max(idx - 1, 0)]?.id); }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived state ────────────────────────────────────────────────────────────
  const boardTickets = useMemo(
    () => sortTickets(profile ? tickets : [], "needs_attention"),
    [tickets, profile],
  );

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? visibleTickets[0],
    [tickets, selectedId, visibleTickets],
  );

  const counts = useMemo(
    () => (profile ? buildCounts(tickets, profile) : {}),
    [tickets, profile],
  );

  const listSummary = useMemo(() => {
    const open = tickets.filter(isUnresolved).length;
    const blocked = tickets.filter((t) => t.status === "blocked").length;
    const attention = tickets.filter(needsAttention).length;
    return `${open} open · ${blocked} blocked · ${attention} need attention`;
  }, [tickets]);

  // ── event handlers ───────────────────────────────────────────────────────────

  function handleTicketChange(updated: Ticket) {
    if (isDemo) {
      patchDemoTicket(updated);
    } else {
      qc.setQueryData<Ticket[]>(
        ticketKeys.list(limit),
        (old) => old?.map((t) => (t.id === updated.id ? updated : t)),
      );
    }
  }

  function handleProfileChange(updated: Profile) {
    if (isDemo) {
      patchDemoProfile(updated);
    } else {
      qc.setQueryData<Profile>(authKeys.currentProfile(), (old) =>
        old ? { ...old, ...updated } : updated,
      );
      qc.setQueryData<Profile[]>(authKeys.profiles(), (old) =>
        old?.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
      );
    }
  }

  async function handleBoardStatusChange(ticket: Ticket, status: TicketStatus) {
    if (!profile || ticket.status === status) return;

    const allowed =
      status === "fixed" ? canMarkFixed(profile, ticket) :
      status === "verified" ? canVerifyTicket(profile, ticket) :
      status === "closed" ? canCloseTicket(profile) :
      (status === "open" && ["fixed", "verified", "closed"].includes(ticket.status))
        ? canReopenTicket(profile, ticket)
        : canEditTicket(profile, ticket);

    if (!allowed || (status === "blocked" && !ticket.dependency_note?.trim())) {
      select(ticket.id);
      setView("tickets");
      return;
    }

    const updated = await updateTicket(ticket, { status }, profile);
    handleTicketChange(updated);

    if (["fixed", "verified", "closed"].includes(status)) {
      void sendTicketEmail({
        eventType: "resolved",
        actor: profile,
        ticket: updated,
        recipients: uniqueEmails(
          [updated.reporter?.email, updated.assignee?.email].filter((e) => e !== profile.email),
        ),
      }).catch(console.warn);
    }
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

    let updated: Profile;

    if (isDemo) {
      updated = { ...profile, ...input, onboarding_completed: true };
      patchDemoProfile(updated);
    } else {
      updated = (await completeOnboardingMutation.mutateAsync({ id: profile.id, ...input })) as Profile;
    }

    setOnboardingOpen(false);

    if (input.preferred_view === "tickets") {
      const primaryFilter = input.preferred_filters[0] as TicketFilter | undefined;
      if (primaryFilter) {
        setActiveFilter(primaryFilter);
        const first = sortTickets(
          tickets.filter((t) => matchesFilter(t, primaryFilter, updated)),
          sort,
        )[0];
        select(first?.id ?? tickets[0]?.id);
      }
    }

    setView(input.preferred_view);
  }

  async function handleSignOut() {
    await signOut();
    resetSelection();
    setView("welcome");
    setOnboardingOpen(false);
  }

  // ── loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-desk-bg text-sm text-desk-muted">
        Opening the desk...
      </main>
    );
  }

  // ── auth screens ─────────────────────────────────────────────────────────────
  if (!profile || recoveryMode) {
    return (
      <LoginScreen
        authError={authError}
        recoveryMode={recoveryMode}
        onRecoveryComplete={() => { setRecoveryMode(false); void qc.invalidateQueries({ queryKey: authKeys.currentProfile() }); }}
        onDemo={() => {
          enterDemo();
          setOnboardingOpen(localStorage.getItem(onboardingKey(demoData?.profile.id ?? "demo")) !== "true");
        }}
        onPreview={() => {
          enterPreview();
          setOnboardingOpen(localStorage.getItem(onboardingKey("preview")) !== "true");
        }}
      />
    );
  }

  // ── first-run onboarding ─────────────────────────────────────────────────────
  if (onboardingOpen) {
    return <FirstRunOnboarding onComplete={handleOnboardingComplete} profile={profile} />;
  }

  // ── main app ─────────────────────────────────────────────────────────────────
  return (
    <AppShell
      activeFilter={activeFilter}
      counts={counts}
      currentUser={profile}
      onAdmin={() => setView("admin")}
      onFilterChange={setActiveFilter}
      onNewIssue={() => setCreateDialogOpen(true)}
      onProfile={() => setProfileDialogOpen(true)}
      onSignOut={handleSignOut}
      onToggleTheme={toggleTheme}
      onViewChange={setView}
      theme={theme}
      view={view}
    >
      {view === "welcome" && (
        <WelcomeScreen
          assignedCount={tickets.filter((t) => t.assigned_to === profile.id).length}
          fixingCount={tickets.filter((t) => t.status === "in_progress" || t.status === "fixed").length}
          onAssigned={() => { setActiveFilter("assigned"); setView("tickets"); }}
          onDashboard={() => setView("dashboard")}
          onFixing={() => { setActiveFilter("being_fixed"); setView("tickets"); }}
        />
      )}

      {view === "admin" && (
        <AdminUsers
          profiles={profiles}
          onRoleChange={async (id, role) => { await updateRoleMutation.mutateAsync({ id, role }); }}
        />
      )}

      {view === "dashboard" && (
        <DashboardOverview
          onNewIssue={() => setCreateDialogOpen(true)}
          onSelect={(t) => { select(t.id); setView("tickets"); }}
          profiles={profiles}
          tickets={tickets}
        />
      )}

      {view === "board" && (
        <TicketBoard
          onSelect={(t) => { select(t.id); setView("tickets"); }}
          onStatusChange={handleBoardStatusChange}
          tickets={boardTickets}
        />
      )}

      {view === "tickets" && (
        <div
          className={`grid h-full min-h-0 grid-cols-1 ${
            listMode === "ledger"
              ? "md:grid-cols-[minmax(32rem,36rem)_1fr]"
              : "md:grid-cols-[minmax(21rem,26rem)_1fr]"
          }`}
        >
          <TicketList
            hasMore={isSupabaseConfigured && tickets.length >= limit}
            mode={listMode}
            onLoadMore={async () => loadMore()}
            onModeChange={setListMode}
            onNewIssue={() => setCreateDialogOpen(true)}
            onQueryChange={setQuery}
            onSelect={(t) => select(t.id)}
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
            onDeleteTicket={async (t) => {
              await deleteTicketMutation.mutateAsync(t.id);
              resetSelection();
            }}
            onSelectTicket={(t) => select(t.id)}
            onTicketChange={handleTicketChange}
            profiles={profiles}
            ticket={selectedTicket}
          />
        </div>
      )}

      <CreateTicketDialog
        onClose={() => setCreateDialogOpen(false)}
        onCreate={async (input) => {
          const ticket = await createTicketMutation.mutateAsync({ input, profile });
          select(ticket.id);
          setView("tickets");
        }}
        open={createDialogOpen}
        profiles={profiles}
      />

      <ProfileSettingsDialog
        onClose={() => setProfileDialogOpen(false)}
        onProfileChange={handleProfileChange}
        open={profileDialogOpen}
        profile={profile}
      />

      <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
    </AppShell>
  );
}
