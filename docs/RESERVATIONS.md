# DREVA Reservations Snapshot

Este documento registra el flujo de reservas actualmente usado por el MVP. No reemplaza las migraciones ni crea nuevas reglas; sirve como referencia funcional para mantener estabilidad.

## Estados

Los estados actuales son:

- `pending`
- `accepted`
- `appointment_scheduled`
- `confirmed`
- `completed`
- `cancelled`
- `expired`

## Flujo Actual

1. La clienta solicita un vestido desde `RequestDressButton`.
2. Se crea una fila en `reservations` con estado `pending`.
3. El local ve la solicitud en `/dashboard`.
4. El local puede aceptar o rechazar.
5. Si acepta, la reserva pasa a `accepted`.
6. La cita se coordina por WhatsApp.
7. El local registra la cita en DREVA y la reserva pasa a `appointment_scheduled`.
8. La clienta ve su código en `/my-reservations`.
9. El local valida el código y la reserva pasa a `confirmed`.
10. El local marca la reserva como finalizada y pasa a `completed`.

## Estados Terminales

Son terminales para la interfaz actual:

- `completed`
- `cancelled`
- `expired`

## Tabla `reservations`

Campos usados actualmente por el frontend:

- `id`
- `status`
- `event_date`
- `appointment_date`
- `client_pin`
- `created_at`
- `dress_id`
- `owner_id`
- `accepted_at`
- `expires_at`
- `completed_at`
- `cancelled_at`

Campos relacionales consultados:

- `vestidos.nombre`
- `vestidos.imagen`
- `vestidos.precio`
- `locales.nombre`

## RPCs Actuales

### `transition_reservation`

Usada por el dashboard del local para:

- `accept`
- `reject`
- `schedule`
- `complete`

### `validate_reservation_pin`

Usada por el dashboard del local para confirmar una reserva con el código de la clienta.

## Bloqueo De Disponibilidad Actual

El código actual considera bloqueantes:

- `accepted`
- `appointment_scheduled`
- `confirmed`

`RequestDressButton` revisa si existe una reserva bloqueante para el mismo `dress_id` y `event_date` antes de crear una solicitud. El script SQL existente también define un índice único parcial para evitar más de una reserva activa bloqueante por vestido y fecha.

## Pantallas Que Leen Reservas

### Clienta

`app/my-reservations/page.tsx`

Muestra:

- estado
- vestido
- local
- fecha del evento
- cita registrada
- timeline
- WhatsApp cuando corresponde
- código de confirmación cuando corresponde

### Local

`app/dashboard/page.tsx`

Permite:

- aceptar disponibilidad
- rechazar solicitud
- coordinar por WhatsApp
- registrar cita
- validar código
- marcar finalización

## Límites Conocidos

- La expiración automática la ejecuta `pg_cron` cada 10 minutos mediante el job `expire-stale-reservations` (ver `supabase/expire_reservations_cron.sql`).
- El código de confirmación se genera actualmente desde el cliente.
- La clienta no tiene cancelación propia desde `my-reservations`.
- La navegación por rol depende de metadata si está disponible.
- No existe gestión completa de inventario desde el dashboard.
