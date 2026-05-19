import type { Ticket } from "../types/ticket";

export type AttentionLevel = "none" | "watch" | "aging" | "stale" | "critical";
export type TicketSort =
  | "needs_attention"
  | "recently_updated"
  | "oldest_open"
  | "stale_first"
  | "priority_first"
  | "blocked_first"
  | "recently_created";

const dayMs = 24 * 60 * 60 * 1000;
const unresolvedStatuses = ["open", "assigned", "in_progress", "blocked", "fixed"];
const priorityScore = { blocker: 4, high: 3, medium: 2, low: 1 };

export function daysSince(value?: string | null) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / dayMs));
}

export function getLastTouchedAt(ticket: Ticket) {
  const dates = [
    ticket.updated_at,
    ...(ticket.comments ?? []).map((comment) => comment.created_at),
    ...(ticket.activity ?? []).map((activity) => activity.created_at),
  ].filter(Boolean);

  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? ticket.updated_at;
}

export function getTicketAge(ticket: Ticket) {
  return daysSince(ticket.created_at);
}

export function getUntouchedDays(ticket: Ticket) {
  return daysSince(getLastTouchedAt(ticket));
}

export function isUnresolved(ticket: Ticket) {
  return unresolvedStatuses.includes(ticket.status);
}

export function getAgeLabel(ticket: Ticket) {
  const openDays = getTicketAge(ticket);
  const untouchedDays = getUntouchedDays(ticket);
  return `Open for ${openDays}d · untouched ${untouchedDays}d`;
}

export function getAttention(ticket: Ticket): {
  attentionLevel: AttentionLevel;
  attentionReason: string;
  score: number;
} {
  if (ticket.status === "closed" || ticket.status === "verified") {
    return { attentionLevel: "none", attentionReason: "", score: 0 };
  }

  const createdDays = getTicketAge(ticket);
  const untouchedDays = getUntouchedDays(ticket);
  let score = 0;
  let reason = "";

  if (!ticket.assigned_to && isUnresolved(ticket)) {
    score += 30;
    reason ||= "Unassigned";
  }

  if (ticket.status === "blocked") {
    score += 40;
    reason ||= `Blocked ${untouchedDays}d`;
    if (untouchedDays > 2) score += 20;
  }

  if (ticket.priority === "blocker" && isUnresolved(ticket)) {
    score += 50;
    reason ||= "Blocker priority";
  }

  if (ticket.priority === "high" && untouchedDays > 1 && isUnresolved(ticket)) {
    score += 30;
    reason ||= "High priority, no update";
  }

  if (["open", "assigned", "in_progress"].includes(ticket.status) && untouchedDays >= 3) {
    score += 20;
    reason ||= `Untouched ${untouchedDays}d`;
  }

  if (isUnresolved(ticket) && createdDays >= 7) {
    score += createdDays >= 14 ? 40 : 20;
    reason ||= `Open ${createdDays}d`;
  }

  if (ticket.status === "fixed" && untouchedDays >= 3) {
    score += 15;
    reason ||= "Needs verification";
  }

  let attentionLevel: AttentionLevel = "none";
  if (score >= 90 || createdDays >= 14 || (ticket.status === "blocked" && untouchedDays >= 5)) {
    attentionLevel = "critical";
  } else if (score >= 60 || untouchedDays >= 8) {
    attentionLevel = "stale";
  } else if (score >= 35 || createdDays >= 4) {
    attentionLevel = "aging";
  } else if (score > 0 || untouchedDays >= 2) {
    attentionLevel = "watch";
  }

  return { attentionLevel, attentionReason: reason, score };
}

export function needsAttention(ticket: Ticket) {
  return getAttention(ticket).score > 0;
}

export function sortTickets(tickets: Ticket[], sort: TicketSort) {
  const sorted = [...tickets];

  return sorted.sort((a, b) => {
    if (sort === "recently_created") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    if (sort === "recently_updated") {
      return new Date(getLastTouchedAt(b)).getTime() - new Date(getLastTouchedAt(a)).getTime();
    }

    if (sort === "oldest_open") {
      return getTicketAge(b) - getTicketAge(a);
    }

    if (sort === "priority_first") {
      return priorityScore[b.priority] - priorityScore[a.priority];
    }

    if (sort === "blocked_first") {
      return Number(b.status === "blocked") - Number(a.status === "blocked");
    }

    const attentionDiff = getAttention(b).score - getAttention(a).score;
    if (sort === "stale_first" || sort === "needs_attention") {
      if (attentionDiff !== 0) return attentionDiff;
    }

    const unresolvedDiff = Number(isUnresolved(b)) - Number(isUnresolved(a));
    if (unresolvedDiff !== 0) return unresolvedDiff;

    return new Date(getLastTouchedAt(b)).getTime() - new Date(getLastTouchedAt(a)).getTime();
  });
}
