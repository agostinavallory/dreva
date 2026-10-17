-- ===========================================================================
-- DREVA: retirar el acceso a la RPC antigua validate_reservation_pin.
--
-- ###########################################################################
-- #  NO EJECUTAR ESTE ARCHIVO ANTES DE MIGRAR Y PROBAR EL FRONTEND.          #
-- #                                                                         #
-- #  El dashboard del local todavía llama a validate_reservation_pin.      #
-- #  Si se revoca EXECUTE antes de que el frontend use                     #
-- #  confirm_reservation_with_pin, la confirmación presencial se ROMPE.     #
-- #                                                                         #
-- #  Orden obligatorio:                                                     #
-- #    1) Ejecutar supabase/pin_attempt_limit.sql                           #
-- #    2) Migrar app/dashboard/reservas/[id]/page.tsx y probar              #
-- #    3) Ejecutar ESTE archivo                                             #
-- ###########################################################################
--
-- Motivo: validate_reservation_pin (la RPC antigua) confirma la reserva sin
-- límite de intentos. Mientras siga siendo ejecutable, permite saltarse el
-- control implementado en confirm_reservation_with_pin.
--
-- Alcance: SOLO revocar EXECUTE de la RPC antigua para PUBLIC, anon y
--   authenticated. NO se elimina (drop) físicamente la función todavía.
-- ===========================================================================

begin;

-- Cubre PUBLIC (herencia por defecto), anon y authenticated.
revoke execute on function public.validate_reservation_pin(uuid, text) from public;
revoke execute on function public.validate_reservation_pin(uuid, text) from anon;
revoke execute on function public.validate_reservation_pin(uuid, text) from authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura)
-- ---------------------------------------------------------------------------
-- a) Permisos de ejecución (esperado: ambas false).
--    PUBLIC no es un rol consultable en has_function_privilege; todo rol hereda
--    de PUBLIC, así que si anon y authenticated quedan en false, PUBLIC tampoco
--    puede ejecutarla.
-- select
--   has_function_privilege('anon',          'public.validate_reservation_pin(uuid,text)', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.validate_reservation_pin(uuid,text)', 'execute') as auth_puede;

-- b) ACL cruda: no debe contener "=X/" (EXECUTE a PUBLIC).
-- select proname, proacl
-- from pg_proc where oid = 'public.validate_reservation_pin(uuid,text)'::regprocedure;

-- c) Confirmar que la RPC nueva sigue ejecutable por authenticated.
-- select
--   has_function_privilege('authenticated', 'public.confirm_reservation_with_pin(uuid,text)', 'execute') as nueva_auth_puede;

-- d) Recargar caché de PostgREST
-- notify pgrst, 'reload schema';
