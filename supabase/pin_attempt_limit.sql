-- ===========================================================================
-- DREVA reservations: límite de intentos del PIN (5 fallos -> bloqueo 15 min)
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
--
-- Alcance de ESTE archivo (aditivo, no rompe nada):
--   1) Nuevas columnas persistentes en public.reservations.
--   2) Constraint de no-negatividad, SIN eliminar restricciones preexistentes.
--   3) Nueva RPC public.confirm_reservation_with_pin(uuid, text) -> jsonb.
--   4) Permisos EXECUTE de la RPC nueva (solo authenticated).
--
-- NO revoca la RPC antigua validate_reservation_pin: eso ocurre en un segundo
-- archivo (supabase/revoke_legacy_validate_pin.sql), DESPUÉS de migrar y probar
-- el frontend. Mientras ambos existan, la RPC vieja sigue sin límite: es
-- intencional durante la transición.
--
-- Reglas de negocio conservadas respecto de la versión vigente:
--   * Autorización del propietario (null-safe).
--   * Estados permitidos: 'accepted', 'appointment_scheduled'.
--   * Vencimiento de coordinación 48h SOLO para 'accepted'
--     ('appointment_scheduled' exento).
--   * FOR UPDATE para serializar intentos concurrentes.
--   * PIN null-safe con formato ^[0-9]{4}$.
--   * NO se lanza excepción por PIN incorrecto ni por bloqueo activo, para que
--     los contadores se persistan (un RAISE revertiría la transacción).
-- ===========================================================================

begin;

-- 1) Columnas persistentes del control de intentos.
alter table public.reservations
  add column if not exists pin_failed_attempts integer not null default 0,
  add column if not exists pin_locked_until timestamptz;

-- 1b) Constraint de no-negatividad.
--     Seguridad: si ya existe una constraint con ese nombre, NO se elimina.
--     - Si no existe: se crea.
--     - Si existe con la definición esperada: se conserva tal cual.
--     - Si existe con OTRA definición: se aborta la migración (raise -> rollback).
do $$
declare
  v_existing text;
begin
  select pg_get_constraintdef(oid)
  into v_existing
  from pg_constraint
  where conname = 'reservations_pin_failed_attempts_check'
    and conrelid = 'public.reservations'::regclass;

  if v_existing is null then
    alter table public.reservations
      add constraint reservations_pin_failed_attempts_check
      check (pin_failed_attempts >= 0);
  elsif v_existing !~ 'pin_failed_attempts\s*>=\s*0' then
    raise exception
      'Conflicto: reservations_pin_failed_attempts_check ya existe con una definición inesperada: %',
      v_existing;
  end if;
end $$;

-- 2) RPC nueva: confirmación presencial con límite de intentos.
--    SECURITY DEFINER + search_path vacío (nombres totalmente calificados).
--    Volátil (escribe). Devuelve JSONB para no revertir los contadores.
create or replace function public.confirm_reservation_with_pin(
  p_reservation_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations;
  v_dress_owner uuid;
  v_max_attempts constant integer := 5;
  v_lock_interval constant interval := interval '15 minutes';
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;                                   -- serializa intentos concurrentes

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

  -- Autorización del propietario (idéntica, null-safe).
  if auth.uid() is null
     or v_reservation.owner_id is distinct from v_dress_owner
     or v_dress_owner is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Estados permitidos (idénticos).
  if v_reservation.status not in ('accepted', 'appointment_scheduled') then
    raise exception 'Reservation cannot be confirmed from its current status';
  end if;

  -- Vencimiento de coordinación 48h SOLO para accepted (idéntico).
  if v_reservation.status = 'accepted'
     and (v_reservation.expires_at is null
          or v_reservation.expires_at <= now()) then
    raise exception 'Reservation has expired and can no longer be confirmed';
  end if;

  -- Bloqueo activo: NO comparar PIN, NO confirmar (ni con PIN correcto).
  if v_reservation.pin_locked_until is not null
     and v_reservation.pin_locked_until > now() then
    return pg_catalog.jsonb_build_object(
      'result', 'locked',
      'attempts_remaining', 0,
      'locked_until', v_reservation.pin_locked_until
    );
  end if;

  -- Bloqueo vencido: reiniciar ventana de intentos.
  if v_reservation.pin_locked_until is not null
     and v_reservation.pin_locked_until <= now() then
    update public.reservations
       set pin_failed_attempts = 0,
           pin_locked_until = null
     where id = p_reservation_id
     returning * into v_reservation;
  end if;

  -- PIN correcto y con formato válido -> confirmar y resetear contadores.
  if p_pin is not null
     and p_pin ~ '^[0-9]{4}$'
     and v_reservation.client_pin is not null
     and v_reservation.client_pin = p_pin then
    update public.reservations
       set status = 'confirmed',
           pin_failed_attempts = 0,
           pin_locked_until = null
     where id = p_reservation_id
     returning * into v_reservation;

    return pg_catalog.jsonb_build_object('result', 'confirmed');
  end if;

  -- PIN incorrecto / null / mal formato -> cuenta como intento fallido.
  -- NO se lanza excepción: el UPDATE debe commitear.
  if v_reservation.pin_failed_attempts + 1 >= v_max_attempts then
    update public.reservations
       set pin_failed_attempts = v_reservation.pin_failed_attempts + 1,
           pin_locked_until = now() + v_lock_interval
     where id = p_reservation_id
     returning * into v_reservation;

    return pg_catalog.jsonb_build_object(
      'result', 'locked',
      'attempts_remaining', 0,
      'locked_until', v_reservation.pin_locked_until
    );
  end if;

  update public.reservations
     set pin_failed_attempts = v_reservation.pin_failed_attempts + 1
   where id = p_reservation_id
   returning * into v_reservation;

  return pg_catalog.jsonb_build_object(
    'result', 'invalid_pin',
    'attempts_remaining', v_max_attempts - v_reservation.pin_failed_attempts
  );
end;
$$;

-- 3) EXECUTE: solo authenticated. PUBLIC y anon nunca.
revoke execute on function public.confirm_reservation_with_pin(uuid, text) from public;
revoke execute on function public.confirm_reservation_with_pin(uuid, text) from anon;
grant  execute on function public.confirm_reservation_with_pin(uuid, text) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura)
-- ---------------------------------------------------------------------------
-- a) Columnas nuevas
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='reservations'
--   and column_name in ('pin_failed_attempts','pin_locked_until');

-- b) Constraint esperada
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid='public.reservations'::regclass
--   and conname='reservations_pin_failed_attempts_check';

-- c) Flags/ACL de la RPC nueva (prosecdef=true; proconfig ~ {search_path=}; sin "=X/")
-- select proname, prosecdef, proconfig, proacl
-- from pg_proc where oid = 'public.confirm_reservation_with_pin(uuid,text)'::regprocedure;

-- d) Permisos de ejecución (anon=false, authenticated=true)
-- select
--   has_function_privilege('anon',          'public.confirm_reservation_with_pin(uuid,text)', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.confirm_reservation_with_pin(uuid,text)', 'execute') as auth_puede;

-- e) Columnas nuevas NO legibles directamente por la API (least privilege)
-- select
--   has_column_privilege('anon',          'public.reservations','pin_failed_attempts','SELECT') as anon_att,
--   has_column_privilege('authenticated', 'public.reservations','pin_locked_until',  'SELECT') as auth_lock;

-- f) Único punto que confirma (heurística: buscar 'confirmed' en definiciones)
-- select p.proname
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname='public' and pg_get_functiondef(p.oid) ilike '%confirmed%';

-- g) Triggers sobre reservations (solo el BEFORE INSERT esperado)
-- select tgname, pg_get_triggerdef(oid)
-- from pg_trigger where tgrelid='public.reservations'::regclass and not tgisinternal;

-- h) Recargar caché de PostgREST
-- notify pgrst, 'reload schema';
