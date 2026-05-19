import type { Department, WorkRole } from "../types/user";

export interface OnboardingPreset {
  department: Department;
  description: string;
  filters: string[];
  label: string;
  landing: "tickets" | "board" | "dashboard";
  role: WorkRole;
}

export const onboardingPresets: OnboardingPreset[] = [
  {
    role: "product_manager",
    department: "product",
    label: "Product / PM",
    description: "See blockers, stale work, unassigned bugs, and waiting verification first.",
    landing: "dashboard",
    filters: [
      "needs_attention",
      "unassigned",
      "stale",
      "blocked",
      "waiting_verification",
      "being_fixed",
      "all",
      "mine",
      "assigned",
      "open",
      "fixed",
    ],
  },
  {
    role: "developer",
    department: "engineering",
    label: "Developer",
    description: "Start with assigned work, bugs being fixed, blockers, and engineering categories.",
    landing: "tickets",
    filters: [
      "being_fixed",
      "assigned",
      "blocked",
      "stale",
      "all",
      "open",
      "in_progress",
      "fixed",
      "backend",
      "frontend",
      "ai_agent",
      "infra",
    ],
  },
  {
    role: "designer",
    department: "design",
    label: "Designer",
    description: "Track visual bugs, frontend polish, copy fixes, and tickets waiting for review.",
    landing: "tickets",
    filters: [
      "waiting_verification",
      "assigned",
      "stale",
      "all",
      "open",
      "fixed",
      "design",
      "copy",
      "frontend",
    ],
  },
  {
    role: "sales_marketing",
    department: "sales_marketing",
    label: "Sales / Marketing",
    description: "Follow issues you raised, campaign/copy bugs, data problems, and customer-facing fixes.",
    landing: "tickets",
    filters: [
      "mine",
      "needs_attention",
      "unassigned",
      "all",
      "open",
      "fixed",
      "copy",
      "data",
      "frontend",
    ],
  },
  {
    role: "support_qa",
    department: "support",
    label: "Support / QA",
    description: "Watch newly raised bugs, blocked fixes, verification, and reopened work.",
    landing: "board",
    filters: [
      "needs_attention",
      "unassigned",
      "blocked",
      "waiting_verification",
      "stale",
      "all",
      "open",
      "in_progress",
      "fixed",
      "verified",
    ],
  },
  {
    role: "other",
    department: "other",
    label: "Just show me the desk",
    description: "Use StillDesk defaults: attention, ownership, blocked work, and the full bug list.",
    landing: "dashboard",
    filters: [
      "needs_attention",
      "unassigned",
      "stale",
      "blocked",
      "waiting_verification",
      "being_fixed",
      "all",
      "mine",
      "assigned",
      "open",
      "in_progress",
      "fixed",
    ],
  },
];

export const sampleFlowEvents = [
  {
    label: "Raise",
    text: "Mira reports a broken onboarding logo check and adds a screenshot.",
  },
  {
    label: "Assign",
    text: "Noah gets ownership, asks one clarifying question, and starts fixing.",
  },
  {
    label: "Fix",
    text: "The ticket moves to fixed with the exact change noted in the thread.",
  },
  {
    label: "Verify",
    text: "The reporter verifies the fix, then the desk gets quiet again.",
  },
];

export function onboardingKey(profileId: string) {
  return `stilldesk:onboarding-complete:${profileId}`;
}
