-- DREVA profiles backfill (Sprint 4 - Task 3)
-- MANUAL ONE-TIME MIGRATION: review and run manually in Supabase SQL Editor.
-- DO NOT execute automatically.
--
-- Problem it solves:
--   Accounts created in auth.users before the profile trigger existed
--   (on_auth_user_created_profile / handle_new_user_profile) may have no row
--   in public.profiles. Several features rely on profiles (e.g. the
--   get_reservation_client_profile helper and the /profile screen), so those
--   historical accounts are "incomplete" even though their auth account works.
--
-- What it does:
--   Inserts a row into public.profiles ONLY for auth.users that currently have
--   NO profile row (auth.users WITHOUT profiles -> INSERT).
--
-- What it does NOT do:
--   - Never updates or deletes existing profiles.
--   - Never touches profiles rows that already exist.
--   - Does NOT re-fire the existing profile trigger (that trigger listens on
--     inserts into auth.users, not on inserts into profiles).
--   - Does NOT replace the trigger: future sign-ups keep being covered by
--     handle_new_user_profile() exactly as before.
--
-- Safety:
--   - Idempotent: guarded by a NOT EXISTS filter AND by
--     ON CONFLICT (user_id) DO NOTHING, so it is safe to run once or to
--     re-run; it can never create duplicate rows.
--   - Respects the current profiles constraints (user_id NOT NULL + FK to
--     auth.users ON DELETE CASCADE; nombre/apellido NOT NULL).
--   - Never inserts NULL into nombre/apellido. Falls back to '' when there is
--     no usable name data (explicit, documented fallback; it does NOT invent
--     personal data).
--   - Name priority: 1) nombre/apellido, 2) first_name/last_name,
--     3) full_name split as last resort (best-effort), 4) ''.
--
-- Requirement:
--   Must run AFTER supabase/profiles.sql (needs the profiles table and the
--   unique index on user_id). Execute as postgres/superuser (SQL Editor) so
--   RLS on profiles does not apply.

with missing_profiles as (
  select
    u.id,
    u.raw_user_meta_data->>'nombre'      as nombre_raw,
    u.raw_user_meta_data->>'first_name'  as first_name_raw,
    u.raw_user_meta_data->>'apellido'    as apellido_raw,
    u.raw_user_meta_data->>'last_name'   as last_name_raw,
    u.raw_user_meta_data->>'full_name'   as full_name_raw
  from auth.users u
  where not exists (
    select 1
    from public.profiles existing
    where existing.user_id = u.id
  )
),
parsed as (
  select
    id,
    nombre_raw,
    first_name_raw,
    apellido_raw,
    last_name_raw,
    full_name_raw,
    string_to_array(btrim(full_name_raw), ' ') as full_name_parts
  from missing_profiles
)
insert into public.profiles (user_id, nombre, apellido)
select
  id,
  coalesce(
    nullif(btrim(nombre_raw), ''),
    nullif(btrim(first_name_raw), ''),
    case when cardinality(full_name_parts) >= 1 then full_name_parts[1] else '' end,
    ''
  ) as nombre,
  coalesce(
    nullif(btrim(apellido_raw), ''),
    nullif(btrim(last_name_raw), ''),
    case
      when cardinality(full_name_parts) > 1
        then array_to_string(full_name_parts[2:cardinality(full_name_parts)], ' ')
      else ''
    end,
    ''
  ) as apellido
from parsed
on conflict (user_id) do nothing;
