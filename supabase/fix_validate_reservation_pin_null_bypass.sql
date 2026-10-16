-- ===========================================================================
-- DREVA reservations: close NULL-PIN bypass in validate_reservation_pin
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
--
-- Motivo:
--   La definición vigente (supabase/reservations_expiry_guard.sql) compara
--     if v_reservation.client_pin <> p_pin then raise 'Invalid PIN'
--   Cuando p_pin es NULL (o client_pin es NULL), `<>` produce NULL y el
--   IF no dispara el RAISE: un owner autenticado puede confirmar la reserva
--   enviando p_pin = NULL, saltando la prueba de presencia de la clienta.
--
-- Alcance: SOLO public.validate_reservation_pin(uuid, text).
--   * CREATE OR REPLACE sobre la MISMA firma: preserva el OID y su ACL.
--     NO usar DROP FUNCTION (re-otorgaría EXECUTE a PUBLIC).
--   * Se reproduce EXACTAMENTE el cuerpo de reservations_expiry_guard.sql
--     (autorización null-safe, FOR UPDATE, estados, vencimiento, transición);
--     el ÚNICO cambio es la comprobación del PIN, ahora null-safe y con
--     validación de formato.
--   * NO modifica transition_reservation, expire_stale_reservations,
--     ni los permisos SELECT de client_pin, ni RLS, ni el cron.
--
-- NO revertir controles: este archivo se basa en la versión de
--   reservations_expiry_guard.sql (la última aplicada). Ejecutarlo DESPUÉS de
--   harden_reservation_rpc_authz.sql y de reservations_expiry_guard.sql.
-- ===========================================================================

begin;

create or replace function public.validate_reservation_pin(
  p_reservation_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations;
  v_dress_owner uuid;
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

  -- Autorización del propietario (sin cambios, null-safe).
  if auth.uid() is null
     or v_reservation.owner_id is distinct from v_dress_owner
     or v_dress_owner is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Estados permitidos (sin cambios).
  if v_reservation.status not in ('accepted', 'appointment_scheduled') then
    raise exception 'Reservation cannot be confirmed from its current status';
  end if;

  -- Vencimiento para 'accepted' (sin cambios; appointment_scheduled exento).
  if v_reservation.status = 'accepted'
     and (v_reservation.expires_at is null
          or v_reservation.expires_at <= now()) then
    raise exception 'Reservation has expired and can no longer be confirmed';
  end if;

  -- COMPROBACIÓN SEGURA DEL PIN (único cambio):
  --   * p_pin NULL                  -> rechaza
  --   * p_pin con formato inválido  -> rechaza (se exige ^[0-9]{4}$)
  --   * client_pin NULL             -> rechaza
  --   * client_pin distinto         -> rechaza (IS DISTINCT FROM es null-safe)
  -- Todos los casos devuelven el MISMO mensaje para no filtrar detalles.
  if p_pin is null
     or p_pin !~ '^[0-9]{4}$'
     or v_reservation.client_pin is null
     or v_reservation.client_pin is distinct from p_pin then
    raise exception 'Invalid PIN';
  end if;

  update public.reservations
  set status = 'confirmed'
  where id = p_reservation_id
  returning * into v_reservation;

  return;
end;
$$;

-- Mantener EXECUTE solo para authenticated (idempotente, defensivo).
-- CREATE OR REPLACE ya preservó la ACL; esto evita cualquier deriva futura.
revoke execute on function public.validate_reservation_pin(uuid, text) from public;
revoke execute on function public.validate_reservation_pin(uuid, text) from anon;
grant  execute on function public.validate_reservation_pin(uuid, text) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura; no altera reservas)
-- ---------------------------------------------------------------------------
-- 1) Definición y flags de la función (debe haber UNA sola sobre (uuid,text))
-- select oid::regprocedure as firma, prosecdef, proconfig, proacl
-- from pg_proc
-- where proname = 'validate_reservation_pin';
--
-- 2) Cuerpo efectivo (confirmar null-safe + formato + expiry guard)
-- select pg_get_functiondef('public.validate_reservation_pin(uuid,text)'::regprocedure);
--
-- 3) Privilegios: anon NO; authenticated SÍ
-- select
--   has_function_privilege('anon',          'public.validate_reservation_pin(uuid,text)', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.validate_reservation_pin(uuid,text)', 'execute') as auth_puede;
--
-- 4) proacl no debe contener el grant implícito a PUBLIC (=X/)
-- select proacl
-- from pg_proc
-- where oid = 'public.validate_reservation_pin(uuid,text)'::regprocedure;
--
-- 5) Precondiciones de datos (no mutan nada)
-- select column_name, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='reservations'
--   and column_name in ('client_pin','expires_at','status');
--
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid='public.reservations'::regclass
--   and conname='reservations_client_pin_check';
