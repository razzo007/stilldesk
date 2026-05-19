import type { Ticket } from "../../types/ticket";
import { StatusBadge } from "../tickets/badgeHelpers";
import { displayTicketId } from "../tickets/time";

interface BlockedTicketsListProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
}

export function BlockedTicketsList({ tickets, onSelect }: BlockedTicketsListProps) {
  const blocked = tickets.filter((ticket) => ticket.status === "blocked");

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-desk-text">Blocked tickets</h2>
      <div className="mt-4 grid gap-3">
        {blocked.length ? (
          blocked.map((ticket) => (
            <button
              className="rounded-xl border border-desk-border bg-desk-soft/40 p-4 text-left transition hover:border-desk-muted"
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tracking-[0.08em] text-desk-muted">
                  {displayTicketId(ticket.id)}
                </span>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-2 font-medium text-desk-text">{ticket.title}</p>
              <p className="mt-2 line-clamp-2 text-sm text-desk-muted">
                {ticket.dependency_note || "Needs more info."}
              </p>
            </button>
          ))
        ) : (
          <p className="rounded-xl border border-desk-border bg-desk-soft/40 p-4 text-sm text-desk-muted">
            No blockers. Good air.
          </p>
        )}
      </div>
    </section>
  );
}
