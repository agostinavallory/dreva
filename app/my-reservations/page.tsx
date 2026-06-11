"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  } | null;
  locales?: {
    nombre?: string | null;
  } | null;
};

type BaseReservation = Omit<Reservation, "vestidos" | "locales">;

type DressSummary = {
  id: number | string;
  nombre?: string | null;
  imagen?: string | null;
};

type LocalSummary = {
  id?: string | null;
  user_id?: string | null;
  owner_id?: string | null;
  nombre?: string | null;
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

const TERMINAL_STATUSES: ReservationStatus[] = ["completed", "cancelled", "expired"];
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

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function MyReservationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const pendingReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status === "pending")
        .sort((a, b) => recentTime(b) - recentTime(a)),
    [reservations],
  );
  const coordinateReservations = useMemo(
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
  const historyReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        TERMINAL_STATUSES.includes(reservation.status),
      ),
    [reservations],
  );

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
        .select("id,nombre,imagen")
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
        .select("id,user_id,owner_id,nombre")
        .or(
          `id.in.(${ownerIds.join(",")}),user_id.in.(${ownerIds.join(
            ",",
          )}),owner_id.in.(${ownerIds.join(",")})`,
        );

      if (localesError) {
        console.warn("[my-reservations] locales fallback unavailable", {
          message: localesError.message,
          details: localesError.details,
          hint: localesError.hint,
        });
      } else {
        (locales || []).forEach((local) => {
          const summary = local as LocalSummary;
          [summary.id, summary.user_id, summary.owner_id].forEach((id) => {
            if (id) {
              localMap.set(String(id), summary);
            }
          });
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
        <div className="mb-12 rounded-2xl border border-pink-100 bg-white px-6 py-7 shadow-[0_12px_40px_rgba(43,43,43,0.07)] sm:px-10 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            DREVA
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
                Tus reservas
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Lo que esta pasando ahora con tus vestidos.
              </p>
            </div>
            <div className="rounded-2xl border border-pink-100 bg-pink-50 px-5 py-4">
              <p className="text-2xl font-semibold text-[var(--ink)]">
                {coordinateReservations.length + upcomingAppointmentsReservations.length}
              </p>
              <p className="text-xs font-semibold text-[var(--muted)]">En proceso</p>
            </div>
          </div>
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
          <div className="flex flex-col gap-14">
            <ReservationSection
              title="Esperando respuesta"
              description="El local aun no respondio."
              emptyMessage="Nada en espera por ahora."
              isEmpty={pendingReservations.length === 0}
              count={pendingReservations.length}
              tone="pending"
            >
              {pendingReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  priority={false}
                  variant="pending"
                />
              ))}
            </ReservationSection>

            <ReservationSection
              title="Coordina tu cita"
              description="Coordina tu cita por WhatsApp."
              emptyMessage="Nada que coordinar."
              isEmpty={coordinateReservations.length === 0}
              count={coordinateReservations.length}
              tone="coordinate"
            >
              {coordinateReservations.map((reservation, index) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  priority={index === 0}
                  variant="action"
                />
              ))}
            </ReservationSection>

            <ReservationSection
              title="Proximas citas"
              description="Ya tienes una cita programada."
              emptyMessage="Sin citas programadas."
              isEmpty={upcomingAppointmentsReservations.length === 0}
              count={upcomingAppointmentsReservations.length}
              tone="upcoming"
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

            <ReservationSection
              title="Confirmadas"
              description="Listas para tu evento."
              emptyMessage="Aun sin confirmar."
              isEmpty={confirmedReservations.length === 0}
              count={confirmedReservations.length}
              tone="confirmed"
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

            <ReservationSection
              title="Historial"
              description="Aqui veras tus reservas anteriores."
              emptyMessage="Sin historial todavia."
              isEmpty={historyReservations.length === 0}
              count={historyReservations.length}
              tone="history"
              headerAction={
                historyReservations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowHistory((current) => !current)}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:border-pink-200 hover:bg-pink-50 sm:w-auto"
                  >
                    {showHistory ? "Ocultar historial" : "Ver historial"}
                  </button>
                ) : undefined
              }
            >
              {showHistory ? (
                historyReservations.map((reservation) => (
                  <HistoryReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-sm font-medium text-[var(--muted)]">
                  Toca &quot;Ver historial&quot; para ver reservas anteriores.
                </p>
              )}
            </ReservationSection>
          </div>
        )}
      </section>
    </main>
  );
}

type SectionTone = "pending" | "coordinate" | "upcoming" | "confirmed" | "history";

const SECTION_TONE_STYLES: Record<
  SectionTone,
  { container: string; divider: string; accent: string; empty: string }
> = {
  pending: {
    container:
      "border border-zinc-200 bg-zinc-50/60 shadow-[0_10px_36px_rgba(43,43,43,0.05)]",
    divider: "border-zinc-200",
    accent: "bg-amber-300",
    empty: "border-zinc-100 bg-white",
  },
  coordinate: {
    container:
      "border border-pink-200 bg-pink-50/40 shadow-[0_14px_44px_rgba(255,92,168,0.12)] ring-1 ring-pink-100",
    divider: "border-pink-200/80",
    accent: "bg-[var(--primary)]",
    empty: "border-pink-100 bg-white",
  },
  upcoming: {
    container:
      "border border-sky-200 bg-sky-50/50 shadow-[0_10px_36px_rgba(14,165,233,0.08)]",
    divider: "border-sky-200/80",
    accent: "bg-sky-400",
    empty: "border-sky-100 bg-white",
  },
  confirmed: {
    container:
      "border border-fuchsia-200 bg-fuchsia-50/40 shadow-[0_10px_36px_rgba(217,70,239,0.08)]",
    divider: "border-fuchsia-200/80",
    accent: "bg-fuchsia-400",
    empty: "border-fuchsia-100 bg-white",
  },
  history: {
    container:
      "border border-zinc-200 bg-zinc-100/50 shadow-[0_6px_24px_rgba(43,43,43,0.04)]",
    divider: "border-zinc-200",
    accent: "bg-zinc-300",
    empty: "border-zinc-100 bg-zinc-50",
  },
};

function ReservationSection({
  title,
  description,
  emptyMessage,
  isEmpty,
  count,
  tone,
  headerAction,
  children,
}: {
  title: string;
  description?: string;
  emptyMessage: string;
  isEmpty: boolean;
  count: number;
  tone: SectionTone;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const styles = SECTION_TONE_STYLES[tone];

  return (
    <section className={`overflow-hidden rounded-2xl p-6 sm:p-8 ${styles.container}`}>
      <div className={`mb-1 h-1 w-14 rounded-full ${styles.accent}`} />
      <div
        className={`mb-6 mt-5 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between ${styles.divider}`}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-[var(--ink)] sm:text-2xl">
            {title} ({count})
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>

      {isEmpty ? (
        <p
          className={`rounded-2xl border px-5 py-5 text-sm font-medium text-[var(--muted)] ${styles.empty}`}
        >
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-6">{children}</div>
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
  const isAccepted = reservation.status === "accepted";
  const isAppointmentScheduled = reservation.status === "appointment_scheduled";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-pink-100 bg-white shadow-[0_20px_70px_rgba(43,43,43,0.08)]">
      <div className="grid min-w-0 md:grid-cols-[minmax(240px,32%)_minmax(0,1fr)]">
        <DressImage
          image={reservation.vestidos?.imagen}
          dressName={dressName}
          priority={priority}
          className="h-[280px] md:h-full md:min-h-[320px]"
          sizes="(max-width: 767px) 100vw, 320px"
        />

        <div className="min-w-0 p-6 sm:p-8">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-tight text-[var(--ink)] sm:text-2xl">
                {dressName}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{localName}</p>
            </div>
            <span
              className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[reservation.status]}`}
            >
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>

          {variant === "confirmed" || variant === "pending" ? (
            <div className="mt-6 space-y-5">
              <div className="max-w-md rounded-2xl bg-pink-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-[var(--muted)]">
                  Fecha del evento
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {formatDate(reservation.event_date)}
                </p>
              </div>

              {variant === "confirmed" &&
                shouldShowPin(reservation.status) &&
                reservation.client_pin && <PinBlock pin={reservation.client_pin} />}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-2xl bg-[#faf7f5] px-4 py-3.5">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {isAccepted ? "El local acepto." : "Cita registrada."}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {isAccepted
                    ? "Escribele por WhatsApp."
                    : "Ve al local con tu PIN."}
                </p>
              </div>

              {isAppointmentScheduled && (
                <div className="max-w-md rounded-2xl bg-sky-50 px-4 py-3">
                  <p className="text-xs font-semibold text-sky-700">Tu cita</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                    {formatDate(reservation.appointment_date)}
                  </p>
                </div>
              )}

              {shouldShowPin(reservation.status) && reservation.client_pin && (
                <PinBlock pin={reservation.client_pin} />
              )}

              {shouldShowWhatsapp(reservation.status) && (
                <a
                  href={whatsappHref(reservation)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center rounded-2xl border border-green-200 bg-green-50 py-4 text-center text-sm font-semibold text-green-700 transition hover:bg-green-100"
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
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

function PinBlock({ pin }: { pin: string }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-pink-200 bg-[linear-gradient(135deg,#fff7fb,#ffffff)] px-6 py-5 text-center shadow-[0_8px_28px_rgba(255,92,168,0.10)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
        Tu PIN
      </p>
      <p className="mt-2 font-mono text-4xl font-bold tracking-[0.28em] text-[var(--ink)] sm:text-5xl">
        {pin}
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted)]">
        Muestralo en el local.
      </p>
    </div>
  );
}

function HistoryReservationCard({ reservation }: { reservation: Reservation }) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Confirmando local";

  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 opacity-90">
      <DressImage
        image={reservation.vestidos?.imagen}
        dressName={dressName}
        priority={false}
        className="h-[100px] rounded-xl"
        sizes="88px"
      />
      <div className="min-w-0 py-1.5 pr-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--ink)]">
              {dressName}
            </h3>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">{localName}</p>
          </div>
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[reservation.status]}`}
          >
            {STATUS_LABELS[reservation.status]}
          </span>
        </div>
        <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
          {formatDate(reservation.event_date)}
        </p>
      </div>
    </article>
  );
}
