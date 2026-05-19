import { isSupabaseConfigured, supabase } from "./supabase";
import type { Ticket } from "../types/ticket";
import type { Profile } from "../types/user";

type NotificationEvent = "assigned" | "resolved" | "comment" | "blocked";

interface TicketEmailPayload {
  eventType: NotificationEvent;
  ticket: Ticket;
  actor: Profile;
  recipients: string[];
}

export async function sendTicketEmail(payload: TicketEmailPayload) {
  if (!isSupabaseConfigured || !supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return;

  const emailFunctionUrl =
    (import.meta.env.VITE_EMAIL_FUNCTION_URL as string | undefined) ??
    "/.netlify/functions/send-ticket-email";

  const response = await fetch(emailFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      eventType: payload.eventType,
      actor: {
        id: payload.actor.id,
        name: payload.actor.name,
        email: payload.actor.email,
      },
      recipients: payload.recipients,
      ticket: {
        id: payload.ticket.id,
        title: payload.ticket.title,
        description: payload.ticket.description,
        status: payload.ticket.status,
        priority: payload.ticket.priority,
        category: payload.ticket.category,
      },
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Could not send notification email.");
  }
}

export function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}
