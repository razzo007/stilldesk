-- Optional local demo seed.
-- Run this after creating local Supabase auth users, then replace these UUIDs
-- with the user IDs shown in Auth > Users.

insert into public.profiles (id, name, email, role)
values
  ('00000000-0000-4000-8000-000000000001', 'Raj', 'raj@stilldesk.local', 'supreme_leader'),
  ('00000000-0000-4000-8000-000000000002', 'Ava Chen', 'ava@stilldesk.local', 'developer'),
  ('00000000-0000-4000-8000-000000000003', 'Noah Patel', 'noah@stilldesk.local', 'developer'),
  ('00000000-0000-4000-8000-000000000004', 'Mira Shah', 'mira@stilldesk.local', 'reporter')
on conflict (id) do update
set name = excluded.name, email = excluded.email, role = excluded.role;

insert into public.issue_tickets
  (title, description, category, priority, status, created_by, assigned_to, module, dependency_note, fixed_at, verified_at)
values
  ('Emma long prompt reply breaks', 'Long prompts render the first response correctly, then the next reply stalls without an error message.', 'ai_agent', 'high', 'blocked', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Emma', 'Waiting on token stream timeout details from logs.', null, null),
  ('Iris onboarding logo detection failed', 'Company logo detection skips otherwise valid SVG logos on first pass.', 'ai_agent', 'medium', 'assigned', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', 'Iris', null, null, null),
  ('Alex enrichment count mismatch', 'The result header says 120 enriched records but the table only shows 116 rows.', 'data', 'high', 'in_progress', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'Alex', null, null, null),
  ('Jim people finder duplicate contacts', 'Duplicate contacts appear when LinkedIn and website sources resolve to the same person.', 'backend', 'medium', 'open', '00000000-0000-4000-8000-000000000004', null, 'Jim', null, null, null),
  ('Maya content template preview blank', 'Preview pane is blank after switching template tone from concise to friendly.', 'frontend', 'medium', 'fixed', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Maya', null, now() - interval '1 day', null),
  ('Lisa campaign draft missing variable', 'The {{company}} variable is not replaced in the second paragraph of generated drafts.', 'copy', 'low', 'verified', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Lisa', null, now() - interval '3 days', now() - interval '2 days'),
  ('Owen workflow step not updating', 'Changing step owner saves visually but refresh resets it to the previous owner.', 'backend', 'blocker', 'blocked', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Owen', 'Needs a migration decision for workflow ownership history.', null, null),
  ('Mobile pricing CTA overlap', 'On 390px screens, the primary CTA overlaps the plan comparison label.', 'design', 'medium', 'closed', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002', 'Pricing', null, now() - interval '5 days', now() - interval '4 days');
