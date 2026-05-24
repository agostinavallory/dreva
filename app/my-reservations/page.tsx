"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type TimelineState = "done" | "current" | "waiting" | "closed";

type TimelineItem = {
  label: string;
  description: string;
  state: TimelineState;
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Solicitud enviada",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita agendada",
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

const NEXT_ACTIONS: Record<ReservationStatus, string> = {
  pending:
    "DREVA registro tu solicitud y la envio al local. El local debe confirmar si puede avanzar con esta fecha.",
  accepted:
    "El local acepto revisar la reserva. La cita se coordina directamente por WhatsApp; DREVA no agenda esa conversacion automaticamente.",
  appointment_scheduled:
    "El local ya registro una cita en DREVA. Asiste a la prueba y muestra tu codigo de confirmacion al local.",
  confirmed:
    "El local valido tu codigo en tienda. DREVA mantiene la reserva confirmada para la fecha de tu evento.",
  completed: "El local marco esta reserva como finalizada. Gracias por usar DREVA.",
  cancelled:
    "Esta solicitud fue cancelada. Puedes elegir otro vestido cuando quieras.",
  expired:
    "La reserva expiro porque no avanzo a tiempo. Puedes solicitar nuevamente si el vestido sigue disponible.",
};

const TERMINAL_STATUSES: ReservationStatus[] = ["completed", "cancelled", "expired"];

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
  return status === "appointment_scheduled" || status === "confirmed";
}

function shouldShowWhatsapp(status: ReservationStatus) {
  return status === "accepted" || status === "appointment_scheduled";
}

function timelineProgress(status: ReservationStatus) {
  if (status === "pending") {
    return 0;
  }

  if (status === "accepted") {
    return 1;
  }

  if (status === "appointment_scheduled") {
    return 2;
  }

  if (status === "confirmed") {
    return 3;
  }

  if (status === "completed") {
    return 4;
  }

  return 0;
}

function timelineItems(status: ReservationStatus) {
  const progress = timelineProgress(status);
  const isClosed = TERMINAL_STATUSES.includes(status) && status !== "completed";

  return [
    {
      label: "Solicitud enviada",
      description: "DREVA recibio tu solicitud y bloqueo el proceso para revision.",
    },
    {
      label: "Confirmar disponibilidad local",
      description: "El local acepta o rechaza la solicitud desde su panel.",
    },
    {
      label: "Cita de prueba agendada",
      description: "La fecha se coordina por WhatsApp y el local la registra en DREVA.",
    },
    {
      label: "Reserva confirmada",
      description: "En tienda, el local valida tu codigo de confirmacion.",
    },
    {
      label: "Finalizada",
      description: "El local cierra la reserva cuando termina el proceso.",
    },
  ].map((item, index): TimelineItem => {
    let state: TimelineState = index < progress ? "done" : "waiting";

    if (index === progress) {
      state = status === "completed" ? "done" : "current";
    }

    if (isClosed && index > 0) {
      state = "closed";
    }

    return { ...item, state };
  });
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

  const activeCount = useMemo(
    () =>
      reservations.filter(
        (reservation) => !TERMINAL_STATUSES.includes(reservation.status),
      ).length,
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
        <section className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-5">
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
        <section className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-5">
          <p className="text-sm font-medium text-[var(--muted)]">
            Redirigiendo a inicio de sesion...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8">
        <div className="mb-6 rounded-[2rem] border border-pink-100 bg-white px-5 py-6 shadow-[0_20px_70px_rgba(255,92,168,0.10)] sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            Mis Reservas
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-[var(--ink)] sm:text-4xl">
                Todo claro para tu evento
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Revisa el avance de cada reserva. DREVA registra los estados; la cita se coordina directamente con el local.
              </p>
            </div>
            <div className="rounded-2xl bg-pink-50 px-4 py-3">
              <p className="text-2xl font-semibold text-[var(--ink)]">{activeCount}</p>
              <p className="text-xs font-semibold text-[var(--muted)]">
                Reservas activas
              </p>
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
              Cuando solicites un vestido, aqui veras el avance del proceso, la cita registrada y el codigo para el local.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
            >
              Explorar vestidos
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {reservations.map((reservation, index) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                priority={index === 0}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ReservationCard({
  reservation,
  priority,
}: {
  reservation: Reservation;
  priority: boolean;
}) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Local por confirmar";

  return (
    <article className="rounded-[1.5rem] border border-pink-100 bg-white p-3 shadow-[0_18px_60px_rgba(43,43,43,0.07)] md:overflow-hidden md:rounded-[2rem] md:p-0">
      <div className="grid min-w-0 gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-[240px] max-h-[260px] overflow-hidden rounded-xl bg-pink-50 md:h-full md:max-h-none md:min-h-full md:rounded-none">
          {reservation.vestidos?.imagen ? (
            <Image
              src={reservation.vestidos.imagen}
              alt={dressName}
              fill
              priority={priority}
              sizes="(max-width: 767px) calc(100vw - 56px), 220px"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-lg font-semibold tracking-[0.32em] text-[var(--primary)]">
              DREVA
            </div>
          )}
        </div>

        <div className="min-w-0 px-1 py-5 sm:px-2 md:p-6">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-tight text-[var(--ink)] sm:text-2xl">
                {dressName}
              </h2>
              <p className="mt-2 text-sm font-medium text-[var(--muted)]">
                {localName}
              </p>
            </div>
            <span
              className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[reservation.status]}`}
            >
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
            <InfoPill label="Fecha del evento" value={formatDate(reservation.event_date)} />
            <InfoPill
              label="Cita de prueba registrada"
              value={formatDate(reservation.appointment_date)}
            />
          </div>

          <p className="mt-5 rounded-2xl bg-[#faf7f5] px-4 py-3 text-sm font-medium leading-6 text-[var(--ink)]">
            {NEXT_ACTIONS[reservation.status]}
          </p>

          <Timeline status={reservation.status} />

          {(shouldShowWhatsapp(reservation.status) ||
            shouldShowPin(reservation.status)) && (
            <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch">
              {shouldShowWhatsapp(reservation.status) && (
                <a
                  href={whatsappHref(reservation)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Coordinar cita con el local
                </a>
              )}

              {shouldShowPin(reservation.status) && reservation.client_pin && (
                <div className="w-full rounded-2xl border border-pink-100 bg-[linear-gradient(135deg,#fff7fb,#ffffff)] px-5 py-4 text-center shadow-sm md:w-auto md:min-w-[230px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                    Codigo para el local
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-[0.24em] text-[var(--ink)]">
                    {reservation.client_pin}
                  </p>
                  <p className="mt-2 text-xs font-medium leading-5 text-[var(--muted)]">
                    Muestralo en tienda. Solo el local puede validarlo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-pink-50 px-4 py-3">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function Timeline({ status }: { status: ReservationStatus }) {
  return (
    <ol className="mt-6 space-y-3">
      {timelineItems(status).map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
              item.state === "done"
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : item.state === "current"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : item.state === "closed"
                    ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                    : "border-pink-100 bg-white text-zinc-300"
            }`}
          >
            {item.state === "done" ? "OK" : item.state === "current" ? "..." : ""}
          </span>
          <span
            className={`min-w-0 text-sm ${
              item.state === "waiting" || item.state === "closed"
                ? "text-zinc-400"
                : "text-[var(--ink)]"
            }`}
          >
            <span className="block font-semibold">{item.label}</span>
            <span className="mt-0.5 block font-medium leading-5 text-[var(--muted)]">
              {item.description}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
