-- ===========================================================================
-- DREVA reservations: impedir registrar citas con fecha/hora en el pasado
-- Migración manual: revisar y ejecutar en el Supabase SQL Editor.
-- PostgreSQL objetivo: 17.6 (Supabase).
--
-- ORDEN DE APLICACIÓN (importante):
--   Este script reemplaza public.transition_reservation(uuid, text, timestamptz)
--   y debe aplicarse DESPUÉS de las migraciones que la redefinen y endurecen:
--     reservations_state_machine.sql -> protect_reservation_ownership_integrity.sql
--     -> fix_appointment_date_timestamptz.sql -> harden_reservation_rpc_authz.sql
--     -> reservations_expiry_guard.sql -> (ESTE ARCHIVO).
--   Base de este archivo: la versión final y endurecida de
--   supabase/reservations_expiry_guard.sql (authz null-safe, ventana 48 h y
--   configuración de seguridad actuales). NO se usan versiones antiguas.
--
-- Alcance EXCLUSIVO de este archivo:
--   * Redefinir public.transition_reservation con CREATE OR REPLACE (misma firma,
--     mismos flags), agregando UNA sola validación nueva en la rama 'schedule':
--     rechazar p_appointment_date <= now().
--   * Reaplicar EXECUTE: revocar de PUBLIC y anon; conceder solo a authenticated.
--
-- Qué NO cambia:
--   * Autorización null-safe, estados permitidos, ventana de expiración 48 h,
--     validación de disponibilidad/bloqueos manuales, timestamps y mensajes.
--   * validate_reservation_pin, confirm_reservation_with_pin, RLS, triggers,
--     tablas y columnas.
--
-- Seguridad: CREATE OR REPLACE PRESERVA el OID y la ACL existente (no se usa
--   DROP, que re-otorgaría EXECUTE a PUBLIC). El REVOKE/GRANT del final es
--   idempotente (defensa en profundidad).
--
-- Frontera temporal: se usa `<= now()` (rechaza el instante exacto), coherente
--   con la frontera de expiración existente (`expires_at <= now()`). La
--   comparación es por instante (timestamptz), por lo que es independiente de la
--   zona horaria. Se permite el día actual si la hora es futura.
-- ===========================================================================

create or replace function public.transition_reservation(
  p_reservation_id uuid,
  p_action text,
  p_appointment_date timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_dress_owner uuid;
  v_can_check_manual_blocks boolean := false;
  v_has_manual_block boolean := false;
begin
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

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

  if auth.uid() is null
     or v_reservation.owner_id is distinct from v_dress_owner
     or v_dress_owner is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_action = 'accept' then
    if v_reservation.status <> 'pending' then
      raise exception 'Only pending reservations can be accepted';
    end if;

    if v_reservation.event_date is null
       or v_reservation.event_date < current_date then
      raise exception 'Reservation event date is no longer valid';
    end if;

    if exists (
      select 1
      from public.reservations r
      where r.id <> v_reservation.id
        and r.dress_id = v_reservation.dress_id
        and r.event_date = v_reservation.event_date
        and r.status in ('accepted', 'appointment_scheduled', 'confirmed')
    ) then
      raise exception 'Dress is already reserved for this event date';
    end if;

    if to_regclass('public.dress_blocks') is not null then
      select count(*) = 3
      into v_can_check_manual_blocks
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'dress_blocks'
        and column_name in ('dress_id', 'start_date', 'end_date');
    end if;

    if v_can_check_manual_blocks then
      execute
        'select exists (
          select 1
          from public.dress_blocks
          where dress_id = $1
            and start_date <= $2
            and end_date >= $2
        )'
      into v_has_manual_block
      using v_reservation.dress_id, v_reservation.event_date;

      if v_has_manual_block then
        raise exception 'Dress has a manual block for this event date';
      end if;
    elsif to_regclass('public.dress_blocks') is not null then
      raise notice 'Skipping dress_blocks validation because expected columns dress_id, start_date, end_date were not found.';
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

    -- NEW GUARD: coordination window elapsed (or missing) -> cannot register.
    if v_reservation.expires_at is null
       or v_reservation.expires_at <= now() then
      raise exception 'Reservation has expired and can no longer be scheduled';
    end if;

    if p_appointment_date is null then
      raise exception 'Appointment date is required';
    end if;

    -- NUEVA VALIDACIÓN: no registrar citas en el pasado. Permite el día actual
    -- si la hora es futura (comparación por instante, independiente de la TZ).
    if p_appointment_date <= now() then
      raise exception 'Appointment date cannot be in the past';
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

-- EXECUTE: solo authenticated. PUBLIC y anon nunca. Idempotente; reaplicado por
-- si en el futuro se hiciera un DROP + CREATE (que re-otorgaría a PUBLIC).
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from public;
revoke execute on function public.transition_reservation(uuid, text, timestamptz) from anon;
grant  execute on function public.transition_reservation(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura; ejecutar tras aplicar el script)
-- ---------------------------------------------------------------------------
-- a) Flags y ACL (esperado: prosecdef=true; proconfig ~ {search_path=public};
--    sin "=X/" para PUBLIC; authenticated con EXECUTE; anon sin EXECUTE)
-- select proname, prosecdef, proconfig, proacl
-- from pg_proc where oid = 'public.transition_reservation(uuid,text,timestamptz)'::regprocedure;
--
-- select
--   has_function_privilege('anon',          'public.transition_reservation(uuid,text,timestamptz)', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.transition_reservation(uuid,text,timestamptz)', 'execute') as auth_puede;
--   -- esperado: anon=false; authenticated=true
--
-- b) La definición contiene la nueva validación
-- select pg_get_functiondef('public.transition_reservation(uuid,text,timestamptz)'::regprocedure)
--   like '%Appointment date cannot be in the past%' as tiene_validacion_futura;
--
-- c) Recargar caché de PostgREST
-- notify pgrst, 'reload schema';
