# Migraciones y configuración de Supabase (DREVA)

Este directorio reúne los scripts SQL y la documentación de la configuración de
Supabase usada por DREVA. Los scripts son **migraciones manuales**: no se
ejecutan automáticamente y deben revisarse antes de aplicarse.

> Esta documentación es descriptiva. **No ejecuta migraciones ni las sustituye.**
> Ningún script aquí se corre solo por abrir o leer este README.

## 1. Migraciones de roles

Ambas migraciones **ya fueron aplicadas manualmente** en el proyecto Supabase de
DREVA (SQL Editor, como `postgres`/superusuario). Se conservan por historial.

Orden histórico:

1. `profiles_role_formalization.sql` — formaliza `profiles.role`.
2. `roles_derive_from_locales.sql` — define el comportamiento vigente de roles.

`roles_derive_from_locales.sql` **debe ejecutarse después** de
`profiles_role_formalization.sql`. La definición de
`handle_new_user_profile()` del primer script queda **reemplazada** por la del
segundo.

Advertencias:

- **No reejecutar** `profiles_role_formalization.sql` sobre una base existente
  sin revisión: su backfill (pasos 4a–4c) puede **modificar roles existentes** y
  el paso 4c puede degradar a `clienta` una cuenta `local` cuyo registro en
  `locales` todavía no exista.
- Reejecutar `profiles_role_formalization.sql` **después** de
  `roles_derive_from_locales.sql` reintroduce la ruta de rol por metadata y por
  lo tanto es una regresión de seguridad.
- `roles_derive_from_locales.sql` es idempotente: usa `CREATE OR REPLACE` y
  `DROP TRIGGER IF EXISTS`, nunca degrada roles y no toca otras columnas.

### Modelo de roles actual

- `profiles.role` es el **rol formal** de la cuenta. Valores permitidos **solo**
  `'clienta'` y `'local'` (CHECK + `NOT NULL`).
- Toda cuenta nueva empieza como `'clienta'`. La promoción a `'local'` ocurre
  **solo** cuando se inserta una fila comercial real en `locales` (trigger
  `AFTER INSERT` que promueve al dueño, en la misma transacción).
- `raw_user_meta_data.role` (controlado por el cliente) **no** autoriza ni
  define el rol.
- La autorización del dashboard **no** usa `profiles.role`: sigue dependiendo de
  que exista una fila en `locales` con `locales.owner_id = auth.uid()`.

## 2. Configuración de Storage (E0) — ya aplicada

Configuración aplicada manualmente (dashboard/API + policies en
`storage.objects`). No existe un script SQL ejecutable de Storage en este repo.

- **Bucket:** `vestidos` — **público**.
- **Tamaño máximo de archivo:** 5 MB.
- **Formatos permitidos:** JPEG, PNG, WebP (`image/jpeg`, `image/png`,
  `image/webp`).
- **Función:** `public.is_local_owner()` — `SECURITY DEFINER` con
  `search_path` vacío (`''`).
- **Políticas** en `storage.objects` (SELECT, INSERT, UPDATE, DELETE) limitadas
  a la carpeta `{auth.uid()}/`: cada dueño de local administra únicamente sus
  propios archivos.

### Lectura pública vs. administración de archivos

- **Lectura:** al ser un bucket público, los archivos se sirven por URL pública
  (`/storage/v1/object/public/...`) sin requerir sesión.
- **Administración:** crear, reemplazar o borrar archivos requiere sesión
  autenticada y solo se permite dentro de la carpeta `{auth.uid()}/` mediante
  las policies anteriores. Poder **ver** una imagen pública no implica poder
  **modificarla**.

## 3. Reconstrucción en otro proyecto Supabase

Cualquier reconstrucción en otro proyecto Supabase requiere **revisar y
reproducir explícitamente** esta configuración: crear el bucket con sus límites
y formatos, crear `public.is_local_owner()` y aplicar las cuatro policies de
`storage.objects`. Esta documentación **no** aplica esos cambios por sí sola.

## 4. Estado vigente de las migraciones y riesgo de regresión (H7)

> **No existe un registro formal de migraciones** en este repositorio (no hay carpeta
> `supabase/migrations/` ni tabla de control). El estado y el orden que se describen
> aquí se **infieren de los encabezados y del contenido de los scripts**; no
> representan un historial oficial de lo ejecutado en Supabase.

### 4.1 Advertencia: no reejecutar migraciones históricas a ciegas

Varios scripts antiguos usan `DROP FUNCTION` + `CREATE FUNCTION` y definen versiones
**anteriores** de las funciones de reservas. Reejecutarlos puede **revertir
protecciones ya aplicadas**:

- Restaurar la autorización **no null-safe** (`<> auth.uid()`), que deja pasar a `anon`.
- Eliminar la **ventana de coordinación de 48 horas** y el **rechazo de citas en el pasado**.
- Re-otorgar `EXECUTE` a **PUBLIC** (el `DROP` + `CREATE` vuelve a aplicar el permiso por defecto).

Archivos con `DROP` + `CREATE` sobre `transition_reservation` y/o
`validate_reservation_pin` (históricos):

| Archivo | Funciones que eliminan y recrean |
|---|---|
| `reservations_state_machine.sql` | `transition_reservation`, `validate_reservation_pin` |
| `protect_reservation_ownership_integrity.sql` | `transition_reservation`, `validate_reservation_pin` |
| `fix_appointment_date_timestamptz.sql` | `transition_reservation` |

Además, reejecutar `reservations_state_machine.sql` vuelve a conceder
`expire_stale_reservations()` a `authenticated`, deshaciendo la restricción de
`expire_reservations_cron.sql`.

Los **endurecimientos posteriores** sí usan `CREATE OR REPLACE` (no `DROP`) y son
los que definen el comportamiento vigente:
`harden_reservation_rpc_authz.sql`, `reservations_expiry_guard.sql`,
`fix_validate_reservation_pin_null_bypass.sql`, `schedule_future_appointment_guard.sql`.

### 4.2 `transition_reservation` — versión vigente

La versión vigente **conocida** corresponde a `schedule_future_appointment_guard.sql`,
que reemplaza (con `CREATE OR REPLACE`) la de `reservations_expiry_guard.sql`. Incluye:

- autorización **null-safe** (`auth.uid() is null` + `IS DISTINCT FROM`);
- validación de **estados** y acciones (`accept`, `reject`, `cancel`, `schedule`, `complete`);
- **ventana de coordinación de 48 horas** para `accepted`;
- **rechazo de citas en el pasado** en `schedule`;
- control de **disponibilidad** y **bloqueos manuales** (`dress_blocks`);
- `SECURITY DEFINER` con `search_path = public`;
- `EXECUTE` limitado a **authenticated** (revocado de PUBLIC y anon).

### 4.3 `confirm_reservation_with_pin` — versión vigente

Proviene de `pin_attempt_limit.sql`. Confirma una reserva con el PIN de la clienta y
aplica un **límite de 5 intentos fallidos**, tras lo cual **bloquea temporalmente 15
minutos**. Devuelve JSONB para no revertir los contadores. `EXECUTE` limitado a
authenticated.

### 4.4 `validate_reservation_pin` — función legacy (deshabilitada)

Es una función antigua. Su cuerpo vigente, si se consulta, proviene de
`fix_validate_reservation_pin_null_bypass.sql` (que cierra el bypass de PIN `NULL`),
pero `revoke_legacy_validate_pin.sql` **revocó su `EXECUTE` para PUBLIC, anon y
authenticated**: ya no debería poder ejecutarse. La sustituye
`confirm_reservation_with_pin`. No se eliminó físicamente todavía.

### 4.5 Generación e inserción del PIN

- `client_pin_server_generation.sql`: el PIN se genera **en PostgreSQL**
  (`generate_client_pin()`, 4 dígitos, CSPRNG) como `DEFAULT` de
  `reservations.client_pin`, que además pasa a `NOT NULL`.
- `restrict_reservation_pin_insert.sql`: **impide que `authenticated` inserte
  `client_pin` explícitamente** (revoca INSERT y concede solo las columnas legítimas),
  evitando la suplantación del PIN desde la API.

### 4.6 Dependencias inferidas del código

> Orden **deducido de los encabezados de los scripts**, no de un registro de ejecución.

- Reservas: `reservations_state_machine.sql` → `protect_reservation_ownership_integrity.sql`
  → `fix_appointment_date_timestamptz.sql` → `protect_reservations_state_machine_updates.sql`
  → `expire_reservations_cron.sql` → `get_reservation_client_profile.sql`
  → `harden_reservation_rpc_authz.sql` → `reservations_expiry_guard.sql`
  → `fix_validate_reservation_pin_null_bypass.sql` → `schedule_future_appointment_guard.sql`.
- PIN: `client_pin_server_generation.sql` → `restrict_reservation_pin_insert.sql`;
  aparte, `pin_attempt_limit.sql` → (migrar y probar el frontend) → `revoke_legacy_validate_pin.sql`.
- Roles: `profiles.sql` → `profiles_backfill.sql` → `profiles_role_formalization.sql`
  → `roles_derive_from_locales.sql` (vigente).
- Independientes: `favorites_rls.sql`, `dress_blocks_hardening.sql` (requiere `btree_gist`),
  `vestidos_largo.sql`, `vestidos_activation_and_history.sql`, `get_my_reservation_pins.sql`,
  `protect_reservation_pin_read.sql`.

### 4.7 Configuración manual no versionada

Parte de la configuración se aplicó **manualmente en Supabase** y **no está representada
por completo** en los scripts SQL de este repositorio:

- El **bucket `vestidos`** y sus límites/formatos (sección 2).
- La función `public.is_local_owner()` y las **policies de `storage.objects`** (no existe
  un script SQL versionado que las cree).
- La habilitación de **`pg_cron`** y de la extensión **`btree_gist`** (se habilitan desde
  el dashboard/Extensiones; los scripts de la sección 4.6 solo crean sus objetos).

## 5. Consultas de verificación (solo lectura)

Ejecutar en el SQL Editor. **Ninguna de estas consultas modifica datos.**

Definición y configuración de `transition_reservation`:

```sql
select pg_get_functiondef('public.transition_reservation(uuid,text,timestamptz)'::regprocedure);

select prosrc, prosecdef, proconfig, proacl
from pg_proc
where oid = 'public.transition_reservation(uuid,text,timestamptz)'::regprocedure;

-- Debe devolver true: la validación de fecha futura está instalada.
select pg_get_functiondef('public.transition_reservation(uuid,text,timestamptz)'::regprocedure)
       like '%Appointment date cannot be in the past%' as tiene_guarda_futura;
```

Permisos `EXECUTE` efectivos:

```sql
select
  has_function_privilege('anon',          'public.transition_reservation(uuid,text,timestamptz)', 'execute') as transition_anon,
  has_function_privilege('authenticated', 'public.transition_reservation(uuid,text,timestamptz)', 'execute') as transition_auth,
  has_function_privilege('authenticated', 'public.confirm_reservation_with_pin(uuid,text)',       'execute') as confirm_auth,
  has_function_privilege('anon',          'public.confirm_reservation_with_pin(uuid,text)',       'execute') as confirm_anon,
  has_function_privilege('authenticated', 'public.validate_reservation_pin(uuid,text)',           'execute') as legacy_auth;
-- Esperado: transition_anon=false, transition_auth=true,
--           confirm_auth=true, confirm_anon=false, legacy_auth=false.
```

`client_pin` bloqueado a SELECT e INSERT directos:

```sql
select
  has_column_privilege('authenticated', 'public.reservations', 'client_pin', 'SELECT') as auth_select_pin,
  has_column_privilege('authenticated', 'public.reservations', 'client_pin', 'INSERT') as auth_insert_pin,
  has_column_privilege('anon',          'public.reservations', 'client_pin', 'SELECT') as anon_select_pin,
  has_column_privilege('anon',          'public.reservations', 'client_pin', 'INSERT') as anon_insert_pin;
-- Esperado: todas false.
```

Existencia de las funciones actuales:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'transition_reservation',
    'validate_reservation_pin',
    'confirm_reservation_with_pin',
    'generate_client_pin',
    'get_my_reservation_pins',
    'get_reservation_client_profile',
    'expire_stale_reservations'
  )
order by p.proname;
```

Job del cron (si aplica):

```sql
select jobid, jobname, schedule, command
from cron.job
where jobname = 'expire-stale-reservations';
```

> Consultar `cron.job` puede requerir permisos adecuados: la extensión `pg_cron`
> expone el esquema `cron`, al que no todos los roles tienen acceso de lectura.
> Si la consulta devuelve un error de permisos, ejecutarla con un rol que pueda
> leer ese esquema (p. ej. `postgres`/superusuario en el SQL Editor).

## 6. Procedimiento seguro para futuras modificaciones

1. **Auditar**: revisar el estado vigente con las consultas de la sección 5.
2. **Proponer**: describir el cambio y su impacto en autorización, `search_path`,
   permisos y dependencias.
3. **Ejecutar**: aplicar el SQL **manualmente** en el SQL Editor de Supabase tras revisión.
4. **Verificar**: volver a correr las consultas de solo lectura de la sección 5.
5. **Probar**: validar el flujo afectado en la aplicación.
6. **Commit**: registrar el script en el repositorio con un mensaje claro.
7. **Push**: publicar en la rama correspondiente.

## 7. Reglas para modificar funciones `SECURITY DEFINER`

- Preservar **autorización**, **`search_path`** y **permisos** existentes.
- Usar **`CREATE OR REPLACE FUNCTION`** en lugar de `DROP` + `CREATE` siempre que la
  firma no cambie: `CREATE OR REPLACE` conserva el OID y la ACL (el `DROP` re-otorga
  `EXECUTE` a PUBLIC).
- Si **es imprescindible** cambiar la firma (lo que obliga a `DROP`), reaplicar el bloque
  `REVOKE`/`GRANT` **en el mismo script**, inmediatamente después del `DROP` + `CREATE`.
- No alterar el comportamiento de funciones de las que dependen otras (p. ej.
  `expire_stale_reservations()` y su cron).
- Documentar cada cambio nuevo en este README.
