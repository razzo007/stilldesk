export type UserRole = "reporter" | "developer" | "admin" | "supreme_leader";

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: UserRole;
  last_seen_at?: string | null;
  created_at?: string | null;
}
