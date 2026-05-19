import { demoProfiles } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Department, Profile, UserRole, WorkRole } from "../types/user";

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

export const allowedEmailDomains = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS as string | undefined)
  ?.split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean) ?? [];

export function isAllowedSignupEmail(email: string) {
  if (!allowedEmailDomains.length) return true;
  const domain = email.trim().toLowerCase().split("@")[1];
  return Boolean(domain && allowedEmailDomains.includes(domain));
}

function roleForEmail(email?: string | null): UserRole {
  return email && adminEmails.includes(email.toLowerCase()) ? "admin" : "reporter";
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile) {
    const desiredRole = roleForEmail(user.email);
    if (desiredRole === "admin" && profile.role !== "admin" && profile.role !== "supreme_leader") {
      const { data: promoted } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id)
        .select("*")
        .single();

      if (promoted) return promoted as Profile;
    }

    void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
    return profile;
  }

  const fallbackName =
    user.user_metadata?.name ||
    user.email?.split("@")[0]?.replace(/[._-]/g, " ") ||
    "StillDesk user";
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const initialRole = count === 0 ? "admin" : roleForEmail(user.email);

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      name: fallbackName,
      email: user.email,
      role: initialRole,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      last_seen_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
  metadata: Record<string, string | string[]> = {},
) {
  if (!supabase) return;

  if (!isAllowedSignupEmail(email)) {
    throw new Error(`Use an approved team email${allowedEmailDomains.length ? `: ${allowedEmailDomains.join(", ")}` : "."}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, ...metadata },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  if (!supabase) return;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) throw error;
}

export async function updateProfile(profile: Pick<Profile, "id" | "name" | "avatar_url">) {
  if (!isSupabaseConfigured || !supabase) return profile;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: profile.name,
      avatar_url: profile.avatar_url ?? null,
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfileRole(id: string, role: UserRole) {
  if (!isSupabaseConfigured || !supabase) return { id, role };

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function completeProfileOnboarding(input: {
  id: string;
  work_role: WorkRole;
  department: Department;
  preferred_filters: string[];
  preferred_view: "welcome" | "tickets" | "board" | "dashboard";
}) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      id: input.id,
      work_role: input.work_role,
      department: input.department,
      preferred_filters: input.preferred_filters,
      preferred_view: input.preferred_view,
      onboarding_completed: true,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      work_role: input.work_role,
      department: input.department,
      preferred_filters: input.preferred_filters,
      preferred_view: input.preferred_view,
      onboarding_completed: true,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function sendUserPasswordReset(email: string) {
  return sendPasswordReset(email);
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export async function getProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured || !supabase) return demoProfiles;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
