"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarX2,
  ChevronDown,
  Home,
  MessageSquareText,
  Plus,
  Settings,
  Shirt,
  UsersRound,
} from "lucide-react";

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
  dress_id?: string | number | null;
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

type TodaySectionId = "newRequests" | "waitingMessage" | "nextAppointment";

type AppointmentDateParts = {
  date: string;
  time: string | null;
  sortTime: number;
};

function formatEventDate(value: string | null) {
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function parseAppointmentDate(value: string | null): AppointmentDateParts | null {
  if (!value) {
    return null;
  }

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDate
    ? new Date(
        Number(simpleDate[1]),
        Number(simpleDate[2]) - 1,
        Number(simpleDate[3])
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const sortTime = simpleDate
    ? new Date(
        Number(simpleDate[1]),
        Number(simpleDate[2]) - 1,
        Number(simpleDate[3]),
        23,
        59,
        59,
        999
      ).getTime()
    : date.getTime();

  return {
    date: new Intl.DateTimeFormat("es-PY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: simpleDate
      ? null
      : new Intl.DateTimeFormat("es-PY", { timeStyle: "short" }).format(date),
    sortTime,
  };
}

function getUpcomingAppointmentTime(reservation: Reservation, now: number) {
  if (reservation.status !== "appointment_scheduled") {
    return null;
  }

  const appointment = parseAppointmentDate(reservation.appointment_date);

  if (!appointment || appointment.sortTime < now) {
    return null;
  }

  return appointment.sortTime;
}

function isUpcomingAppointment(reservation: Reservation, now: number) {
  return getUpcomingAppointmentTime(reservation, now) !== null;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const upcomingAppointments = useMemo(() => {
    return reservations
      .filter((reservation) => isUpcomingAppointment(reservation, currentTime))
      .sort((a, b) => {
        return (
          (getUpcomingAppointmentTime(a, currentTime) ?? 0) -
          (getUpcomingAppointmentTime(b, currentTime) ?? 0)
        );
      });
  }, [currentTime, reservations]);

const stats = useMemo(() => {
  const reservedStatuses: ReservationStatus[] = [
    "accepted",
    "appointment_scheduled",
    "confirmed",
  ];
  const reservedDressIds = new Set<string>();

  const summary = reservations.reduce(
    (acc, reservation) => {
      if (reservation.status === "pending") {
        acc.pendingRequests += 1;
      }

      if (
        reservedStatuses.includes(reservation.status) &&
        reservation.dress_id !== null &&
        reservation.dress_id !== undefined
      ) {
        reservedDressIds.add(String(reservation.dress_id));
      }

      acc.reservedDresses = reservedDressIds.size;

      return acc;
    },
    {
      pendingRequests: 0,
      upcomingAppointments: 0,
      reservedDresses: 0,
    }
  );

  summary.upcomingAppointments = upcomingAppointments.length;

  return summary;
}, [reservations, upcomingAppointments.length]);



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
        dress_id,
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
    setCurrentTime(new Date().getTime());
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
      const now = new Date().getTime();

      if (cancelled) {
        return;
      }

      setCurrentTime(now);
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

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">Cargando inicio...</p>
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
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-6xl">
        <DashboardHomeNav />

        <section className="mb-6 grid gap-3 rounded-[1.5rem] border border-[#ffd2e2] bg-white px-4 py-4 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)] lg:items-stretch">
          <div className="flex min-h-32 flex-col justify-center rounded-[1.2rem] border border-[#f4e3eb] bg-[#fff8fb] px-5 py-4 text-left sm:px-6">
            <h1 className="text-xl font-bold leading-tight text-[#17151b] sm:text-2xl">
              Hola, Boutique Laura {"\uD83D\uDC4B"}
            </h1>
            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[#6d6670]">
              Hoy tenés {stats.pendingRequests} cosas por revisar.
            </p>

            <Link
              href="/dashboard/vestidos/nuevo"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff2f78] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] sm:w-auto"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Publicar vestido
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              icon={<MessageSquareText />}
              title="Solicitudes"
              value={stats.pendingRequests}
              tone="border-[#ffd8e6] bg-[#fff4f8] text-[#ff2f78]"
            />

            <Metric
              icon={<UsersRound />}
              title="Próximas citas"
              value={stats.upcomingAppointments}
              tone="border-[#ccefe0] bg-[#f0fff8] text-[#35b779]"
            />

            <Metric
              icon={<CalendarX2 />}
              title="Vestidos apartados"
              value={stats.reservedDresses}
              tone="border-[#e4dcff] bg-[#f7f3ff] text-[#7d62d9]"
            />
          </div>
        </section>

        {reservations.length > 0 && (
          <PendingTasks
            pendingReservations={groupedReservations.pending}
            waitingContactReservations={groupedReservations.waitingContact}
            upcomingAppointments={upcomingAppointments}
            busyId={busyId}
            onTransition={transitionReservation}
          />
        )}
      </section>
    </main>
  );
}

function DashboardHomeNav() {
  const navItems = [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: <Home />,
      active: true,
    },
    {
      href: "/dashboard/vestidos",
      label: "Mis vestidos",
      icon: <Shirt />,
      active: false,
    },
    {
      href: "/dashboard/configuracion",
      label: "Configuración",
      icon: <Settings />,
      active: false,
    },
  ];

  return (
    <nav className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-[#eadfe5] pb-3">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
            item.active
              ? "bg-[#ffe7f0] text-[#ff2f78]"
              : "text-[#302b33] hover:bg-white hover:text-[#ff2f78]"
          }`}
        >
          <span className="[&_svg]:h-4 [&_svg]:w-4">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Metric({
  icon,
  title,
  value,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      className={`flex min-h-24 items-center gap-3 rounded-[1.1rem] border px-3.5 py-3 shadow-[0_10px_24px_rgba(38,31,36,0.045)] ${tone}`}
    >
      <IconBubble icon={icon} soft compact />
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-[#17151b]">
          {value}
        </p>
        <h3 className="mt-1 text-sm font-bold leading-tight text-[#4f4951]">
          {title}
        </h3>
      </div>
    </div>
  );
}

function IconBubble({
  icon,
  soft = false,
  compact = false,
}: {
  icon: ReactNode;
  soft?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${
        compact ? "h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]" : "h-16 w-16 [&_svg]:h-8 [&_svg]:w-8"
      } ${
        soft ? "bg-white/60" : "bg-[#ffe7f0] text-[#ff2f78]"
      }`}
    >
      {icon}
    </div>
  );
}

function PendingTasks({
  pendingReservations,
  waitingContactReservations,
  upcomingAppointments,
  busyId,
  onTransition,
}: {
  pendingReservations: Reservation[];
  waitingContactReservations: Reservation[];
  upcomingAppointments: Reservation[];
  busyId: string | null;
  onTransition: (
    id: string,
    action: "accept" | "reject" | "schedule" | "complete",
    appointmentDate?: string
  ) => Promise<void>;
}) {
  const [openSection, setOpenSection] = useState<TodaySectionId | null>(() =>
    pendingReservations.length > 0 ? "newRequests" : null
  );
  const toggleSection = (id: TodaySectionId) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#eadfe5] pb-3">
        <h2 className="text-2xl font-bold text-[#17151b] sm:text-3xl">Hoy</h2>
      </div>

      <div className="space-y-4">
        <TodayAccordionSection
          id="newRequests"
          title="Nuevas solicitudes"
          count={pendingReservations.length}
          isOpen={openSection === "newRequests"}
          onToggle={toggleSection}
          tone="border-[#ffb9d2] bg-[#fff6fa] text-[#d92f68]"
        >
          {pendingReservations.map((reservation) => (
            <PendingRequestCard
              key={reservation.id}
              reservation={reservation}
              busy={busyId === reservation.id}
              onTransition={onTransition}
            />
          ))}
        </TodayAccordionSection>

        <TodayAccordionSection
          id="waitingMessage"
          title="Esperando mensaje"
          count={waitingContactReservations.length}
          isOpen={openSection === "waitingMessage"}
          onToggle={toggleSection}
          tone="border-[#ffd68a] bg-[#fffaf0] text-[#b66b00]"
        >
          {waitingContactReservations.map((reservation) => (
            <WaitingContactCard key={reservation.id} reservation={reservation} />
          ))}
        </TodayAccordionSection>

        <TodayAccordionSection
          id="nextAppointment"
          title="Próxima cita"
          count={upcomingAppointments.length}
          isOpen={openSection === "nextAppointment"}
          onToggle={toggleSection}
          tone="border-[#a8e2c4] bg-[#f2fff8] text-[#247a50]"
        >
          {upcomingAppointments.map((reservation) => (
            <NextAppointmentCard key={reservation.id} reservation={reservation} />
          ))}
        </TodayAccordionSection>
      </div>
    </section>
  );
}

function TodayAccordionSection({
  id,
  title,
  count,
  isOpen,
  onToggle,
  tone,
  children,
}: {
  id: TodaySectionId;
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: (id: TodaySectionId) => void;
  tone: string;
  children: ReactNode;
}) {
  const panelId = `today-${id}-panel`;

  return (
    <section className="space-y-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
        className={`flex w-full items-center justify-between gap-4 rounded-[1.15rem] border px-4 py-4 text-left shadow-[0_10px_28px_rgba(38,31,36,0.045)] transition hover:-translate-y-0.5 hover:bg-white sm:px-5 ${tone}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-base font-extrabold text-[#17151b] sm:text-lg">
            {title}
          </span>
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-sm font-extrabold text-[#17151b]">
            {count}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen ? (
        <div id={panelId} className="space-y-5 sm:pl-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function PendingRequestCard({
  reservation,
  busy,
  onTransition,
}: {
  reservation: Reservation;
  busy: boolean;
  onTransition: (
    id: string,
    action: "accept" | "reject" | "schedule" | "complete",
    appointmentDate?: string
  ) => Promise<void>;
}) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const dressImage = reservation.vestidos?.imagen;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_18px_55px_rgba(38,31,36,0.07)]">
      <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative min-h-72 bg-[#fff4f8] md:min-h-full">
          {dressImage ? (
            <Image
              src={dressImage}
              alt={dressName}
              fill
              sizes="(max-width: 768px) 100vw, 240px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-72 items-center justify-center px-6 text-center text-sm font-semibold leading-6 text-[#9a8f98]">
              Imagen del vestido no disponible
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-7 p-5 sm:p-7">
          <div className="min-w-0">
            <h3 className="text-2xl font-extrabold leading-tight text-[#17151b]">
              {dressName}
            </h3>
            <p className="mt-3 text-base font-bold leading-7 text-[#5d535c]">
              Evento: {formatEventDate(reservation.event_date)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
            <button
              onClick={() => onTransition(reservation.id, "accept")}
              disabled={busy}
              className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Procesando..." : "Aceptar"}
            </button>
            <button
              onClick={() => onTransition(reservation.id, "reject")}
              disabled={busy}
              className="rounded-full border border-[#f3c7d6] bg-white px-5 py-3 text-sm font-bold text-[#d92f68] transition hover:bg-[#fff7fa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function WaitingContactCard({ reservation }: { reservation: Reservation }) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const dressImage = reservation.vestidos?.imagen;
  const clientName = getClientName(reservation);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_14px_42px_rgba(38,31,36,0.06)]">
      <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative min-h-60 bg-[#fffaf0] md:min-h-full">
          {dressImage ? (
            <Image
              src={dressImage}
              alt={dressName}
              fill
              sizes="(max-width: 768px) 100vw, 180px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-60 items-center justify-center px-5 text-center text-sm font-semibold leading-6 text-[#9a8f98]">
              Imagen del vestido no disponible
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-6 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b66b00]">
              Esperando mensaje
            </p>
            <h3 className="mt-3 text-xl font-extrabold leading-tight text-[#17151b]">
              {dressName}
            </h3>
            {clientName ? (
              <p className="mt-2 text-sm font-bold leading-6 text-[#6b626b]">
                Clienta: {clientName}
              </p>
            ) : null}
            <p className="mt-4 max-w-2xl rounded-lg border border-[#ffe3ad] bg-[#fffaf0] px-4 py-3 text-sm font-medium leading-6 text-[#5d535c]">
              La clienta ya recibió tu aceptación. Solo queda esperar su mensaje por WhatsApp.
            </p>
          </div>

          <Link
            href={`/dashboard/reservas/${reservation.id}`}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#f0d09a] bg-white px-5 py-3 text-sm font-bold text-[#17151b] transition hover:border-[#e4bb75] hover:bg-[#fffaf0] sm:w-auto lg:min-w-40"
          >
            Ver reserva
          </Link>
        </div>
      </div>
    </article>
  );
}

function NextAppointmentCard({ reservation }: { reservation: Reservation }) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const dressImage = reservation.vestidos?.imagen;
  const clientName = getClientName(reservation);
  const appointment = parseAppointmentDate(reservation.appointment_date);

  if (!appointment) {
    return null;
  }

  return (
    <article className="rounded-[1.1rem] border border-[#d5efdf] bg-white p-3 shadow-[0_10px_28px_rgba(38,31,36,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-[#f2fff8] sm:w-24">
          {dressImage ? (
            <Image
              src={dressImage}
              alt={dressName}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs font-semibold leading-5 text-[#9a8f98]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#247a50]">
              Próxima cita
            </p>
            <h3 className="mt-2 truncate text-base font-extrabold leading-tight text-[#17151b]">
              {dressName}
            </h3>

            <p className="mt-2 text-sm font-bold leading-5 text-[#247a50]">
              {appointment.date} - {appointment.time ?? "Hora no registrada"}
            </p>

            {clientName ? (
              <p className="mt-1 text-sm font-semibold leading-5 text-[#6b626b]">
                Clienta: {clientName}
              </p>
            ) : null}
          </div>

          <Link
            href={`/dashboard/reservas/${reservation.id}`}
            className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-[#bce9cf] bg-white px-4 py-2.5 text-sm font-bold text-[#17151b] transition hover:border-[#91d9b2] hover:bg-[#f2fff8] sm:w-auto"
          >
            Ver reserva
          </Link>
        </div>
      </div>
    </article>
  );
}

function getClientName(reservation: Reservation) {
  const source = reservation as Reservation & {
    client_name?: string | null;
    clientName?: string | null;
    cliente_nombre?: string | null;
    profiles?: { nombre?: string | null; full_name?: string | null; name?: string | null } | null;
    profile?: { nombre?: string | null; full_name?: string | null; name?: string | null } | null;
  };

  return (
    source.client_name ??
    source.clientName ??
    source.cliente_nombre ??
    source.profiles?.nombre ??
    source.profiles?.full_name ??
    source.profiles?.name ??
    source.profile?.nombre ??
    source.profile?.full_name ??
    source.profile?.name ??
    null
  );
}
