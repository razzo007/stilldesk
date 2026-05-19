alter table public.profiles
add column if not exists work_role text,
add column if not exists department text,
add column if not exists preferred_filters text[] default array[]::text[],
add column if not exists preferred_view text default 'welcome',
add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
drop constraint if exists profiles_work_role_check;

alter table public.profiles
add constraint profiles_work_role_check
check (
  work_role is null
  or work_role in (
    'product_manager',
    'developer',
    'designer',
    'sales_marketing',
    'support_qa',
    'other'
  )
);

alter table public.profiles
drop constraint if exists profiles_department_check;

alter table public.profiles
add constraint profiles_department_check
check (
  department is null
  or department in (
    'product',
    'engineering',
    'design',
    'sales_marketing',
    'support',
    'operations',
    'other'
  )
);

alter table public.profiles
drop constraint if exists profiles_preferred_view_check;

alter table public.profiles
add constraint profiles_preferred_view_check
check (
  preferred_view is null
  or preferred_view in ('welcome', 'tickets', 'board', 'dashboard')
);
