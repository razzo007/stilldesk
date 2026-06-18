-- 0007 — Fix leaked ticket update policy and pre-login auth settings access
--
-- Two issues introduced by the interaction between 0001 and 0006:
--
-- 1. "Users can update accessible tickets" (0001) was never dropped by 0006.
--    Migration 0006 replaced can_view_issue_ticket() to return true for any
--    active user, which silently made this old policy allow any authenticated
--    user to update any ticket — bypassing the ownership check in 0006's
--    "Authorized users can update tickets" policy.
--
-- 2. get_platform_auth_settings() was only granted to `authenticated`, but the
--    login page calls it before the user signs in to determine SSO-only mode.
--    Unauthenticated callers got a permission error, the function returned null,
--    and the SSO enforcement UI was invisible until a failed sign-in attempt.

-- Fix 1: drop the leaked 0001 update policy
drop policy if exists "Users can update accessible tickets" on public.issue_tickets;

-- Fix 2: allow the login page to read platform auth settings before sign-in
grant execute on function public.get_platform_auth_settings() to anon;
