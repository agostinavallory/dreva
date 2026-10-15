-- ===========================================================================
-- DREVA reservations coordination-expiry guard
-- Manual migration: review and run in the Supabase SQL Editor.
-- Run AFTER supabase/harden_reservation_rpc_authz.sql. DO NOT execute automatically.
--
-- Business rule:
--   * The 48h window starts when the local ACCEPTS (expires_at = accepted_at + 48h)
--     and exists ONLY to coordinate/register the in-person appointment.
--   * accepted                                   -> subject to expires_at.
--   * appointment_scheduled / confirmed / completed -> NOT subject to that window.
--   * An `accepted` row whose expires_at is NULL or <= now() can NOT be scheduled
--     (transition 'schedule') nor confirmed via PIN (validate_reservation_pin):
--     every accepted reservation must carry a valid deadline to continue.
--   * The existing cron (expire_stale_reservations, every 10 min) is NOT modified.
--
-- Boundary: a reservation is EXPIRED when expires_at is NULL or now() >= expires_at
--   (valid strictly while now() < expires_at). At the exact instant
--   now() = expires_at it is expired; hence the guard uses `<=`. This is
--   1 instant stricter than the cron's `expires_at < now()` on purpose, to close
--   the race before the tick.
--
-- Safety: CREATE OR REPLACE with the SAME signatures (uuid,text,timestamptz)
--   and (uuid,text) preserves the function OID and its existing ACL, so EXECUTE
--   stays restricted to authenticated. DO NOT use DROP FUNCTION (it would
--   re-grant EXECUTE to PUBLIC). The REVOKE/GRANT block is re-applied below.
--   Authorization, FOR UPDATE locks, availability/manual-block checks, status
--   rules, timestamps and error messages are kept identical except the 2 guards.
-- ===========================================================================

create or replace function public.transition_reservation(
  p_reservation_id uuid,
  p_action text,
  p_appointment_date timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_dress_owner uuid;
  v_can_check_manual_blocks boolean := false;
  v_has_manual_block boolean := false;
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  select v.owner_id
  into v_dress_owner
  from public.vestidos v
  where v.id = v_reservation.dress_id;

  if not found then
    raise exception 'Dress not found';
  end if;

  if auth.uid() is null
     or v_reservation.owner_id is distinct from v_dress_owner
     or v_dress_owner is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_action = 'accept' then
    if v_reservation.status <> 'pending' then
      raise exception 'Only pending reservations can be accepted';
    end if;

    if v_reservation.event_date is null
       or v_reservation.event_date < current_date then
      raise exception 'Reservation event date is no longer valid';
    end if;

    if exists (
      select 1
      from public.reservations r
      where r.id <> v_reservation.id
        and r.dress_id = v_reservation.dress_id
        and r.event_date = v_reservation.event_date
        and r.status in ('accepted', 'appointment_scheduled', 'confirmed')
    ) then
      raise exception 'Dress is already reserved for this event date';
    end if;

    if to_regclass('public.dress_blocks') is not null then
      select count(*) = 3
      into v_can_check_manual_blocks
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dress_blocks'
        and column_name in ('dress_id', 'start_date', 'end_date');
    end if;

    if v_can_check_manual_blocks then
      execute
        'select exists (
          select 1
          from public.dress_blocks
          where dress_id = $1
            and start_date <= $2
            and end_date >= $2
        )'
      into v_has_manual_block
      using v_reservation.dress_id, v_reservation.event_date;

      if v_has_manual_block then
        raise exception 'Dress has a manual block for this event date';
      end if;
    elsif to_regclass('public.dress_blocks') is not null then
      raise notice 'Skipping dress_blocks validation because expected columns dress_id, start_date, end_date were not found.';
    end if;

    update public.reservations
    set status = 'accepted',
        accepted_at = now(),
        expires_at = now() + interval '48 hours',
        cancelled_at = null
    where id = p_reservation_id
    returning * into v_reservation;

  elsif p_action in ('reject', 'cancel') then
    if v_reservation.status in ('completed', 'cancelled', 'expired') then
      raise exception 'Reservation is already closed';
    end if;

    update public.reservations
    set status = 'cancelled',
        cancelled_at = now()
    where id = p_reservation_id
    returning * into v_reservation;

  elsif p_action = 'schedule' then
    if v_reservation.status <> 'accepted' then
      raise exception 'Only accepted reservations can be scheduled';
    end if;

    -- NEW GUARD: coordination window elapsed (or missing) -> cannot register.
    if v_reservation.expires_at is null
       or v_reservation.expires_at <= now() then
      raise exception 'Reservation has expired and can no longer be scheduled';
    end if;

    if p_appointment_date is null then
      raise exception 'Appointment date is required';
    end if;

    update public.reservations
    set status = 'appointment_scheduled',
        appointment_date = p_appointment_date
    where id = p_reservation_id
    returning * into v_reservation;

  elsif p_action = 'complete' then
    if v_reservation.status <> 'confirmed' then
      raise exception 'Only confirmed reservations can be completed';
    end if;

    update public.reservations
    set status = 'completed',
        completed_at = now()
    where id = p_reservation_id
    returning * into v_reservation;

  else
    raise exception 'Unknown reservation action';
  end if;

  return;
end;
$$;

create or replace function public.validate_reservation_pin(
  p_reservation_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_dress_owner uuid;
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  select v.owner_id
  into v_dress_owner
  from public.vestidos v
  where v.id = v_reservation.dress_id;

  if not found then
    raise exception 'Dress not found';
  end if;

  if auth.uid() is null
     or v_reservation.owner_id is distinct from v_dress_owner
     or v_dress_owner is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  if v_reservation.status not in ('accepted', 'appointment_scheduled') then
    raise exception 'Reservation cannot be confirmed from its current status';
  end if;

  -- NEW GUARD: an ACCEPTED reservation past its coordination window (or with a
  -- missing deadline) cannot be confirmed. appointment_scheduled is exempt.
  if v_reservation.status = 'accepted'
     and (v_reservation.expires_at is null
          or v_reservation.expires_at <= now()) then
    raise exception 'Reservation has expired and can no longer be confirmed';
  end if;

  if v_reservation.client_pin <> p_pin then
    raise exception 'Invalid PIN';
  end if;

  update public.reservations
  set status = 'confirmed'
  where id = p_reservation_id
  returning * into v_reservation;

  return;
end;
$$;

-- Keep EXECUTE restricted to authenticated (idempotent). CREATE OR REPLACE
-- already preserved the ACL; this is belt-and-braces. Never grant to public/anon.
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from public;
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from anon;
grant  execute on function public.transition_reservation(uuid, text, timestamptz) to authenticated;

revoke execute on function public.validate_reservation_pin(uuid, text) from public;
revoke execute on function public.validate_reservation_pin(uuid, text) from anon;
grant  execute on function public.validate_reservation_pin(uuid, text) to authenticated;
