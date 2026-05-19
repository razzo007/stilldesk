import { sendUserPasswordReset } from "../../lib/auth";
import type { Profile, UserRole } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { formatDate } from "../tickets/time";

interface AdminUsersProps {
  profiles: Profile[];
  onRoleChange: (id: string, role: UserRole) => Promise<void>;
}

const roles: UserRole[] = ["reporter", "developer", "admin", "supreme_leader"];

export function AdminUsers({ onRoleChange, profiles }: AdminUsersProps) {
  async function resetPassword(email: string) {
    await sendUserPasswordReset(email);
  }

  return (
    <section className="h-full overflow-y-auto bg-desk-bg p-5 scrollbar-soft lg:p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-desk-muted">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-desk-text">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-desk-muted">
          View team users, roles, profile images, and last seen time. Password reset sends a Supabase reset email.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-desk-border">
          <div className="grid grid-cols-[1fr_11rem_9rem_8rem] gap-4 border-b border-desk-border bg-desk-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-desk-muted">
            <span>User</span>
            <span>Role</span>
            <span>Last seen</span>
            <span className="text-right">Action</span>
          </div>
          {profiles.map((profile) => (
            <div
              className="grid grid-cols-[1fr_11rem_9rem_8rem] items-center gap-4 border-b border-desk-border px-4 py-3 text-sm last:border-b-0"
              key={profile.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={profile.name} src={profile.avatar_url} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-desk-text">{profile.name}</p>
                  <p className="truncate text-xs text-desk-muted">{profile.email}</p>
                </div>
              </div>
              <Select
                aria-label={`Role for ${profile.name}`}
                className="h-9"
                name={`role-${profile.id}`}
                onChange={(event) => void onRoleChange(profile.id, event.target.value as UserRole)}
                options={roles.map((role) => ({ value: role, label: role === "supreme_leader" ? "Leader" : role }))}
                value={profile.role}
              />
              <span className="text-desk-muted">{profile.last_seen_at ? formatDate(profile.last_seen_at) : "Not tracked"}</span>
              <div className="text-right">
                <Button className="min-h-8 px-3 py-1 text-xs" onClick={() => resetPassword(profile.email)}>
                  Reset
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
