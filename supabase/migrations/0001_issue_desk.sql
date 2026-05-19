create extension if not exists pgcrypto;

create type public.issue_user_role as enum (
  'reporter',
  'developer',
  'admin',
  'supreme_leader'
);

create type public.issue_status as enum (
  'open',
  'assigned',
  'in_progress',
  'blocked',
  'fixed',
  'verified',
  'closed'
);

create type public.issue_category as enum (
  'design',
  'frontend',
  'backend',
  'ai_agent',
  'infra',
  'data',
  'copy',
  'other'
);

create type public.issue_priority as enum (
  'low',
  'medium',
  'high',
  'blocker'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_url text,
  role public.issue_user_role not null default 'reporter',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issue_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  category public.issue_category not null,
  priority public.issue_priority not null default 'medium',
  status public.issue_status not null default 'open',
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  module text,
  dependency_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fixed_at timestamptz,
  verified_at timestamptz
);

create table public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.issue_tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null check (char_length(trim(comment)) > 0),
  tagged_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.issue_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.issue_tickets(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  file_type text not null check (file_type in ('image/png', 'image/jpeg', 'image/jpg', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 5242880),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.issue_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.issue_tickets(id) on delete cascade,
  action text not null,
  old_value text,
  new_value text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index issue_tickets_status_idx on public.issue_tickets(status);
create index issue_tickets_assigned_to_idx on public.issue_tickets(assigned_to);
create index issue_tickets_created_by_idx on public.issue_tickets(created_by);
create index issue_tickets_category_idx on public.issue_tickets(category);
create index issue_tickets_priority_idx on public.issue_tickets(priority);
create index issue_tickets_created_at_idx on public.issue_tickets(created_at desc);
create index issue_tickets_updated_at_idx on public.issue_tickets(updated_at desc);
create index issue_comments_ticket_id_idx on public.issue_comments(ticket_id, created_at);
create index issue_attachments_ticket_id_idx on public.issue_attachments(ticket_id);
create index issue_activity_ticket_id_idx on public.issue_activity(ticket_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger issue_tickets_set_updated_at
before update on public.issue_tickets
for each row execute function public.set_updated_at();

create or replace function public.is_issue_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'supreme_leader')
  );
$$;

create or replace function public.can_view_issue_ticket(ticket_id uuid)
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

create or replace function public.log_issue_ticket_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.issue_activity(ticket_id, action, old_value, new_value, user_id)
    values (new.id, 'created', null, new.status::text, auth.uid());
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.issue_activity(ticket_id, action, old_value, new_value, user_id)
    values (new.id, 'status', old.status::text, new.status::text, auth.uid());
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    insert into public.issue_activity(ticket_id, action, old_value, new_value, user_id)
    values (new.id, 'assigned_to', old.assigned_to::text, new.assigned_to::text, auth.uid());
  end if;

  if old.priority is distinct from new.priority then
    insert into public.issue_activity(ticket_id, action, old_value, new_value, user_id)
    values (new.id, 'priority', old.priority::text, new.priority::text, auth.uid());
  end if;

  return new;
end;
$$;

create trigger issue_tickets_log_activity_insert
after insert on public.issue_tickets
for each row execute function public.log_issue_ticket_activity();

create trigger issue_tickets_log_activity_update
after update of status, assigned_to, priority on public.issue_tickets
for each row execute function public.log_issue_ticket_activity();

alter table public.profiles enable row level security;
alter table public.issue_tickets enable row level security;
alter table public.issue_comments enable row level security;
alter table public.issue_attachments enable row level security;
alter table public.issue_activity enable row level security;

create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users can create tickets"
on public.issue_tickets for insert
to authenticated
with check (created_by = auth.uid());

create policy "Users can view accessible tickets"
on public.issue_tickets for select
to authenticated
using (
  public.is_issue_admin()
  or created_by = auth.uid()
  or assigned_to = auth.uid()
);

create policy "Users can update accessible tickets"
on public.issue_tickets for update
to authenticated
using (public.can_view_issue_ticket(id))
with check (public.can_view_issue_ticket(id));

create policy "Users can comment on visible tickets"
on public.issue_comments for insert
to authenticated
with check (user_id = auth.uid() and public.can_view_issue_ticket(ticket_id));

create policy "Users can view comments on visible tickets"
on public.issue_comments for select
to authenticated
using (public.can_view_issue_ticket(ticket_id));

create policy "Users can insert attachments on visible tickets"
on public.issue_attachments for insert
to authenticated
with check (uploaded_by = auth.uid() and public.can_view_issue_ticket(ticket_id));

create policy "Users can view attachments on visible tickets"
on public.issue_attachments for select
to authenticated
using (public.can_view_issue_ticket(ticket_id));

create policy "Users can view activity on visible tickets"
on public.issue_activity for select
to authenticated
using (public.can_view_issue_ticket(ticket_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stilldesk-attachments',
  'stilldesk-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stilldesk-avatars',
  'stilldesk-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

create policy "Users can upload screenshots for visible tickets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'stilldesk-attachments'
  and public.can_view_issue_ticket((storage.foldername(name))[1]::uuid)
);

create policy "Users can read screenshots for visible tickets"
on storage.objects for select
to authenticated
using (
  bucket_id = 'stilldesk-attachments'
  and public.can_view_issue_ticket((storage.foldername(name))[1]::uuid)
);

create policy "Users can upload their avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'stilldesk-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'stilldesk-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Avatar images are public"
on storage.objects for select
to public
using (bucket_id = 'stilldesk-avatars');
