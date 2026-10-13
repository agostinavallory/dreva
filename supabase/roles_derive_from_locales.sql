-- ===========================================================================
-- FOLLOW-UP MIGRATION — ALREADY APPLIED MANUALLY. CURRENT ROLES BEHAVIOR.
-- ===========================================================================
-- Status:   Applied manually in the DREVA Supabase project SQL Editor.
-- Order:    Runs AFTER supabase/profiles_role_formalization.sql.
-- Current:  This file contains the CURRENT definition of
--           handle_new_user_profile() (every new account starts as 'clienta').
--           It replaces the version from profiles_role_formalization.sql.
-- Model:    A profile's FORMAL role is derived from the existence of a real
--           commercial row in locales (the AFTER INSERT trigger promotes the
--           owner to 'local'). No client/browser input can set the role.
-- Authz:    Dashboard authorization does NOT use profiles.role. It keeps
--           depending on locales.owner_id = auth.uid().
-- ===========================================================================

-- DREVA roles derive from locales (promotion only on real commercial rows)
-- Manual migration: review and run manually in Supabase SQL Editor.
-- DO NOT execute automatically. Idempotent: safe to re-run unchanged.
--
-- Context / decision:
--   A DREVA account must NOT be able to claim a 'local' role from the browser
--   (raw_user_meta_data is client-controlled). Therefore:
--     * every NEW profile starts as 'clienta';
--     * a profile is promoted to 'local' ONLY when a real commercial record is
--       inserted into public.locales (same transaction, DB-side).
--   Authorization for /dashboard remains untouched: it keeps depending on the
--   existence of a locales row where locales.owner_id = auth.uid().
--
-- What it does:
--   1) Replaces public.handle_new_user_profile() (same signature, same
--      security properties) so a new profile ALWAYS gets role = 'clienta'.
--      It no longer reads raw_user_meta_data->>'role'. The existing trigger
--      on_auth_user_created_profile (auth.users AFTER INSERT) stays attached:
--      CREATE OR REPLACE FUNCTION keeps the same OID, so the trigger is NOT
--      dropped nor recreated.
--   2) Creates public.promote_profile_to_local_on_locale_insert(), a trigger
--      function with SECURITY DEFINER (required: authenticated cannot write
--      profiles.role, so the promotion must run with the owner's privileges)
--      and the most restrictive search_path ('') with fully qualified names.
--      It only updates role for the profile whose user_id = NEW.owner_id, and
--      only promotes to 'local' (never demotes, never writes other columns).
--      Owner guard: when there IS an authenticated context and auth.uid()
--      differs from NEW.owner_id, the insert is ABORTED with a generic error
--      (defense in depth; RLS normally rejects the row before the trigger);
--      trusted paths without a session (manual admin inserts, service_role)
--      keep working.
--   3) Creates trigger promote_profile_to_local (AFTER INSERT, FOR EACH ROW on
--      public.locales), with drop-if-exists so re-runs do not duplicate it.
--      The promotion is atomic with the locale insertion: a failure inside the
--      trigger aborts the statement/transaction, so a committed commercial row
--      without its promotion cannot happen through this path.
--
-- What it does NOT do:
--   - Does NOT read or trust raw_user_meta_data.role.
--   - Does NOT modify RLS policies (profiles or locales).
--   - Does NOT change any grant on profiles (role stays non-writable by
--     authenticated/anon). It only revokes PUBLIC EXECUTE on the new trigger
--     function as defense in depth (a returns-trigger function cannot be
--     called with SELECT nor exposed via /rpc anyway).
--   - Does NOT create any public RPC nor an alternative role-changing path.
--   - Does NOT run backfills and does NOT touch existing profiles/locales rows.
--
-- Requirement:
--   - Run AFTER supabase/profiles_role_formalization.sql (needs profiles.role,
--     the CHECK constraint and the existing column grants).
--   - Run as postgres/superuser in the SQL Editor.
--
-- NOTES / validation:
--   - Profile rows are created by the signup trigger before any authenticated
--     user can insert a locale, so NEW.owner_id has a profile in the normal
--     flow. If a profile row were missing, the UPDATE is a no-op and the role
--     is simply not promoted (criterion is owner-only; no profile is never
--     created here).
--   - locales.owner_id and its RLS policies are NOT defined in this repo's
--     .sql files (no locales.sql exists): they were verified at runtime, not
--     from source. The trigger below is safe with or without a UNIQUE
--     owner_id; it only ever touches the profile of the inserted owner.

-- ---------------------------------------------------------------------------
-- A) Formalize profile creation: every new account starts as 'clienta'
-- ---------------------------------------------------------------------------
-- Same signature (returns trigger) and same security properties as the
-- original function; ONLY the role source changes (constant instead of
-- raw_user_meta_data->>'role'). The trigger on_auth_user_created_profile keeps
-- working because CREATE OR REPLACE FUNCTION preserves the OID.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nombre, apellido, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(new.raw_user_meta_data->>'first_name', ''),
      ''
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'apellido', ''),
      nullif(new.raw_user_meta_data->>'last_name', ''),
      ''
    ),
    'clienta'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- B) Promotion function (SECURITY DEFINER, locked search_path)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER is required on purpose: authenticated has no INSERT/UPDATE
-- privilege on profiles.role, so the promotion must run as the function owner.
-- search_path = '' + fully qualified names = the most restrictive variant.
-- It NEVER inserts profiles, NEVER writes other columns, NEVER demotes and is
-- always scoped to the profile whose user_id = NEW.owner_id. The owner guard
-- raises instead of silently skipping: a foreign-owner insert cannot commit.
create or replace function public.promote_profile_to_local_on_locale_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- When there IS an authenticated context, a foreign owner aborts the
  -- insert (defense in depth: RLS normally rejects it before the trigger).
  -- Trusted/non-session inserts (manual admin, service_role) keep working.
  -- The error is generic: it does not reveal any email, id or other data.
  if auth.uid() is not null
     and auth.uid() <> new.owner_id then
    raise exception using
      errcode = '42501',
      message = 'Forbidden: this locale does not belong to the authenticated user.';
  end if;

  update public.profiles
  set role = 'local'
  where user_id = new.owner_id
    and role is distinct from 'local';

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- C) Trigger: promote atomically with the commercial row insertion
-- ---------------------------------------------------------------------------
drop trigger if exists promote_profile_to_local
on public.locales;
create trigger promote_profile_to_local
after insert on public.locales
for each row execute function public.promote_profile_to_local_on_locale_insert();

-- ---------------------------------------------------------------------------
-- D) Defense in depth: no direct/public execution of the trigger function
--    (a returns-trigger function cannot be called with SELECT nor exposed via
--     PostgREST /rpc; this revoke is belt-and-braces only).
-- ---------------------------------------------------------------------------
revoke all on function public.promote_profile_to_local_on_locale_insert()
from public;

-- ---------------------------------------------------------------------------
-- VERIFICATION (read-only; run AFTER applying the migration above)
--
-- IMPORTANT: none of these checks were executed; they are instructions to run
-- manually, one block at a time, in the Supabase SQL Editor.
-- For the FUNCTIONAL tests (5-7) use a DEDICATED test account that:
--   * already has a profiles row (e.g. created through the normal signup), and
--   * does NOT have a row in locales yet.
-- Do NOT use or modify a production account. All functional tests run inside
-- a transaction that is always rolled back (nothing is persisted).
--
-- 1) Function bodies (expected: handle_new_user_profile inserts 'clienta' and
--    does NOT mention raw_user_meta_data->>'role'; promote function has
--    search_path = '' and the owner-guarded UPDATE).
-- select p.proname, p.prosrc
-- from pg_proc p
-- where p.proname in ('handle_new_user_profile',
--                     'promote_profile_to_local_on_locale_insert');
--
-- 2) Promotion trigger (expected: AFTER INSERT ON public.locales, function
--    promote_profile_to_local_on_locale_insert, enabled).
-- select tgname, tgenabled, tgrelid::regclass as on_table,
--        pg_get_triggerdef(oid) as definition
-- from pg_trigger
-- where not tgisinternal
--   and tgname = 'promote_profile_to_local';
--
-- 3) Signup trigger untouched (expected: still attached, enabled).
-- select tgname, tgenabled, pg_get_triggerdef(oid) as definition
-- from pg_trigger
-- where not tgisinternal
--   and tgname = 'on_auth_user_created_profile';
--
-- 4) Privileges on profiles.role unchanged (expected: false | false).
-- select has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
--          as puede_upd_role,
--        has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT')
--          as puede_ins_role;
--
-- 5) Functional test A - ADMINISTRATOR path promotes.
--    Run it as ADMIN (postgres/SQL Editor superuser): the insert bypasses RLS
--    and auth.uid() is NULL, so it is a trusted context.
--    Expected IF the promotion works: role of the test profile = 'local'.
-- begin;
-- insert into public.locales (owner_id, nombre, ciudad)
-- values ('<TEST_OWNER_ID>', 'Test', 'Test');
-- select role from public.profiles where user_id = '<TEST_OWNER_ID>';
-- rollback;
--
-- 6) Functional test B - AUTHENTICATED owner promotes.
--    Run under the authenticated role with test claims (set local role
--    authenticated + set local request.jwt.claims). RLS allows the insert
--    (owner = sub) and the trigger then promotes the same profile.
--    Expected IF the promotion works: role of the test profile = 'local'.
-- begin;
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<TEST_OWNER_ID>","role":"authenticated"}';
-- insert into public.locales (owner_id, nombre, ciudad)
-- values ('<TEST_OWNER_ID>', 'Test', 'Test');
-- select role from public.profiles where user_id = '<TEST_OWNER_ID>';
-- rollback;
--
-- 7) Functional test C - AUTHENTICATED user blocked on a foreign owner.
--    Run under the authenticated role with claims of a different user.
--    RLS rejects the insert; if it ever reached the trigger (non-RLS path),
--    the function aborts the transaction. Nothing is committed/promoted.
-- begin;
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<AUTH_ID>","role":"authenticated"}';
-- insert into public.locales (owner_id, nombre, ciudad)
-- values ('<OTHER_OWNER_ID>', 'Test', 'Test');
-- rollback;  -- expected: error (RLS and/or the trigger guard), no promotion
-- ---------------------------------------------------------------------------
