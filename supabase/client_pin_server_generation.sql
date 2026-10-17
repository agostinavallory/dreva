-- ===========================================================================
-- DREVA reservations: generación segura del PIN en PostgreSQL
-- Migración manual (Supabase SQL Editor). REVISAR antes de ejecutar.
-- PostgreSQL objetivo: 17.6 (Supabase).
--
-- Alcance EXCLUSIVO de este archivo:
--   1) Función CSPRNG public.generate_client_pin() (4 dígitos, sin sesgo).
--   2) DEFAULT de reservations.client_pin -> public.generate_client_pin().
--   3) NOT NULL en client_pin.
--   4) EXECUTE del generador acotado a los roles que insertan.
--
-- NO toca los permisos INSERT de reservations: eso ocurre en el segundo archivo
--   (supabase/restrict_reservation_pin_insert.sql), DESPUÉS de adaptar y probar
--   RequestDressButton.tsx.
--
-- NO modifica: RLS, RPC de reservas, confirmación, contadores, bloqueo de
--   intentos, Storage, SELECT por columna, get_my_reservation_pins(), ni los
--   PIN/reservas existentes.
-- ===========================================================================

begin;

-- 1) Generador de PIN de 4 dígitos: CSPRNG + muestreo por rechazo (sin sesgo).
--
--    Fuente: pg_catalog.gen_random_uuid() (PostgreSQL >= 13; usa pg_strong_random,
--    criptográficamente seguro). De la representación textual del UUID v4 se
--    toman los primeros 4 dígitos hexadecimales = 16 bits uniformes.
--
--    Sesgo del módulo si se hiciera 'draw % 10000' directamente:
--      65536 = 6*10000 + 5536  =>  los valores 0..5535 saldrían 7 veces y
--      5536..9999 saldrían 6 veces (+6.81% / -8.45%). Muestreo por rechazo:
--      aceptar solo [0, 59999] (60000 = 6*10000) y repetir si >= 60000.
--      Aceptación ~91.55%, iteraciones esperadas ~1.09.
--
--    Nota sobre casts: ('x' || '1a2b')::bit(16) interpreta el string como
--    bit-string (cada dígito hex = 4 bits) y ::integer lo convierte a 0..65535.
create or replace function public.generate_client_pin()
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_draw integer;
begin
  loop
    v_draw := ('x' || pg_catalog.substr(
                 pg_catalog.gen_random_uuid()::text, 1, 4
               ))::bit(16)::integer;
    exit when v_draw < 60000;
  end loop;

  return pg_catalog.lpad((v_draw % 10000)::text, 4, '0');
end;
$$;

-- 2) DEFAULT seguro. SET DEFAULT solo afecta inserciones futuras: no reescribe
--    filas ni altera los PIN existentes.
alter table public.reservations
  alter column client_pin set default public.generate_client_pin();

-- 3) NOT NULL. Verificado previamente: 0 filas con client_pin NULL.
--    El CHECK existente reservations_client_pin_check (~ '^[0-9]{4}$') se
--    conserva intacto.
alter table public.reservations
  alter column client_pin set not null;

-- 4) EXECUTE del generador.
--    Necesario para poder evaluar el DEFAULT al insertar: el INSERT lo ejecuta
--    'authenticated' (API) y el DEFAULT invoca la función => debe poder
--    ejecutarla. service_role se incluye por inserciones del servidor.
--    anon y PUBLIC quedan fuera (anon no inserta: RLS exige auth.uid()).
revoke execute on function public.generate_client_pin() from public;
revoke execute on function public.generate_client_pin() from anon;
grant  execute on function public.generate_client_pin() to authenticated;
grant  execute on function public.generate_client_pin() to service_role;

commit;

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN POSTERIOR (solo lectura; ejecutar tras COMMIT)
-- ---------------------------------------------------------------------------
-- a) DEFAULT y NOT NULL de client_pin
-- select column_name, column_default, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name='reservations' and column_name='client_pin';
--   -- esperado: column_default ~ 'generate_client_pin()'; is_nullable = 'NO'

-- b) Flags del generador (esperado: prosecdef=false; proconfig ~ {search_path=})
-- select proname, prosecdef, proconfig, proacl
-- from pg_catalog.pg_proc
-- where oid = 'public.generate_client_pin()'::regprocedure;

-- c) EXECUTE por rol (esperado: anon=false; authenticated=true)
-- select
--   has_function_privilege('anon',          'public.generate_client_pin()', 'execute') as anon_puede,
--   has_function_privilege('authenticated', 'public.generate_client_pin()', 'execute') as auth_puede,
--   has_function_privilege('service_role',  'public.generate_client_pin()', 'execute') as service_puede;

-- d) CHECK de formato conservado
-- select conname, pg_get_constraintdef(oid)
-- from pg_catalog.pg_constraint
-- where conrelid='public.reservations'::regclass
--   and conname='reservations_client_pin_check';

-- e) Formato del generador (no inserta; solo lectura)
-- select public.generate_client_pin() from generate_series(1, 5);
--   -- esperado: 5 cadenas de 4 dígitos

-- f) Recargar caché de PostgREST
-- notify pgrst, 'reload schema';
