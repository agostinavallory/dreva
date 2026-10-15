-- ===========================================================================
-- DREVA vestidos: activación/desactivación + protección del historial de reservas
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
-- Transacción atómica: si algo no coincide con lo esperado, ABORTA y revierte todo.
-- NO toca RLS, Storage, las RPC de estado ni el cron.
--
-- Efectos:
--   1) vestidos.activo (bool, default true)          -> vestidos actuales quedan activos.
--   2) reservations_dress_id_fkey -> ON DELETE RESTRICT (antes CASCADE).
--   3) Trigger BEFORE INSERT en reservations          -> bloquea NUEVAS reservas sobre
--      vestidos inactivos. NO afecta UPDATE (transiciones, cancelaciones, cron).
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) VERIFICACIÓN PREVIA (ejecutar aparte y revisar ANTES de este bloque)
-- ---------------------------------------------------------------------------
-- a) ¿Ya existe la columna?
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='vestidos' and column_name='activo';
--
-- b) Definición EXACTA de la FK (debe existir, 1 columna, hacia vestidos(id))
-- select conname, contype, confrelid::regclass, conkey, confkey, confdeltype
-- from pg_catalog.pg_constraint
-- where conrelid='public.reservations'::regclass and conname='reservations_dress_id_fkey';
--
-- c) Volumen / coherencia
-- select count(*) as vestidos from public.vestidos;
-- select count(*) as reservas from public.reservations;
-- select count(*) filter (where dress_id is null)     as reservas_sin_vestido from public.reservations;
-- select count(*) filter (where dress_id is not null) as reservas_con_vestido from public.reservations;
--
-- d) Trigger preexistente (no debería existir todavía)
-- select tgname from pg_catalog.pg_trigger
-- where tgrelid='public.reservations'::regclass and not tgisinternal;

-- ---------------------------------------------------------------------------
-- 1) Columna activo (aditiva; las filas actuales quedan activas)
-- ---------------------------------------------------------------------------
alter table public.vestidos
  add column if not exists activo boolean not null default true;

comment on column public.vestidos.activo is
  'Vestido visible y disponible para nuevas solicitudes. false = retirado del catálogo sin borrar historial.';

-- ---------------------------------------------------------------------------
-- 2) FK reservations_dress_id_fkey -> ON DELETE RESTRICT
--    Comprueba la definición conocida y ABORTA si no coincide.
--    No elimina restricciones desconocidas. Idempotente.
-- ---------------------------------------------------------------------------
do $$
declare
  v_relid       oid      := 'public.reservations'::regclass;
  v_vestidos    oid      := 'public.vestidos'::regclass;
  v_dress_att   smallint;
  v_id_att      smallint;
  v_contype     text;
  v_confdeltype text;
  v_confrelid   oid;
  v_conkey      smallint[];
  v_confkey     smallint[];
begin
  select attnum into v_dress_att
  from pg_catalog.pg_attribute
  where attrelid = v_relid and attname = 'dress_id' and not attisdropped;

  select attnum into v_id_att
  from pg_catalog.pg_attribute
  where attrelid = v_vestidos and attname = 'id' and not attisdropped;

  if v_dress_att is null or v_id_att is null then
    raise exception 'No se pudieron resolver las columnas dress_id / vestidos.id. Migración abortada.';
  end if;

  select contype::text, confdeltype::text, confrelid, conkey, confkey
  into v_contype, v_confdeltype, v_confrelid, v_conkey, v_confkey
  from pg_catalog.pg_constraint
  where conrelid = v_relid
    and conname  = 'reservations_dress_id_fkey';

  if not found then
    raise exception 'No existe la restricción reservations_dress_id_fkey en public.reservations. Migración abortada (no se eliminan restricciones desconocidas).';
  end if;

  if v_contype <> 'f'
     or v_confrelid <> v_vestidos
     or v_conkey <> array[v_dress_att]
     or v_confkey <> array[v_id_att] then
    raise exception 'reservations_dress_id_fkey no coincide con la definición esperada (1 columna dress_id -> vestidos(id)). Migración abortada.';
  end if;

  if v_confdeltype = 'c' then
    execute 'alter table public.reservations drop constraint reservations_dress_id_fkey';
    execute 'alter table public.reservations add constraint reservations_dress_id_fkey '
         || 'foreign key (dress_id) references public.vestidos (id) on delete restrict';
    raise notice 'reservations_dress_id_fkey recreada con ON DELETE RESTRICT.';
  elsif v_confdeltype in ('r', 'a') then
    raise notice 'reservations_dress_id_fkey ya protege el historial (confdeltype=%). Sin cambios.', v_confdeltype;
  else
    raise exception 'Acción ON DELETE inesperada (%) en reservations_dress_id_fkey. Migración abortada.', v_confdeltype;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) Trigger que impide NUEVAS reservas sobre vestidos inactivos
--    SECURITY DEFINER + search_path='' + referencias calificadas.
--    FOR SHARE: serializa contra el UPDATE de desactivación.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_reservation_inactive_dress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activo boolean;
begin
  if new.dress_id is not null then
    select v.activo
      into v_activo
      from public.vestidos v
     where v.id = new.dress_id
       for share;

    if found and not v_activo then
      raise exception 'Dress is not active and cannot receive new reservations';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservations_prevent_inactive_dress
  on public.reservations;

create trigger trg_reservations_prevent_inactive_dress
  before insert
  on public.reservations
  for each row
  execute function public.prevent_reservation_inactive_dress();

-- Higiene de ACL: seguro porque PostgreSQL no revalida EXECUTE de la función
-- trigger en runtime (la comprobación ocurre al crear el trigger, contra su
-- creador, que conserva los privilegios como owner).
revoke execute on function public.prevent_reservation_inactive_dress() from public, anon;

commit;

-- ---------------------------------------------------------------------------
-- 4) VERIFICACIÓN POSTERIOR
-- ---------------------------------------------------------------------------
-- a) Columna creada
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema='public' and table_name='vestidos' and column_name='activo';

-- b) FK con RESTRICT
-- select conname, pg_get_constraintdef(oid)
-- from pg_catalog.pg_constraint
-- where conrelid='public.reservations'::regclass and conname='reservations_dress_id_fkey';
--   -- esperado: FOREIGN KEY (dress_id) REFERENCES public.vestidos(id) ON DELETE RESTRICT

-- c) Trigger activo
-- select tgname, tgenabled from pg_catalog.pg_trigger
-- where tgrelid='public.reservations'::regclass and not tgisinternal;

-- d) Función con config correcta (prosecdef=true, proconfig search_path=)
-- select proname, prosecdef, proconfig from pg_catalog.pg_proc
-- where proname='prevent_reservation_inactive_dress';

-- e) Todos los vestidos actuales quedaron activos
-- select count(*) filter (where activo) as activos, count(*) as total from public.vestidos;

-- f) RLS intacta (comparar con la captura previa)
-- select relrowsecurity from pg_catalog.pg_class where oid='public.vestidos'::regclass;
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_catalog.pg_policies where tablename in ('vestidos','reservations')
-- order by tablename, policyname;
