import { formatDate } from "./time";
import type { TicketActivity } from "../../types/ticket";

export function ActivityTimeline({ activity }: { activity: TicketActivity[] }) {
  if (!activity.length) return null;

  return (
    <details className="rounded-xl border border-desk-border bg-desk-surface px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-desk-text">Activity</summary>
      <ol className="mt-4 grid gap-3 border-l border-desk-border pl-4">
        {activity.map((item) => (
          <li className="relative text-desk-muted" key={item.id}>
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border border-desk-border bg-desk-surface" />
            <span className="text-desk-text">{item.user?.name ?? "Someone"}</span>{" "}
            changed {item.action.replace("_", " ")}
            {item.new_value ? ` to ${item.new_value.replace("_", " ")}` : ""}.
            <span className="ml-2 text-xs">{formatDate(item.created_at)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
