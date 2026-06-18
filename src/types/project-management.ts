import type { Profile } from "./user";
import type { TicketCategory } from "./ticket";

export type WorkspaceRole = "owner" | "admin" | "member";
export type ProjectRole = "admin" | "member" | "viewer";
export type PmIssueType = "epic" | "story" | "task" | "bug" | "sub_task";
export type PmIssuePriority = "lowest" | "low" | "medium" | "high" | "highest";
export type WorkflowStatusCategory = "backlog" | "todo" | "in_progress" | "done";
export type BoardType = "kanban" | "scrum";
export type SprintState = "future" | "active" | "closed";
export type IssueLinkType =
  | "blocks"
  | "is_blocked_by"
  | "relates"
  | "duplicates"
  | "clones";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  description?: string | null;
  lead_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  lead?: Profile | null;
}

export interface WorkflowStatus {
  id: string;
  project_id: string;
  key: string;
  name: string;
  category: WorkflowStatusCategory;
  sort_order: number;
  is_default: boolean;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  board_type: BoardType;
  is_default: boolean;
  columns?: BoardColumn[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  workflow_status_id: string;
  name: string;
  sort_order: number;
  wip_limit?: number | null;
  status?: WorkflowStatus;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string | null;
  state: SprintState;
  start_date?: string | null;
  end_date?: string | null;
}

export interface Issue {
  id: string;
  project_id: string;
  issue_number: number;
  issue_key?: string;
  issue_type: PmIssueType;
  title: string;
  description?: string | null;
  status_id: string;
  priority: PmIssuePriority;
  reporter_id: string;
  assignee_id?: string | null;
  parent_issue_id?: string | null;
  epic_id?: string | null;
  sprint_id?: string | null;
  story_points?: number | null;
  rank_key: string;
  legacy_ticket_id?: string | null;
  legacy_category?: TicketCategory | null;
  dependency_note?: string | null;
  blocked_by_issue_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  status?: WorkflowStatus;
  reporter?: Profile;
  assignee?: Profile | null;
  labels?: Label[];
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface IssueLink {
  id: string;
  source_issue_id: string;
  target_issue_id: string;
  link_type: IssueLinkType;
  created_by: string;
  created_at: string;
}

export interface CreateProjectInput {
  workspace_id: string;
  key: string;
  name: string;
  description?: string;
  lead_id?: string;
}

export interface CreateIssueInput {
  project_id: string;
  issue_type?: PmIssueType;
  title: string;
  description?: string;
  status_id?: string;
  priority?: PmIssuePriority;
  assignee_id?: string;
  epic_id?: string;
  sprint_id?: string;
  story_points?: number;
  parent_issue_id?: string;
}
