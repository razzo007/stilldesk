import type { AccountStatus, AuthProvider, UserRole } from "./user";

export type { AccountStatus, AuthProvider };

export type AuthAuditEvent =
  | "sign_in"
  | "sign_out"
  | "sign_up"
  | "identity_linked"
  | "identity_unlinked"
  | "password_reset_requested"
  | "invitation_sent"
  | "invitation_accepted"
  | "role_changed"
  | "account_suspended"
  | "account_reactivated"
  | "access_denied";

export interface PlatformAuthSettings {
  id: number;
  allowed_email_domains: string[];
  enforce_microsoft_sso: boolean;
  allow_email_password: boolean;
  allow_self_registration: boolean;
  microsoft_tenant_id: string | null;
  microsoft_tenant_ids: string[];
  auto_promote_admin_emails: string[];
  session_max_age_hours: number;
  updated_at?: string;
}

export interface WorkspaceAuthSettings {
  workspace_id: string;
  allowed_email_domains: string[];
  enforce_microsoft_sso: boolean;
  allow_email_password: boolean;
  allow_self_registration: boolean;
  microsoft_tenant_id: string | null;
  microsoft_tenant_ids: string[];
  auto_join_workspace: boolean;
  default_workspace_role: "owner" | "admin" | "member";
  default_app_role: UserRole;
}

export interface UserAuthIdentity {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_subject: string;
  provider_tenant_id: string | null;
  email: string | null;
  first_linked_at: string;
  last_sign_in_at: string | null;
}

export interface UserInvitation {
  id: string;
  email: string;
  workspace_id: string | null;
  app_role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface CreateInvitationResult {
  invitation_id: string;
  invite_token: string;
}
