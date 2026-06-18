import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTicket, deleteTicket, fetchTickets, updateTicket } from "../lib/tickets";
import type { CreateTicketInput, Ticket } from "../types/ticket";
import type { Profile } from "../types/user";
import { ticketKeys } from "./keys";

export function useTickets(limit: number, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.list(limit),
    queryFn: () => fetchTickets(limit),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, profile }: { input: CreateTicketInput; profile: Profile }) =>
      createTicket(input, profile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticket,
      updates,
      user,
    }: {
      ticket: Ticket;
      updates: Parameters<typeof updateTicket>[1];
      user: Profile;
    }) => updateTicket(ticket, updates, user),
    onMutate: async ({ ticket, updates }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.all });
      const snapshots = qc.getQueriesData<Ticket[]>({ queryKey: ticketKeys.all });
      qc.setQueriesData<Ticket[]>(
        { queryKey: ticketKeys.all },
        (old) => old?.map((t) => (t.id === ticket.id ? { ...t, ...updates } : t)),
      );
      return { snapshots };
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (updated) => {
      qc.setQueriesData<Ticket[]>(
        { queryKey: ticketKeys.all },
        (old) => old?.map((t) => (t.id === updated.id ? updated : t)),
      );
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTicket(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ticketKeys.all });
      const snapshots = qc.getQueriesData<Ticket[]>({ queryKey: ticketKeys.all });
      qc.setQueriesData<Ticket[]>(
        { queryKey: ticketKeys.all },
        (old) => old?.filter((t) => t.id !== id),
      );
      return { snapshots };
    },
    onError: (_, __, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}
