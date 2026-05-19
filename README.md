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

The Resend API key must live in Netlify environment variables. Do not expose it with a `VITE_` prefix.

The function checks the Supabase user token before sending when Supabase env vars are configured. In demo mode, emails are skipped.

## Supabase Setup

Run the migrations in `supabase/migrations/` in order:

- `0001_issue_desk.sql`
- `0002_internal_team_launch.sql`
- `0003_first_run_onboarding.sql`

It creates:

- `profiles`
- `issue_tickets`
- `issue_comments`
- `issue_attachments`
- `issue_activity`
- private storage bucket `stilldesk-attachments`
- public avatar bucket `stilldesk-avatars`
- RLS policies for authenticated ticket access
- indexes for status, owner, creator, category, priority, and dates
- triggers for `updated_at` and ticket activity
- internal-team launch hardening in `0002_internal_team_launch.sql`

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

## Roadmap

- Better team/workspace scoping
- Paste screenshot support
- Comment mentions
- Notification digest
- Optional Slack handoff
- Compact mobile ticket detail route

StillDesk should stay small. Every feature needs to earn its place.

## Contributing

Keep changes calm, direct, and useful. Avoid adding project management ceremony. If a feature makes the desk feel heavier, it probably does not belong in v1.

## License

MIT
