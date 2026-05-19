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
  onSelect: (ticket: Ticket) => void;
}

export function DashboardOverview({ onSelect, profiles, tickets }: DashboardOverviewProps) {
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
    .filter((item) => item.count > 0);

  return (
    <section className="h-full overflow-y-auto bg-desk-bg p-4 scrollbar-soft lg:p-6">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div>
          <p className="text-sm font-medium text-desk-muted">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-desk-text">
            The quiet truth board.
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open tickets" note="Open, assigned, in progress" value={metrics.open} />
          <MetricCard label="Blocked tickets" note="Needs a decision or dependency" value={metrics.blocked} />
          <MetricCard label="Fixed this week" note="Ready for the next look" value={metrics.fixedThisWeek} />
          <MetricCard
            label="Waiting verification"
            note={metrics.waitingVerification ? "Someone should check these." : "Nothing waiting."}
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
                <div className="flex items-center justify-between gap-3" key={item.category}>
                  <span className="text-sm text-desk-text">{item.label}</span>
                  <span className="rounded-full bg-desk-soft px-2.5 py-1 text-xs text-desk-muted">
                    {item.count}
                  </span>
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
            className="glass-panel rounded-2xl p-5 text-left transition hover:border-desk-muted"
            onClick={() => onSelect(metrics.oldestUnresolved!)}
            type="button"
          >
            <p className="text-sm font-semibold text-desk-text">Oldest unresolved ticket</p>
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
