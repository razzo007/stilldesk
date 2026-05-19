import type { TicketCategory, TicketPriority, TicketStatus } from "../types/ticket";

export const ATTACHMENT_BUCKET = "stilldesk-attachments";

export const statuses: TicketStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "blocked",
  "fixed",
  "verified",
  "closed",
];

export const categories: TicketCategory[] = [
  "design",
  "frontend",
  "backend",
  "ai_agent",
  "infra",
  "data",
  "copy",
  "other",
];

export const priorities: TicketPriority[] = ["low", "medium", "high", "blocker"];

export const modules = [
  "Emma",
  "Iris",
  "Alex",
  "Jim",
  "Maya",
  "Lisa",
  "Owen",
  "Auth",
  "Dashboard",
  "Pricing",
  "Onboarding",
  "Campaigns",
  "Settings",
];

export const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  blocked: "Blocked",
  fixed: "Fixed",
  verified: "Verified",
  closed: "Closed",
};

export const categoryLabels: Record<TicketCategory, string> = {
  design: "Design",
  frontend: "Frontend",
  backend: "Backend",
  ai_agent: "AI Agent",
  infra: "Infra",
  data: "Data",
  copy: "Copy",
  other: "Other",
};

export const priorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  blocker: "Blocker",
};
