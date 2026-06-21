"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import DashboardNav from "@/app/components/DashboardNav";

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

const NEXT_STEPS: Record<ReservationStatus, string> = {
  pending: "Revisa la disponibilidad del vestido para aceptar o rechazar la solicitud.",
  accepted: "Espera a que la clienta te contacte por WhatsApp y registra la fecha acordada en DREVA.",
  appointment_scheduled: "Espera a la clienta en tienda y valida su codigo de 4 digitos.",
  confirmed: "Cuando termine el proceso, marca la reserva como finalizada.",
  completed: "Reserva finalizada. No quedan acciones pendientes.",
  cancelled: "Solicitud cancelada. Queda disponible como referencia historica.",
  expired: "Reserva expirada. No quedan acciones pendientes.",
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dressCount, setDressCount] = useState(0);
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

  const groupedReservations = useMemo(() => {
    return {
      pending: reservations.filter((reservation) => reservation.status === "pending"),
      waitingContact: reservations.filter(
        (reservation) => reservation.status === "accepted"
      ),
      scheduled: reservations.filter(
        (reservation) => reservation.status === "appointment_scheduled"
      ),
      confirmed: reservations.filter((reservation) => reservation.status === "confirmed"),
      history: reservations.filter((reservation) =>
        ["completed", "cancelled", "expired"].includes(reservation.status)
      ),
    };
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
      const { count } = await supabase
  .from("vestidos")
  .select("*", { count: "exact", head: true })
  .eq("owner_id", userId);

setDressCount(count ?? 0);

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
        <p className="text-sm font-medium text-[var(--muted)]">No has iniciado sesión.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-5xl">
        <DashboardNav />
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

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric
            label="Pendientes"
            value={stats.pending}
            tone="border-amber-100 bg-amber-50"
          />
          <Metric
            label="Citas programadas"
            value={stats.appointment_scheduled}
            tone="border-violet-100 bg-violet-50"
          />
          <Metric
            label="Confirmadas"
            value={stats.confirmed}
            tone="border-emerald-100 bg-emerald-50"
          />
          <Metric
            label="Completadas"
            value={stats.completed}
            tone="border-zinc-200 bg-white"
          />
          <Metric
  label="Vestidos"
  value={dressCount}
  tone="border-pink-100 bg-pink-50"
/>
        </div>

        {reservations.length === 0 ? (
          <div className="rounded-2xl border border-pink-100 bg-white p-6 text-sm text-[var(--muted)] shadow-sm">
            No hay solicitudes todavia.
          </div>
        ) : (
          <div className="space-y-8">
            <ReservationSection
              title="Pendientes"
              description="Solicitudes nuevas que necesitan una respuesta del local."
              reservations={groupedReservations.pending}
              emptyMessage="No hay solicitudes pendientes."
              busyId={busyId}
              appointmentDrafts={appointmentDrafts}
              pinDrafts={pinDrafts}
              setAppointmentDrafts={setAppointmentDrafts}
              setPinDrafts={setPinDrafts}
              onTransition={transitionReservation}
              onValidatePin={validatePin}
            />

            <ReservationSection
              title="Esperando contacto"
              description="Reservas aceptadas donde la clienta debe escribir por WhatsApp para coordinar la cita."
              reservations={groupedReservations.waitingContact}
              emptyMessage="No hay reservas esperando contacto."
              busyId={busyId}
              appointmentDrafts={appointmentDrafts}
              pinDrafts={pinDrafts}
              setAppointmentDrafts={setAppointmentDrafts}
              setPinDrafts={setPinDrafts}
              onTransition={transitionReservation}
              onValidatePin={validatePin}
            />

            <ReservationSection
              title="Citas programadas"
              description="Reservas con cita registrada que requieren validacion en tienda."
              reservations={groupedReservations.scheduled}
              emptyMessage="No hay citas programadas."
              busyId={busyId}
              appointmentDrafts={appointmentDrafts}
              pinDrafts={pinDrafts}
              setAppointmentDrafts={setAppointmentDrafts}
              setPinDrafts={setPinDrafts}
              onTransition={transitionReservation}
              onValidatePin={validatePin}
            />

            <ReservationSection
              title="Confirmadas"
              description="Reservas validadas en tienda, listas para cerrar cuando termine el proceso."
              reservations={groupedReservations.confirmed}
              emptyMessage="No hay reservas confirmadas."
              busyId={busyId}
              appointmentDrafts={appointmentDrafts}
              pinDrafts={pinDrafts}
              setAppointmentDrafts={setAppointmentDrafts}
              setPinDrafts={setPinDrafts}
              onTransition={transitionReservation}
              onValidatePin={validatePin}
            />

            <ReservationSection
              title="Historial"
              description="Reservas completadas, canceladas o expiradas."
              reservations={groupedReservations.history}
              emptyMessage="Aun no hay reservas en historial."
              busyId={busyId}
              appointmentDrafts={appointmentDrafts}
              pinDrafts={pinDrafts}
              setAppointmentDrafts={setAppointmentDrafts}
              setPinDrafts={setPinDrafts}
              onTransition={transitionReservation}
              onValidatePin={validatePin}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-3xl font-semibold text-[var(--ink)]">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
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

function ReservationSection({
  title,
  description,
  reservations,
  emptyMessage,
  busyId,
  appointmentDrafts,
  pinDrafts,
  setAppointmentDrafts,
  setPinDrafts,
  onTransition,
  onValidatePin,
}: {
  title: string;
  description: string;
  reservations: Reservation[];
  emptyMessage: string;
  busyId: string | null;
  appointmentDrafts: Record<string, string>;
  pinDrafts: Record<string, string>;
  setAppointmentDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setPinDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  onTransition: (
    id: string,
    action: "accept" | "reject" | "schedule" | "complete",
    appointmentDate?: string
  ) => Promise<void>;
  onValidatePin: (id: string) => Promise<void>;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-pink-100 bg-white px-3 py-1 text-xs font-semibold text-[var(--primary)] shadow-sm">
          {reservations.length} reservas
        </span>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-5 text-sm font-medium text-[var(--muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
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
              onTransition={onTransition}
              onValidatePin={onValidatePin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReservationCard({
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
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";

  return (
    <article className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
      <div className="grid gap-0 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="relative h-48 bg-pink-50 sm:h-full">
          {reservation.vestidos?.imagen ? (
            <Image
              src={reservation.vestidos.imagen}
              alt={dressName}
              fill
              sizes="(max-width: 640px) 100vw, 140px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm font-semibold tracking-[0.28em] text-[var(--primary)]">
              DREVA
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-[var(--ink)]">
                  {dressName}
                </h3>
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

          <div className="mt-4 rounded-2xl border border-pink-100 bg-[#fffafc] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
              Proximo paso
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--ink)]">
              {NEXT_STEPS[reservation.status]}
            </p>
          </div>

          <ReservationActions
            reservation={reservation}
            busy={busy}
            appointmentDraft={appointmentDraft}
            pinDraft={pinDraft}
            setAppointmentDraft={setAppointmentDraft}
            setPinDraft={setPinDraft}
            onTransition={onTransition}
            onValidatePin={onValidatePin}
          />
        </div>
      </div>
    </article>
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
        <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium leading-6 text-green-800">
          Esperando contacto de la clienta por WhatsApp.
        </p>
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
