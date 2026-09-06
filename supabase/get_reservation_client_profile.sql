-- DREVA reservation client profile helper (Sprint 3 - HU-08)
-- REVIEWED (Sprint 4 - Task 3): prepared to run manually in Supabase SQL Editor.
-- DO NOT execute automatically.
--
-- Purpose: let an authenticated boutique (owner) fetch only the basic
-- public-facing identity (nombre, apellido) of the client linked to one of
-- their own reservations, WITHOUT exposing other personal data and WITHOUT
-- touching the existing RLS on profiles.
--
-- Behavior:
--   * SECURITY DEFINER so it can read profiles despite that table's RLS.
--   * Only returns nombre/apellido; never telefono or other columns.
--   * Returns NULL when the reservation does not belong to the caller
--     (auth.uid() <> reservations.owner_id), so owners cannot probe foreign
--     reservations.
--   * Does NOT modify any existing RLS policy or RPC.
--   * Does NOT create or alter tables/columns in reservations or profiles.

create or replace function public.get_reservation_client_profile(
  p_reservation_id uuid
)
returns table (
  nombre text,
  apellido text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select r.owner_id
  into v_owner_id
  from public.reservations r
  where r.id = p_reservation_id;

  if v_owner_id is null then
    return;
  end if;

  if v_owner_id is distinct from auth.uid() then
    return;
  end if;

  return query
  select p.nombre, p.apellido
  from public.reservations r
  join public.profiles p on p.user_id = r.user_id
  where r.id = p_reservation_id;
end;
$$;

revoke execute on function public.get_reservation_client_profile(uuid)
from public;

grant execute on function public.get_reservation_client_profile(uuid)
to authenticated;
