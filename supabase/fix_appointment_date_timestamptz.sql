-- DREVA appointment date/time preservation fix
-- Run in Supabase SQL editor.
--
-- This keeps appointment_date as the source of truth for both date and time.
-- Existing rows that were already stored as date-only cannot recover the
-- original time, but future schedules will preserve it.

select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reservations'
  and column_name = 'appointment_date';

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'transition_reservation'
order by arguments;

alter table public.reservations
  alter column appointment_date type timestamptz
  using appointment_date::timestamptz;

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

grant execute on function public.transition_reservation(uuid, text, timestamptz) to authenticated;

select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reservations'
  and column_name = 'appointment_date';

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'transition_reservation'
order by arguments;
