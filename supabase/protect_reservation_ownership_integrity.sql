-- DREVA reservation ownership integrity hardening
-- Run this manually in Supabase SQL Editor.
--
-- This migration keeps the existing reservation flow, but moves ownership and
-- acceptance integrity checks into RLS/RPCs.

create or replace function public.reservation_dress_owner_matches(
  p_dress_id bigint,
  p_owner_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vestidos v
    where v.id = p_dress_id
      and v.owner_id = p_owner_id
  );
$$;

grant execute on function public.reservation_dress_owner_matches(bigint, uuid)
to authenticated;

drop policy if exists "Clients can create pending reservations"
on public.reservations;

create policy "Clients can create pending reservations"
on public.reservations
for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and dress_id is not null
  and owner_id is not null
  and event_date is not null
  and event_date >= current_date
  and public.reservation_dress_owner_matches(dress_id, owner_id)
);

drop function if exists public.transition_reservation(bigint, text, timestamptz);
drop function if exists public.transition_reservation(uuid, text, timestamptz);
drop function if exists public.transition_reservation(uuid, text, date);

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

  if v_reservation.owner_id <> v_dress_owner
     or v_dress_owner <> auth.uid() then
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

drop function if exists public.validate_reservation_pin(bigint, text);
drop function if exists public.validate_reservation_pin(uuid, text);

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

  if v_reservation.owner_id <> v_dress_owner
     or v_dress_owner <> auth.uid() then
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

grant execute on function public.transition_reservation(uuid, text, timestamptz)
to authenticated;

grant execute on function public.validate_reservation_pin(uuid, text)
to authenticated;
