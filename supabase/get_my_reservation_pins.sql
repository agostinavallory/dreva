-- ===========================================================================
-- DREVA reservations: RPC de lectura de PIN para la clienta autenticada
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
--
-- Objetivo:
--   Permitir que una clienta autenticada lea EXCLUSIVAMENTE los client_pin de
--   SUS propias reservas, sin exponer los PIN de otras clientas y sin depender
--   de los privilegios SELECT de la tabla.
--
-- Características:
--   * SECURITY DEFINER + SET search_path = '' (nombres totalmente calificados).
--   * Filtra obligatoriamente por public.reservations.user_id = auth.uid().
--   * Solo lee: no modifica estados, fechas, reservas ni PIN.
--   * NO altera RLS, ni funciones existentes, ni permisos SELECT de la tabla.
--
-- Nota: CREATE OR REPLACE es idempotente y preserva la firma. No usar DROP.
--   Los privilegios en funciones son aditivos: por defecto PUBLIC recibe
--   EXECUTE, por eso se revoca explícitamente de PUBLIC y anon.
-- ===========================================================================

begin;

create or replace function public.get_my_reservation_pins()
returns table (
  reservation_id uuid,
  client_pin text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Sin sesión no hay filas que devolver (defensa en profundidad).
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    r.id,
    r.client_pin
  from public.reservations r
  where r.user_id = auth.uid();
end;
$$;

-- EXECUTE: solo authenticated. PUBLIC y anon nunca.
revoke execute on function public.get_my_reservation_pins() from public;
revoke execute on function public.get_my_reservation_pins() from anon;
grant  execute on function public.get_my_reservation_pins() to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura; no modifica reservas)
-- ---------------------------------------------------------------------------
-- 1) Definición y flags (debe ser prosecdef=true y proconfig con search_path=)
-- select
--   pg_get_functiondef('public.get_my_reservation_pins()'::regprocedure) as definicion,
--   pg_get_function_result('public.get_my_reservation_pins()'::regprocedure) as resultado;

-- 2) Flags/ACL
-- select proname, prosecdef, proconfig, proacl
-- from pg_proc
-- where oid = 'public.get_my_reservation_pins()'::regprocedure;
--   -- esperado: prosecdef=true; proconfig ~ {search_path=}; proacl SIN "=X/" (PUBLIC)

-- 3) Permisos por rol
-- select
--   has_function_privilege('anon',          'public.get_my_reservation_pins()', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.get_my_reservation_pins()', 'execute') as auth_puede;
--   -- esperado: anon_puede=false; auth_puede=true

-- 4) Confirmar que el cuerpo filtra por user_id = auth.uid()
-- select pg_get_functiondef('public.get_my_reservation_pins()'::regprocedure)
--   like '%user_id = auth.uid()%' as filtra_por_uid;
