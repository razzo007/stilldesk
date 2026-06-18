-- 0006 — Authentication, Microsoft SSO, and authorization
--
-- Requires 0005_jira_project_management.sql (workspace_auth_settings FK).
-- Extends profiles with account lifecycle, links auth.identities to app tables,
-- defines platform/workspace SSO policy, permission grants, invitations, and
-- audit logging. Configure Azure in Supabase Dashboard → Auth → Providers → Azure.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.auth_provider as enum ('email', 'azure');

create type public.account_status as enum ('active', 'invited', 'suspended');

create type public.auth_audit_event as enum (
  'sign_in',
  'sign_out',
  'sign_up',
  'identity_linked',
  'identity_unlinked',
  'password_reset_requested',
  'invitation_sent',
  'invitation_accepted',
  'role_changed',
  'account_suspended',
  'account_reactivated',
  'access_denied'
);

-- ---------------------------------------------------------------------------
-- Profiles: account lifecycle & SSO metadata
-- ---------------------------------------------------------------------------

alter table public.profiles
add column if not exists account_status public.account_status not null default 'active',
add column if not exists primary_auth_provider public.auth_provider,
add column if not exists email_domain text generated always as (
  lower(split_part(email, '@', 2))
) stored,
add column if not exists invited_by uuid references public.profiles(id) on delete set null,
add column if not exists invited_at timestamptz,
add column if not exists suspended_at timestamptz,
add column if not exists suspended_reason text,
add column if not exists last_login_at timestamptz,
add column if not exists login_count integer not null default 0 check (login_count >= 0);

create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists profiles_email_domain_idx on public.profiles(email_domain);
create index if not exists profiles_primary_auth_provider_idx on public.profiles(primary_auth_provider);

-- ---------------------------------------------------------------------------
-- Platform-wide auth policy (single-tenant / default StillDesk team)
-- ---------------------------------------------------------------------------

create table public.platform_auth_settings (
  id smallint primary key default 1 check (id = 1),
  allowed_email_domains text[] not null default '{}'::text[],
  enforce_microsoft_sso boolean not null default false,
  allow_email_password boolean not null default true,
  allow_self_registration boolean not null default true,
  microsoft_tenant_id text,
  microsoft_tenant_ids text[] not null default '{}'::text[],
  auto_promote_admin_emails text[] not null default '{}'::text[],
  session_max_age_hours integer not null default 168 check (session_max_age_hours between 1 and 720),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_auth_settings (id)
values (1)
on conflict (id) do nothing;

-- Per-workspace overrides (Jira / multi-team)
create table public.workspace_auth_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  allowed_email_domains text[] not null default '{}'::text[],
  enforce_microsoft_sso boolean not null default false,
  allow_email_password boolean not null default true,
  allow_self_registration boolean not null default false,
  microsoft_tenant_id text,
  microsoft_tenant_ids text[] not null default '{}'::text[],
  auto_join_workspace boolean not null default true,
  default_workspace_role public.workspace_role not null default 'member',
  default_app_role public.issue_user_role not null default 'reporter',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Linked identities (Microsoft OID, email, etc.)
-- ---------------------------------------------------------------------------

create table public.user_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.auth_provider not null,
  provider_subject text not null,
  provider_tenant_id text,
  email text,
  identity_data jsonb not null default '{}'::jsonb,
  first_linked_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  unique (provider, provider_subject, provider_tenant_id)
);

create index user_auth_identities_user_id_idx on public.user_auth_identities(user_id);
create index user_auth_identities_provider_idx on public.user_auth_identities(provider, provider_subject);

-- ---------------------------------------------------------------------------
-- Invitations (pre-provision before first Microsoft sign-in)
-- ---------------------------------------------------------------------------

create table public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  app_role public.issue_user_role not null default 'reporter',
  workspace_role public.workspace_role,
  project_id uuid references public.projects(id) on delete cascade,
  project_role public.project_role,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index user_invitations_email_pending_idx
  on public.user_invitations(lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Permission catalog (maps to profiles.role)
-- ---------------------------------------------------------------------------

create table public.app_permissions (
  key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permission_grants (
  role public.issue_user_role not null,
  permission_key text not null references public.app_permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into public.app_permissions (key, description) values
  ('profile.read.self', 'Read own profile'),
  ('profile.update.self', 'Update own profile'),
  ('profiles.read', 'View team profiles'),
  ('profiles.manage', 'Manage team profiles and roles'),
  ('tickets.read', 'View tickets'),
  ('tickets.create', 'Create tickets'),
  ('tickets.update.own', 'Update own reported or assigned tickets'),
  ('tickets.update.all', 'Update any ticket'),
  ('tickets.delete', 'Delete tickets'),
  ('tickets.comment', 'Comment on tickets'),
  ('tickets.attach', 'Upload ticket attachments'),
  ('projects.read', 'View projects and issues'),
  ('projects.manage', 'Manage project settings'),
  ('workspaces.manage', 'Manage workspaces and SSO settings'),
  ('auth.settings.manage', 'Manage platform auth and SSO settings'),
  ('invitations.manage', 'Send and revoke user invitations')
on conflict (key) do nothing;

insert into public.role_permission_grants (role, permission_key) values
  ('reporter', 'profile.read.self'),
  ('reporter', 'profile.update.self'),
  ('reporter', 'profiles.read'),
  ('reporter', 'tickets.read'),
  ('reporter', 'tickets.create'),
  ('reporter', 'tickets.update.own'),
  ('reporter', 'tickets.comment'),
  ('reporter', 'tickets.attach'),
  ('reporter', 'projects.read'),
  ('developer', 'profile.read.self'),
  ('developer', 'profile.update.self'),
  ('developer', 'profiles.read'),
  ('developer', 'tickets.read'),
  ('developer', 'tickets.create'),
  ('developer', 'tickets.update.own'),
  ('developer', 'tickets.comment'),
  ('developer', 'tickets.attach'),
  ('developer', 'projects.read'),
  ('admin', 'profile.read.self'),
  ('admin', 'profile.update.self'),
  ('admin', 'profiles.read'),
  ('admin', 'profiles.manage'),
  ('admin', 'tickets.read'),
  ('admin', 'tickets.create'),
  ('admin', 'tickets.update.own'),
  ('admin', 'tickets.update.all'),
  ('admin', 'tickets.delete'),
  ('admin', 'tickets.comment'),
  ('admin', 'tickets.attach'),
  ('admin', 'projects.read'),
  ('admin', 'projects.manage'),
  ('admin', 'workspaces.manage'),
  ('admin', 'invitations.manage'),
  ('supreme_leader', 'profile.read.self'),
  ('supreme_leader', 'profile.update.self'),
  ('supreme_leader', 'profiles.read'),
  ('supreme_leader', 'profiles.manage'),
  ('supreme_leader', 'tickets.read'),
  ('supreme_leader', 'tickets.create'),
  ('supreme_leader', 'tickets.update.own'),
  ('supreme_leader', 'tickets.update.all'),
  ('supreme_leader', 'tickets.delete'),
  ('supreme_leader', 'tickets.comment'),
  ('supreme_leader', 'tickets.attach'),
  ('supreme_leader', 'projects.read'),
  ('supreme_leader', 'projects.manage'),
  ('supreme_leader', 'workspaces.manage'),
  ('supreme_leader', 'auth.settings.manage'),
  ('supreme_leader', 'invitations.manage')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Auth audit log
-- ---------------------------------------------------------------------------

create table public.auth_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type public.auth_audit_event not null,
  provider public.auth_provider,
  email text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index auth_audit_log_user_id_idx on public.auth_audit_log(user_id, created_at desc);
create index auth_audit_log_event_type_idx on public.auth_audit_log(event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.account_status = 'active'
  );
$$;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and exists (
      select 1
      from public.profiles p
      join public.role_permission_grants g on g.role = p.role
      where p.id = auth.uid()
        and g.permission_key = p_permission_key
    );
$$;

create or replace function public.can_manage_auth_settings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('auth.settings.manage');
$$;

create or replace function public.get_platform_auth_settings()
returns public.platform_auth_settings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.platform_auth_settings where id = 1;
$$;

create or replace function public.email_domain_allowed(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_settings public.platform_auth_settings;
begin
  v_domain := lower(split_part(trim(p_email), '@', 2));
  if v_domain is null or v_domain = '' then
    return false;
  end if;

  select * into v_settings from public.platform_auth_settings where id = 1;

  if coalesce(array_length(v_settings.allowed_email_domains, 1), 0) = 0 then
    return true;
  end if;

  return v_domain = any (v_settings.allowed_email_domains);
end;
$$;

create or replace function public.email_domain_allowed_for_workspace(
  p_workspace_id uuid,
  p_email text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_ws public.workspace_auth_settings;
  v_platform public.platform_auth_settings;
begin
  v_domain := lower(split_part(trim(p_email), '@', 2));
  if v_domain is null or v_domain = '' then
    return false;
  end if;

  select * into v_ws
  from public.workspace_auth_settings
  where workspace_id = p_workspace_id;

  if found and coalesce(array_length(v_ws.allowed_email_domains, 1), 0) > 0 then
    return v_domain = any (v_ws.allowed_email_domains);
  end if;

  select * into v_platform from public.platform_auth_settings where id = 1;
  if coalesce(array_length(v_platform.allowed_email_domains, 1), 0) = 0 then
    return true;
  end if;

  return v_domain = any (v_platform.allowed_email_domains);
end;
$$;

create or replace function public.user_has_microsoft_identity(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_auth_identities i
    where i.user_id = p_user_id
      and i.provider = 'azure'
  );
$$;

create or replace function public.microsoft_tenant_allowed(
  p_tenant_id text,
  p_workspace_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ws public.workspace_auth_settings;
  v_platform public.platform_auth_settings;
  v_allowed text[];
begin
  if p_tenant_id is null or trim(p_tenant_id) = '' then
    return false;
  end if;

  if p_workspace_id is not null then
    select * into v_ws
    from public.workspace_auth_settings
    where workspace_id = p_workspace_id;

    if found then
      if v_ws.microsoft_tenant_id is not null and v_ws.microsoft_tenant_id = p_tenant_id then
        return true;
      end if;
      if coalesce(array_length(v_ws.microsoft_tenant_ids, 1), 0) > 0 then
        return p_tenant_id = any (v_ws.microsoft_tenant_ids);
      end if;
    end if;
  end if;

  select * into v_platform from public.platform_auth_settings where id = 1;

  if v_platform.microsoft_tenant_id is not null and v_platform.microsoft_tenant_id = p_tenant_id then
    return true;
  end if;

  v_allowed := v_platform.microsoft_tenant_ids;
  if coalesce(array_length(v_allowed, 1), 0) = 0 then
    return true;
  end if;

  return p_tenant_id = any (v_allowed);
end;
$$;

create or replace function public.user_satisfies_sso_policy(p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_platform public.platform_auth_settings;
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found or v_profile.account_status <> 'active' then
    return false;
  end if;

  select * into v_platform from public.platform_auth_settings where id = 1;

  if not v_platform.enforce_microsoft_sso then
    return true;
  end if;

  return public.user_has_microsoft_identity(p_user_id)
    or v_profile.primary_auth_provider = 'azure';
end;
$$;

create or replace function public.log_auth_event(
  p_event_type public.auth_audit_event,
  p_user_id uuid default auth.uid(),
  p_provider public.auth_provider default null,
  p_email text default null,
  p_workspace_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.auth_audit_log (
    user_id,
    event_type,
    provider,
    email,
    workspace_id,
    metadata
  )
  values (
    p_user_id,
    p_event_type,
    p_provider,
    p_email,
    p_workspace_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sync auth.identities → user_auth_identities
-- ---------------------------------------------------------------------------

create or replace function public.map_auth_provider(p_provider text)
returns public.auth_provider
language plpgsql
immutable
as $$
begin
  if p_provider in ('azure', 'microsoft', 'azuread') then
    return 'azure'::public.auth_provider;
  end if;
  return 'email'::public.auth_provider;
end;
$$;

create or replace function public.extract_azure_tenant_id(p_identity jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(p_identity->>'tenant_id', ''),
    nullif(p_identity->'custom_claims'->>'tid', ''),
    nullif(p_identity->>'tid', '')
  );
$$;

create or replace function public.sync_user_auth_identity_from_auth_row()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_provider public.auth_provider;
  v_tenant text;
  v_email text;
begin
  v_provider := public.map_auth_provider(new.provider);
  v_tenant := public.extract_azure_tenant_id(new.identity_data);
  v_email := coalesce(new.identity_data->>'email', (select email from auth.users where id = new.user_id));

  insert into public.user_auth_identities (
    user_id,
    provider,
    provider_subject,
    provider_tenant_id,
    email,
    identity_data,
    last_sign_in_at
  )
  values (
    new.user_id,
    v_provider,
    new.provider_id,
    v_tenant,
    v_email,
    coalesce(new.identity_data, '{}'::jsonb),
    now()
  )
  on conflict (provider, provider_subject, provider_tenant_id)
  do update set
    email = excluded.email,
    identity_data = excluded.identity_data,
    last_sign_in_at = now();

  update public.profiles
  set
    primary_auth_provider = v_provider,
    last_login_at = now(),
    login_count = login_count + 1
  where id = new.user_id;

  perform public.log_auth_event(
    'identity_linked',
    new.user_id,
    v_provider,
    v_email,
    null,
    jsonb_build_object('provider_subject', new.provider_id, 'tenant_id', v_tenant)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_identity_sync on auth.identities;
create trigger on_auth_identity_sync
after insert or update on auth.identities
for each row execute function public.sync_user_auth_identity_from_auth_row();

-- ---------------------------------------------------------------------------
-- Auto-provision profile on auth.users insert
-- ---------------------------------------------------------------------------

create or replace function public.role_for_email(p_email text)
returns public.issue_user_role
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings public.platform_auth_settings;
begin
  select * into v_settings from public.platform_auth_settings where id = 1;

  if p_email is not null
    and lower(trim(p_email)) = any (
      select lower(trim(x)) from unnest(v_settings.auto_promote_admin_emails) as x
    ) then
    return 'admin';
  end if;

  return 'reporter';
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
  v_role public.issue_user_role;
  v_status public.account_status := 'active';
  v_invitation record;
  v_profile_count integer;
begin
  if new.email is not null and not public.email_domain_allowed(new.email) then
    perform public.log_auth_event(
      'access_denied',
      new.id,
      null,
      new.email,
      null,
      jsonb_build_object('reason', 'email_domain_not_allowed')
    );
    raise exception 'Email domain is not allowed for this organization';
  end if;

  select *
  into v_invitation
  from public.user_invitations ui
  where lower(ui.email) = lower(new.email)
    and ui.accepted_at is null
    and ui.revoked_at is null
    and ui.expires_at > now()
  order by ui.created_at desc
  limit 1;

  if found then
    v_status := 'active';
  end if;

  select count(*) into v_profile_count from public.profiles;
  v_role := case when v_profile_count = 0 then 'admin'::public.issue_user_role
                 else public.role_for_email(new.email) end;

  if v_invitation.id is not null then
    v_role := v_invitation.app_role;
  end if;

  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id,
    name,
    email,
    role,
    avatar_url,
    account_status,
    primary_auth_provider,
    invited_by,
    invited_at,
    last_seen_at,
    last_login_at,
    login_count
  )
  values (
    new.id,
    v_name,
    new.email,
    v_role,
    new.raw_user_meta_data->>'avatar_url',
    v_status,
    case
      when new.raw_app_meta_data->>'provider' is not null
        then public.map_auth_provider(new.raw_app_meta_data->>'provider')
      else null
    end,
    v_invitation.invited_by,
    case when v_invitation.id is not null then now() else null end,
    now(),
    now(),
    1
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    last_login_at = now(),
    login_count = public.profiles.login_count + 1,
    account_status = case
      when public.profiles.account_status = 'suspended' then public.profiles.account_status
      else excluded.account_status
    end;

  if v_invitation.id is not null then
    update public.user_invitations
    set accepted_at = now(), accepted_by = new.id
    where id = v_invitation.id;

    if v_invitation.workspace_id is not null then
      insert into public.workspace_members (workspace_id, user_id, role)
      values (
        v_invitation.workspace_id,
        new.id,
        coalesce(v_invitation.workspace_role, 'member'::public.workspace_role)
      )
      on conflict do nothing;
    end if;

    if v_invitation.project_id is not null then
      insert into public.project_members (project_id, user_id, role)
      values (
        v_invitation.project_id,
        new.id,
        coalesce(v_invitation.project_role, 'member'::public.project_role)
      )
      on conflict do nothing;
    end if;

    perform public.log_auth_event('invitation_accepted', new.id, null, new.email);
  end if;

  perform public.auto_join_workspaces_for_email(new.id, new.email);
  perform public.log_auth_event('sign_up', new.id, null, new.email);

  return new;
end;
$$;

create or replace function public.auto_join_workspaces_for_email(
  p_user_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws record;
  v_domain text := lower(split_part(trim(p_email), '@', 2));
begin
  for v_ws in
    select was.workspace_id, was.default_workspace_role
    from public.workspace_auth_settings was
    where was.auto_join_workspace
      and (
        coalesce(array_length(was.allowed_email_domains, 1), 0) = 0
        or v_domain = any (was.allowed_email_domains)
      )
  loop
    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_ws.workspace_id, p_user_id, v_ws.default_workspace_role)
    on conflict do nothing;
  end loop;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Profile protection: status, role, provider
-- ---------------------------------------------------------------------------

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.has_permission('profiles.manage') then
    raise exception 'Only admins can change roles';
  end if;

  if old.account_status is distinct from new.account_status
    and not public.has_permission('profiles.manage') then
    raise exception 'Only admins can change account status';
  end if;

  if old.email is distinct from new.email then
    raise exception 'Email cannot be changed from the client';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- Harden core helpers to require active users + SSO when enforced
-- ---------------------------------------------------------------------------

create or replace function public.is_issue_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and public.user_satisfies_sso_policy()
    and exists (
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
  select public.is_active_user() and public.user_satisfies_sso_policy();
$$;

create or replace function public.can_update_issue_ticket(ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and public.user_satisfies_sso_policy()
    and exists (
      select 1
      from public.issue_tickets ticket
      where ticket.id = ticket_id
        and (
          public.has_permission('tickets.update.all')
          or (
            public.has_permission('tickets.update.own')
            and (ticket.created_by = auth.uid() or ticket.assigned_to = auth.uid())
          )
        )
    );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and public.user_satisfies_sso_policy()
    and (
      exists (
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
      )
    );
$$;

create or replace function public.can_edit_project_issues(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user()
    and public.user_satisfies_sso_policy()
    and (
      public.has_permission('tickets.update.all')
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
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Invitation token helpers (server / admin only)
-- ---------------------------------------------------------------------------

create or replace function public.create_user_invitation(
  p_email text,
  p_app_role public.issue_user_role default 'reporter',
  p_workspace_id uuid default null,
  p_workspace_role public.workspace_role default 'member',
  p_project_id uuid default null,
  p_project_role public.project_role default 'member',
  p_expires_in_days integer default 7
)
returns table (invitation_id uuid, invite_token text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_hash text;
  v_id uuid;
begin
  if not public.has_permission('invitations.manage') then
    raise exception 'Not allowed to create invitations';
  end if;

  if not public.email_domain_allowed(p_email) then
    raise exception 'Email domain is not allowed';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.user_invitations (
    email,
    workspace_id,
    app_role,
    workspace_role,
    project_id,
    project_role,
    invited_by,
    token_hash,
    expires_at
  )
  values (
    lower(trim(p_email)),
    p_workspace_id,
    p_app_role,
    p_workspace_role,
    p_project_id,
    p_project_role,
    auth.uid(),
    v_hash,
    now() + make_interval(days => greatest(p_expires_in_days, 1))
  )
  returning id into v_id;

  perform public.log_auth_event(
    'invitation_sent',
    auth.uid(),
    null,
    p_email,
    p_workspace_id,
    jsonb_build_object('invitation_id', v_id)
  );

  return query select v_id, v_token;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_invitation public.user_invitations;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in to accept an invitation';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_invitation
  from public.user_invitations
  where token_hash = v_hash
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return false;
  end if;

  if lower(v_invitation.email) <> lower((select email from public.profiles where id = auth.uid())) then
    raise exception 'Invitation email does not match signed-in account';
  end if;

  update public.user_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invitation.id;

  update public.profiles
  set role = v_invitation.app_role, account_status = 'active'
  where id = auth.uid();

  if v_invitation.workspace_id is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (
      v_invitation.workspace_id,
      auth.uid(),
      coalesce(v_invitation.workspace_role, 'member'::public.workspace_role)
    )
    on conflict do nothing;
  end if;

  if v_invitation.project_id is not null then
    insert into public.project_members (project_id, user_id, role)
    values (
      v_invitation.project_id,
      auth.uid(),
      coalesce(v_invitation.project_role, 'member'::public.project_role)
    )
    on conflict do nothing;
  end if;

  perform public.log_auth_event('invitation_accepted', auth.uid(), null, v_invitation.email);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: updated_at on settings tables
-- ---------------------------------------------------------------------------

create trigger platform_auth_settings_set_updated_at
before update on public.platform_auth_settings
for each row execute function public.set_updated_at();

create trigger workspace_auth_settings_set_updated_at
before update on public.workspace_auth_settings
for each row execute function public.set_updated_at();

-- Bootstrap workspace auth row when workspace is created
create or replace function public.on_workspace_created_auth_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_auth_settings (workspace_id)
  values (new.id)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists workspaces_auth_settings_after_insert on public.workspaces;
create trigger workspaces_auth_settings_after_insert
after insert on public.workspaces
for each row execute function public.on_workspace_created_auth_settings();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.platform_auth_settings enable row level security;
alter table public.workspace_auth_settings enable row level security;
alter table public.user_auth_identities enable row level security;
alter table public.user_invitations enable row level security;
alter table public.app_permissions enable row level security;
alter table public.role_permission_grants enable row level security;
alter table public.auth_audit_log enable row level security;

-- Profiles: block suspended users from reading others if we tighten - keep team visible
drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Active users can view team profiles"
on public.profiles for select
to authenticated
using (public.is_active_user() and public.user_satisfies_sso_policy());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Active users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and public.is_active_user() and public.user_satisfies_sso_policy())
with check (id = auth.uid() and public.is_active_user());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert own profile on first sign in"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Admins can update team profiles" on public.profiles;
create policy "Admins can manage team profiles"
on public.profiles for update
to authenticated
using (public.has_permission('profiles.manage'))
with check (public.has_permission('profiles.manage'));

-- Platform auth settings
create policy "Authenticated users can read platform auth settings"
on public.platform_auth_settings for select
to authenticated
using (public.is_active_user());

create policy "Auth admins can update platform auth settings"
on public.platform_auth_settings for update
to authenticated
using (public.can_manage_auth_settings())
with check (public.can_manage_auth_settings());

-- Workspace auth settings
create policy "Workspace members can read workspace auth settings"
on public.workspace_auth_settings for select
to authenticated
using (public.is_workspace_member(workspace_id) or public.is_issue_admin());

create policy "Workspace admins can manage workspace auth settings"
on public.workspace_auth_settings for all
to authenticated
using (public.is_workspace_admin(workspace_id) or public.can_manage_auth_settings())
with check (public.is_workspace_admin(workspace_id) or public.can_manage_auth_settings());

-- User identities: own rows + admins
create policy "Users can view own auth identities"
on public.user_auth_identities for select
to authenticated
using (user_id = auth.uid() or public.has_permission('profiles.manage'));

create policy "Service sync manages auth identities"
on public.user_auth_identities for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own auth identity metadata"
on public.user_auth_identities for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Invitations
create policy "Admins can view invitations"
on public.user_invitations for select
to authenticated
using (public.has_permission('invitations.manage'));

create policy "Admins can create invitations via rpc"
on public.user_invitations for insert
to authenticated
with check (public.has_permission('invitations.manage') and invited_by = auth.uid());

create policy "Admins can revoke invitations"
on public.user_invitations for update
to authenticated
using (public.has_permission('invitations.manage'))
with check (public.has_permission('invitations.manage'));

-- Permissions catalog (read-only for app UI)
create policy "Authenticated users can read permissions"
on public.app_permissions for select
to authenticated
using (public.is_active_user());

create policy "Authenticated users can read role grants"
on public.role_permission_grants for select
to authenticated
using (public.is_active_user());

-- Audit log
create policy "Users can view own auth audit events"
on public.auth_audit_log for select
to authenticated
using (user_id = auth.uid() or public.has_permission('profiles.manage'));

create policy "Users can insert own auth audit events"
on public.auth_audit_log for insert
to authenticated
with check (user_id = auth.uid() or public.has_permission('profiles.manage'));

-- Ticket policies: require active + SSO
drop policy if exists "Authenticated users can view team tickets" on public.issue_tickets;
create policy "Active users can view team tickets"
on public.issue_tickets for select
to authenticated
using (public.is_active_user() and public.user_satisfies_sso_policy());

drop policy if exists "Users can create tickets" on public.issue_tickets;
create policy "Active users can create tickets"
on public.issue_tickets for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_active_user()
  and public.user_satisfies_sso_policy()
  and public.has_permission('tickets.create')
);

drop policy if exists "Reporters assignees and admins can update tickets" on public.issue_tickets;
create policy "Authorized users can update tickets"
on public.issue_tickets for update
to authenticated
using (public.can_update_issue_ticket(id))
with check (public.can_update_issue_ticket(id));

drop policy if exists "leaders_can_delete_tickets" on public.issue_tickets;
create policy "Users with delete permission can remove tickets"
on public.issue_tickets for delete
to authenticated
using (public.has_permission('tickets.delete'));

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.create_user_invitation(text, public.issue_user_role, uuid, public.workspace_role, uuid, public.project_role, integer) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.log_auth_event(public.auth_audit_event, uuid, public.auth_provider, text, uuid, jsonb) to authenticated;
grant execute on function public.get_platform_auth_settings() to authenticated;
