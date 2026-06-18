-- Platform auth defaults (run once after migration 0006)
-- Mirrors VITE_ALLOWED_EMAIL_DOMAINS / VITE_ADMIN_EMAILS in the database.

update public.platform_auth_settings
set
  allowed_email_domains = array['yourcompany.com'],
  auto_promote_admin_emails = array['owner@yourcompany.com', 'ops@yourcompany.com'],
  microsoft_tenant_id = null,
  microsoft_tenant_ids = '{}',
  enforce_microsoft_sso = false,
  allow_email_password = true,
  allow_self_registration = true
where id = 1;

-- Enforce Microsoft-only sign-in (enable after Azure provider works):
-- update public.platform_auth_settings
-- set enforce_microsoft_sso = true, allow_email_password = false
-- where id = 1;

-- Per-workspace SSO (requires migration 0005 workspaces):
-- update public.workspace_auth_settings
-- set
--   allowed_email_domains = array['yourcompany.com'],
--   microsoft_tenant_id = 'YOUR_AZURE_TENANT_ID',
--   enforce_microsoft_sso = true,
--   allow_email_password = false,
--   auto_join_workspace = true
-- where workspace_id = 'YOUR_WORKSPACE_ID';
