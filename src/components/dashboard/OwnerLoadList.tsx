import type { Ticket } from "../../types/ticket";
import type { Profile } from "../../types/user";
import { Avatar } from "../ui/Avatar";

interface OwnerLoadListProps {
  tickets: Ticket[];
  profiles: Profile[];
}

function loadBadgeClass(count: number): string {
  if (count >= 8) return "rounded-full bg-desk-red px-2.5 py-1 text-xs text-desk-redText font-medium";
  if (count >= 5) return "rounded-full bg-desk-amber px-2.5 py-1 text-xs text-desk-amberText font-medium";
  return "rounded-full bg-desk-soft px-2.5 py-1 text-xs text-desk-muted";
}

export function OwnerLoadList({ profiles, tickets }: OwnerLoadListProps) {
  const rows = profiles
    .map((profile) => ({
      profile,
      count: tickets.filter(
        (ticket) =>
          ticket.assigned_to === profile.id && !["verified", "closed"].includes(ticket.status),
      ).length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-desk-text">Owner load</h2>
      <div className="mt-4 grid gap-3">
        {rows.length ? (
          rows.map(({ profile, count }) => (
            <div className="flex items-center justify-between gap-3" key={profile.id}>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={profile.name} src={profile.avatar_url} />
                <span className="truncate text-sm text-desk-text">{profile.name}</span>
              </div>
              <span className={loadBadgeClass(count)}>{count} open</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-desk-muted">No owner has unresolved work.</p>
        )}
      </div>
    </section>
  );
}
