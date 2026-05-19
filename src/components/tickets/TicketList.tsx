import { Search } from "lucide-react";
import { TicketCard } from "./TicketCard";
import { TicketCompactRow } from "./TicketCompactRow";
import { EmptyState } from "../ui/EmptyState";
import type { Ticket } from "../../types/ticket";
import type { TicketSort } from "../../lib/attention";

export type TicketListMode = "comfortable" | "ledger";

interface TicketListProps {
  tickets: Ticket[];
  selectedId?: string;
  query: string;
  mode: TicketListMode;
  sort: TicketSort;
  summary: string;
  hasMore?: boolean;
  onModeChange: (mode: TicketListMode) => void;
  onQueryChange: (query: string) => void;
  onLoadMore?: () => Promise<void>;
  onSelect: (ticket: Ticket) => void;
  onSortChange: (sort: TicketSort) => void;
}

const sortOptions: { value: TicketSort; label: string }[] = [
  { value: "needs_attention", label: "Needs attention" },
  { value: "recently_updated", label: "Recently updated" },
  { value: "oldest_open", label: "Oldest open first" },
  { value: "stale_first", label: "Stale first" },
  { value: "priority_first", label: "Priority first" },
  { value: "blocked_first", label: "Blocked first" },
  { value: "recently_created", label: "Recently created" },
];

export function TicketList({
  hasMore,
  mode,
  onLoadMore,
  onModeChange,
  onQueryChange,
  onSelect,
  onSortChange,
  query,
  selectedId,
  sort,
  summary,
  tickets,
}: TicketListProps) {
  return (
    <section className="flex min-h-0 flex-col border-r border-desk-border bg-desk-bg/45 backdrop-blur-xl">
      <div className="glass-panel m-3 rounded-2xl p-3">
        <p className="mb-3 text-xs font-medium text-desk-muted">{summary}</p>
        <label className="relative block">
          <span className="sr-only">Search tickets</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-desk-muted" />
          <input
            id="ticket-search"
            className="h-11 w-full rounded-xl border border-desk-border/80 bg-desk-surface/70 pl-10 pr-3 text-sm text-desk-text placeholder:text-desk-muted/70 backdrop-blur-xl"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, issue ID, description"
            value={query}
          />
        </label>
        <div className="mt-3 flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-desk-border/80 bg-desk-surface/60 p-0.5 text-xs text-desk-muted">
            <button
              className={`rounded-md px-2.5 py-1.5 ${mode === "comfortable" ? "bg-desk-soft text-desk-text" : ""}`}
              onClick={() => onModeChange("comfortable")}
              type="button"
            >
              Comfortable
            </button>
            <button
              className={`rounded-md px-2.5 py-1.5 ${mode === "ledger" ? "bg-desk-soft text-desk-text" : ""}`}
              onClick={() => onModeChange("ledger")}
              type="button"
            >
              Ledger
            </button>
          </div>
          <select
            aria-label="Sort tickets"
            className="h-8 min-w-0 flex-1 rounded-xl border border-desk-border/80 bg-desk-surface/60 px-2 text-xs text-desk-muted"
            onChange={(event) => onSortChange(event.target.value as TicketSort)}
            value={sort}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-soft">
        {tickets.length ? (
          <div className={mode === "ledger" ? "min-w-[58rem]" : ""}>
            {mode === "ledger" ? (
              <div className="sticky top-0 z-10 grid h-9 grid-cols-[5.5rem_minmax(13rem,1fr)_5.5rem_5rem_6rem_7rem_5rem_5rem_8.5rem] items-center gap-3 border-b border-desk-border bg-desk-bg/95 px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-desk-muted backdrop-blur">
                <span>ID</span>
                <span>Title</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Category</span>
                <span>Owner</span>
                <span>Open</span>
                <span>Untouched</span>
                <span className="text-right">Updated</span>
              </div>
            ) : null}
            {tickets.map((ticket) => (
              mode === "ledger" ? (
                <TicketCompactRow
                  key={ticket.id}
                  onSelect={() => onSelect(ticket)}
                  selected={ticket.id === selectedId}
                  ticket={ticket}
                />
              ) : (
                <TicketCard
                  key={ticket.id}
                  onSelect={() => onSelect(ticket)}
                  selected={ticket.id === selectedId}
                  ticket={ticket}
                />
              )
            ))}
            {hasMore && onLoadMore ? (
              <div className="p-3">
                <button
                  className="w-full rounded-xl border border-desk-border bg-desk-surface/60 px-3 py-2 text-sm text-desk-muted transition hover:bg-desk-surface hover:text-desk-text"
                  onClick={() => void onLoadMore()}
                  type="button"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nothing open. Quiet desk."
            body="When something breaks, raise it here and tag the right person."
          />
        )}
      </div>
    </section>
  );
}
