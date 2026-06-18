-- Optional bootstrap after migrations 0001–0005 and at least one auth user/profile.
-- Replace :user_id with your profile UUID (same as auth.users.id).

-- 1) Workspace
-- insert into public.workspaces (name, slug, created_by)
-- values ('StillDesk Team', 'stilldesk', ':user_id'::uuid)
-- returning id;

-- 2) Project (use workspace id from step 1)
-- insert into public.projects (workspace_id, key, name, description, lead_id, created_by)
-- values (
--   ':workspace_id'::uuid,
--   'STILL',
--   'StillDesk',
--   'Main product backlog',
--   ':user_id'::uuid,
--   ':user_id'::uuid
-- )
-- returning id;

-- 3) Migrate existing issue_tickets into the project (run once)
-- select public.migrate_legacy_tickets(':project_id'::uuid);

-- Example queries:
-- select * from public.issues_with_key where project_id = ':project_id'::uuid order by issue_number;
-- select * from public.boards where project_id = ':project_id'::uuid;
-- select * from public.sprints where project_id = ':project_id'::uuid;
