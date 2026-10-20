"use client";

import { DressImage } from "@/app/components/DressImage";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock3,
  History as HistoryIcon,
  Store,
  Tag,
} from "lucide-react";

import { ProfileNavbar } from "@/app/components/ProfileNavbar";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type HistoryStatus = "completed" | "cancelled" | "expired";

type HistoryReservation = {
  id: string;
  status: HistoryStatus;
  event_date: string | null;
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
  } | null;
};

type BaseHistoryReservation = Omit<HistoryReservation, "vestidos" | "locales">;

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
};

const HISTORY_STATUSES: HistoryStatus[] = ["completed", "cancelled", "expired"];

const STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: "Finalizada",
  cancelled: "Cancelada",
  expired: "Vencida",
};

const STATUS_STYLES: Record<HistoryStatus, string> = {
  completed: "border-dreva-success/25 bg-dreva-success-bg text-dreva-success",
  cancelled: "border-dreva-error/25 bg-dreva-error-bg text-dreva-error",
  expired: "border-dreva-neutral/25 bg-dreva-neutral-bg text-dreva-neutral",
};

const STATUS_ICONS: Record<HistoryStatus, ReactNode> = {
  completed: <CircleCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />,
  cancelled: <CircleX className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />,
  expired: <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />,
};

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

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<HistoryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async (clientId: string) => {
    const { data: baseReservations, error: baseError } = await supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        event_date,
        created_at,
        dress_id,
        owner_id
      `,
      )
      .eq("user_id", clientId)
      .in("status", HISTORY_STATUSES)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (baseError) {
      console.error("[my-reservations/history] base reservations fetch error", baseError);
      throw baseError;
    }

    const reservations = (baseReservations || []) as BaseHistoryReservation[];

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
        console.error("[my-reservations/history] vestidos fallback fetch error", {
          message: dressesError.message,
          details: dressesError.details,
          hint: dressesError.hint,
        });
      } else {
        (dresses || []).forEach((dress) => {
          const summary = dress as DressSummary;
          dressMap.set(String(summary.id), summary);
        });
      }
    }

    if (ownerIds.length > 0) {
      const { data: locales, error: localesError } = await supabase
        .from("locales")
        .select("id,owner_id,nombre")
        .in("owner_id", ownerIds);

      if (localesError) {
        console.warn("[my-reservations/history] locales fallback unavailable", {
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
    })) as HistoryReservation[];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
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
        const data = await fetchHistory(userId);

        if (cancelled) {
          return;
        }

        setReservations(data);
      } catch {
        if (!cancelled) {
          setErrorMessage("No pudimos cargar tus reservas anteriores en este momento.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchHistory, router, userId]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-dreva-background text-dreva-text">
        <ProfileNavbar backLabel="Volver a Mis reservas" backHref="/my-reservations" />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-center justify-center px-5 lg:w-[88%]">
          <p className="rounded-full border border-dreva-border bg-white px-5 py-3 text-sm font-semibold text-dreva-text-muted shadow-dreva-sm">
            Cargando tu historial...
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-dreva-background text-dreva-text">
        <ProfileNavbar backLabel="Volver a Mis reservas" backHref="/my-reservations" />
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
        <ProfileNavbar backLabel="Volver a Mis reservas" backHref="/my-reservations" />

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8 lg:w-[88%] lg:px-0 lg:pt-7">
          <header className="mb-8">
            <h1 className="text-[30px] font-bold tracking-tight text-[#211d26] sm:text-[34px]">
              Historial de reservas
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#635b66] sm:text-base">
              Consultá tus reservas anteriores. Acá podés ver las solicitudes que ya
              finalizaron, fueron canceladas o vencieron.
            </p>
          </header>

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-dreva-dialog border border-dreva-border bg-white p-6 text-sm font-medium text-dreva-error shadow-dreva-sm sm:max-w-2xl"
            >
              {errorMessage}
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-dreva-dialog border border-[#ffd8e6] bg-white px-6 py-7 text-center shadow-dreva-sm sm:px-8 sm:py-8">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dreva-soft text-dreva-brand">
                <HistoryIcon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              </span>
              <h2 className="text-2xl font-semibold text-dreva-text">
                Aún no tenés reservas en tu historial
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-dreva-text-muted">
                Acá aparecerán las reservas que ya finalizaron, fueron canceladas o
                vencieron.
              </p>
              <Link
                href="/my-reservations"
                className="mt-6 inline-flex rounded-full bg-dreva-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
              >
                Volver a Mis reservas
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {reservations.map((reservation) => (
                <HistoryCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HistoryCard({ reservation }: { reservation: HistoryReservation }) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Confirmando local";
  const priceValue = formatPrice(reservation.vestidos?.precio);
  const priceLabel = priceValue ? `Gs. ${priceValue}` : "Consultar precio";

  return (
    <article className="flex flex-col gap-3 rounded-dreva-card border border-[#ffd8e6] bg-white p-3 shadow-dreva-sm transition hover:border-[#f3c7d6] sm:flex-row sm:items-stretch sm:gap-4">
      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-dreva-soft sm:h-[204px] sm:w-[168px]">
        <DressImage
          src={reservation.vestidos?.imagen}
          alt={dressName}
          fill
          sizes="(min-width: 640px) 168px, 100vw"
          className="object-contain"
          fallback={
            <div className="grid h-full place-items-center text-xs font-semibold tracking-[0.3em] text-dreva-brand">
              DREVA
            </div>
          }
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold leading-tight text-dreva-text sm:text-base">
              {dressName}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-dreva-text-muted">
              <Store
                className="h-4 w-4 shrink-0 text-dreva-brand"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="truncate">{localName}</span>
            </p>
          </div>

          <span
            className={`flex w-fit shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[reservation.status]}`}
          >
            {STATUS_ICONS[reservation.status]}
            {STATUS_LABELS[reservation.status]}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <HistoryInfo
            icon={<CalendarDays className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
            label="Fecha del evento"
            value={formatDate(reservation.event_date)}
          />
          <HistoryInfo
            icon={<Tag className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
            label="Precio"
            value={priceLabel}
          />
        </div>
      </div>
    </article>
  );
}

function HistoryInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] min-w-0 max-w-full items-center gap-2 rounded-dreva-control border border-dreva-border/70 bg-dreva-soft px-3 py-1.5">
      <span className="shrink-0 text-dreva-brand">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-dreva-text-muted">
          {label}
        </span>
        <span className="block truncate text-[13px] font-semibold text-dreva-text">
          {value}
        </span>
      </span>
    </div>
  );
}
