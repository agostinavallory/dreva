-- ===========================================================================
-- DREVA reservations: proteger client_pin ante lectura directa por la API.
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
--
-- Objetivo:
--   Impedir que PUBLIC, anon y authenticated consulten reservations.client_pin
--   por acceso directo (PostgREST/SQL), conservando las consultas legítimas y
--   la validación presencial vía RPC SECURITY DEFINER.
--
-- Estrategia:
--   Los privilegios son aditivos. Un GRANT SELECT a nivel tabla cubre TODAS
--   las columnas, por lo que revocar una sola columna NO surte efecto mientras
--   exista ese grant. Por eso: REVOKE SELECT de tabla + GRANT SELECT por
--   columnas (todas menos client_pin).
--
-- No se modifican: RLS, RPCs, INSERT/UPDATE, triggers, ni privilegios de
-- postgres/service_role.
--
-- ANTES DE EJECUTAR: confirmar la lista de columnas con information_schema
-- (ver verificaciones). Si reservations tiene columnas nuevas, incluirlas.
-- ===========================================================================

begin;

-- 1) Quitar el SELECT general de la tabla a los roles de la API.
--    (Defensa en profundidad: no-op si PUBLIC no tuviera grant.)
revoke select on public.reservations from public;
revoke select on public.reservations from anon;
revoke select on public.reservations from authenticated;

-- 1b) Revocar explícitamente cualquier SELECT de columna sobre client_pin.
--     (No-op si no existiera; cierra concesiones por columna preexistentes.)
revoke select (client_pin) on public.reservations from public, anon, authenticated;

-- 2) authenticated: todas las columnas EXCEPTO client_pin.
grant select (
  id,
  user_id,
  owner_id,
  dress_id,
  event_date,
  status,
  appointment_date,
  accepted_at,
  expires_at,
  completed_at,
  cancelled_at,
  created_at
) on public.reservations to authenticated;

-- 3) anon: solo columnas para la disponibilidad pública (HomeClient).
grant select (
  dress_id,
  event_date,
  status
) on public.reservations to anon;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura)
-- ---------------------------------------------------------------------------
-- a) Privilegio de tabla (ambos deben ser false)
-- select
--   has_table_privilege('anon',          'public.reservations', 'SELECT') as anon_tabla,
--   has_table_privilege('authenticated', 'public.reservations', 'SELECT') as auth_tabla;

-- b) client_pin denegado (ambos false)
-- select
--   has_column_privilege('anon',          'public.reservations', 'client_pin', 'SELECT') as anon_pin,
--   has_column_privilege('authenticated', 'public.reservations', 'client_pin', 'SELECT') as auth_pin;

-- c) columnas legítimas permitidas (true)
-- select
--   has_column_privilege('authenticated', 'public.reservations', 'status',  'SELECT') as auth_status,
--   has_column_privilege('authenticated', 'public.reservations', 'owner_id','SELECT') as auth_owner,
--   has_column_privilege('anon',          'public.reservations', 'dress_id','SELECT') as anon_dress;

-- d) INSERT intacto (debe seguir en true para authenticated)
-- select has_table_privilege('authenticated', 'public.reservations', 'INSERT') as auth_insert;

-- e) service_role y postgres intactos (deben seguir en true)
-- select
--   has_table_privilege('service_role', 'public.reservations', 'SELECT') as service_select,
--   has_table_privilege('postgres',     'public.reservations', 'SELECT') as postgres_select;

-- f) RLS/policies sin cambios
-- select policyname, cmd, qual, with_check
-- from pg_policies where schemaname='public' and tablename='reservations';

-- g) RPC SECURITY DEFINER siguen siendo definer
-- select proname, prosecdef
-- from pg_proc
-- where proname in ('validate_reservation_pin','get_my_reservation_pins','get_reservation_client_profile');

-- h) Ningún rol de la API tiene SELECT efectivo sobre client_pin.
--    (has_column_privilege devuelve true si hubiera grant de tabla o de columna,
--     por lo que este chequeo cubre ambas vías y la herencia de roles.
--     PUBLIC no es un rol consultable en has_column_privilege, pero todo rol
--     hereda de PUBLIC: si PUBLIC tuviera grant, anon/authenticated darían true.)
-- select
--   not has_column_privilege('anon',          'public.reservations', 'client_pin', 'SELECT') as anon_pin_bloqueado,
--   not has_column_privilege('authenticated', 'public.reservations', 'client_pin', 'SELECT') as auth_pin_bloqueado;

-- i) Opcional: recargar caché de PostgREST
-- notify pgrst, 'reload schema';
