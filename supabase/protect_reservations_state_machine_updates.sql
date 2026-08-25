-- DREVA reservations state machine protection
-- Run this in Supabase SQL Editor after verifying that reservation state
-- changes are performed through the RPCs below.
--
-- Expected application writes to public.reservations:
-- - clients insert pending reservations directly;
-- - locals change reservation states through transition_reservation;
-- - locals confirm PINs through validate_reservation_pin.

drop policy if exists "Owners can operate their reservations" on public.reservations;

revoke update on public.reservations from anon;
revoke update on public.reservations from authenticated;

grant execute on function public.transition_reservation(uuid, text, timestamptz) to authenticated;
grant execute on function public.validate_reservation_pin(uuid, text) to authenticated;

select
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'reservations'
order by policyname;
