-- DREVA vestidos largo attribute
-- Run this in Supabase SQL editor before using the dashboard field.

alter table public.vestidos
  add column if not exists largo text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vestidos_largo_check'
      and conrelid = 'public.vestidos'::regclass
  ) then
    alter table public.vestidos
      add constraint vestidos_largo_check
      check (largo is null or largo in ('Corto', 'Midi', 'Largo'));
  end if;
end $$;
