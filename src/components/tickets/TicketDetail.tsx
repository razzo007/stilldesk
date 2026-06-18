import { CheckCircle2, CircleDot, Link2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { categories, categoryLabels, priorities, priorityLabels, statuses, statusLabels } from "../../lib/constants";
import { addComment } from "../../lib/tickets";
import { useUpdateTicket } from "../../queries/tickets";
import { sendTicketEmail, uniqueEmails } from "../../lib/notifications";
import {
  canAssignTicket,
  canCloseTicket,
  canDeleteTicket,
  canEditTicket,
  canMarkFixed,
  canReopenTicket,
  canVerifyTicket,
} from "../../lib/permissions";
import type { Ticket, TicketPriority, TicketStatus } from "../../types/ticket";
import type { Profile } from "../../types/user";
import { AttachmentPreview } from "./AttachmentPreview";
import { ActivityTimeline } from "./ActivityTimeline";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./badgeHelpers";
import { CommentThread } from "./CommentThread";
import { displayTicketId, formatDate } from "./time";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface TicketDetailProps {
  ticket?: Ticket;
  currentUser: Profile;
  profiles: Profile[];
  allTickets: Ticket[];
  onTicketChange: (ticket: Ticket) => void;
  onSelectTicket: (ticket: Ticket) => void;
  onDeleteTicket: (ticket: Ticket) => Promise<void>;
}

export function TicketDetail({ ticket, currentUser, profiles, allTickets, onTicketChange, onSelectTicket, onDeleteTicket }: TicketDetailProps) {
  const updateTicketMutation = useUpdateTicket();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dependencyNote, setDependencyNote] = useState(ticket?.dependency_note ?? "");
  const [blockedById, setBlockedById] = useState(ticket?.blocked_by_id ?? "");
  const [editOpen, setEditOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setDependencyNote(ticket?.dependency_note ?? "");
    setBlockedById(ticket?.blocked_by_id ?? "");
    setConfirmDelete(false);
    setActionError("");
    setReopenOpen(false);
    setReopenNote("");
  }, [ticket?.id, ticket?.dependency_note, ticket?.blocked_by_id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEditOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!ticket) {
    return (
      <section className="min-h-0 overflow-y-auto bg-desk-bg p-5 scrollbar-soft">
        <EmptyState
          title="Pick an issue."
          body="The detail panel stays quiet until there is something useful to read."
        />
      </section>
    );
  }

  const currentTicket = ticket;
  const canEdit = canEditTicket(currentUser, ticket);
  const canAssign = canAssignTicket(currentUser, ticket);
  const canFix = canMarkFixed(currentUser, ticket);
  const canVerify = canVerifyTicket(currentUser, ticket);
  const canClose = canCloseTicket(currentUser);
  const canReopen = canReopenTicket(currentUser, ticket);
  const canDelete = canDeleteTicket(currentUser);

  const blockingTicket = ticket.blocked_by_id
    ? allTickets.find((t) => t.id === ticket.blocked_by_id) ?? null
    : null;

  const otherTickets = allTickets.filter(
    (t) => t.id !== ticket.id && !["verified", "closed"].includes(t.status),
  );

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDeleteTicket(currentTicket);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function validateStatusChange(updates: Partial<Pick<Ticket, "status" | "assigned_to" | "priority" | "dependency_note" | "blocked_by_id" | "category">>) {
    if (!updates.status) return true;

    if (updates.status === "fixed" && !canFix) {
      setActionError("Only the owner or an admin can mark this fixed.");
      return false;
    }

    if (updates.status === "verified" && !canVerify) {
      setActionError("Only the reporter or an admin can verify the fix.");
      return false;
    }

    if (updates.status === "closed" && !canClose) {
      setActionError("Only an admin can close tickets.");
      return false;
    }

    if (updates.status === "open" && ["fixed", "verified", "closed"].includes(currentTicket.status) && !canReopen) {
      setActionError("Only the reporter, owner, or admin can reopen this ticket.");
      return false;
    }

    if (updates.status === "blocked") {
      const note = updates.dependency_note ?? dependencyNote;
      if (!note?.trim()) {
        setEditOpen(true);
        setActionError("Add what this is waiting on before marking it blocked.");
        return false;
      }
    }

    if (!canEdit && !["fixed", "verified", "closed"].includes(updates.status)) {
      setActionError("Only the reporter, owner, or admin can change this ticket.");
      return false;
    }

    return true;
  }

  async function patchTicket(updates: Partial<Pick<Ticket, "status" | "assigned_to" | "priority" | "dependency_note" | "blocked_by_id" | "category">>) {
    if (!validateStatusChange(updates)) return;

    setSaving(true);
    setActionError("");
    try {
      const normalizedUpdates =
        updates.status === "blocked"
          ? { ...updates, dependency_note: (updates.dependency_note ?? dependencyNote).trim() }
          : updates;
      const updated = await updateTicketMutation.mutateAsync({
        ticket: currentTicket,
        updates: normalizedUpdates,
        user: currentUser,
      });
      onTicketChange(updated);
      const assignee = profiles.find((profile) => profile.id === updated.assigned_to) ?? updated.assignee;
      const reporter = profiles.find((profile) => profile.id === updated.created_by) ?? updated.reporter;

      if (updates.assigned_to && updates.assigned_to !== currentTicket.assigned_to && assignee?.email) {
        void sendTicketEmail({
          eventType: "assigned",
          actor: currentUser,
          ticket: { ...updated, assignee },
          recipients: uniqueEmails([assignee.email]),
        }).catch(console.warn);
      }

      if (
        updates.status &&
        updates.status !== currentTicket.status &&
        ["fixed", "verified", "closed"].includes(updates.status)
      ) {
        void sendTicketEmail({
          eventType: "resolved",
          actor: currentUser,
          ticket: { ...updated, assignee, reporter },
          recipients: uniqueEmails([reporter?.email, assignee?.email].filter((email) => email !== currentUser.email)),
        }).catch(console.warn);
      }

      if (updates.status === "blocked" && updates.status !== currentTicket.status) {
        void sendTicketEmail({
          eventType: "blocked",
          actor: currentUser,
          ticket: { ...updated, assignee, reporter },
          recipients: uniqueEmails([reporter?.email, assignee?.email].filter((email) => email !== currentUser.email)),
        }).catch(console.warn);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitComment(comment: string, taggedUserId?: string) {
    const created = await addComment(currentTicket, comment, currentUser, taggedUserId);
    onTicketChange({
      ...currentTicket,
      comments: [...(currentTicket.comments ?? []), created],
      updated_at: new Date().toISOString(),
    });

    const taggedUser = profiles.find((profile) => profile.id === taggedUserId);
    if (taggedUser?.email && taggedUser.email !== currentUser.email) {
      void sendTicketEmail({
        eventType: "comment",
        actor: currentUser,
        ticket: currentTicket,
        recipients: uniqueEmails([taggedUser.email]),
      }).catch(console.warn);
    }
  }

  async function submitReopen() {
    if (!reopenNote.trim()) {
      setActionError("Add a short reason before reopening.");
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      const updated = await updateTicket(currentTicket, { status: "open" }, currentUser);
      const created = await addComment(updated, `Reopened: ${reopenNote.trim()}`, currentUser, updated.assigned_to ?? undefined);
      onTicketChange({
        ...updated,
        comments: [...(updated.comments ?? currentTicket.comments ?? []), created],
        assignee: profiles.find((profile) => profile.id === updated.assigned_to) ?? updated.assignee,
        reporter: profiles.find((profile) => profile.id === updated.created_by) ?? updated.reporter,
      });
      setReopenOpen(false);
      setReopenNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-0 overflow-y-auto bg-desk-bg/35 scrollbar-soft">
      <article className="mx-auto grid max-w-6xl gap-7 px-5 py-6 lg:px-9 lg:py-8">
        <header className="border-b border-desk-border/80 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-desk-muted">
                {displayTicketId(ticket.id)}
              </p>
              <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-desk-text">
                {ticket.title}
              </h1>
            </div>
            {canEdit ? (
              <button
                className="mt-1 shrink-0 text-xs text-desk-muted transition-colors hover:text-desk-text"
                onClick={() => setEditOpen((value) => !value)}
                type="button"
              >
                {editOpen ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
              {!ticket.assigned_to && canAssign ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() => patchTicket({ assigned_to: currentUser.id, status: "assigned" })}
                  variant="ghost"
                >
                  Assign to me
                </Button>
              ) : null}
              {canEdit && ticket.status !== "in_progress" && !["verified", "closed"].includes(ticket.status) ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() =>
                    patchTicket({
                      assigned_to: ticket.assigned_to || currentUser.id,
                      status: "in_progress",
                    })
                  }
                  variant="ghost"
                >
                  Start fixing
                </Button>
              ) : null}
              {canEdit && !["verified", "closed"].includes(ticket.status) ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() => {
                    setEditOpen(true);
                    setActionError("Add what this is waiting on, then save blocked.");
                  }}
                  variant="ghost"
                >
                  Mark blocked
                </Button>
              ) : null}
              {canFix ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() => patchTicket({ status: "fixed" })}
                  variant="secondary"
                >
                  Mark fixed
                </Button>
              ) : null}
              {canVerify ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() => patchTicket({ status: "verified" })}
                  variant="primary"
                >
                  Verify
                </Button>
              ) : null}
              {canClose ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  isLoading={saving}
                  onClick={() => patchTicket({ status: "closed" })}
                  variant="ghost"
                >
                  Close
                </Button>
              ) : null}
              {["fixed", "verified", "closed"].includes(ticket.status) && canReopen ? (
                <Button
                  className="min-h-8 px-3 py-1 text-xs"
                  onClick={() => setReopenOpen((value) => !value)}
                  variant="ghost"
                >
                  Reopen
                </Button>
              ) : null}
            </div>
          </div>
          {actionError ? (
            <p className="mt-4 rounded-lg bg-desk-amber/55 px-3 py-2 text-sm text-desk-amberText">
              {actionError}
            </p>
          ) : null}
          {reopenOpen ? (
            <div className="mt-4 grid max-w-2xl gap-3 rounded-xl border border-desk-border bg-desk-surface/55 p-4">
              <Textarea
                label="Why reopen?"
                onChange={(event) => setReopenNote(event.target.value)}
                placeholder="What still breaks?"
                value={reopenNote}
              />
              <div className="flex justify-end">
                <Button isLoading={saving} onClick={submitReopen} variant="primary">
                  Reopen ticket
                </Button>
              </div>
            </div>
          ) : null}

          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-desk-muted">
            <div className="flex items-center gap-2">
              <dt>Reporter</dt>
              <dd className="flex items-center gap-2 font-medium text-desk-text">
                <Avatar className="h-6 w-6 text-[10px]" name={ticket.reporter?.name ?? "Reporter"} />
                {ticket.reporter?.name ?? "Reporter"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt>Owner</dt>
              <dd className="font-medium text-desk-text">{ticket.assignee?.name ?? "Unassigned"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt>Created</dt>
              <dd className="font-medium text-desk-text">{formatDate(ticket.created_at)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt>Module</dt>
              <dd className="font-medium text-desk-text">{ticket.module ?? "Not set"}</dd>
            </div>
          </dl>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid content-start gap-7">
            <section className="border-b border-desk-border/80 pb-7">
              <h2 className="text-sm font-semibold text-desk-text">Description</h2>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-[15px] leading-8 text-desk-text">
                {ticket.description || "No description. The title is carrying this one."}
              </p>
            </section>

            <section className="border-b border-desk-border/80 pb-7">
              <h2 className="mb-4 text-sm font-semibold text-desk-text">Screenshot</h2>
              <AttachmentPreview attachments={ticket.attachments ?? []} />
            </section>

            {ticket.status === "blocked" ? (
              <section className="rounded-xl bg-desk-amber/45 px-4 py-3">
                <h2 className="text-sm font-semibold text-desk-amberText">Why is this blocked?</h2>
                <p className="mt-2 text-sm leading-6 text-desk-amberText">
                  {ticket.dependency_note || "Needs more info."}
                </p>
                {blockingTicket ? (
                  <button
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-desk-amber/60 bg-desk-surface/50 px-2.5 py-1.5 text-xs font-medium text-desk-amberText transition hover:bg-desk-surface/80"
                    onClick={() => onSelectTicket(blockingTicket)}
                    type="button"
                  >
                    <Link2 className="h-3 w-3" aria-hidden="true" />
                    Blocked by {blockingTicket.id} — {blockingTicket.title}
                  </button>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="grid content-start gap-5">
            {editOpen ? (
            <section className="glass-panel rounded-2xl p-4">
              <h2 className="mb-4 text-sm font-semibold text-desk-text">Update</h2>
              <div className="grid gap-3.5">
                <Select
                  label="Status"
                  name="status"
                  onChange={(event) => patchTicket({ status: event.target.value as TicketStatus })}
                  options={statuses.map((status) => ({ value: status, label: statusLabels[status] }))}
                  value={ticket.status}
                />
                <Select
                  label="Priority"
                  name="priority"
                  onChange={(event) => patchTicket({ priority: event.target.value as TicketPriority })}
                  options={priorities.map((priority) => ({ value: priority, label: priorityLabels[priority] }))}
                  value={ticket.priority}
                />
                <Select
                  label="Owner"
                  name="assigned_to"
                  onChange={(event) => patchTicket({ assigned_to: event.target.value || null })}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...profiles.map((profile) => ({ value: profile.id, label: profile.name })),
                  ]}
                  value={ticket.assigned_to ?? ""}
                />
                <Select
                  label="Category"
                  name="category"
                  onChange={(event) => patchTicket({ category: event.target.value as Ticket["category"] })}
                  options={categories.map((category) => ({ value: category, label: categoryLabels[category] }))}
                  value={ticket.category}
                />
                {ticket.status === "blocked" || actionError.toLowerCase().includes("blocked") ? (
                  <div className="grid gap-3">
                    <Textarea
                      label="Waiting on"
                      onChange={(event) => setDependencyNote(event.target.value)}
                      placeholder="Dependency, decision, or missing context."
                      value={dependencyNote}
                    />
                    <Select
                      label="Blocked by ticket (optional)"
                      name="blocked_by_id"
                      onChange={(event) => setBlockedById(event.target.value)}
                      options={[
                        { value: "", label: "None" },
                        ...otherTickets.map((t) => ({
                          value: t.id,
                          label: `${t.id} — ${t.title}`,
                        })),
                      ]}
                      value={blockedById}
                    />
                    <Button
                      isLoading={saving}
                      onClick={() =>
                        patchTicket({
                          status: "blocked",
                          dependency_note: dependencyNote,
                          blocked_by_id: blockedById || null,
                        })
                      }
                      variant="secondary"
                    >
                      Save blocked
                    </Button>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    icon={<CircleDot className="h-4 w-4" aria-hidden="true" />}
                    isLoading={saving}
                    onClick={() => patchTicket({ status: "fixed" })}
                    variant="secondary"
                  >
                    Mark fixed
                  </Button>
                  <Button
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    isLoading={saving}
                    onClick={() => patchTicket({ status: "verified" })}
                    variant="primary"
                  >
                    Verify fix
                  </Button>
                </div>
              </div>
            </section>
            ) : null}

            <section className="px-1 text-sm text-desk-muted">
              <p>Fixed: <span className="text-desk-text">{formatDate(ticket.fixed_at)}</span></p>
              <p className="mt-2">Verified: <span className="text-desk-text">{formatDate(ticket.verified_at)}</span></p>
            </section>

            <ActivityTimeline activity={ticket.activity ?? []} />

            {canDelete ? (
              <section className="border-t border-desk-border/60 pt-4">
                {confirmDelete ? (
                  <div className="grid gap-2">
                    <p className="text-xs text-desk-redText">
                      This will permanently delete the ticket. There is no undo.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        isLoading={deleting}
                        onClick={handleDelete}
                        variant="danger"
                      >
                        Yes, delete
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setConfirmDelete(false)}
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 text-xs text-desk-muted transition hover:text-desk-redText"
                    onClick={handleDelete}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete ticket
                  </button>
                )}
              </section>
            ) : null}
          </aside>
        </div>

        <section className="border-t border-desk-border/80 pt-7">
          <h2 className="mb-4 text-sm font-semibold text-desk-text">Comments</h2>
          <CommentThread comments={ticket.comments ?? []} onSubmit={submitComment} profiles={profiles} />
        </section>
      </article>
    </section>
  );
}
