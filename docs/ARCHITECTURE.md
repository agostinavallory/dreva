# DREVA Architecture Snapshot

Estado documentado para la Fase A de estabilización segura. Este documento describe lo que existe hoy en el proyecto; no introduce tablas, migraciones ni cambios de negocio.

## Stack

- Next.js 16 con App Router en `app/`.
- React 19.
- Supabase JS v2 como cliente de datos y autenticación.
- Tailwind CSS v4.

## Estructura Principal

- `app/page.tsx`: home y catálogo público.
- `app/detalle/[id]/page.tsx`: detalle de vestido y punto de solicitud.
- `app/login/page.tsx`: inicio de sesión.
- `app/register/page.tsx`: registro.
- `app/favorites/page.tsx`: favoritos funcionales.
- `app/favoritos/page.tsx`: ruta heredada que redirige a `/favorites`.
- `app/profile/page.tsx`: perfil básico con favoritos.
- `app/my-reservations/page.tsx`: vista de reservas de la clienta.
- `app/dashboard/page.tsx`: dashboard funcional del local.
- `app/admin/page.tsx`: placeholder visual, no operativo.
- `app/components/`: componentes compartidos de navegación, catálogo, filtros, favoritos y solicitud.
- `lib/supabaseClient.ts`: cliente Supabase compartido.
- `supabase/`: scripts SQL existentes para favoritos y reservas.

## Autenticación

`app/providers/AuthProvider.tsx` centraliza:

- sesión actual
- usuario actual
- estado de carga
- cierre de sesión

El provider está montado en `app/layout.tsx`, por lo que las pantallas cliente pueden usar `useAuth()`.

## Supabase Actual

El proyecto usa un cliente Supabase único en `lib/supabaseClient.ts`.

Tablas utilizadas actualmente por el frontend:

- `vestidos`
- `favorites`
- `reservations`
- `locales`

RPCs utilizadas actualmente:

- `transition_reservation`
- `validate_reservation_pin`

Scripts SQL locales existentes:

- `supabase/favorites_rls.sql`
- `supabase/reservations_state_machine.sql`

## Rutas Oficiales

- `/`: catálogo.
- `/detalle/[id]`: detalle de vestido.
- `/favorites`: favoritos.
- `/favoritos`: compatibilidad heredada, redirige a `/favorites`.
- `/profile`: perfil básico.
- `/my-reservations`: reservas de la clienta.
- `/dashboard`: operación del local.
- `/login`: inicio de sesión.
- `/register`: registro.
- `/admin`: placeholder.

## Riesgos Conocidos

- El modelo de roles todavía no está formalizado en una tabla local.
- El dashboard se muestra en navegación solo si el rol existe en metadata del usuario.
- La disponibilidad real no está conectada al buscador del home.
- `/admin` no debe considerarse operativo.
- El esquema completo de Supabase no está representado en migraciones locales.

## Reglas De Esta Fase

- No modificar tablas.
- No modificar migraciones.
- No modificar RPCs.
- No modificar `AuthProvider`.
- No alterar la lógica de disponibilidad.
- No alterar el flujo de reservas existente.
