"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type ReservationStatus =
  | "pending"
  | "accepted"
  | "appointment_scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "expired";

type Reservation = {
  id: string;
  status: ReservationStatus;
  event_date: string | null;
  appointment_date: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at?: string | null;
  vestidos?: {
    nombre?: string | null;
    imagen?: string | null;
    precio?: string | number | null;
  } | null;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Solicitud pendiente",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita registrada",
  confirmed: "Reserva confirmada",
  completed: "Finalizada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  accepted: "bg-blue-50 text-blue-700 border-blue-100",
  appointment_scheduled: "bg-violet-50 text-violet-700 border-violet-100",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function formatDate(value: string | null, includeTime = false) {
  if (!value) {
    return "Sin definir";
  }

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDate
    ? new Date(Number(simpleDate[1]), Number(simpleDate[2]) - 1, Number(simpleDate[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: includeTime ? "short" : undefined,
  }).format(date);
}

function whatsappHref(reservation: Reservation) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const eventDate = reservation.event_date ?? "fecha a coordinar";
  const message = [
    "Hola, soy del local en DREVA.",
    `Quiero coordinar la cita de prueba por el vestido: ${dressName}.`,
    `Fecha del evento: ${eventDate}.`,
    `Referencia DREVA: RES-${reservation.id}.`,
  ].join(" ");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [appointmentDrafts, setAppointmentDrafts] = useState<Record<string, string>>({});
  const [pinDrafts, setPinDrafts] = useState<Record<string, string>>({});

  const stats = useMemo(() => {
    return reservations.reduce(
      (acc, reservation) => {
        acc.total += 1;
        acc[reservation.status] += 1;
        return acc;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        appointment_scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
      } as Record<ReservationStatus | "total", number>
    );
  }, [reservations]);

  const fetchReservations = useCallback(async (ownerId: string) => {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        event_date,
        appointment_date,
        accepted_at,
        expires_at,
        completed_at,
        cancelled_at,
        created_at,
        vestidos (
          nombre,
          imagen,
          precio
        )
      `
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DREVA dashboard] reservations fetch error", error);
      return [];
    }

    console.debug("[DREVA dashboard] reservations loaded", {
      ownerId,
      count: data?.length ?? 0,
    });

    return (data || []) as Reservation[];
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      return;
    }

    const data = await fetchReservations(userId);
    setReservations(data);
  }, [fetchReservations, userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (authLoading) {
        return;
      }

      if (!userId) {
        setReservations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await fetchReservations(userId);

      if (cancelled) {
        return;
      }

      setReservations(data);
      setLoading(false);
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchReservations, userId]);

  async function transitionReservation(
    id: string,
    action: "accept" | "reject" | "schedule" | "complete",
    appointmentDate?: string
  ) {
    setBusyId(id);
    console.debug("[DREVA dashboard] transition reservation", {
      id,
      action,
      appointmentDate,
    });

    const { error } = await supabase.rpc("transition_reservation", {
      p_reservation_id: id,
      p_action: action,
      p_appointment_date: appointmentDate || null,
    });

    if (error) {
      console.error("[DREVA dashboard] transition error", error);
      alert(error.message);
      setBusyId(null);
      return;
    }

    await reload();
    setBusyId(null);
  }

  async function validatePin(id: string) {
    const pin = pinDrafts[id]?.trim() ?? "";

    if (!/^\d{4}$/.test(pin)) {
      alert("Ingresa el codigo de 4 digitos que muestra la clienta.");
      return;
    }

    setBusyId(id);
    console.debug("[DREVA dashboard] validating client PIN", { id });

    const { error } = await supabase.rpc("validate_reservation_pin", {
      p_reservation_id: id,
      p_pin: pin,
    });

    if (error) {
      console.error("[DREVA dashboard] PIN validation error", error);
      alert("Codigo invalido o reserva no disponible para confirmar.");
      setBusyId(null);
      return;
    }

    setPinDrafts((current) => ({ ...current, [id]: "" }));
    await reload();
    setBusyId(null);
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">Cargando dashboard...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">No has iniciado sesion.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            Panel del local
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--ink)]">
            Dashboard del local
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Acepta o rechaza solicitudes, coordina la cita por WhatsApp, registra la fecha en DREVA y valida el codigo en tienda.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Pendientes" value={stats.pending} />
          <Metric label="Citas registradas" value={stats.appointment_scheduled} />
          <Metric label="Confirmadas" value={stats.confirmed} />
          <Metric label="Finalizadas" value={stats.completed} />
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-2xl border border-pink-100 bg-white p-6 text-sm text-[var(--muted)] shadow-sm">
            No hay solicitudes todavia.
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--ink)]">
                        {reservation.vestidos?.nombre ?? "Vestido DREVA"}
                      </h2>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[reservation.status]}`}
                      >
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[var(--primary)]">
                      Ref. DREVA RES-{reservation.id}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="Evento" value={formatDate(reservation.event_date)} />
                  <Info label="Cita registrada" value={formatDate(reservation.appointment_date)} />
                  <Info label="Expira" value={formatDate(reservation.expires_at, true)} />
                </div>

                <ReservationActions
                  reservation={reservation}
                  busy={busyId === reservation.id}
                  appointmentDraft={appointmentDrafts[reservation.id] ?? ""}
                  pinDraft={pinDrafts[reservation.id] ?? ""}
                  setAppointmentDraft={(value) =>
                    setAppointmentDrafts((current) => ({
                      ...current,
                      [reservation.id]: value,
                    }))
                  }
                  setPinDraft={(value) =>
                    setPinDrafts((current) => ({
                      ...current,
                      [reservation.id]: value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  onTransition={transitionReservation}
                  onValidatePin={validatePin}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs font-medium text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-pink-50 px-4 py-3">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function ReservationActions({
  reservation,
  busy,
  appointmentDraft,
  pinDraft,
  setAppointmentDraft,
  setPinDraft,
  onTransition,
  onValidatePin,
}: {
  reservation: Reservation;
  busy: boolean;
  appointmentDraft: string;
  pinDraft: string;
  setAppointmentDraft: (value: string) => void;
  setPinDraft: (value: string) => void;
  onTransition: (
    id: string,
    action: "accept" | "reject" | "schedule" | "complete",
    appointmentDate?: string
  ) => Promise<void>;
  onValidatePin: (id: string) => Promise<void>;
}) {
  if (reservation.status === "pending") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          onClick={() => onTransition(reservation.id, "accept")}
          disabled={busy}
          className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Procesando..." : "Aceptar disponibilidad"}
        </button>
        <button
          onClick={() => onTransition(reservation.id, "reject")}
          disabled={busy}
          className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Rechazar solicitud
        </button>
      </div>
    );
  }

  if (reservation.status === "accepted") {
    return (
      <div className="mt-4 space-y-3">
        <a
          href={whatsappHref(reservation)}
          target="_blank"
          className="block rounded-2xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Coordinar cita por WhatsApp
        </a>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="date"
            value={appointmentDraft}
            onChange={(event) => setAppointmentDraft(event.target.value)}
            className="rounded-2xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-black"
          />
          <button
            onClick={() => onTransition(reservation.id, "schedule", appointmentDraft)}
            disabled={busy || !appointmentDraft}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Registrar cita en DREVA
          </button>
        </div>
      </div>
    );
  }

  if (reservation.status === "appointment_scheduled") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          inputMode="numeric"
          maxLength={4}
          placeholder="Codigo de 4 digitos"
          value={pinDraft}
          onChange={(event) => setPinDraft(event.target.value)}
          className="rounded-2xl border border-pink-200 px-4 py-3 text-sm tracking-[0.2em] outline-none focus:border-black"
        />
        <button
          onClick={() => onValidatePin(reservation.id)}
          disabled={busy}
          className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Validar codigo en tienda
        </button>
      </div>
    );
  }

  if (reservation.status === "confirmed") {
    return (
      <div className="mt-4">
        <button
          onClick={() => onTransition(reservation.id, "complete")}
          disabled={busy}
          className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Marcar finalizacion
        </button>
      </div>
    );
  }

  return (
    <p className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
      Reserva cerrada. No quedan acciones pendientes.
    </p>
  );
}
