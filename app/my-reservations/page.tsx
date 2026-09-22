"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Store,
  Tag,
} from "lucide-react";

import { Navbar } from "@/app/components/Navbar";
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
  client_pin: string | null;
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
  pending: "border-amber-100 bg-amber-50 text-amber-700",
  accepted: "border-emerald-100 bg-emerald-50 text-emerald-700",
  appointment_scheduled: "border-sky-100 bg-sky-50 text-sky-700",
  confirmed: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
  completed: "border-pink-100 bg-pink-50 text-[var(--primary)]",
  cancelled: "border-rose-100 bg-rose-50 text-rose-700",
  expired: "border-zinc-200 bg-zinc-100 text-zinc-600",
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
        client_pin,
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
      return [];
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

    return reservations.map((reservation) => ({
      ...reservation,
      vestidos: reservation.dress_id
        ? (dressMap.get(String(reservation.dress_id)) ?? null)
        : null,
      locales: reservation.owner_id
        ? (localMap.get(String(reservation.owner_id)) ?? null)
        : null,
    })) as Reservation[];
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

      try {
        const data = await fetchReservations(userId);

        if (cancelled) {
          return;
        }

        setReservations(data);
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
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-5">
          <p className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--muted)] shadow-sm">
            Cargando tus reservas...
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-5">
          <p className="text-sm font-medium text-[var(--muted)]">
            Redirigiendo a inicio de sesión...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#17151b] sm:text-4xl">
            Mis reservas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6971] sm:text-base">
            Segui en un solo lugar todo lo que esta pasando con tus vestidos.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-7 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Aun no tienes reservas
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              Cuando solicites un vestido, lo veras aqui.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
            >
              Explorar vestidos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingReservations.length > 0 && (
              <ReservationSection
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
                  />
                ))}
              </ReservationSection>
            )}

            {acceptedReservations.length > 0 && (
              <ReservationSection
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
                  />
                ))}
              </ReservationSection>
            )}

            {upcomingAppointmentsReservations.length > 0 && (
              <ReservationSection
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
                  />
                ))}
              </ReservationSection>
            )}

            {confirmedReservations.length > 0 && (
              <ReservationSection
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
                  />
                ))}
              </ReservationSection>
            )}

            <Link
              href="/my-reservations/history"
              className="flex w-full items-center gap-3 rounded-[1.25rem] border border-[#eee4e9] bg-white p-4 shadow-[0_8px_26px_rgba(43,43,43,0.05)] transition hover:bg-[#fff8fa]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe7f0]">
                <Clock className="h-5 w-5 text-[#ff2f78]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-[#17151b]">
                  Historial
                </span>
                <span className="block text-sm text-[#6f6971]">
                  Consultá tus reservas anteriores.
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-[#ffd4e2] bg-[#fff7fa] px-3 py-1.5 text-xs font-semibold text-[#ff2f78]">
                Ver historial
              </span>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function ReservationSection({
  title,
  description,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_12px_38px_rgba(43,43,43,0.06)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-col gap-1.5 px-5 py-4 text-left transition hover:bg-[#fff8fa] sm:px-6"
      >
        <span className="flex items-center justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span className="truncate text-lg font-bold text-[#17151b] sm:text-xl">
              {title}
            </span>
            {count > 0 && (
              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#ffe7f0] px-2 text-xs font-bold text-[#ff2f78]">
                {count}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[#ff2f78] transition-transform duration-200 ${
              open ? "rotate-0" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
        </span>
        {description ? (
          <span className="text-sm leading-5 text-[#6f6971]">{description}</span>
        ) : null}
      </button>

      {open && (
        <div className="border-t border-[#f1e9ef] px-5 pb-5 pt-4 sm:px-6">
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
}: {
  reservation: Reservation;
  priority: boolean;
  variant: "action" | "confirmed" | "pending";
}) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Confirmando local";
  const isAppointmentScheduled = reservation.status === "appointment_scheduled";
  const appointmentDate = formatAppointmentDate(reservation.appointment_date);
  const appointmentTime = formatAppointmentTime(reservation.appointment_date);

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_12px_38px_rgba(43,43,43,0.06)] md:flex-row">
      <DressImage
        image={reservation.vestidos?.imagen}
        dressName={dressName}
        priority={priority}
        className="h-44 w-full shrink-0 md:h-auto md:min-h-[200px] md:w-60"
        sizes="(max-width: 767px) 100vw, 240px"
      />

      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight text-[#17151b]">
              {dressName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-[#6f6971]">
              <Store
                className="h-4 w-4 shrink-0 text-[#ff2f78]"
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
                    className="h-4 w-4 shrink-0 text-[#ff2f78]"
                    strokeWidth={2}
                  />
                }
                label="Fecha de tu evento"
                value={formatDate(reservation.event_date)}
              />
              <MiniInfo
                icon={
                  <Tag
                    className="h-4 w-4 shrink-0 text-[#ff2f78]"
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
                    className="h-4 w-4 shrink-0 text-[#ff2f78]"
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
                <div className="w-fit rounded-2xl bg-[#faf4f7] px-4 py-3">
                  <p className="text-sm font-semibold text-[#252329]">
                    Cita agendada.
                  </p>
                  <p className="mt-0.5 max-w-[16rem] text-sm text-[#6f6971]">
                    Asistí al local en la fecha y hora indicadas y presentá tu
                    PIN.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <MiniInfo
                    fit
                    icon={
                      <CalendarDays
                        className="h-4 w-4 shrink-0 text-[#ff2f78]"
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
                          className="h-4 w-4 shrink-0 text-[#ff2f78]"
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
              ) : null}
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#faf4f7] px-4 py-3">
                <p className="text-sm font-semibold text-[#252329]">
                  El local aceptó tu solicitud.
                </p>
                <p className="mt-0.5 text-sm text-[#6f6971]">
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
    <div className={`relative overflow-hidden bg-pink-50 ${className}`}>
      {image ? (
        <Image
          src={image}
          alt={dressName}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center text-lg font-semibold tracking-[0.32em] text-[var(--primary)]">
          DREVA
        </div>
      )}
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
      className={`rounded-2xl border border-[#f1dfe7] bg-[#fff8fa] px-4 py-2.5 ${
        fit ? "w-fit" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a49aa4]">
        {label}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[#252329]">
        {icon}
        {value}
      </p>
    </div>
  );
}

function PinBlock({ pin, large = false }: { pin: string; large?: boolean }) {
  return (
    <div
      className={`w-full rounded-2xl border-2 border-[#ffd4e2] bg-[#fff7fa] text-center shadow-[0_6px_20px_rgba(255,47,120,0.06)] ${
        large ? "max-w-[22rem] px-6 py-5" : "max-w-xs px-5 py-4"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff2f78]">
        Tu PIN
      </p>
      <p
        className={`mt-1.5 font-mono font-bold tracking-[0.22em] text-[#252329] ${
          large ? "text-3xl sm:text-4xl" : "text-3xl"
        }`}
      >
        {pin}
      </p>
      <p className="mt-1 text-xs font-medium text-[#6f6971]">
        Muestralo en el local.
      </p>
    </div>
  );
}
