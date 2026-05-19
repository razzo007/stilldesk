import { MessageSquare, Paperclip } from "lucide-react";
import { clsx } from "clsx";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./badgeHelpers";
import { displayTicketId } from "./time";
import { Avatar } from "../ui/Avatar";
import type { Ticket } from "../../types/ticket";
import { getAgeLabel, getAttention } from "../../lib/attention";

interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect: () => void;
}

export function TicketCard({ ticket, selected, onSelect }: TicketCardProps) {
  const attention = getAttention(ticket);

  return (
    <button
      className={clsx(
        "group w-full border-b border-desk-border/70 px-5 py-4 text-left transition hover:bg-desk-surface/70",
        selected ? "bg-desk-surface/80 shadow-[inset_3px_0_0_var(--desk-accent)] backdrop-blur-xl" : "bg-transparent",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.08em] text-desk-muted">
          {displayTicketId(ticket.id)}
        </span>
        <span className="text-xs text-desk-muted">{getAgeLabel(ticket)}</span>
      </div>

      <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-6 text-desk-text">
        {ticket.title}
      </h3>

      {ticket.status === "blocked" && ticket.dependency_note ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-desk-amberText">
          {ticket.dependency_note}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <CategoryBadge category={ticket.category} />
        {attention.attentionReason ? (
          <span className="text-xs text-desk-amberText">{attention.attentionReason}</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-6 w-6 text-[10px]" name={ticket.assignee?.name ?? "Unassigned"} />
          <span className="truncate text-xs text-desk-muted">
            {ticket.assignee?.name ?? "Unassigned"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-desk-muted">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {ticket.comments?.length ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            {ticket.attachments?.length ?? 0}
          </span>
        </div>
      </div>
      {attention.attentionLevel !== "none" ? (
        <div className="mt-3 h-px w-full bg-desk-amber/80" aria-hidden="true" />
      ) : null}
    </button>
  );
}
