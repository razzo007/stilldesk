# StillDesk
A calm, minimal issue desk for small teams.

StillDesk helps teams log internal issues, attach screenshots, tag the right owner, discuss blockers, and track what is fixed without kanban boards, sprint rituals, or enterprise clutter.

Built for teams that need issue clarity, not project management theatre.

## What It Is

StillDesk is a tiny internal bug desk for focused teams. The product philosophy is simple:

Raise. Assign. Discuss. Fix. Verify. Close.

Use it when something breaks, someone needs context, and the team needs one quiet place to see the truth.

## What It Is Not

StillDesk is not Jira, ClickUp, a kanban board, sprint planning software, a roadmap tool, or a time tracker. There are no epics, story points, Gantt charts, marketplace integrations, or onboarding mazes.

## Features

- Supabase Auth magic-link login
- Email/password login, registration, and password reset
- First-run role and department setup with sensible default views
- Calm split-view ticket inbox
- Create tickets with title, description, category, priority, module, owner, and screenshots
- Private Supabase Storage bucket for screenshots
- Ticket detail panel with metadata, comments, attachments, activity, status, priority, and owner updates
- Blocked ticket dependency notes
- Quiet overview with open, blocked, fixed, verification, aging, category, owner load, and recently fixed views
- Desktop-first layout with usable mobile/tablet behavior
- Local demo mode when Supabase env vars are not configured

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Netlify Functions
- Resend transactional email

## Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALLOWED_EMAIL_DOMAINS=yourcompany.com
VITE_ADMIN_EMAILS=founder@yourcompany.com,ops@yourcompany.com
```

For Netlify email notifications:

```bash
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="StillDesk <bugs@yourdomain.com>"
STILLDESK_APP_URL=https://your-netlify-site.netlify.app
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Email Notifications

StillDesk can send Resend emails through `netlify/functions/send-ticket-email.js`.

Emails are sent when:

- a bug is assigned to someone
- a bug is marked `fixed`, `verified`, or `closed`
- a teammate is @mentioned in a comment
- a bug is marked blocked

The Resend API key must live in your host's environment variables. Do not expose it with a `VITE_` prefix.

The function checks the Supabase user token before sending when Supabase env vars are configured. In demo mode, emails are skipped.

**Not on Netlify?** The function is plain Node.js and works on any serverless platform (Vercel, Railway, Render, etc.). Copy it to the appropriate functions directory for your host and set the same environment variables. No Netlify-specific APIs are used.

## Supabase Setup

Run the migrations in `supabase/migrations/` in order:

- `0001_issue_desk.sql`
- `0002_internal_team_launch.sql`
- `0003_first_run_onboarding.sql`
- `0004_ticket_links_and_delete.sql`
- `0005_jira_project_management.sql` — Jira-like workspaces, projects, boards, sprints, and issues
- `0006_auth_sso_authorization.sql` — Microsoft SSO, permissions, invitations, audit log

It creates:

- `profiles`
- `issue_tickets` (original StillDesk bug desk — still used by the current UI)
- `issue_comments`, `issue_attachments`, `issue_activity`
- **Jira layer (0005):** `workspaces`, `projects`, `issues`, `boards`, `sprints`, `labels`, `components`, `versions`, `issue_links`, and related tables
- View `issues_with_key` (e.g. `STILL-42`)
- private storage buckets `stilldesk-attachments` and `stilldesk-issue-files`
- public avatar bucket `stilldesk-avatars`
- RLS policies for authenticated ticket and project access
- indexes for status, owner, creator, category, priority, and dates
- triggers for `updated_at`, ticket activity, issue numbering, and project defaults
- internal-team launch hardening in `0002_internal_team_launch.sql`

### Jira-style schema quick start

After migrations, create a workspace and project (SQL editor or API), then optionally import existing tickets:

```sql
-- Replace with your profile UUID
insert into public.workspaces (name, slug, created_by)
values ('My Team', 'my-team', 'YOUR_USER_ID')
returning id;

insert into public.projects (workspace_id, key, name, created_by)
values ('WORKSPACE_ID', 'APP', 'My App', 'YOUR_USER_ID')
returning id;

-- One-time import from issue_tickets
select public.migrate_legacy_tickets('PROJECT_ID');
```

See `supabase/seed/jira_bootstrap.sql` for a copy-paste template. TypeScript types live in `src/types/project-management.ts`.

### Microsoft SSO and authorization

Migration `0006_auth_sso_authorization.sql` adds:

- `platform_auth_settings` — allowed domains, tenant IDs, enforce SSO, email/password toggles
- `workspace_auth_settings` — per-workspace overrides
- `user_auth_identities` — links Supabase `auth.identities` (Azure OID, tenant)
- `user_invitations` — invite-by-email before first login
- `app_permissions` / `role_permission_grants` — RBAC mapped to `profiles.role`
- `auth_audit_log` — sign-in and admin events
- Triggers on `auth.users` and `auth.identities` for auto-provisioning

**Supabase Dashboard setup**

1. Authentication → Providers → **Azure** → enable
2. Paste Application (client) ID and secret from Microsoft Entra
3. Add redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`
4. In Entra, register redirect URI for your app and grant `openid`, `email`, `profile`

**Local env:** set `VITE_AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (see `.env.example`).

**Configure policy in SQL** (or use `supabase/seed/auth_bootstrap.sql`):

```sql
update public.platform_auth_settings set
  allowed_email_domains = array['yourcompany.com'],
  microsoft_tenant_id = 'YOUR_TENANT_ID',
  enforce_microsoft_sso = false,
  allow_email_password = true
where id = 1;
```

**Invitations (admin RPC):**

```sql
select * from public.create_user_invitation('newhire@yourcompany.com', 'developer');
```

The login screen includes **Continue with Microsoft** when Supabase is configured.

The app expects the private screenshot bucket to be named:

```text
stilldesk-attachments
```

Screenshots are uploaded to Supabase Storage. Only file paths are stored in Postgres; image blobs are never stored in database rows. Preview URLs are generated as signed URLs for authenticated users.

## RLS Notes

Authenticated users can create and view team tickets. Reporters, assignees, admins, and supreme leaders can update tickets. Everyone authenticated can comment on tickets they can view. Screenshots remain private and use signed URLs.

For an internal desk, set `VITE_ALLOWED_EMAIL_DOMAINS` so random users cannot register from the public login page. The first created profile becomes an admin, and emails listed in `VITE_ADMIN_EMAILS` become admins when their profile is created.

Roles live in `profiles.role`:

- `reporter`
- `developer`
- `admin`
- `supreme_leader`

The UI refers to `supreme_leader` as Leader view.

Server-side checks enforce screenshot MIME types, 5 MB file size, and a maximum of 3 attachments per ticket. Blocked tickets require a dependency note.

## Sample Data

The app includes local demo sample data so first-time users can feel the full loop: raise, assign, discuss, fix, verify, and close. Production Supabase installs can start empty; the samples are only cues for the first experience.

The file `supabase/seed/seed.sql` includes sample SalesGPT-style issues:

- Emma long prompt reply breaks
- Iris onboarding logo detection failed
- Alex enrichment count mismatch
- Jim people finder duplicate contacts
- Maya content template preview blank
- Lisa campaign draft missing variable
- Owen workflow step not updating
- Mobile pricing CTA overlap

For local Supabase, create matching auth users first, then replace the sample UUIDs with real auth user IDs before running the seed.

## Mobile

StillDesk is desktop-first. The ticket inbox, detail panel, and kanban board are all designed for screens wider than 768px.

On mobile and tablet you can browse tickets, read comments, and view the dashboard. Creating tickets, editing, and drag-drop on the board require a larger screen. This is intentional — issue triage is a desk activity.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `?` | Show keyboard shortcuts |
| `⌘ K` | Search tickets |
| `N` | New issue |
| `J` | Next ticket |
| `K` | Previous ticket |
| `Esc` | Close panel or dialog |

## Roadmap

- Better team/workspace scoping
- Paste screenshot support
- Comment mentions
- Notification digest
- Compact mobile ticket detail route

StillDesk should stay small. Every feature needs to earn its place.

## Contributing

Keep changes calm, direct, and useful. Avoid adding project management ceremony. If a feature makes the desk feel heavier, it probably does not belong in v1.

## License

MIT
