-- Internal team launch hardening.
-- StillDesk is intended for a small authenticated team: everyone can see bugs,
-- but only reporters, assignees, and admins can change ticket ownership/status.

create or replace function public.can_view_issue_ticket(ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

create or replace function public.can_update_issue_ticket(ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issue_tickets ticket
    where ticket.id = ticket_id
      and (
        public.is_issue_admin()
        or ticket.created_by = auth.uid()
        or ticket.assigned_to = auth.uid()
      )
  );
$$;

drop policy if exists "Users can view accessible tickets" on public.issue_tickets;
create policy "Authenticated users can view team tickets"
on public.issue_tickets for select
to authenticated
using (true);

drop policy if exists "Users can update accessible tickets" on public.issue_tickets;
create policy "Reporters assignees and admins can update tickets"
on public.issue_tickets for update
to authenticated
using (public.can_update_issue_ticket(id))
with check (auth.uid() is not null);

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_issue_admin() then
    raise exception 'Only admins can change roles';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create policy "Admins can update team profiles"
on public.profiles for update
to authenticated
using (public.is_issue_admin())
with check (public.is_issue_admin());

create or replace function public.enforce_issue_attachment_limit()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.issue_attachments
    where ticket_id = new.ticket_id
  ) >= 3 then
    raise exception 'A ticket can have at most 3 attachments';
  end if;

  return new;
end;
$$;

drop trigger if exists issue_attachments_limit on public.issue_attachments;
create trigger issue_attachments_limit
before insert on public.issue_attachments
for each row execute function public.enforce_issue_attachment_limit();

alter table public.issue_tickets
drop constraint if exists issue_tickets_blocked_dependency_note_check;

alter table public.issue_tickets
add constraint issue_tickets_blocked_dependency_note_check
check (
  status <> 'blocked'
  or char_length(trim(coalesce(dependency_note, ''))) > 0
);
