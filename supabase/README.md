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
