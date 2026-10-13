-- ===========================================================================
-- HISTORICAL MIGRATION — ALREADY APPLIED MANUALLY. DO NOT RE-RUN BLINDLY.
-- ===========================================================================
-- Status:   Applied manually in the DREVA Supabase project SQL Editor.
-- Order:    Runs BEFORE supabase/roles_derive_from_locales.sql.
-- Superseded: The handle_new_user_profile() defined further below is REPLACED
--           by the newer definition in supabase/roles_derive_from_locales.sql.
--           Do not treat the function body in this file as the current one.
-- Re-run risk: Its backfill (steps 4a-4c) can CHANGE EXISTING ROLES if run
--           again on a live database; step 4c can demote a 'local' account
--           whose locales row does not exist yet. Review before re-running.
-- This file is kept for history. For the current roles behavior, see
-- supabase/roles_derive_from_locales.sql and supabase/README.md.
-- ===========================================================================

-- DREVA profiles.role formalization (Tarea 3 - roles y registro)
-- Manual migration: review and run manually in Supabase SQL Editor.
-- DO NOT execute automatically. HISTORICAL, SINGLE-APPLICATION MIGRATION:
-- do NOT re-run it without reviewing its effects and its order relative to
-- roles_derive_from_locales.sql (see header above).
--
-- Context / decision:
--   profiles.role is the FORMAL role of a DREVA account. Allowed values are
--   ONLY 'clienta' and 'local' (CHECK constraint below).
--   Authorization to operate as a local REMAINS locales.owner_id = auth.uid()
--   (middleware + RLS keep using locales, as today). user_metadata.role is NOT
--   an authorization mechanism: it is only an optional hint consumed by the
--   signup trigger below, always validated against the same whitelist.
--
-- What it does:
--   1) Adds public.profiles.role (text, default 'clienta', NOT NULL).
--   2) Adds CHECK constraint profiles_role_check (role IN ('clienta','local')).
--   3) Updates the signup trigger function handle_new_user_profile() so a new
--      account can pass raw_user_meta_data->>'role', with a safe fallback:
--      missing or invalid values become 'clienta'. Only valid values can end
--      up stored (defense in depth). The trigger on_auth_user_created_profile
--      is KEPT (create or replace reuses the same function body, so the
--      existing trigger stays attached).
--   4) Backfill (idempotent): existing profiles -> 'local' when the account
--      owns a row in locales.owner_id (column is UNIQUE, so that is exact),
--      otherwise -> 'clienta'. 4a fixes NULLs, 4b marks owners, 4c demotes
--      the rest. Immediately after the migration the whole table matches the
--      current locales state.
--   5) Column-level privileges: anon/authenticated lose table-level INSERT and
--      UPDATE on profiles and keep only the columns the app really writes
--      (user_id, nombre, apellido, telefono). The role column is thus NOT
--      writable from the client at all.
--
-- What it does NOT do:
--   - Does not touch the existing profiles RLS policies (they stay intact:
--     read/insert/update own profile). No new policy is created for role:
--     an RLS WITH CHECK clause cannot compare OLD and NEW rows, so a policy
--     alone cannot block a role change; the column-level grant is the correct
--     and minimal protection.
--   - Does not modify locales (schema/policies untouched) nor auth.users.
--   - Does not drop or rename columns, triggers, functions or indexes.
--
-- Requirements:
--   - Run AFTER supabase/profiles.sql (needs the table + its trigger).
--   - Run as postgres/superuser in the SQL Editor (bypasses RLS so the
--     backfill and privilege changes apply regardless of policies).
--   - If there are auth.users accounts without a profiles row, run
--     supabase/profiles_backfill.sql first.
--   - Re-running 4c in the FUTURE (once local signup exists) can demote an
--     account to 'clienta' while its locales row is not yet created. That is
--     why this migration is meant to be applied once. Rerunning it unchanged
--     right after the first run is a no-op.
--
-- NOTES:
--   - The app only writes profiles through the /register upsert
--     (app/register/page.tsx:71, payload user_id/nombre/apellido). Step 5
--     keeps granting those exact columns, so that flow keeps working.
--   - The profile trigger runs with security definer as the function owner
--     (postgres), so the anon/authenticated grants in step 5 do not affect
--     signup.
--   - Seed data / api keys: script is safe to run on any environment, it only
--     defines schema objects and permissive grants (no secrets involved).

-- ---------------------------------------------------------------------------
-- 1) Column (existing value is kept if the column already exists)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text default 'clienta';

-- ---------------------------------------------------------------------------
-- 2) CHECK constraint: allowed values ONLY 'clienta' / 'local'
--    (guarded so it is not created twice on re-runs)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('clienta', 'local'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Signup trigger: role comes from metadata but is always validated
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := new.raw_user_meta_data->>'role';

  if v_role is null or v_role not in ('clienta', 'local') then
    v_role := 'clienta';
  end if;

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
    v_role
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Backfill (idempotent BEFORE step 5, so grants do not interfere)
-- ---------------------------------------------------------------------------
-- 4a. Defense: no profile row should keep a NULL role
update public.profiles
set role = 'clienta'
where role is null;

-- 4b. Accounts that own a local => 'local'
update public.profiles p
set role = 'local'
where p.role is distinct from 'local'
  and exists (
    select 1
    from public.locales l
    where l.owner_id = p.user_id
  );

-- 4c. Everything else => 'clienta' (reflects the locales state at run time)
update public.profiles p
set role = 'clienta'
where p.role is distinct from 'clienta'
  and not exists (
    select 1
    from public.locales l
    where l.owner_id = p.user_id
  );

-- ---------------------------------------------------------------------------
-- 5) Enforce default + NOT NULL (no-op when the column is brand new, still
--    applied so a pre-existing column is also normalized)
-- ---------------------------------------------------------------------------
alter table public.profiles alter column role set default 'clienta';
alter table public.profiles alter column role set not null;

-- ---------------------------------------------------------------------------
-- 6) Privileges: role is not writable by the client.
--    anon/authenticated keep ONLY the columns the app writes.
-- ---------------------------------------------------------------------------
revoke insert, update, delete
on public.profiles
from anon, authenticated;

grant insert (user_id, nombre, apellido, telefono)
on public.profiles
to authenticated;

grant update (user_id, nombre, apellido, telefono)
on public.profiles
to authenticated;
-- Note: 'select' and 'delete' grants are untouched. RLS has no DELETE policy
-- on profiles, so delete is already denied by default; revoking delete here
-- is only defensive. anon has no insert/update in the app flow (session is
-- required to reach the profiles upsert), so its revoke is defensive too.
-- CALLEDFORBIDDEN-CAREFULL: after any future "grant all on public.profiles to
-- authenticated" (e.g. re-running docs snippets), re-apply this section.

-- ---------------------------------------------------------------------------
-- VERIFICATION (read-only; run AFTER applying everything above)
-- Run each block separately in the SQL Editor.
--
-- 1) Column shape (expected: role | text | NO | 'clienta'::text)
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name = 'role';
--
-- 2) CHECK constraint (expected: CHECK ((role = ANY (ARRAY['clienta'::text,
--    'local'::text]))))
-- select pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where conrelid = 'public.profiles'::regclass
--   and conname = 'profiles_role_check';
--
-- 3) Role distribution (1 local expected: 'Local de Agos'/7b27d1c5-...)
-- select role, count(*) as total
-- from public.profiles
-- group by role
-- order by role;
--
-- 4) Owners of a local must all be 'local' (expected: 0 rows)
-- select count(*) as deberian_ser_local
-- from public.locales l
-- join public.profiles p on p.user_id = l.owner_id
-- where p.role <> 'local';
--
-- 5) Non-owners must be 'clienta' (expected: 0 rows)
-- select count(*) as deberian_ser_clienta
-- from public.profiles p
-- where p.role <> 'clienta'
--   and not exists (
--     select 1 from public.locales l where l.owner_id = p.user_id
--   );
--
-- 6) Trigger still attached + function source (expected: prosrc contains
--    v_role and `not in ('clienta', 'local')`; trigger exists and not disabled)
-- select tgname, tgenabled, pg_get_triggerdef(oid) as definition
-- from pg_trigger
-- where tgname = 'on_auth_user_created_profile';
--
-- select prosrc
-- from pg_proc
-- where proname = 'handle_new_user_profile';
--
-- 7) The 3 existing policies must still be there (unchanged):
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'profiles'
-- order by cmd;
--
-- 8a) Column privileges on role (expected: only postgres / service_role /
--     dashboard roles listed, NO authenticated nor anon)
-- select grantee, privilege_type
-- from information_schema.column_privilege_grants
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name = 'role'
-- order by grantee, privilege_type;
--
-- 8b) Direct check (expected: false | false)
-- select has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') as puede_upd_role,
--        has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT') as puede_ins_role;
--
-- 9) Functional tests — simulate an authenticated user inside a transaction
--    that is rolled back. Replace <USER_UUID> with a real profile's user_id.
--    All three blocks are independent: run each one separately.
--
-- 9a) UPDATE of role must FAIL
--     expected error: permission denied for column "role"
-- begin;
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<USER_UUID>","role":"authenticated"}';
-- update public.profiles set role = 'local' where user_id = '<USER_UUID>';
-- rollback;
--
-- 9b) UPDATE of nombre must KEEP working (the /register upsert flow)
-- begin;
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<USER_UUID>","role":"authenticated"}';
-- update public.profiles set nombre = nombre where user_id = '<USER_UUID>';
-- rollback;   -- expected: 1 row updated, equality is a no-op
--
-- 9c) The exact /register upsert (payload user_id/nombre/apellido) must work
-- begin;
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<USER_UUID>","role":"authenticated"}';
-- insert into public.profiles (user_id, nombre, apellido)
-- values ('<USER_UUID>', 'Test', 'Test')
-- on conflict (user_id) do update set
--   user_id = excluded.user_id,
--   nombre = excluded.nombre,
--   apellido = excluded.apellido;
-- rollback;   -- expected: OK (0 or 1 rows, no permission error)
-- ---------------------------------------------------------------------------