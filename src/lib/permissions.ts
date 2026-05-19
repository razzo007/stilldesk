import type { Profile } from "../types/user";
import type { Ticket } from "../types/ticket";

export function isLeader(profile: Profile | null | undefined) {
  return profile?.role === "admin" || profile?.role === "supreme_leader";
}

export function canViewTicket(profile: Profile, ticket: Ticket) {
  void ticket;
  return Boolean(profile);
}

export function canEditTicket(profile: Profile | null | undefined, ticket?: Ticket | null) {
  if (!profile || !ticket) return false;
  return isLeader(profile) || ticket.created_by === profile.id || ticket.assigned_to === profile.id;
}

export function canAssignTicket(profile: Profile | null | undefined, ticket?: Ticket | null) {
  return canEditTicket(profile, ticket);
}

export function canMarkFixed(profile: Profile | null | undefined, ticket?: Ticket | null) {
  if (!profile || !ticket) return false;
  return isLeader(profile) || ticket.assigned_to === profile.id;
}

export function canVerifyTicket(profile: Profile | null | undefined, ticket?: Ticket | null) {
  if (!profile || !ticket) return false;
  return isLeader(profile) || ticket.created_by === profile.id;
}

export function canCloseTicket(profile: Profile | null | undefined) {
  return isLeader(profile);
}

export function canReopenTicket(profile: Profile | null | undefined, ticket?: Ticket | null) {
  if (!profile || !ticket) return false;
  return isLeader(profile) || ticket.created_by === profile.id || ticket.assigned_to === profile.id;
}
