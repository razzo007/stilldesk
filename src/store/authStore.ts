import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { signOut as apiSignOut } from "../lib/auth";
import { onboardingKey } from "../lib/onboarding";
import { demoProfiles, demoTickets, demoUser, previewUser } from "../lib/mockData";
import type { Ticket } from "../types/ticket";
import type { Profile } from "../types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemoData {
  profile: Profile;
  profiles: Profile[];
  tickets: Ticket[];
}

interface AuthState {
  recoveryMode: boolean;
  authError: string;
  pendingInviteToken: string | null;
  demoData: DemoData | null;
}

interface AuthActions {
  setRecoveryMode(on: boolean): void;
  setAuthError(error: string): void;
  enterDemo(): void;
  enterPreview(): void;
  signOut(): Promise<void>;
  patchDemoProfile(profile: Profile): void;
  patchDemoTicket(ticket: Ticket): void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function consumeInviteToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("invite_token");
  if (token) {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite_token");
    window.history.replaceState({}, "", url.toString());
  }
  return token;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    (set) => ({
      recoveryMode: false,
      authError: "",
      pendingInviteToken: consumeInviteToken(),
      demoData: null,

      setRecoveryMode: (recoveryMode) =>
        set({ recoveryMode }, false, "auth/recoveryMode"),

      setAuthError: (authError) =>
        set({ authError }, false, "auth/error"),

      enterDemo() {
        set(
          {
            demoData: { profile: demoUser, profiles: demoProfiles, tickets: demoTickets },
            authError: "",
            recoveryMode: false,
          },
          false,
          "auth/demo",
        );
      },

      enterPreview() {
        set(
          {
            demoData: { profile: previewUser, profiles: [previewUser], tickets: [] },
            authError: "",
            recoveryMode: false,
          },
          false,
          "auth/preview",
        );
      },

      async signOut() {
        await apiSignOut();
        set({ demoData: null, authError: "", recoveryMode: false }, false, "auth/signedOut");
      },

      patchDemoProfile(profile) {
        set(
          (s) => ({
            demoData: s.demoData
              ? { ...s.demoData, profile, profiles: s.demoData.profiles.map((p) => (p.id === profile.id ? profile : p)) }
              : null,
          }),
          false,
          "auth/demoProfile",
        );
      },

      patchDemoTicket(ticket) {
        set(
          (s) => ({
            demoData: s.demoData
              ? { ...s.demoData, tickets: s.demoData.tickets.map((t) => (t.id === ticket.id ? ticket : t)) }
              : null,
          }),
          false,
          "auth/demoTicket",
        );
      },
    }),
    { name: "StillDesk/auth" },
  ),
);

// ---------------------------------------------------------------------------
// Selector helpers
// ---------------------------------------------------------------------------

export const selectOnboardingPending = (profile: Profile | null) =>
  Boolean(
    profile &&
      !profile.onboarding_completed &&
      localStorage.getItem(onboardingKey(profile.id)) !== "true",
  );
