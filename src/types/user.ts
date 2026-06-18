export type UserRole = "reporter" | "developer" | "admin" | "supreme_leader";

export type WorkRole = "product_manager" | "developer" | "designer" | "sales_marketing" | "support_qa" | "other";

export type Department = "product" | "engineering" | "design" | "sales_marketing" | "support" | "operations" | "other";

export type AccountStatus = "active" | "invited" | "suspended";
export type AuthProvider = "email" | "azure";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: UserRole;
  account_status?: AccountStatus | null;
  primary_auth_provider?: AuthProvider | null;
  work_role?: WorkRole | null;
  department?: Department | null;
  preferred_filters?: string[] | null;
  preferred_view?: "welcome" | "tickets" | "board" | "dashboard" | null;
  onboarding_completed?: boolean | null;
  last_seen_at?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}
