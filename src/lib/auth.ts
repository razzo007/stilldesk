import { demoProfiles } from "./mockData";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { PlatformAuthSettings } from "../types/auth";
import type { Department, Profile, UserRole, WorkRole } from "../types/user";

export const allowedEmailDomains = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS as string | undefined)
  ?.split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean) ?? [];

export function isAllowedSignupEmail(email: string) {
  if (!allowedEmailDomains.length) return true;
  const domain = email.trim().toLowerCase().split("@")[1];
  return Boolean(domain && allowedEmailDomains.includes(domain));
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

  if (!profile) return null;

  if (profile.account_status === "suspended") {
    throw new Error("Your account has been suspended. Contact your administrator.");
  }

  void supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  return profile;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return;

  if (!isAllowedSignupEmail(email)) {
    throw new Error(`Use an approved team email${allowedEmailDomains.length ? `: ${allowedEmailDomains.join(", ")}` : "."}`);
  }

  const settings = await getPlatformAuthSettings();
  if (settings?.enforce_microsoft_sso && !settings.allow_email_password) {
    throw new Error("This organization requires Microsoft sign-in.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  await logAuthEvent("sign_in", "email", email);
}

export async function signInWithMicrosoft() {
  if (!supabase) return;

  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string | undefined;
  const queryParams = tenantId ? { tenant: tenantId } : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: window.location.origin,
      scopes: "email openid profile",
      queryParams,
    },
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

  const settings = await getPlatformAuthSettings();
  if (settings?.enforce_microsoft_sso || settings?.allow_self_registration === false) {
    throw new Error("Self-registration is disabled. Ask an admin for an invitation or use Microsoft sign-in.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, ...metadata },
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) throw error;

  // Supabase silently swallows duplicate email errors when enumeration protection is ON.
  // Older versions: returns user with identities: []
  // Newer versions: returns data.user = null with no error
  if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
    throw new Error("An account with this email already exists");
  }
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

export async function updatePassword(newPassword: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  if (supabase) {
    await logAuthEvent("sign_out");
    await supabase.auth.signOut();
  }
}

export async function getPlatformAuthSettings(): Promise<PlatformAuthSettings | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase.rpc("get_platform_auth_settings");
  if (error) return null;
  return data as PlatformAuthSettings;
}

export async function logAuthEvent(
  eventType: "sign_in" | "sign_out" | "sign_up",
  provider?: "email" | "azure",
  email?: string,
) {
  if (!isSupabaseConfigured || !supabase) return;

  await supabase.rpc("log_auth_event", {
    p_event_type: eventType,
    p_provider: provider ?? null,
    p_email: email ?? null,
    p_metadata: {},
  });
}

export async function acceptInvitation(token: string) {
  if (!isSupabaseConfigured || !supabase) return false;

  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token: token,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function createUserInvitation(email: string, appRole: UserRole = "reporter") {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Invitations require Supabase.");
  }

  const { data, error } = await supabase.rpc("create_user_invitation", {
    p_email: email,
    p_app_role: appRole,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { invitation_id: string; invite_token: string };
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

export async function createUser(name: string, email: string) {
  if (!isSupabaseConfigured || !supabase) throw new Error("No backend configured.");

  const { data, error } = await supabase
    .from("users")
    .insert([{ name, email }])
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate key") || error.code === "23505") {
      throw new Error("User already exists");
    }
    throw error;
  }

  return data;
}
