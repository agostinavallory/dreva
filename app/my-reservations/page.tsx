"use client";

import { DressImage as SharedDressImage } from "@/app/components/DressImage";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  MessageCircle,
  Send,
  Store,
  Tag,
} from "lucide-react";

import { ProfileNavbar } from "@/app/components/ProfileNavbar";
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
  client_pin?: string | null;
  created_at?: string | null;
  dress_id?: number | string | null;
  owner_id?: string | null;
  vestidos?: {
    nombre?: string | null;
    imagen?: string | null;
    precio?: number | string | null;
  } | null;
  locales?: {
    nombre?: string | null;
    telefono_whatsapp?: string | null;
  } | null;
};

type BaseReservation = Omit<Reservation, "vestidos" | "locales">;

type ReservationPinRow = {
  reservation_id: string;
  client_pin: string | null;
};

type DressSummary = {
  id: number | string;
  nombre?: string | null;
  imagen?: string | null;
  precio?: number | string | null;
};

type LocalSummary = {
  id?: string | null;
  owner_id?: string | null;
  nombre?: string | null;
  telefono_whatsapp?: string | null;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Solicitud enviada",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita programada",
  confirmed: "Reserva confirmada",
  completed: "Finalizada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending:
    "border-dreva-warning/25 bg-dreva-warning-bg text-dreva-warning",
  accepted:
    "border-dreva-success/25 bg-dreva-success-bg text-dreva-success",
  appointment_scheduled:
    "border-dreva-appointment/25 bg-dreva-appointment-bg text-dreva-appointment",
  confirmed: "border-transparent bg-dreva-success text-white",
  completed:
    "border-dreva-success/25 bg-dreva-success-bg text-dreva-success",
  cancelled:
    "border-dreva-error/25 bg-dreva-error-bg text-dreva-error",
  expired:
    "border-dreva-neutral/25 bg-dreva-neutral-bg text-dreva-neutral",
};

const ACTION_REQUIRED_STATUSES: ReservationStatus[] = [
  "accepted",
  "appointment_scheduled",
];

function formatDate(value: string | null) {
  if (!value) {
    return "Fecha por definir";
  }

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDate
    ? new Date(Number(simpleDate[1]), Number(simpleDate[2]) - 1, Number(simpleDate[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "long",
  }).format(date);
}

function formatPrice(price: number | string | null | undefined) {
  if (price === null || price === undefined || price === "") {
    return null;
  }

  const numeric =
    typeof price === "string" ? Number(price.replace(/[^\d.]/g, "")) : price;

  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric.toLocaleString("es-PY");
}

function formatAppointmentDate(value: string | null) {
  if (!value) {
    return "Fecha por definir";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatAppointmentTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function shouldShowPin(status: ReservationStatus) {
  return (
    status === "accepted" ||
    status === "appointment_scheduled" ||
    status === "confirmed"
  );
}

function shouldShowWhatsapp(status: ReservationStatus) {
  return status === "accepted" || status === "appointment_scheduled";
}

function recentTime(reservation: Reservation) {
  const dates = [
    reservation.created_at,
    reservation.appointment_date,
    reservation.event_date,
  ];

  for (const value of dates) {
    if (!value) {
      continue;
    }

    const time = new Date(value).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  return 0;
}

function whatsappHref(reservation: Reservation) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const eventDate = formatDate(reservation.event_date);
  const localName = reservation.locales?.nombre ?? "el local";
  const message = [
    "Hola, estoy gestionando mi reserva en DREVA.",
    `Vestido: ${dressName}.`,
    `Fecha del evento: ${eventDate}.`,
    `Local: ${localName}.`,
    "Quisiera coordinar la cita de prueba con el local, por favor.",
  ].join(" ");

  const encodedMessage = encodeURIComponent(message);
  const phone = reservation.locales?.telefono_whatsapp?.replace(
    /[\s\-()+]/g,
    "",
  );

  return phone
    ? `https://wa.me/${phone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
}

export default function MyReservationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinLoadFailed, setPinLoadFailed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean> | null>(
    null,
  );

  const pendingReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status === "pending")
        .sort((a, b) => recentTime(b) - recentTime(a)),
    [reservations],
  );
  const acceptedReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status === "accepted")
        .sort((a, b) => recentTime(b) - recentTime(a)),
    [reservations],
  );
  const upcomingAppointmentsReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status === "appointment_scheduled")
        .sort((a, b) => recentTime(b) - recentTime(a)),
    [reservations],
  );
  const confirmedReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "confirmed"),
    [reservations],
  );

  const defaultOpenSection = useMemo(() => {
    if (pendingReservations.length > 0) {
      return "pending";
    }

    if (acceptedReservations.length > 0) {
      return "accepted";
    }

    if (upcomingAppointmentsReservations.length > 0) {
      return "appointment_scheduled";
    }

    if (confirmedReservations.length > 0) {
      return "confirmed";
    }

    return null;
  }, [
    pendingReservations,
    acceptedReservations,
    upcomingAppointmentsReservations,
    confirmedReservations,
  ]);

  const isSectionOpen = (key: string) =>
    openSections ? Boolean(openSections[key]) : key === defaultOpenSection;

  function toggleSection(key: string) {
    setOpenSections((current) => ({
      ...(current ?? {}),
      [key]: !(current ? current[key] : key === defaultOpenSection),
    }));
  }

  const fetchReservations = useCallback(async (clientId: string) => {
    console.debug("[my-reservations] loading base reservations", { clientId });

    const { data: baseReservations, error: baseError } = await supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        event_date,
        appointment_date,
        created_at,
        dress_id,
        owner_id
      `,
      )
      .eq("user_id", clientId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (baseError) {
      console.error("[my-reservations] base reservations fetch error", baseError);
      throw baseError;
    }

    const reservations = (baseReservations || []) as BaseReservation[];

    console.debug("[my-reservations] base reservations loaded", {
      clientId,
      count: reservations.length,
    });

    if (reservations.length === 0) {
      return { reservations: [] as Reservation[], pinLoadFailed: false };
    }

    const dressIds = Array.from(
      new Set(
        reservations
          .map((reservation) => reservation.dress_id)
          .filter((id): id is number | string => id !== null && id !== undefined),
      ),
    );
    const ownerIds = Array.from(
      new Set(
        reservations
          .map((reservation) => reservation.owner_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const dressMap = new Map<string, DressSummary>();
    const localMap = new Map<string, LocalSummary>();

    if (dressIds.length > 0) {
      const { data: dresses, error: dressesError } = await supabase
        .from("vestidos")
        .select("id,nombre,imagen,precio")
        .in("id", dressIds);

      if (dressesError) {
        console.error("[my-reservations] vestidos fallback fetch error", {
          message: dressesError.message,
          details: dressesError.details,
          hint: dressesError.hint,
        });
      } else {
        (dresses || []).forEach((dress) => {
          const summary = dress as DressSummary;
          dressMap.set(String(summary.id), summary);
        });
        console.debug("[my-reservations] vestidos fallback loaded", {
          requested: dressIds.length,
          count: dresses?.length ?? 0,
        });
      }
    }

    if (ownerIds.length > 0) {
      const { data: locales, error: localesError } = await supabase
        .from("locales")
        .select("id,owner_id,nombre,telefono_whatsapp")
        .in("owner_id", ownerIds);

      if (localesError) {
        console.warn("[my-reservations] locales fallback unavailable", {
          message: localesError.message,
          details: localesError.details,
          hint: localesError.hint,
        });
      } else {
        (locales || []).forEach((local) => {
          const summary = local as LocalSummary;
          if (summary.owner_id) {
            localMap.set(String(summary.owner_id), summary);
          }
        });
        console.debug("[my-reservations] locales fallback loaded", {
          requested: ownerIds.length,
          count: locales?.length ?? 0,
        });
      }
    }

    const mergedReservations = reservations.map((reservation) => ({
      ...reservation,
      vestidos: reservation.dress_id
        ? (dressMap.get(String(reservation.dress_id)) ?? null)
        : null,
      locales: reservation.owner_id
        ? (localMap.get(String(reservation.owner_id)) ?? null)
        : null,
    })) as Reservation[];

    let pinLoadFailed = false;

    try {
      const { data: pinRows, error: pinError } = await supabase.rpc(
        "get_my_reservation_pins",
      );

      if (pinError) {
        pinLoadFailed = true;
        console.warn("[my-reservations] pin fetch unavailable", {
          message: pinError.message,
          code: pinError.code,
        });
      } else {
        const pinMap = new Map<string, string | null>();

        ((pinRows || []) as ReservationPinRow[]).forEach((row) => {
          if (row && row.reservation_id) {
            pinMap.set(String(row.reservation_id), row.client_pin ?? null);
          }
        });

        mergedReservations.forEach((reservation) => {
          reservation.client_pin = pinMap.get(String(reservation.id)) ?? null;
        });
      }
    } catch {
      pinLoadFailed = true;
      console.warn("[my-reservations] pin fetch unavailable");
    }

    return { reservations: mergedReservations, pinLoadFailed };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReservations() {
      if (authLoading) {
        return;
      }

      if (!userId) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setPinLoadFailed(false);

      try {
        const { reservations: data, pinLoadFailed: pinFailed } =
          await fetchReservations(userId);

        if (cancelled) {
          return;
        }

        setReservations(data);
        setPinLoadFailed(pinFailed);
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

    loadReservations();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchReservations, router, userId]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-dreva-background text-dreva-text">
        <ProfileNavbar />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-center justify-center px-5 lg:w-[88%]">
          <p className="rounded-full border border-dreva-border bg-white px-5 py-3 text-sm font-semibold text-dreva-text-muted shadow-dreva-sm">
            Cargando tus reservas...
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-dreva-background text-dreva-text">
        <ProfileNavbar />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-center justify-center px-5 lg:w-[88%]">
          <p className="text-sm font-medium text-dreva-text-muted">
            Redirigiendo a inicio de sesión...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-dreva-background text-dreva-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[300px] overflow-hidden"
      >
        <svg
          className="absolute inset-x-0 bottom-0 h-full w-full"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 300V186c148-40 268-6 402 32 150 42 268 60 420 18 168-46 300-96 618-52v116H0Z"
            fill="#fff0f6"
          />
          <path
            d="M0 300v-84c190-44 320 6 470 40 168 38 300 42 452 2 176-46 316-88 518-52v94H0Z"
            fill="#fbe3ef"
            opacity="0.85"
          />
          <path
            d="M0 300v-44c240-34 380 20 560 36 190 18 340-20 520-40 150-16 260-10 360 4v44H0Z"
            fill="#ff5ca8"
            opacity="0.07"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <ProfileNavbar />

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8 lg:w-[88%] lg:px-0 lg:pt-7">
          <header className="mb-8">
            <h1 className="text-[30px] font-bold tracking-tight text-[#211d26] sm:text-[34px]">
              Mis reservas
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#635b66] sm:text-base">
              Seguí en un solo lugar todo lo que está pasando con tus vestidos.
            </p>
          </header>

        {errorMessage ? (
          <div className="rounded-dreva-dialog border border-dreva-border bg-white p-6 text-sm font-medium text-dreva-error shadow-dreva-sm sm:max-w-2xl">
            {errorMessage}
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-dreva-dialog border border-[#ffd8e6] bg-white px-6 py-7 text-center shadow-dreva-sm sm:px-8 sm:py-8">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dreva-soft text-dreva-brand">
              <CalendarDays className="h-6 w-6" strokeWidth={2} />
            </span>
            <h2 className="text-2xl font-semibold text-dreva-text">
              Aun no tienes reservas
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-dreva-text-muted">
              Cuando solicites un vestido, lo veras aqui.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-dreva-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
            >
              Explorar vestidos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingReservations.length > 0 && (
              <ReservationSection
                icon={
                  <Send className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                }
                title="Solicitudes enviadas"
                description="Estamos esperando la respuesta del local."
                count={pendingReservations.length}
                open={isSectionOpen("pending")}
                onToggle={() => toggleSection("pending")}
              >
                {pendingReservations.map((reservation, index) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    priority={index === 0}
                    variant="pending"
                    pinLoadFailed={pinLoadFailed}
                  />
                ))}
              </ReservationSection>
            )}

            {acceptedReservations.length > 0 && (
              <ReservationSection
                icon={
                  <MessageCircle
                    className="h-5 w-5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                }
                title="Por coordinar"
                description="El local aceptó tu solicitud. Coordiná tu cita."
                count={acceptedReservations.length}
                open={isSectionOpen("accepted")}
                onToggle={() => toggleSection("accepted")}
              >
                {acceptedReservations.map((reservation, index) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    priority={index === 0}
                    variant="action"
                    pinLoadFailed={pinLoadFailed}
                  />
                ))}
              </ReservationSection>
            )}

            {upcomingAppointmentsReservations.length > 0 && (
              <ReservationSection
                icon={
                  <CalendarCheck
                    className="h-5 w-5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                }
                title="Citas agendadas"
                description="Ya tenés una cita agendada con el local."
                count={upcomingAppointmentsReservations.length}
                open={isSectionOpen("appointment_scheduled")}
                onToggle={() => toggleSection("appointment_scheduled")}
              >
                {upcomingAppointmentsReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    priority={false}
                    variant="action"
                    pinLoadFailed={pinLoadFailed}
                  />
                ))}
              </ReservationSection>
            )}

            {confirmedReservations.length > 0 && (
              <ReservationSection
                icon={
                  <BadgeCheck
                    className="h-5 w-5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                }
                title="Reservas confirmadas"
                description="Tu vestido ya está confirmado para tu evento."
                count={confirmedReservations.length}
                open={isSectionOpen("confirmed")}
                onToggle={() => toggleSection("confirmed")}
              >
                {confirmedReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    priority={false}
                    variant="confirmed"
                    pinLoadFailed={pinLoadFailed}
                  />
                ))}
              </ReservationSection>
            )}

            <Link
              href="/my-reservations/history"
              className="flex w-full items-center gap-3 rounded-dreva-card border border-dreva-border bg-white px-4 py-4 shadow-dreva-sm transition hover:border-[#f3c7d6] hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30 sm:px-5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dreva-soft text-dreva-brand">
                <Clock className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-dreva-text">
                  Historial
                </span>
                <span className="block text-sm text-dreva-text-muted">
                  Consultá tus reservas anteriores.
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-[#f3c7d6] bg-white px-3 py-1.5 text-xs font-semibold text-dreva-action">
                Ver historial
              </span>
            </Link>
          </div>
        )}
        </section>
      </div>
    </main>
  );
}

function ReservationSection({
  icon,
  title,
  description,
  count,
  open,
  onToggle,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-dreva-card border border-[#ffd8e6] bg-white shadow-dreva-sm transition hover:border-[#f3c7d6] hover:shadow-dreva-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30 sm:gap-4 sm:px-6 sm:py-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dreva-soft text-dreva-brand">
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate text-lg font-bold text-dreva-text sm:text-xl">
              {title}
            </span>
            {count > 0 && (
              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-dreva-soft px-2 text-xs font-bold text-dreva-action">
                {count}
              </span>
            )}
          </span>
          {description ? (
            <span className="mt-1 block text-sm leading-5 text-dreva-text-muted">
              {description}
            </span>
          ) : null}
        </span>

        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-dreva-brand transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-dreva-border px-4 pb-5 pt-4 sm:px-6">
          <div className="space-y-4">{children}</div>
        </div>
      )}
    </section>
  );
}

function ReservationCard({
  reservation,
  priority,
  variant,
  pinLoadFailed,
}: {
  reservation: Reservation;
  priority: boolean;
  variant: "action" | "confirmed" | "pending";
  pinLoadFailed: boolean;
}) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Confirmando local";
  const isAppointmentScheduled = reservation.status === "appointment_scheduled";
  const appointmentDate = formatAppointmentDate(reservation.appointment_date);
  const appointmentTime = formatAppointmentTime(reservation.appointment_date);

  return (
    <article className="flex flex-col overflow-hidden rounded-dreva-card border border-dreva-border bg-white shadow-dreva-sm md:flex-row">
      <DressImage
        image={reservation.vestidos?.imagen}
        dressName={dressName}
        priority={priority}
        className="h-44 w-full shrink-0 md:h-auto md:min-h-[190px] md:w-56"
        sizes="(max-width: 767px) 100vw, 224px"
      />

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight text-dreva-text">
              {dressName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-dreva-text-muted">
              <Store
                className="h-4 w-4 shrink-0 text-dreva-brand"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="truncate">{localName}</span>
            </p>
          </div>
          <span
            className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[reservation.status]}`}
          >
            {STATUS_LABELS[reservation.status]}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {variant === "confirmed" ? (
            <>
              <MiniInfo
                icon={
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-dreva-brand"
                    strokeWidth={2}
                  />
                }
                label="Fecha de tu evento"
                value={formatDate(reservation.event_date)}
              />
              <MiniInfo
                icon={
                  <Tag
                    className="h-4 w-4 shrink-0 text-dreva-brand"
                    strokeWidth={2}
                  />
                }
                label="Precio"
                value={
                  formatPrice(reservation.vestidos?.precio)
                    ? `Gs. ${formatPrice(reservation.vestidos?.precio)}`
                    : "Consultar precio"
                }
              />
            </>
          ) : variant === "pending" ? (
            <>
              <MiniInfo
                icon={
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-dreva-brand"
                    strokeWidth={2}
                  />
                }
                label="Fecha del evento"
                value={formatDate(reservation.event_date)}
              />
            </>
          ) : isAppointmentScheduled ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)] md:items-start">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="w-fit rounded-2xl bg-dreva-soft px-4 py-3">
                  <p className="text-sm font-semibold text-dreva-text">
                    Cita agendada.
                  </p>
                  <p className="mt-0.5 max-w-[16rem] text-sm text-dreva-text-muted">
                    Asistí al local en la fecha y hora indicadas y presentá tu
                    PIN.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <MiniInfo
                    fit
                    icon={
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-dreva-brand"
                        strokeWidth={2}
                      />
                    }
                    label="Fecha"
                    value={appointmentDate}
                  />

                  {appointmentTime ? (
                    <MiniInfo
                      fit
                      icon={
                        <Clock
                          className="h-4 w-4 shrink-0 text-dreva-brand"
                          strokeWidth={2}
                        />
                      }
                      label="Hora"
                      value={appointmentTime}
                    />
                  ) : null}
                </div>
              </div>

              {shouldShowPin(reservation.status) && reservation.client_pin ? (
                <div className="flex min-w-0 items-start justify-center md:justify-end">
                  <PinBlock large pin={reservation.client_pin} />
                </div>
              ) : shouldShowPin(reservation.status) && pinLoadFailed ? (
                <div className="flex min-w-0 items-start justify-center md:justify-end">
                  <PinUnavailableBlock large />
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-dreva-soft px-4 py-3">
                <p className="text-sm font-semibold text-dreva-text">
                  El local aceptó tu solicitud.
                </p>
                <p className="mt-0.5 text-sm text-dreva-text-muted">
                  Escribile al local por WhatsApp y coordiná tu cita de prueba.
                </p>
              </div>
            </>
          )}
        </div>

        {variant === "action" &&
            shouldShowWhatsapp(reservation.status) &&
            reservation.status === "accepted" && (
          <div className="mt-4 border-t border-[#f1e7ee] pt-4">
            <a
              href={whatsappHref(reservation)}
              target="_blank"
              rel="noreferrer"
              className="mx-auto flex w-fit items-center justify-center rounded-full border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
            >
              Escribir por WhatsApp
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

function DressImage({
  image,
  dressName,
  priority,
  className,
  sizes,
}: {
  image?: string | null;
  dressName: string;
  priority: boolean;
  className: string;
  sizes: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-dreva-soft ${className}`}>
      <SharedDressImage
        src={image}
        alt={dressName}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        fallback={
          <div className="grid h-full place-items-center text-lg font-semibold tracking-[0.32em] text-dreva-brand">
            DREVA
          </div>
        }
      />
    </div>
  );
}

function MiniInfo({
  fit = false,
  icon,
  label,
  value,
}: {
  fit?: boolean;
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`rounded-dreva-control border border-[#ffd8e6] bg-dreva-soft px-4 py-2.5 ${
        fit ? "w-fit" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-dreva-text-muted">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-dreva-text">
        {icon}
        {value}
      </p>
    </div>
  );
}

function PinBlock({ pin, large = false }: { pin: string; large?: boolean }) {
  return (
    <div
      className={`w-full rounded-dreva-card border-2 border-[#ffd4e2] bg-dreva-soft text-center shadow-dreva-sm ${
        large ? "max-w-[22rem] px-6 py-5" : "max-w-xs px-5 py-4"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dreva-action">
        Tu PIN
      </p>
      <p
        className={`mt-1.5 font-mono font-bold tracking-[0.22em] text-dreva-text ${
          large ? "text-3xl sm:text-4xl" : "text-3xl"
        }`}
      >
        {pin}
      </p>
      <p className="mt-1 text-xs font-medium text-dreva-text-muted">
        Muestralo en el local.
      </p>
    </div>
  );
}

function PinUnavailableBlock({ large = false }: { large?: boolean }) {
  return (
    <div
      className={`w-full rounded-dreva-card border-2 border-[#ffd4e2] bg-dreva-soft text-center shadow-dreva-sm ${
        large ? "max-w-[22rem] px-6 py-5" : "max-w-xs px-5 py-4"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dreva-action">
        Tu PIN
      </p>
      <p className="mt-1.5 text-sm font-semibold text-dreva-text">
        No pudimos cargar tu PIN en este momento.
      </p>
      <p className="mt-1 text-xs font-medium text-dreva-text-muted">
        Recargá la página para intentarlo de nuevo.
      </p>
    </div>
  );
}
