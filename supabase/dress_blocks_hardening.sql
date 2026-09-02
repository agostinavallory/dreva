-- DREVA dress_blocks hardening
-- Run this in Supabase SQL Editor after reviewing the diff.
--
-- Scope: public.dress_blocks only. Does NOT touch public.reservations,
-- its RLS policies or its RPCs.
--
-- Rules:
-- - Existing historical blocks are NEVER deleted or modified automatically.
-- - If the current data is incompatible (inverted dates or overlapping
--   ranges) this migration FAILS with a clear message so it can be cleaned
--   up manually before applying the constraints.

-- 1) Enable btree_gist if it is not already installed. Required for the
--    daterange exclusion constraint used to prevent overlapping blocks.
create extension if not exists btree_gist;

-- 2) Ownership helper following the existing reservations pattern
--    (see public.reservation_dress_owner_matches). Security definer,
--    so the RLS policies of public.vestidos do not interfere.
create or replace function public.dress_block_dress_owner_matches(
  p_dress_id bigint
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
      and v.owner_id = auth.uid()
  );
$$;

grant execute on function public.dress_block_dress_owner_matches(bigint)
to authenticated;

-- 3) Recreate the existing four policies with the same names and semantics,
--    now backed by the security definer ownership check.
drop policy if exists "view own dress blocks" on public.dress_blocks;
create policy "view own dress blocks"
on public.dress_blocks
for select
using (public.dress_block_dress_owner_matches(dress_id));

drop policy if exists "insert own dress blocks" on public.dress_blocks;
create policy "insert own dress blocks"
on public.dress_blocks
for insert
with check (public.dress_block_dress_owner_matches(dress_id));

drop policy if exists "update own dress blocks" on public.dress_blocks;
create policy "update own dress blocks"
on public.dress_blocks
for update
using (public.dress_block_dress_owner_matches(dress_id))
with check (public.dress_block_dress_owner_matches(dress_id));

drop policy if exists "delete own dress blocks" on public.dress_blocks;
create policy "delete own dress blocks"
on public.dress_blocks
for delete
using (public.dress_block_dress_owner_matches(dress_id));

-- 4) Pre-flight check: abort (without touching data) when existing rows are
--    incompatible with the constraints below.
do $$
declare
  v_invalid_dates bigint;
  v_overlapping bigint;
begin
  select count(*)
  into v_invalid_dates
  from public.dress_blocks
  where start_date > end_date;

  if v_invalid_dates > 0 then
    raise exception
      'DRESS_BLOCKS_HARDENING_ABORT: % bloqueo(s) tienen start_date > end_date. Limpialos manualmente antes de aplicar las constraints.',
      v_invalid_dates;
  end if;

  select count(*)
  into v_overlapping
  from public.dress_blocks a
  join public.dress_blocks b on b.dress_id = a.dress_id
    and b.id <> a.id
    and a.start_date <= b.end_date
    and b.start_date <= a.end_date
  where a.id < b.id;

  if v_overlapping > 0 then
    raise exception
      'DRESS_BLOCKS_HARDENING_ABORT: % par(es) de bloqueos se superponen para el mismo vestido. Limpialos manualmente antes de aplicar la exclusion constraint.',
      v_overlapping;
  end if;
end $$;

-- 5) Fill created_at for future rows without touching historical values.
alter table public.dress_blocks
  alter column created_at set default now();

-- 6) Reject inverted ranges at the database level.
alter table public.dress_blocks
  drop constraint if exists dress_blocks_dates_check;

alter table public.dress_blocks
  add constraint dress_blocks_dates_check
  check (start_date <= end_date);

-- 7) Prevent overlapping blocks for the same dress. Uses inclusive
--    daterange limits so touching ranges are also considered conflicts.
alter table public.dress_blocks
  drop constraint if exists dress_blocks_no_overlap_excl;

alter table public.dress_blocks
  add constraint dress_blocks_no_overlap_excl
  exclude using gist (
    dress_id with =,
    daterange(start_date, end_date, '[]') with &&
  );