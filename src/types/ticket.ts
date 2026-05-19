import type { Profile } from "./user";

export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "fixed"
  | "verified"
  | "closed";

export type TicketCategory =
  | "design"
  | "frontend"
  | "backend"
  | "ai_agent"
  | "infra"
  | "data"
  | "copy"
  | "other";

export type TicketPriority = "low" | "medium" | "high" | "blocker";

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  signed_url?: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  tagged_user_id?: string | null;
  created_at: string;
  user?: Profile;
  tagged_user?: Profile | null;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  user_id?: string | null;
  created_at: string;
  user?: Profile | null;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by: string;
  assigned_to?: string | null;
  module?: string | null;
  dependency_note?: string | null;
  created_at: string;
  updated_at: string;
  fixed_at?: string | null;
  verified_at?: string | null;
  reporter?: Profile;
  assignee?: Profile | null;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  activity?: TicketActivity[];
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  category: TicketCategory;
  priority: TicketPriority;
  assigned_to?: string;
  module?: string;
  dependency_note?: string;
  attachments?: File[];
}

export interface TicketMetrics {
  open: number;
  blocked: number;
  fixedThisWeek: number;
  waitingVerification: number;
  oldestUnresolved?: Ticket;
}
