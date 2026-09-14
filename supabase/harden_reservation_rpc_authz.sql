-- DREVA RPC authorization hardening
-- Run in Supabase SQL Editor (as postgres). Idempotent: safe to re-run.
--
-- This is a HARDENING migration that runs AFTER all historical migrations
-- (reservations_state_machine.sql, protect_reservation_ownership_integrity.sql,
-- fix_appointment_date_timestamptz.sql, protect_reservations_state_machine_updates.sql,
-- expire_reservations_cron.sql, get_reservation_client_profile.sql).
--
-- Why this file exists:
--   * transition_reservation(uuid, text, timestamptz) and
--     validate_reservation_pin(uuid, text) are SECURITY DEFINER and currently
--     have EXECUTE for anon (the PUBLIC default grant was never revoked).
--   * Both compare ownership with `<> auth.uid()`. For anon, auth.uid() is
--     NULL, so `owner <> NULL` evaluates to NULL and PL/pgSQL treats NULL in
--     IF as false, letting anon pass the authorization check.
--   * This file only makes that check null-safe (auth.uid() is null +
--     IS DISTINCT FROM) and restricts EXECUTE to authenticated.
--     Business logic, states, timestamps, PIN flow and error messages are
--     unchanged. expire_stale_reservations() and its cron are NOT touched.
--
-- CRITICAL: use CREATE OR REPLACE, NOT DROP + CREATE.
--   * CREATE OR REPLACE PRESERVES existing EXECUTE grants.
--   * DROP + CREATE would re-grant EXECUTE to PUBLIC (the default for new
--     functions), which re-exposes anon. Future modifications of these
--     functions MUST prefer CREATE OR REPLACE.
--   * If a future migration MUST drop them (e.g. to change the signature), it
--     MUST re-apply the REVOKE/GRANT block at the bottom of this file in the
--     SAME script, right after the DROP + CREATE.

-- ---------------------------------------------------------------------------
-- 1. transition_reservation: null-safe authorization (only change)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. validate_reservation_pin: null-safe authorization (only change)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Grants: PUBLIC and anon must NOT execute; only authenticated executes.
--    These are idempotent and MUST be re-applied after any future
--    DROP + CREATE of these functions (see header comment).
-- ---------------------------------------------------------------------------
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from public;
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from anon;
grant  execute on function public.transition_reservation(uuid, text, timestamptz) to authenticated;

revoke execute on function public.validate_reservation_pin(uuid, text) from public;
revoke execute on function public.validate_reservation_pin(uuid, text) from anon;
grant  execute on function public.validate_reservation_pin(uuid, text) to authenticated;