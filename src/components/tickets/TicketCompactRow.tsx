import { MessageSquare, Paperclip } from "lucide-react";
import { clsx } from "clsx";
import {
  getAgeLabel,
  getAttention,
  getLastTouchedAt,
  getUntouchedDays,
  getTicketAge,
} from "../../lib/attention";
import { categoryLabels, priorityLabels, statusLabels } from "../../lib/constants";
import type { Ticket } from "../../types/ticket";
import { displayTicketId, relativeAge } from "./time";

interface TicketCompactRowProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect: () => void;
}

export function TicketCompactRow({ onSelect, selected, ticket }: TicketCompactRowProps) {
  const attention = getAttention(ticket);
  const hasAttention = attention.attentionLevel !== "none";

  return (
    <button
      className={clsx(
        "grid min-h-12 w-full grid-cols-[5.5rem_minmax(13rem,1fr)_5.5rem_5rem_6rem_7rem_5rem_5rem_8.5rem] items-center gap-3 border-b border-desk-border/70 px-4 text-left text-sm transition hover:bg-desk-surface/70",
        selected ? "bg-desk-surface/78 shadow-[inset_2px_0_0_var(--desk-accent)] backdrop-blur-xl" : "bg-transparent",
      )}
      onClick={onSelect}
      title={getAgeLabel(ticket)}
      type="button"
    >
      <span className="font-semibold tracking-[0.06em] text-desk-muted">{displayTicketId(ticket.id)}</span>
      <span className="min-w-0 truncate font-medium text-desk-text">{ticket.title}</span>
      <span className="text-xs text-desk-muted">{statusLabels[ticket.status]}</span>
      <span className="text-xs text-desk-muted">{priorityLabels[ticket.priority]}</span>
      <span className="text-xs text-desk-muted">{categoryLabels[ticket.category]}</span>
      <span className="truncate text-xs text-desk-muted">{ticket.assignee?.name ?? "Unassigned"}</span>
      <span className={clsx("text-xs", hasAttention ? "text-desk-amberText" : "text-desk-muted")}>
        {getTicketAge(ticket)}d
      </span>
      <span className={clsx("text-xs", hasAttention ? "text-desk-amberText" : "text-desk-muted")}>
        {getUntouchedDays(ticket)}d
      </span>
      <span className="flex items-center justify-end gap-2 text-xs text-desk-muted">
        <span className="mr-auto max-w-16 truncate">{relativeAge(getLastTouchedAt(ticket))}</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {ticket.comments?.length ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          {ticket.attachments?.length ?? 0}
        </span>
      </span>
    </button>
  );
}
