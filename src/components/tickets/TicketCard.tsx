import { MessageSquare, Paperclip } from "lucide-react";
import { clsx } from "clsx";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./badgeHelpers";
import { displayTicketId } from "./time";
import { Avatar } from "../ui/Avatar";
import type { Ticket } from "../../types/ticket";
import { getAttention, getTicketAge } from "../../lib/attention";

interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect: () => void;
}

function leftBorderClass(ticket: Ticket, selected: boolean, attentionLevel: string) {
  if (selected) return "border-l-[3px] border-l-desk-accent";
  if (ticket.status === "blocked" || attentionLevel === "critical")
    return "border-l-[3px] border-l-[var(--desk-amber-text)]/50";
  if (ticket.priority === "blocker")
    return "border-l-[3px] border-l-[var(--desk-red-text)]/50";
  if (attentionLevel === "stale")
    return "border-l-[3px] border-l-[var(--desk-amber-text)]/30";
  return "border-l-[3px] border-l-transparent";
}

export function TicketCard({ ticket, selected, onSelect }: TicketCardProps) {
  const attention = getAttention(ticket);
  const commentCount = ticket.comments?.length ?? 0;
  const attachmentCount = ticket.attachments?.length ?? 0;
  const age = getTicketAge(ticket);

  return (
    <button
      className={clsx(
        "group w-full border-b border-desk-border/70 py-4 pl-4 pr-5 text-left transition hover:bg-desk-surface/60",
        leftBorderClass(ticket, !!selected, attention.attentionLevel),
        selected && "bg-desk-surface/70 backdrop-blur-xl",
      )}
      onClick={onSelect}
      type="button"
    >
      {/* ID · module · signal */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-desk-muted">
            {displayTicketId(ticket.id)}
          </span>
          {ticket.module ? (
            <span className="truncate text-[11px] text-desk-muted/60">{ticket.module}</span>
          ) : null}
        </div>
        <span
          className={clsx(
            "shrink-0 text-[11px] leading-none",
            attention.attentionReason
              ? "font-medium text-desk-amberText"
              : "text-desk-muted/70",
          )}
        >
          {attention.attentionReason || `${age}d`}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-[1.45] text-desk-text">
        {ticket.title}
      </h3>

      {/* Blocked dependency note */}
      {ticket.status === "blocked" && ticket.dependency_note ? (
        <p className="mt-1.5 line-clamp-1 text-[11px] leading-5 text-desk-amberText">
          {ticket.dependency_note}
        </p>
      ) : null}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <CategoryBadge category={ticket.category} />
      </div>

      {/* Assignee + counts */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar
            className="h-5 w-5 shrink-0 text-[9px]"
            name={ticket.assignee?.name ?? "?"}
          />
          <span className="truncate text-[11px] text-desk-muted">
            {ticket.assignee?.name ?? "Unassigned"}
          </span>
        </div>
        {commentCount > 0 || attachmentCount > 0 ? (
          <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-desk-muted/70">
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" aria-hidden="true" />
                {commentCount}
              </span>
            ) : null}
            {attachmentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="h-3 w-3" aria-hidden="true" />
                {attachmentCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
