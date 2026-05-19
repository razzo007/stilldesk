-- Optional local demo seed.
-- Run this after creating local Supabase auth users, then replace these UUIDs
-- with the user IDs shown in Auth > Users.

insert into public.profiles (id, name, email, role)
values
  ('00000000-0000-4000-8000-000000000001', 'Sam', 'sam@stilldesk.local', 'supreme_leader'),
  ('00000000-0000-4000-8000-000000000002', 'Jordan', 'jordan@stilldesk.local', 'developer'),
  ('00000000-0000-4000-8000-000000000003', 'Casey', 'casey@stilldesk.local', 'developer'),
  ('00000000-0000-4000-8000-000000000004', 'Alex', 'alex@stilldesk.local', 'reporter')
on conflict (id) do update
set name = excluded.name, email = excluded.email, role = excluded.role;

insert into public.issue_tickets
  (title, description, category, priority, status, created_by, assigned_to, module, dependency_note, fixed_at, verified_at)
values
  (
    'Long text input causes response to stall',
    'When the input exceeds roughly 2 000 characters the next reply stalls silently. No error is shown to the user.',
    'backend', 'high', 'blocked',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000002',
    'Messaging',
    'Waiting on stream timeout details from server logs.',
    null, null
  ),
  (
    'Logo detection skips valid SVG files on first pass',
    'SVG files that pass our validation rules are silently skipped during the first detection pass. PNG files work correctly.',
    'frontend', 'medium', 'assigned',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000003',
    'Uploads',
    null, null, null
  ),
  (
    'Record count in header does not match table rows',
    'The summary header shows 120 records but the table renders only 116 rows. Discrepancy is consistent across refreshes.',
    'data', 'high', 'in_progress',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    'Reports',
    null, null, null
  ),
  (
    'Duplicate contacts when sources overlap',
    'When two data sources resolve to the same person, duplicate contact records are created instead of being merged.',
    'backend', 'medium', 'open',
    '00000000-0000-4000-8000-000000000004',
    null,
    'Contacts',
    null, null, null
  ),
  (
    'Preview pane blank after switching template tone',
    'Switching the template tone from Concise to Friendly leaves the preview pane blank. Refreshing the page restores it.',
    'frontend', 'medium', 'fixed',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000003',
    'Templates',
    null, now() - interval '1 day', null
  ),
  (
    'Variable placeholder not replaced in second paragraph',
    'The {{company}} placeholder is not substituted in the second paragraph of generated content. First paragraph is fine.',
    'copy', 'low', 'verified',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000002',
    'Content',
    null, now() - interval '3 days', now() - interval '2 days'
  ),
  (
    'Step owner resets after page refresh',
    'Changing the step owner saves visually but a hard refresh reverts it to the previous owner. DB write appears to fail silently.',
    'backend', 'blocker', 'blocked',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000003',
    'Workflows',
    'Needs a migration decision for ownership history table.',
    null, null
  ),
  (
    'Primary CTA overlaps plan label on small screens',
    'On 390 px viewports the primary call-to-action button overlaps the plan comparison label directly below it.',
    'design', 'medium', 'closed',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000002',
    'Pricing',
    null, now() - interval '5 days', now() - interval '4 days'
  );
