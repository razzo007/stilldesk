-- 0004 — ticket links and admin delete
--
-- Adds:
--   • blocked_by_id: nullable self-reference so a blocked ticket can point to
--     the ticket blocking it (navigable link, not just free text)
--   • index on blocked_by_id for fast reverse-lookup
--   • RLS policy allowing admins and supreme_leaders to hard-delete tickets

alter table public.issue_tickets
  add column if not exists blocked_by_id uuid references public.issue_tickets(id) on delete set null;

create index if not exists idx_issue_tickets_blocked_by_id
  on public.issue_tickets(blocked_by_id);

-- Allow leaders to delete tickets. Reporters and developers cannot.
create policy "leaders_can_delete_tickets"
  on public.issue_tickets
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'supreme_leader')
    )
  );
