-- 0005 — Jira-like project management layer for StillDesk
--
-- Adds workspaces, projects, boards, sprints, typed issues, labels, components,
-- versions, and issue links. Existing issue_tickets remain unchanged; link via
-- issues.legacy_ticket_id or run migrate_legacy_tickets(project_id).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'admin', 'member');

create type public.project_role as enum ('admin', 'member', 'viewer');

create type public.pm_issue_type as enum (
  'epic',
  'story',
  'task',
  'bug',
  'sub_task'
);

create type public.pm_issue_priority as enum (
  'lowest',
  'low',
  'medium',
  'high',
  'highest'
);

create type public.workflow_status_category as enum (
  'backlog',
  'todo',
  'in_progress',
  'done'
);

create type public.board_type as enum ('kanban', 'scrum');

create type public.sprint_state as enum ('future', 'active', 'closed');

create type public.issue_link_type as enum (
  'blocks',
  'is_blocked_by',
  'relates',
  'duplicates',
  'clones'
);

-- ---------------------------------------------------------------------------
-- Workspaces & projects
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null check (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
  name text not null check (char_length(trim(name)) > 0),
  description text,
  lead_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.project_issue_counters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  last_number integer not null default 0 check (last_number >= 0)
);

-- ---------------------------------------------------------------------------
-- Workflow, boards, sprints
-- ---------------------------------------------------------------------------

create table public.workflow_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(trim(name)) > 0),
  category public.workflow_status_category not null default 'todo',
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create unique index workflow_statuses_one_default_per_project_idx
  on public.workflow_statuses (project_id)
  where is_default;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  board_type public.board_type not null default 'kanban',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index boards_one_default_per_project_idx
  on public.boards (project_id)
  where is_default;

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  workflow_status_id uuid not null references public.workflow_statuses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  sort_order integer not null default 0,
  wip_limit integer check (wip_limit is null or wip_limit > 0),
  unique (board_id, workflow_status_id)
);

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  goal text,
  state public.sprint_state not null default 'future',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  )
);

create unique index sprints_one_active_per_project_idx
  on public.sprints (project_id)
  where state = 'active';

-- ---------------------------------------------------------------------------
-- Issues (Jira work items)
-- ---------------------------------------------------------------------------

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_number integer not null check (issue_number > 0),
  issue_type public.pm_issue_type not null default 'task',
  title text not null check (char_length(trim(title)) > 0),
  description text,
  status_id uuid not null references public.workflow_statuses(id) on delete restrict,
  priority public.pm_issue_priority not null default 'medium',
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  assignee_id uuid references public.profiles(id) on delete set null,
  parent_issue_id uuid references public.issues(id) on delete cascade,
  epic_id uuid references public.issues(id) on delete set null,
  sprint_id uuid references public.sprints(id) on delete set null,
  story_points numeric(6, 2) check (story_points is null or story_points >= 0),
  rank_key text not null default 'm',
  legacy_ticket_id uuid unique references public.issue_tickets(id) on delete set null,
  -- StillDesk category mapping (optional; mirrors issue_tickets.category)
  legacy_category public.issue_category,
  dependency_note text,
  blocked_by_issue_id uuid references public.issues(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (project_id, issue_number),
  check (parent_issue_id is null or parent_issue_id <> id),
  check (epic_id is null or epic_id <> id),
  check (blocked_by_issue_id is null or blocked_by_issue_id <> id)
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#6b7280' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.issue_labels (
  issue_id uuid not null references public.issues(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (issue_id, label_id)
);

create table public.components (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  lead_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.issue_components (
  issue_id uuid not null references public.issues(id) on delete cascade,
  component_id uuid not null references public.components(id) on delete cascade,
  primary key (issue_id, component_id)
);

create table public.versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  release_date date,
  released boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.issue_fix_versions (
  issue_id uuid not null references public.issues(id) on delete cascade,
  version_id uuid not null references public.versions(id) on delete cascade,
  primary key (issue_id, version_id)
);

create table public.issue_links (
  id uuid primary key default gen_random_uuid(),
  source_issue_id uuid not null references public.issues(id) on delete cascade,
  target_issue_id uuid not null references public.issues(id) on delete cascade,
  link_type public.issue_link_type not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (source_issue_id, target_issue_id, link_type),
  check (source_issue_id <> target_issue_id)
);

create table public.issue_watchers (
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

-- Comments, attachments, activity for Jira issues (parallel to issue_* tables)
create table public.pm_issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  tagged_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pm_issue_attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 10485760),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.pm_issue_activity (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  action text not null,
  field_name text,
  old_value text,
  new_value text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index workspaces_slug_idx on public.workspaces(slug);
create index projects_workspace_id_idx on public.projects(workspace_id);
create index projects_key_idx on public.projects(key);
create index workflow_statuses_project_sort_idx on public.workflow_statuses(project_id, sort_order);
create index boards_project_id_idx on public.boards(project_id);
create index sprints_project_state_idx on public.sprints(project_id, state);
create index issues_project_id_idx on public.issues(project_id);
create index issues_status_id_idx on public.issues(status_id);
create index issues_assignee_id_idx on public.issues(assignee_id);
create index issues_reporter_id_idx on public.issues(reporter_id);
create index issues_sprint_id_idx on public.issues(sprint_id);
create index issues_epic_id_idx on public.issues(epic_id);
create index issues_parent_issue_id_idx on public.issues(parent_issue_id);
create index issues_legacy_ticket_id_idx on public.issues(legacy_ticket_id);
create index issue_links_source_idx on public.issue_links(source_issue_id);
create index issue_links_target_idx on public.issue_links(target_issue_id);
create index pm_issue_comments_issue_id_idx on public.pm_issue_comments(issue_id, created_at);
create index pm_issue_attachments_issue_id_idx on public.pm_issue_attachments(issue_id);
create index pm_issue_activity_issue_id_idx on public.pm_issue_activity(issue_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger boards_set_updated_at
before update on public.boards
for each row execute function public.set_updated_at();

create trigger sprints_set_updated_at
before update on public.sprints
for each row execute function public.set_updated_at();

create trigger issues_set_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

create trigger pm_issue_comments_set_updated_at
before update on public.pm_issue_comments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Issue key helper view
-- ---------------------------------------------------------------------------

create or replace view public.issues_with_key as
select
  i.*,
  p.key || '-' || i.issue_number::text as issue_key
from public.issues i
join public.projects p on p.id = i.project_id;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.projects pr
    join public.workspace_members wm on wm.workspace_id = pr.workspace_id
    where pr.id = p_project_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project_issues(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_issue_admin()
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin', 'member')
  )
  or exists (
    select 1
    from public.projects pr
    join public.workspace_members wm on wm.workspace_id = pr.workspace_id
    where pr.id = p_project_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.can_view_issue(p_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.issues i
    where i.id = p_issue_id
      and public.is_project_member(i.project_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Project bootstrap: statuses, board, counter
-- ---------------------------------------------------------------------------

create or replace function public.seed_project_defaults(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_status record;
begin
  insert into public.project_issue_counters(project_id, last_number)
  values (p_project_id, 0)
  on conflict (project_id) do nothing;

  insert into public.workflow_statuses (project_id, key, name, category, sort_order, is_default)
  values
    (p_project_id, 'backlog', 'Backlog', 'backlog', 0, false),
    (p_project_id, 'todo', 'To Do', 'todo', 10, true),
    (p_project_id, 'in_progress', 'In Progress', 'in_progress', 20, false),
    (p_project_id, 'in_review', 'In Review', 'in_progress', 30, false),
    (p_project_id, 'done', 'Done', 'done', 40, false)
  on conflict (project_id, key) do nothing;

  if not exists (
    select 1 from public.boards where project_id = p_project_id and is_default
  ) then
    insert into public.boards (project_id, name, board_type, is_default)
    values (p_project_id, 'Main board', 'kanban', true)
    returning id into v_board_id;
  else
    select id into v_board_id
    from public.boards
    where project_id = p_project_id and is_default
    limit 1;
  end if;

  if v_board_id is not null then
    for v_status in
      select id, name, sort_order
      from public.workflow_statuses
      where project_id = p_project_id
      order by sort_order
    loop
      insert into public.board_columns (board_id, workflow_status_id, name, sort_order)
      values (v_board_id, v_status.id, v_status.name, v_status.sort_order)
      on conflict (board_id, workflow_status_id) do nothing;
    end loop;
  end if;
end;
$$;

create or replace function public.on_project_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;

  if new.lead_id is not null and new.lead_id <> new.created_by then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, new.lead_id, 'admin')
    on conflict do nothing;
  end if;

  perform public.seed_project_defaults(new.id);
  return new;
end;
$$;

create trigger projects_after_insert
after insert on public.projects
for each row execute function public.on_project_created();

-- ---------------------------------------------------------------------------
-- Issue number allocation
-- ---------------------------------------------------------------------------

create or replace function public.allocate_issue_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if new.issue_number is not null and new.issue_number > 0 then
    return new;
  end if;

  insert into public.project_issue_counters (project_id, last_number)
  values (new.project_id, 1)
  on conflict (project_id) do update
    set last_number = public.project_issue_counters.last_number + 1
  returning last_number into v_next;

  new.issue_number := v_next;
  return new;
end;
$$;

create trigger issues_allocate_number
before insert on public.issues
for each row execute function public.allocate_issue_number();

-- Default status when omitted
create or replace function public.set_issue_default_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_id is null then
    select id into new.status_id
    from public.workflow_statuses
    where project_id = new.project_id and is_default
    limit 1;

    if new.status_id is null then
      select id into new.status_id
      from public.workflow_statuses
      where project_id = new.project_id
      order by sort_order
      limit 1;
    end if;
  end if;

  return new;
end;
$$;

create trigger issues_set_default_status
before insert on public.issues
for each row execute function public.set_issue_default_status();

-- Activity logging
create or replace function public.log_pm_issue_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pm_issue_activity(issue_id, action, field_name, old_value, new_value, user_id)
    values (new.id, 'created', 'status', null, new.status_id::text, auth.uid());
    return new;
  end if;

  if old.status_id is distinct from new.status_id then
    insert into public.pm_issue_activity(issue_id, action, field_name, old_value, new_value, user_id)
    values (new.id, 'updated', 'status', old.status_id::text, new.status_id::text, auth.uid());

    if exists (
      select 1 from public.workflow_statuses ws
      where ws.id = new.status_id and ws.category = 'done'
    ) then
      new.resolved_at := coalesce(new.resolved_at, now());
    end if;
  end if;

  if old.assignee_id is distinct from new.assignee_id then
    insert into public.pm_issue_activity(issue_id, action, field_name, old_value, new_value, user_id)
    values (new.id, 'updated', 'assignee', old.assignee_id::text, new.assignee_id::text, auth.uid());
  end if;

  if old.priority is distinct from new.priority then
    insert into public.pm_issue_activity(issue_id, action, field_name, old_value, new_value, user_id)
    values (new.id, 'updated', 'priority', old.priority::text, new.priority::text, auth.uid());
  end if;

  if old.sprint_id is distinct from new.sprint_id then
    insert into public.pm_issue_activity(issue_id, action, field_name, old_value, new_value, user_id)
    values (new.id, 'updated', 'sprint', old.sprint_id::text, new.sprint_id::text, auth.uid());
  end if;

  return new;
end;
$$;

create trigger issues_log_activity_insert
after insert on public.issues
for each row execute function public.log_pm_issue_activity();

create trigger issues_log_activity_update
after update of status_id, assignee_id, priority, sprint_id on public.issues
for each row execute function public.log_pm_issue_activity();

-- ---------------------------------------------------------------------------
-- Migrate legacy issue_tickets into a project (run once per project)
-- ---------------------------------------------------------------------------

create or replace function public.migrate_legacy_tickets(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_ticket record;
  v_status_id uuid;
  v_priority public.pm_issue_priority;
begin
  if not public.can_edit_project_issues(p_project_id) and not public.is_issue_admin() then
    raise exception 'Not allowed to migrate tickets into this project';
  end if;

  select id into v_status_id
  from public.workflow_statuses
  where project_id = p_project_id and key = 'todo'
  limit 1;

  for v_ticket in
    select *
    from public.issue_tickets t
    where not exists (
      select 1 from public.issues i where i.legacy_ticket_id = t.id
    )
  loop
    v_priority := case v_ticket.priority
      when 'low' then 'low'::public.pm_issue_priority
      when 'medium' then 'medium'::public.pm_issue_priority
      when 'high' then 'high'::public.pm_issue_priority
      when 'blocker' then 'highest'::public.pm_issue_priority
      else 'medium'::public.pm_issue_priority
    end;

    insert into public.issues (
      project_id,
      issue_type,
      title,
      description,
      status_id,
      priority,
      reporter_id,
      assignee_id,
      legacy_ticket_id,
      legacy_category,
      dependency_note,
      created_at,
      updated_at,
      resolved_at
    )
    values (
      p_project_id,
      case when v_ticket.category = 'other' then 'task' else 'bug' end::public.pm_issue_type,
      v_ticket.title,
      v_ticket.description,
      coalesce(
        (
          select ws.id
          from public.workflow_statuses ws
          where ws.project_id = p_project_id
            and ws.key = case v_ticket.status
              when 'open' then 'todo'
              when 'assigned' then 'todo'
              when 'in_progress' then 'in_progress'
              when 'blocked' then 'in_progress'
              when 'fixed' then 'in_review'
              when 'verified' then 'done'
              when 'closed' then 'done'
              else 'todo'
            end
          limit 1
        ),
        v_status_id
      ),
      v_priority,
      v_ticket.created_by,
      v_ticket.assigned_to,
      v_ticket.id,
      v_ticket.category,
      v_ticket.dependency_note,
      v_ticket.created_at,
      v_ticket.updated_at,
      coalesce(v_ticket.verified_at, v_ticket.fixed_at)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workspace bootstrap on insert
-- ---------------------------------------------------------------------------

create or replace function public.on_workspace_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger workspaces_after_insert
after insert on public.workspaces
for each row execute function public.on_workspace_created();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_issue_counters enable row level security;
alter table public.workflow_statuses enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.sprints enable row level security;
alter table public.issues enable row level security;
alter table public.labels enable row level security;
alter table public.issue_labels enable row level security;
alter table public.components enable row level security;
alter table public.issue_components enable row level security;
alter table public.versions enable row level security;
alter table public.issue_fix_versions enable row level security;
alter table public.issue_links enable row level security;
alter table public.issue_watchers enable row level security;
alter table public.pm_issue_comments enable row level security;
alter table public.pm_issue_attachments enable row level security;
alter table public.pm_issue_activity enable row level security;

-- Workspaces
create policy "workspace_members_can_view_workspaces"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id) or public.is_issue_admin());

create policy "authenticated_users_can_create_workspaces"
on public.workspaces for insert to authenticated
with check (created_by = auth.uid());

create policy "workspace_admins_can_update_workspaces"
on public.workspaces for update to authenticated
using (public.is_workspace_admin(id) or public.is_issue_admin())
with check (public.is_workspace_admin(id) or public.is_issue_admin());

-- Workspace members
create policy "workspace_members_can_view_members"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id) or public.is_issue_admin());

create policy "workspace_admins_manage_members"
on public.workspace_members for all to authenticated
using (public.is_workspace_admin(workspace_id) or public.is_issue_admin())
with check (public.is_workspace_admin(workspace_id) or public.is_issue_admin());

-- Projects
create policy "project_members_can_view_projects"
on public.projects for select to authenticated
using (public.is_project_member(id) or public.is_issue_admin());

create policy "workspace_members_can_create_projects"
on public.projects for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_workspace_member(workspace_id)
);

create policy "project_admins_can_update_projects"
on public.projects for update to authenticated
using (public.can_edit_project_issues(id) or public.is_issue_admin())
with check (public.can_edit_project_issues(id) or public.is_issue_admin());

-- Project members
create policy "project_members_can_view_project_members"
on public.project_members for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_admins_manage_project_members"
on public.project_members for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

-- Counters (internal; visible to project members)
create policy "project_members_can_view_counters"
on public.project_issue_counters for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

-- Workflow & boards
create policy "project_members_view_workflow_statuses"
on public.workflow_statuses for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_admins_manage_workflow_statuses"
on public.workflow_statuses for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

create policy "project_members_view_boards"
on public.boards for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_admins_manage_boards"
on public.boards for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

create policy "project_members_view_board_columns"
on public.board_columns for select to authenticated
using (
  exists (
    select 1 from public.boards b
    where b.id = board_id and public.is_project_member(b.project_id)
  )
  or public.is_issue_admin()
);

create policy "project_admins_manage_board_columns"
on public.board_columns for all to authenticated
using (
  exists (
    select 1 from public.boards b
    where b.id = board_id and public.can_edit_project_issues(b.project_id)
  )
  or public.is_issue_admin()
)
with check (
  exists (
    select 1 from public.boards b
    where b.id = board_id and public.can_edit_project_issues(b.project_id)
  )
  or public.is_issue_admin()
);

-- Sprints
create policy "project_members_view_sprints"
on public.sprints for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_editors_manage_sprints"
on public.sprints for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

-- Issues
create policy "project_members_view_issues"
on public.issues for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_editors_create_issues"
on public.issues for insert to authenticated
with check (
  reporter_id = auth.uid()
  and (public.can_edit_project_issues(project_id) or public.is_issue_admin())
);

create policy "project_editors_update_issues"
on public.issues for update to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

create policy "project_admins_delete_issues"
on public.issues for delete to authenticated
using (public.is_issue_admin() or exists (
  select 1 from public.project_members pm
  where pm.project_id = issues.project_id
    and pm.user_id = auth.uid()
    and pm.role = 'admin'
));

-- Labels, components, versions
create policy "project_members_view_labels"
on public.labels for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_editors_manage_labels"
on public.labels for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

create policy "project_members_view_components"
on public.components for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_editors_manage_components"
on public.components for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

create policy "project_members_view_versions"
on public.versions for select to authenticated
using (public.is_project_member(project_id) or public.is_issue_admin());

create policy "project_editors_manage_versions"
on public.versions for all to authenticated
using (public.can_edit_project_issues(project_id) or public.is_issue_admin())
with check (public.can_edit_project_issues(project_id) or public.is_issue_admin());

-- Junction tables (issue-scoped)
create policy "project_members_manage_issue_labels"
on public.issue_labels for all to authenticated
using (public.can_view_issue(issue_id))
with check (public.can_edit_project_issues((select project_id from public.issues where id = issue_id)));

create policy "project_members_manage_issue_components"
on public.issue_components for all to authenticated
using (public.can_view_issue(issue_id))
with check (public.can_edit_project_issues((select project_id from public.issues where id = issue_id)));

create policy "project_members_manage_issue_fix_versions"
on public.issue_fix_versions for all to authenticated
using (public.can_view_issue(issue_id))
with check (public.can_edit_project_issues((select project_id from public.issues where id = issue_id)));

create policy "project_members_view_issue_links"
on public.issue_links for select to authenticated
using (public.can_view_issue(source_issue_id) and public.can_view_issue(target_issue_id));

create policy "project_editors_manage_issue_links"
on public.issue_links for insert to authenticated
with check (
  created_by = auth.uid()
  and public.can_view_issue(source_issue_id)
  and public.can_view_issue(target_issue_id)
  and public.can_edit_project_issues((select project_id from public.issues where id = source_issue_id))
);

create policy "project_editors_delete_issue_links"
on public.issue_links for delete to authenticated
using (public.can_edit_project_issues((select project_id from public.issues where id = source_issue_id)));

create policy "users_manage_own_watchers"
on public.issue_watchers for all to authenticated
using (user_id = auth.uid() or public.can_view_issue(issue_id))
with check (user_id = auth.uid());

-- Comments, attachments, activity
create policy "project_members_view_pm_comments"
on public.pm_issue_comments for select to authenticated
using (public.can_view_issue(issue_id));

create policy "users_create_pm_comments"
on public.pm_issue_comments for insert to authenticated
with check (user_id = auth.uid() and public.can_view_issue(issue_id));

create policy "users_update_own_pm_comments"
on public.pm_issue_comments for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "project_members_view_pm_attachments"
on public.pm_issue_attachments for select to authenticated
using (public.can_view_issue(issue_id));

create policy "users_upload_pm_attachments"
on public.pm_issue_attachments for insert to authenticated
with check (uploaded_by = auth.uid() and public.can_view_issue(issue_id));

create policy "project_members_view_pm_activity"
on public.pm_issue_activity for select to authenticated
using (public.can_view_issue(issue_id));

-- Storage bucket for Jira-style issue attachments (broader MIME than screenshots)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stilldesk-issue-files',
  'stilldesk-issue-files',
  false,
  10485760,
  array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'application/json'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'application/pdf',
    'text/plain',
    'application/json'
  ];

create or replace function public.can_view_pm_issue_from_storage(path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_issue((storage.foldername(path))[1]::uuid);
$$;

create policy "Users can upload files for visible pm issues"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'stilldesk-issue-files'
  and public.can_view_pm_issue_from_storage(name)
);

create policy "Users can read files for visible pm issues"
on storage.objects for select to authenticated
using (
  bucket_id = 'stilldesk-issue-files'
  and public.can_view_pm_issue_from_storage(name)
);

grant select on public.issues_with_key to authenticated;
