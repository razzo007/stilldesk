import { categoryLabels } from "../../lib/constants";
import { getTicketMetrics } from "../../lib/tickets";
import type { Ticket } from "../../types/ticket";
import type { Profile } from "../../types/user";
import { BlockedTicketsList } from "./BlockedTicketsList";
import { MetricCard } from "./MetricCard";
import { OwnerLoadList } from "./OwnerLoadList";
import { StatusBadge } from "../tickets/badgeHelpers";
import { displayTicketId, formatDate } from "../tickets/time";

interface DashboardOverviewProps {
  tickets: Ticket[];
  profiles: Profile[];
  onNewIssue?: () => void;
  onSelect: (ticket: Ticket) => void;
}

export function DashboardOverview({ onNewIssue, onSelect, profiles, tickets }: DashboardOverviewProps) {
  const metrics = getTicketMetrics(tickets);
  const recentlyFixed = tickets
    .filter((ticket) => ticket.fixed_at)
    .sort((a, b) => new Date(b.fixed_at ?? 0).getTime() - new Date(a.fixed_at ?? 0).getTime())
    .slice(0, 5);

  const categoryCounts = Object.entries(categoryLabels)
    .map(([category, label]) => ({
      category,
      label,
      count: tickets.filter((ticket) => ticket.category === category).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCategoryCount = Math.max(...categoryCounts.map((item) => item.count), 1);

  if (tickets.length === 0) {
    return (
      <section className="grid h-full place-items-center bg-desk-bg p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-desk-text">Nothing here yet.</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-desk-muted">
            The dashboard lights up once your team starts raising tickets.
          </p>
          {onNewIssue ? (
            <button
              className="mt-5 rounded-full border border-desk-accent/50 bg-desk-accentSoft/60 px-5 py-2.5 text-sm font-medium text-desk-accent transition hover:bg-desk-accentSoft"
              onClick={onNewIssue}
              type="button"
            >
              Create first ticket
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto bg-desk-bg p-4 scrollbar-soft lg:p-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-desk-text">Overview</h1>
          <p className="mt-1 text-sm text-desk-muted">The quiet truth board.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open tickets" note="Open, assigned, in progress" value={metrics.open} />
          <MetricCard
            label="Blocked tickets"
            note="Needs a decision or dependency"
            tone="amber"
            value={metrics.blocked}
          />
          <MetricCard
            label="Fixed this week"
            note="Ready for the next look"
            tone="green"
            value={metrics.fixedThisWeek}
          />
          <MetricCard
            label="Waiting verification"
            note={metrics.waitingVerification ? "Someone should check these." : "Nothing waiting."}
            tone="blue"
            value={metrics.waitingVerification}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <BlockedTicketsList onSelect={onSelect} tickets={tickets} />
          <OwnerLoadList profiles={profiles} tickets={tickets} />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-desk-text">Tickets by category</h2>
            <div className="mt-4 grid gap-3">
              {categoryCounts.map((item) => (
                <div className="flex items-center gap-3" key={item.category}>
                  <span className="w-28 shrink-0 text-sm text-desk-text">{item.label}</span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-desk-soft/60">
                      <div
                        className="h-full rounded-full bg-desk-accent/55 transition-all duration-500"
                        style={{ width: `${(item.count / maxCategoryCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs tabular-nums text-desk-muted">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-desk-text">Recently fixed</h2>
            <div className="mt-4 grid gap-3">
              {recentlyFixed.length ? (
                recentlyFixed.map((ticket) => (
                  <button
                    className="flex items-center justify-between gap-4 rounded-xl border border-desk-border bg-desk-soft/40 p-4 text-left transition hover:border-desk-muted"
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.08em] text-desk-muted">
                        {displayTicketId(ticket.id)}
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-desk-text">{ticket.title}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-desk-border bg-desk-soft/40 p-4 text-sm text-desk-muted">
                  Fixes will appear here once the team ships them.
                </p>
              )}
            </div>
          </section>
        </div>

        {metrics.oldestUnresolved ? (
          <button
            className="glass-panel rounded-2xl p-5 text-left transition hover:border-desk-muted shadow-[inset_4px_0_0_var(--desk-amber-text)]"
            onClick={() => onSelect(metrics.oldestUnresolved!)}
            type="button"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-amberText">
              Oldest unresolved
            </p>
            <p className="mt-2 text-lg font-medium text-desk-text">{metrics.oldestUnresolved.title}</p>
            <p className="mt-1 text-sm text-desk-muted">
              Open since {formatDate(metrics.oldestUnresolved.created_at)}
            </p>
          </button>
        ) : null}
      </div>
    </section>
  );
}
