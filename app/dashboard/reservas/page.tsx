"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  created_at?: string | null;
  vestidos?: {
    nombre?: string | null;
    imagen?: string | null;
    precio?: string | number | null;
  } | null;
};

type ClientProfile = {
  nombre: string;
  apellido: string;
};

const ACTIVE_STATUSES: ReservationStatus[] = [
  "pending",
  "accepted",
  "appointment_scheduled",
  "confirmed",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Solicitud pendiente",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita programada",
  confirmed: "Reserva confirmada",
  completed: "Reserva completada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  accepted: "bg-blue-50 text-blue-700 border-blue-100",
  appointment_scheduled: "bg-violet-50 text-violet-700 border-violet-100",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function formatDate(value: string | null) {
  if (!value) return "Sin definir";

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDate
    ? new Date(Number(simpleDate[1]), Number(simpleDate[2]) - 1, Number(simpleDate[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ReservasDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clientMap, setClientMap] = useState<Map<string, ClientProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchClientProfile = useCallback(async (reservationId: string) => {
    const { data, error } = await supabase.rpc("get_reservation_client_profile", {
      p_reservation_id: reservationId,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const profile = data[0] as ClientProfile;
    if (!profile.nombre && !profile.apellido) {
      return null;
    }
    return profile;
  }, []);

  const fetchReservations = useCallback(async (ownerId: string) => {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        event_date,
        appointment_date,
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
      console.error("[DREVA dashboard reservas] reservations fetch error", error);
      throw error;
    }

    return (data || []) as Reservation[];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReservas() {
      if (authLoading) {
        return;
      }

      if (!userId) {
        setReservations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await fetchReservations(userId);

        if (cancelled) {
          return;
        }

        setReservations(data);

        const map = new Map<string, ClientProfile>();
        for (const reservation of data) {
          const profile = await fetchClientProfile(reservation.id);
          if (profile) {
            map.set(reservation.id, profile);
          }
        }

        if (cancelled) {
          return;
        }

        setClientMap(map);
      } catch {
        if (!cancelled) {
          setErrorMessage("No pudimos cargar tus reservas en este momento.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReservas();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchClientProfile, fetchReservations, userId]);

  const grouped = useMemo(() => {
    const active: Reservation[] = [];
    const history: Reservation[] = [];

    reservations.forEach((reservation) => {
      if (ACTIVE_STATUSES.includes(reservation.status)) {
        active.push(reservation);
      } else {
        history.push(reservation);
      }
    });

    return { active, history };
  }, [reservations]);

  const getClientName = useCallback(
    (reservationId: string) => {
      const profile = clientMap.get(reservationId);
      if (!profile) return null;
      return [profile.nombre, profile.apellido].filter(Boolean).join(" ").trim() || null;
    },
    [clientMap],
  );

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
        <section className="mx-auto max-w-6xl">
          <DashboardNav />
          <p className="mt-10 text-sm font-medium text-[var(--muted)]">
            Cargando reservas...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-6xl">
        <DashboardNav />

        <header className="mb-8 mt-2 flex flex-col gap-4 rounded-[1.5rem] border border-[#ffd2e2] bg-white px-5 py-6 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff2f78]">
            DREVA
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#17151b] sm:text-3xl">
                Reservas
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6d6670]">
                Consultá el estado de tus reservas activas y tu historial.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ffd8e6] bg-[#fff4f8] px-5 py-4">
              <p className="text-2xl font-extrabold leading-none text-[#ff2f78]">
                {grouped.active.length}
              </p>
              <p className="mt-1 text-xs font-bold text-[#6d6670]">Activas</p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-extrabold text-[#17151b]">
              Aún no tenés reservas
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6d6670]">
              Cuando una clienta reserve tus vestidos, las vas a ver acá.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            <ReservationSection
              title="Activas"
              description="Tus reservas en curso."
              emptyMessage="No tenés reservas activas por ahora."
              isSectionEmpty={grouped.active.length === 0}
              count={grouped.active.length}
            >
              {grouped.active.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  clientName={getClientName(reservation.id)}
                />
              ))}
            </ReservationSection>

            <ReservationSection
              title="Historial"
              description="Reservas finalizadas, canceladas o expiradas."
              emptyMessage="Aún no tenés historial."
              isSectionEmpty={grouped.history.length === 0}
              count={grouped.history.length}
            >
              {grouped.history.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  clientName={getClientName(reservation.id)}
                />
              ))}
            </ReservationSection>
          </div>
        )}
      </section>
    </main>
  );
}

function ReservationSection({
  title,
  description,
  emptyMessage,
  isSectionEmpty,
  count,
  children,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  isSectionEmpty: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#eadfe5] pb-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#17151b]">{title}</h2>
          <p className="mt-1 text-sm font-medium text-[#6d6670]">{description}</p>
        </div>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#ffe7f0] px-2 text-sm font-extrabold text-[#d92f68]">
          {count}
        </span>
      </div>

      {isSectionEmpty ? (
        <p className="rounded-2xl border border-[#f1e4ea] bg-white px-5 py-6 text-center text-sm font-medium text-[#9a8f98]">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-4">{children}</div>
      )}
    </section>
  );
}

function ReservationCard({
  reservation,
  clientName,
}: {
  reservation: Reservation;
  clientName: string | null;
}) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const dressImage = reservation.vestidos?.imagen;
  const hasAppointment = Boolean(reservation.appointment_date);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_14px_42px_rgba(38,31,36,0.06)]">
      <div className="grid gap-0 md:grid-cols-[150px_minmax(0,1fr)]">
        <div className="relative min-h-48 bg-[#fff4f8] md:min-h-full">
          {dressImage ? (
            <Image
              src={dressImage}
              alt={dressName}
              fill
              sizes="(max-width: 768px) 100vw, 150px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm font-semibold leading-6 text-[#9a8f98]">
              Imagen del vestido no disponible
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-5 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-xl font-extrabold leading-tight text-[#17151b]">
                {dressName}
              </h3>
              <span
                className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                  STATUS_STYLES[reservation.status]
                }`}
              >
                {STATUS_LABELS[reservation.status]}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-[#5d535c] sm:grid-cols-2">
              <p>
                <span className="text-[#9a8f98]">Evento:</span>{" "}
                {formatDate(reservation.event_date)}
              </p>
              {hasAppointment ? (
                <p>
                  <span className="text-[#9a8f98]">Cita:</span>{" "}
                  {formatDate(reservation.appointment_date)}
                </p>
              ) : null}
            </div>

            {clientName ? (
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6b626b]">
                <span className="text-[#9a8f98]">Clienta:</span> {clientName}
              </p>
            ) : null}
          </div>

          <Link
            href={`/dashboard/reservas/${reservation.id}`}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#f3c7d6] bg-white px-5 py-2.5 text-sm font-bold text-[#d92f68] transition hover:bg-[#fff7fa] sm:w-auto lg:min-w-40"
          >
            Ver reserva
          </Link>
        </div>
      </div>
    </article>
  );
}
