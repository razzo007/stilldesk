import { demoTickets } from "./mockData";
import { createSignedAttachmentUrl, uploadTicketAttachment } from "./storage";
import { isSupabaseConfigured, supabase } from "./supabase";
import type {
  CreateTicketInput,
  Ticket,
  TicketComment,
  TicketPriority,
  TicketStatus,
} from "../types/ticket";
import type { Profile } from "../types/user";

const ticketSelect = `
  *,
  reporter:profiles!issue_tickets_created_by_fkey(*),
  assignee:profiles!issue_tickets_assigned_to_fkey(*),
  comments:issue_comments(
    *,
    user:profiles!issue_comments_user_id_fkey(*),
    tagged_user:profiles!issue_comments_tagged_user_id_fkey(*)
  ),
  attachments:issue_attachments(*),
  activity:issue_activity(
    *,
    user:profiles!issue_activity_user_id_fkey(*)
  )
`;

function stampActivity(ticket: Ticket, action: string, oldValue: string | null, newValue: string | null, user: Profile) {
  ticket.activity = [
    ...(ticket.activity ?? []),
    {
      id: crypto.randomUUID(),
      ticket_id: ticket.id,
      action,
      old_value: oldValue,
      new_value: newValue,
      user_id: user.id,
      created_at: new Date().toISOString(),
      user,
    },
  ];
}

function sortTickets(tickets: Ticket[]) {
  return [...tickets].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function fetchTickets(limit = 50): Promise<Ticket[]> {
  if (!isSupabaseConfigured || !supabase) return sortTickets(demoTickets);

  const { data, error } = await supabase
    .from("issue_tickets")
    .select(ticketSelect)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const tickets = (data ?? []) as Ticket[];
  await Promise.all(
    tickets.map(async (ticket) => {
      ticket.attachments = await Promise.all(
        (ticket.attachments ?? []).map(async (attachment) => ({
          ...attachment,
          signed_url: await createSignedAttachmentUrl(attachment.file_path),
        })),
      );
    }),
  );

  return tickets;
}

export async function createTicket(input: CreateTicketInput, user: Profile): Promise<Ticket> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    const id = `SD-${Math.floor(1050 + Math.random() * 8000)}`;
    const ticket: Ticket = {
      id,
      title: input.title,
      description: input.description || null,
      category: input.category,
      priority: input.priority,
      status: input.assigned_to ? "assigned" : "open",
      created_by: user.id,
      assigned_to: input.assigned_to || null,
      module: input.module || null,
      dependency_note: input.dependency_note || null,
      created_at: now,
      updated_at: now,
      fixed_at: null,
      verified_at: null,
      reporter: user,
      assignee: null,
      comments: [],
      attachments: [],
      activity: [],
    };

    for (const file of input.attachments ?? []) {
      const attachment = await uploadTicketAttachment(id, file, user.id);
      ticket.attachments?.push({
        id: crypto.randomUUID(),
        ticket_id: id,
        uploaded_by: user.id,
        created_at: now,
        signed_url: attachment.file_path,
        ...attachment,
      });
    }

    stampActivity(ticket, "created", null, ticket.status, user);
    return ticket;
  }

  const { data, error } = await supabase
    .from("issue_tickets")
    .insert({
      title: input.title,
      description: input.description || null,
      category: input.category,
      priority: input.priority,
      status: input.assigned_to ? "assigned" : "open",
      created_by: user.id,
      assigned_to: input.assigned_to || null,
      module: input.module || null,
      dependency_note: input.dependency_note || null,
    })
    .select(ticketSelect)
    .single();

  if (error) throw error;

  const ticket = data as Ticket;
  const attachments = input.attachments ?? [];

  for (const file of attachments.slice(0, 3)) {
    const attachment = await uploadTicketAttachment(ticket.id, file, user.id);
    const { error: attachmentError } = await supabase.from("issue_attachments").insert({
      ticket_id: ticket.id,
      uploaded_by: user.id,
      ...attachment,
    });

    if (attachmentError) throw attachmentError;
  }

  return (await fetchTickets()).find((item) => item.id === ticket.id) ?? ticket;
}

export async function updateTicket(
  ticket: Ticket,
  updates: Partial<Pick<Ticket, "status" | "assigned_to" | "priority" | "dependency_note" | "category">>,
  user: Profile,
): Promise<Ticket> {
  const now = new Date().toISOString();
  const fixedAt = updates.status === "fixed" ? now : updates.status ? ticket.fixed_at : undefined;
  const verifiedAt = updates.status === "verified" ? now : updates.status ? ticket.verified_at : undefined;

  if (!isSupabaseConfigured || !supabase) {
    const next: Ticket = {
      ...ticket,
      ...updates,
      updated_at: now,
      fixed_at: fixedAt ?? ticket.fixed_at,
      verified_at: verifiedAt ?? ticket.verified_at,
    };

    if (updates.status && updates.status !== ticket.status) {
      stampActivity(next, "status", ticket.status, updates.status, user);
    }
    if (updates.assigned_to !== undefined && updates.assigned_to !== ticket.assigned_to) {
      stampActivity(next, "assigned_to", ticket.assigned_to ?? null, updates.assigned_to ?? null, user);
    }
    if (updates.priority && updates.priority !== ticket.priority) {
      stampActivity(next, "priority", ticket.priority, updates.priority, user);
    }

    return next;
  }

  const { data, error } = await supabase
    .from("issue_tickets")
    .update({
      ...updates,
      fixed_at: fixedAt,
      verified_at: verifiedAt,
    })
    .eq("id", ticket.id)
    .select(ticketSelect)
    .single();

  if (error) throw error;
  return data as Ticket;
}

export async function addComment(
  ticket: Ticket,
  comment: string,
  user: Profile,
  taggedUserId?: string,
): Promise<TicketComment> {
  const newComment: TicketComment = {
    id: crypto.randomUUID(),
    ticket_id: ticket.id,
    user_id: user.id,
    comment,
    tagged_user_id: taggedUserId || null,
    created_at: new Date().toISOString(),
    user,
  };

  if (!isSupabaseConfigured || !supabase) return newComment;

  const { data, error } = await supabase
    .from("issue_comments")
    .insert({
      ticket_id: ticket.id,
      user_id: user.id,
      comment,
      tagged_user_id: taggedUserId || null,
    })
    .select(
      `
      *,
      user:profiles!issue_comments_user_id_fkey(*),
      tagged_user:profiles!issue_comments_tagged_user_id_fkey(*)
    `,
    )
    .single();

  if (error) throw error;
  return data as TicketComment;
}

export function getTicketMetrics(tickets: Ticket[]) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const unresolved = tickets.filter((ticket) => !["verified", "closed"].includes(ticket.status));

  return {
    open: tickets.filter((ticket) => ["open", "assigned", "in_progress"].includes(ticket.status)).length,
    blocked: tickets.filter((ticket) => ticket.status === "blocked").length,
    fixedThisWeek: tickets.filter(
      (ticket) => ticket.fixed_at && new Date(ticket.fixed_at).getTime() >= weekAgo,
    ).length,
    waitingVerification: tickets.filter((ticket) => ticket.status === "fixed").length,
    oldestUnresolved: unresolved.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0],
  };
}

export function isStatus(value: string): value is TicketStatus {
  return ["open", "assigned", "in_progress", "blocked", "fixed", "verified", "closed"].includes(value);
}

export function isPriority(value: string): value is TicketPriority {
  return ["low", "medium", "high", "blocker"].includes(value);
}
