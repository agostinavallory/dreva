-- ===========================================================================
-- DREVA reservations: restringir el INSERT del PIN (anti-suplantación)
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
--
-- ###########################################################################
-- #  ADVERTENCIA: EJECUTAR SOLO DESPUÉS DE ADAPTAR Y PROBAR                 #
-- #  RequestDressButton.tsx (dejar de enviar client_pin en el INSERT).      #
-- #                                                                         #
-- #  Mientras el frontend siga enviando client_pin, aplicar este archivo    #
-- #  hace que TODA creación de solicitud falle con:                         #
-- #    ERROR: permission denied for column client_pin                       #
-- ###########################################################################
--
-- Alcance EXCLUSIVO de este archivo:
--   1) REVOKE INSERT (nivel tabla) para PUBLIC, anon y authenticated.
--   2) GRANT INSERT solo de las columnas legítimas a authenticated.
--
-- NO modifica: SELECT (ni por columna), UPDATE/DELETE (update ya revocado en
--   una migración previa; delete sin política), permisos de postgres/
--   service_role, RLS, RPC, DEFAULT, NOT NULL, CHECK ni Storage.
--
-- Requiere que supabase/client_pin_server_generation.sql YA esté aplicado
--   (DEFAULT generate_client_pin() + EXECUTE para authenticated), para que el
--   INSERT de authenticated omitiendo client_pin siga funcionando.
-- ===========================================================================

begin;

-- 1) Revocar INSERT a nivel tabla.
--    Obligatorio a nivel tabla: un REVOKE de columna NO resta de un GRANT de
--    tabla. PUBLIC se incluye de forma defensiva (no recibe grants de tabla por
--    defecto); postgres/service_role conservan sus privilegios explícitos.
revoke insert on public.reservations from public;
revoke insert on public.reservations from anon;
revoke insert on public.reservations from authenticated;

-- 2) Conceder INSERT solo de las columnas necesarias para una solicitud.
--    client_pin queda NO otorgable => la API no puede fijar el PIN.
--    Las columnas omitidas toman su DEFAULT: id, created_at, client_pin,
--    pin_failed_attempts (0); el resto son nullable.
grant insert (dress_id, user_id, owner_id, event_date, status)
  on public.reservations
  to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura; ejecutar tras COMMIT)
-- ---------------------------------------------------------------------------
-- a) INSERT a nivel tabla (esperado: false para anon/authenticated)
-- select
--   has_table_privilege('anon',          'public.reservations', 'INSERT') as anon_tabla_insert,
--   has_table_privilege('authenticated', 'public.reservations', 'INSERT') as auth_tabla_insert;

-- b) INSERT por columna: las 5 legítimas true; client_pin false
-- select
--   has_column_privilege('authenticated','public.reservations','dress_id',  'INSERT') as dress_id,
--   has_column_privilege('authenticated','public.reservations','user_id',   'INSERT') as user_id,
--   has_column_privilege('authenticated','public.reservations','owner_id',  'INSERT') as owner_id,
--   has_column_privilege('authenticated','public.reservations','event_date','INSERT') as event_date,
--   has_column_privilege('authenticated','public.reservations','status',    'INSERT') as status,
--   has_column_privilege('authenticated','public.reservations','client_pin','INSERT') as client_pin;
--   -- esperado: true x5, client_pin=false

-- c) anon no puede insertar client_pin
-- select
--   has_column_privilege('anon','public.reservations','client_pin','INSERT') as anon_pin_insert;
--   -- esperado: false

-- d) SELECT de client_pin sigue denegado (no se tocó)
-- select
--   has_column_privilege('authenticated','public.reservations','client_pin','SELECT') as auth_pin_select;
--   -- esperado: false

-- e) DEFAULT ejecutable por authenticated: el INSERT sin client_pin debe poder
--    evaluar generate_client_pin(). Debe seguir true.
-- select
--   has_function_privilege('authenticated','public.generate_client_pin()', 'execute') as auth_puede_default;
--   -- esperado: true

-- f) service_role conserva INSERT (no modificado)
-- select
--   has_table_privilege('service_role','public.reservations','INSERT') as service_insert;

-- g) Recargar caché de PostgREST
-- notify pgrst, 'reload schema';
