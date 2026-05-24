-- DREVA reservations state machine
-- Run this migration in Supabase SQL editor after reviewing existing policies.

alter table public.reservations
  add column if not exists status text default 'pending',
  add column if not exists client_pin text,
  add column if not exists appointment_date date,
  add column if not exists accepted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.reservations
set status = 'cancelled'
where status = 'rejected';

update public.reservations
set status = 'pending'
where status is null
   or status not in (
    'pending',
    'accepted',
    'appointment_scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'expired'
  );

update public.reservations
set client_pin = lpad(floor(random() * 10000)::int::text, 4, '0')
where client_pin is null;

alter table public.reservations
  alter column appointment_date type date
  using appointment_date::date;

alter table public.reservations
  alter column status set default 'pending',
  alter column status set not null,
  alter column client_pin set default lpad(floor(random() * 10000)::int::text, 4, '0');

do $$
declare
  v_existing_status_check text;
begin
  select pg_get_constraintdef(oid)
  into v_existing_status_check
  from pg_constraint
  where conname = 'reservations_status_check'
    and conrelid = 'public.reservations'::regclass;

  raise notice 'Existing reservations_status_check: %',
    coalesce(v_existing_status_check, 'not found');

  alter table public.reservations
    drop constraint if exists reservations_status_check;

  alter table public.reservations
    add constraint reservations_status_check
    check (
      status in (
        'pending',
        'accepted',
        'appointment_scheduled',
        'confirmed',
        'completed',
        'cancelled',
        'expired'
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_client_pin_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_client_pin_check
      check (client_pin ~ '^[0-9]{4}$');
  end if;
end $$;

create index if not exists reservations_owner_status_created_at_idx
  on public.reservations (owner_id, status, created_at desc);

create index if not exists reservations_dress_event_block_idx
  on public.reservations (dress_id, event_date, status)
  where status in ('accepted', 'appointment_scheduled', 'confirmed');

create unique index if not exists reservations_one_active_block_per_dress_date
  on public.reservations (dress_id, event_date)
  where status in ('accepted', 'appointment_scheduled', 'confirmed');

alter table public.reservations enable row level security;

drop policy if exists "Clients can read their own reservations" on public.reservations;
create policy "Clients can read their own reservations"
on public.reservations
for select
using (auth.uid() = user_id);

drop policy if exists "Owners can read local reservations without pin" on public.reservations;
create policy "Owners can read local reservations without pin"
on public.reservations
for select
using (auth.uid() = owner_id);

drop policy if exists "Clients can create pending reservations" on public.reservations;
create policy "Clients can create pending reservations"
on public.reservations
for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "Owners can operate their reservations" on public.reservations;
create policy "Owners can operate their reservations"
on public.reservations
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop function if exists public.transition_reservation(bigint, text, timestamptz);
drop function if exists public.transition_reservation(uuid, text, timestamptz);
drop function if exists public.transition_reservation(uuid, text, date);
create or replace function public.transition_reservation(
  p_reservation_id uuid,
  p_action text,
  p_appointment_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_action = 'accept' then
    if v_reservation.status <> 'pending' then
      raise exception 'Only pending reservations can be accepted';
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
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.owner_id <> auth.uid() then
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

grant execute on function public.transition_reservation(uuid, text, date) to authenticated;
grant execute on function public.validate_reservation_pin(uuid, text) to authenticated;

create or replace function public.expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.reservations
  set status = 'expired'
  where status = 'accepted'
    and expires_at is not null
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_stale_reservations() to authenticated;
