import { MessageSquare, Paperclip } from "lucide-react";
import { useState } from "react";
import { categoryLabels, statusLabels } from "../../lib/constants";
import { getAgeLabel, getAttention, isUnresolved } from "../../lib/attention";
import { displayTicketId } from "../tickets/time";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import type { Ticket, TicketStatus } from "../../types/ticket";

interface TicketBoardProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  onStatusChange: (ticket: Ticket, status: TicketStatus) => Promise<void>;
}

const boardStatuses: TicketStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "fixed",
  "verified",
  "closed",
];

function ticketsForStatus(tickets: Ticket[], status: TicketStatus) {
  return tickets.filter((ticket) => ticket.status === status);
}

export function TicketBoard({ onSelect, onStatusChange, tickets }: TicketBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const openCount = tickets.filter(isUnresolved).length;
  const blockedCount = tickets.filter((ticket) => ticket.status === "blocked").length;
  const waitingCount = tickets.filter((ticket) => ticket.status === "fixed").length;

  async function moveTicket(status: TicketStatus) {
    const ticket = tickets.find((item) => item.id === draggedId);
    if (!ticket || ticket.status === status) {
      setDraggedId(null);
      return;
    }

    setUpdatingId(ticket.id);
    try {
      await onStatusChange(ticket, status);
    } finally {
      setUpdatingId(null);
      setDraggedId(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-desk-bg/45">
      <div className="glass-panel m-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-muted/70">Board</p>
            <h2 className="mt-1 text-xl font-semibold text-desk-text">Bugs by status</h2>
          </div>
          <p className="text-sm text-desk-muted">
            {openCount} open · {blockedCount} blocked · {waitingCount} waiting verification
          </p>
        </div>
      </div>

      {tickets.length ? (
        <div className="min-h-0 flex-1 overflow-x-auto px-3 pb-3">
          <div className="grid h-full min-w-[78rem] grid-cols-7 gap-3">
            {boardStatuses.map((status) => {
              const laneTickets = ticketsForStatus(tickets, status);

              return (
                <section
                  className="glass-panel flex min-h-0 flex-col rounded-2xl"
                  key={status}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void moveTicket(status)}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-desk-border/70 px-3 py-3">
                    <h3 className="text-sm font-semibold text-desk-text">{statusLabels[status]}</h3>
                    <span className="rounded-full border border-desk-border/70 px-2 py-0.5 text-xs text-desk-muted">
                      {laneTickets.length}
                    </span>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
                    {laneTickets.length ? (
                      <div className="grid gap-2">
                        {laneTickets.map((ticket) => (
                          <BoardTicketCard
                            dragging={draggedId === ticket.id}
                            key={ticket.id}
                            onDragStart={() => setDraggedId(ticket.id)}
                            onSelect={() => onSelect(ticket)}
                            ticket={ticket}
                            updating={updatingId === ticket.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="px-2 py-8 text-center text-xs text-desk-muted">Nothing here.</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid flex-1 place-items-center">
          <EmptyState
            title="No bugs on the board."
            body="Raised bugs will appear here by status."
          />
        </div>
      )}
    </section>
  );
}

function BoardTicketCard({
  dragging,
  onDragStart,
  onSelect,
  ticket,
  updating,
}: {
  dragging: boolean;
  onDragStart: () => void;
  onSelect: () => void;
  ticket: Ticket;
  updating: boolean;
}) {
  const attention = getAttention(ticket);

  return (
    <button
      className={`group rounded-xl border border-desk-border/75 bg-desk-surface/55 p-3 text-left transition hover:bg-desk-surface/85 ${
        dragging ? "opacity-50" : ""
      } ${attention.attentionLevel !== "none" ? "shadow-[inset_2px_0_0_var(--desk-amber-text)]" : ""}`}
      draggable
      onClick={onSelect}
      onDragStart={onDragStart}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-desk-muted">
          {displayTicketId(ticket.id)}
        </span>
        <span className="text-[11px] text-desk-muted">{updating ? "Moving..." : getAgeLabel(ticket)}</span>
      </div>

      <h4 className="mt-2 line-clamp-3 text-sm font-semibold leading-5 text-desk-text">
        {ticket.title}
      </h4>

      {ticket.status === "blocked" && ticket.dependency_note ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-desk-amberText">
          {ticket.dependency_note}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-6 w-6 text-[10px]" name={ticket.assignee?.name ?? "Unassigned"} />
          <span className="truncate text-xs text-desk-muted">{ticket.assignee?.name ?? "Unassigned"}</span>
        </div>
        <span className="shrink-0 text-[11px] text-desk-muted">{categoryLabels[ticket.category]}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-desk-muted">
        <span className="capitalize">{ticket.priority}</span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" aria-hidden="true" />
            {ticket.comments?.length ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3 w-3" aria-hidden="true" />
            {ticket.attachments?.length ?? 0}
          </span>
        </span>
      </div>
    </button>
  );
}
