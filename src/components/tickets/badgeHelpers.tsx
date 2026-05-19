import { Badge } from "../ui/Badge";
import { categoryLabels, priorityLabels, statusLabels } from "../../lib/constants";
import type { TicketCategory, TicketPriority, TicketStatus } from "../../types/ticket";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const tone =
    status === "blocked"
      ? "amber"
      : status === "fixed" || status === "verified" || status === "closed"
        ? "green"
        : status === "in_progress"
          ? "accent"
          : "neutral";

  return <Badge tone={tone}>{statusLabels[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const tone = priority === "blocker" ? "red" : priority === "high" ? "amber" : "neutral";
  return <Badge tone={tone}>{priorityLabels[priority]}</Badge>;
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return <Badge tone={category === "ai_agent" ? "accent" : "neutral"}>{categoryLabels[category]}</Badge>;
}
