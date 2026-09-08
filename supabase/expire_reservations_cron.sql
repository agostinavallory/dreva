-- DREVA expire_stale_reservations() scheduler
-- Run this in the Supabase SQL editor AFTER enabling the pg_cron extension
-- (enabled manually in Database > Extensions). Safe to run multiple times.

-- 1. Security: only the scheduler should execute expire_stale_reservations().
--    Normal users (anonymous or authenticated) must NOT call it, to avoid
--    arbitrary/global expirations of reservations owned by other locals.
revoke execute on function public.expire_stale_reservations() from public;
revoke execute on function public.expire_stale_reservations() from anon;
revoke execute on function public.expire_stale_reservations() from authenticated;

-- 2. Register a single pg_cron job named 'expire-stale-reservations' that runs
--    expire_stale_reservations() every 10 minutes. Idempotent: every existing
--    job with that name is unscheduled first, then exactly one new job is
--    created, so duplicates can never survive.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
      from cron.job
     where jobname = 'expire-stale-reservations'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'expire-stale-reservations',
    '*/10 * * * *',
    $cmd$select public.expire_stale_reservations();$cmd$
  );
end $$;