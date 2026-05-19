import { Columns3, Eye, EyeOff, GripVertical, MessageSquare, Paperclip, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { categoryLabels, statusLabels } from "../../lib/constants";
import { getAgeLabel, getAttention, isUnresolved } from "../../lib/attention";
import { displayTicketId } from "../tickets/time";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
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

type BoardFocus =
  | "all"
  | "needs_attention"
  | "blocked"
  | "being_fixed"
  | "waiting_verification"
  | "engineering"
  | "design"
  | "go_to_market";

interface SavedBoard {
  id: string;
  name: string;
  focus: BoardFocus;
}

const boardStorageKey = "stilldesk:boards";
const selectedBoardStorageKey = "stilldesk:selected-board";
const showClosedStorageKey = "stilldesk:board-show-closed";

const defaultBoards: SavedBoard[] = [
  { id: "main", name: "Main board", focus: "all" },
  { id: "attention", name: "Needs attention", focus: "needs_attention" },
];

const focusOptions: { value: BoardFocus; label: string }[] = [
  { value: "all", label: "All bugs" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "blocked", label: "Blocked only" },
  { value: "being_fixed", label: "Being fixed" },
  { value: "waiting_verification", label: "Waiting verification" },
  { value: "engineering", label: "Engineering bugs" },
  { value: "design", label: "Design bugs" },
  { value: "go_to_market", label: "Sales / marketing bugs" },
];

const laneHeaderClass: Partial<Record<TicketStatus, string>> = {
  assigned: "lane-header-assigned",
  in_progress: "lane-header-in-progress",
  blocked: "lane-header-blocked",
  fixed: "lane-header-fixed",
  verified: "lane-header-verified",
  closed: "lane-header-closed",
};

const laneHeaderTextClass: Record<TicketStatus, string> = {
  open: "text-desk-muted",
  assigned: "text-desk-accent",
  in_progress: "text-desk-blueText",
  blocked: "text-desk-amberText",
  fixed: "text-desk-greenText",
  verified: "text-desk-greenText",
  closed: "text-desk-stoneText",
};

const priorityDot: Record<string, string | undefined> = {
  blocker: "var(--desk-red-text)",
  high: "var(--desk-amber-text)",
};

function readBoards() {
  const saved = localStorage.getItem(boardStorageKey);
  if (!saved) return defaultBoards;

  try {
    const parsed = JSON.parse(saved) as SavedBoard[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultBoards;
  } catch {
    return defaultBoards;
  }
}

function ticketsForBoard(tickets: Ticket[], focus: BoardFocus) {
  if (focus === "all") return tickets;
  if (focus === "needs_attention") return tickets.filter((ticket) => getAttention(ticket).score > 0);
  if (focus === "blocked") return tickets.filter((ticket) => ticket.status === "blocked");
  if (focus === "being_fixed") return tickets.filter((ticket) => ticket.status === "in_progress" || ticket.status === "fixed");
  if (focus === "waiting_verification") return tickets.filter((ticket) => ticket.status === "fixed");
  if (focus === "engineering") {
    return tickets.filter((ticket) => ["frontend", "backend", "ai_agent", "infra", "data"].includes(ticket.category));
  }
  if (focus === "design") return tickets.filter((ticket) => ["design", "copy"].includes(ticket.category));
  return tickets.filter((ticket) => ["copy", "data", "frontend"].includes(ticket.category));
}

export function TicketBoard({ onSelect, onStatusChange, tickets }: TicketBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<TicketStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [boards, setBoards] = useState<SavedBoard[]>(readBoards);
  const [selectedBoardId, setSelectedBoardId] = useState(() => {
    return localStorage.getItem(selectedBoardStorageKey) ?? "main";
  });
  const [showClosed, setShowClosed] = useState(() => {
    return localStorage.getItem(showClosedStorageKey) === "true";
  });
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardFocus, setNewBoardFocus] = useState<BoardFocus>("all");

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? defaultBoards[0];
  const boardTickets = useMemo(() => ticketsForBoard(tickets, selectedBoard.focus), [selectedBoard.focus, tickets]);
  const visibleStatuses = showClosed ? boardStatuses : boardStatuses.filter((s) => s !== "closed");
  const openCount = boardTickets.filter(isUnresolved).length;
  const blockedCount = boardTickets.filter((ticket) => ticket.status === "blocked").length;
  const waitingCount = boardTickets.filter((ticket) => ticket.status === "fixed").length;

  function selectBoard(id: string) {
    setSelectedBoardId(id);
    localStorage.setItem(selectedBoardStorageKey, id);
  }

  function toggleShowClosed() {
    setShowClosed((prev) => {
      const next = !prev;
      localStorage.setItem(showClosedStorageKey, String(next));
      return next;
    });
  }

  function createBoard() {
    const trimmed = newBoardName.trim();
    if (!trimmed) return;

    const board = {
      id: `board-${Date.now()}`,
      name: trimmed,
      focus: newBoardFocus,
    };
    const nextBoards = [...boards, board];
    setBoards(nextBoards);
    localStorage.setItem(boardStorageKey, JSON.stringify(nextBoards));
    selectBoard(board.id);
    setNewBoardName("");
    setNewBoardFocus("all");
    setBoardDialogOpen(false);
  }

  async function moveTicket(status: TicketStatus, ticketId = draggedId) {
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === status) {
      setDraggedId(null);
      setDropStatus(null);
      return;
    }

    setUpdatingId(ticket.id);
    try {
      await onStatusChange(ticket, status);
    } finally {
      setUpdatingId(null);
      setDraggedId(null);
      setDropStatus(null);
    }
  }

  const colCount = visibleStatuses.length;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-desk-bg/35">
      <div className="bevel-panel m-3 rounded-[1.35rem] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-desk-muted/70">Kanban board</p>
            <h2 className="mt-1 text-xl font-semibold text-desk-text">{selectedBoard.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-2">
              {openCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-desk-soft/70 px-2.5 py-1 text-xs font-medium text-desk-muted">
                  {openCount} open
                </span>
              )}
              {blockedCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-desk-amber px-2.5 py-1 text-xs font-medium text-desk-amberText">
                  {blockedCount} blocked
                </span>
              )}
              {waitingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-desk-blue px-2.5 py-1 text-xs font-medium text-desk-blueText">
                  {waitingCount} waiting
                </span>
              )}
            </div>
            <Select
              aria-label="Choose board"
              className="h-9 min-w-40 rounded-xl bg-desk-surface/70"
              options={boards.map((board) => ({ value: board.id, label: board.name }))}
              value={selectedBoard.id}
              onChange={(event) => selectBoard(event.target.value)}
            />
            <Button
              className="rounded-xl"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setBoardDialogOpen(true)}
              type="button"
            >
              New board
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-desk-muted">
            <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
            Drag bugs between lanes to update status. Blocked still needs a reason before it can move.
          </p>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-desk-muted transition hover:bg-desk-surface/55 hover:text-desk-text"
            onClick={toggleShowClosed}
            type="button"
          >
            {showClosed ? (
              <><EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Hide closed</>
            ) : (
              <><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Show closed</>
            )}
          </button>
        </div>
      </div>

      {boardTickets.length ? (
        <div className="min-h-0 flex-1 overflow-x-auto px-3 pb-3">
          <div
            className="grid h-full gap-3"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, minWidth: `${colCount * 11.5}rem` }}
          >
            {visibleStatuses.map((status) => {
              const laneTickets = boardTickets.filter((ticket) => ticket.status === status);
              const dropping = dropStatus === status;
              const headerBg = laneHeaderClass[status] ?? "";
              const headerText = laneHeaderTextClass[status];

              return (
                <section
                  aria-label={statusLabels[status]}
                  className={`bevel-panel flex min-h-0 flex-col rounded-[1.35rem] transition ${
                    dropping ? "border-desk-accent bg-desk-accent-soft/35 shadow-[0_0_0_3px_var(--desk-accent-soft)]" : ""
                  }`}
                  key={status}
                  onDragEnter={() => setDropStatus(status)}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropStatus(null);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void moveTicket(status, event.dataTransfer.getData("text/plain") || draggedId);
                  }}
                >
                  <div
                    className={`flex shrink-0 items-center justify-between rounded-t-[1.2rem] border-b border-desk-border/60 px-3 py-3 ${headerBg}`}
                  >
                    <h3 className={`text-sm font-semibold ${headerText}`}>{statusLabels[status]}</h3>
                    <span className="rounded-full border border-desk-border/60 bg-desk-surface/45 px-2 py-0.5 text-xs text-desk-muted">
                      {laneTickets.length}
                    </span>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]" role="list">
                    {laneTickets.length ? (
                      <div className="grid gap-2">
                        {laneTickets.map((ticket) => (
                          <BoardTicketCard
                            dragging={draggedId === ticket.id}
                            key={ticket.id}
                            onDragEnd={() => {
                              setDraggedId(null);
                              setDropStatus(null);
                            }}
                            onDragStart={(event) => {
                              setDraggedId(ticket.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", ticket.id);
                            }}
                            onSelect={() => onSelect(ticket)}
                            ticket={ticket}
                            updating={updatingId === ticket.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-desk-border/70 px-2 py-8 text-center text-xs text-desk-muted">
                        Drop bugs here.
                      </p>
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

      <Modal
        description="Create a saved board view for a team, department, or kind of work."
        onClose={() => setBoardDialogOpen(false)}
        open={boardDialogOpen}
        title="New Kanban board"
      >
        <div className="grid gap-4">
          <Input
            autoFocus
            label="Board name"
            name="board-name"
            onChange={(event) => setNewBoardName(event.target.value)}
            placeholder="Engineering bugs"
            value={newBoardName}
          />
          <Select
            label="Focus"
            name="board-focus"
            onChange={(event) => setNewBoardFocus(event.target.value as BoardFocus)}
            options={focusOptions}
            value={newBoardFocus}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setBoardDialogOpen(false)} type="button">
              Cancel
            </Button>
            <Button
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={createBoard}
              type="button"
              disabled={!newBoardName.trim()}
            >
              Create board
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

function BoardTicketCard({
  dragging,
  onDragEnd,
  onDragStart,
  onSelect,
  ticket,
  updating,
}: {
  dragging: boolean;
  onDragEnd: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  ticket: Ticket;
  updating: boolean;
}) {
  const attention = getAttention(ticket);
  const dotColor = priorityDot[ticket.priority];
  const commentCount = ticket.comments?.length ?? 0;
  const attachmentCount = ticket.attachments?.length ?? 0;

  return (
    <div role="listitem">
      <button
        className={`board-card-bevel group w-full cursor-grab rounded-2xl p-3 text-left transition active:cursor-grabbing hover:-translate-y-0.5 hover:border-desk-accent/45 hover:shadow-[0_18px_32px_rgba(78,68,49,0.12)] ${
          dragging ? "opacity-50" : ""
        } ${attention.attentionLevel !== "none" ? "shadow-[inset_2px_0_0_var(--desk-amber-text)]" : ""}`}
        draggable
        onClick={onSelect}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        type="button"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-desk-muted">
            <GripVertical className="h-3.5 w-3.5 opacity-55 transition group-hover:opacity-100" aria-hidden="true" />
            {displayTicketId(ticket.id)}
          </span>
          <span className="text-[11px] text-desk-muted">{updating ? "Moving…" : getAgeLabel(ticket)}</span>
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
            <Avatar className="h-6 w-6 border border-white/60 text-[10px] shadow-sm" name={ticket.assignee?.name ?? "Unassigned"} />
            <span className="truncate text-xs text-desk-muted">{ticket.assignee?.name ?? "Unassigned"}</span>
          </div>
          <span className="shrink-0 text-[11px] text-desk-muted">{categoryLabels[ticket.category]}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-desk-muted">
          <span className="inline-flex items-center gap-1.5 capitalize">
            {dotColor ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
            ) : null}
            {ticket.priority}
          </span>
          {(commentCount > 0 || attachmentCount > 0) ? (
            <span className="inline-flex items-center gap-2">
              {commentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" aria-hidden="true" />
                  {commentCount}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" aria-hidden="true" />
                  {attachmentCount}
                </span>
              )}
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
