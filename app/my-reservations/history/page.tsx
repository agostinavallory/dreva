"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Store, Tag } from "lucide-react";

import { Navbar } from "@/app/components/Navbar";
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
  completed: "border-pink-100 bg-pink-50 text-[#ff2f78]",
  cancelled: "border-rose-100 bg-rose-50 text-rose-700",
  expired: "border-zinc-200 bg-zinc-100 text-zinc-600",
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
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-5">
          <p className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--muted)] shadow-sm">
            Cargando tu historial...
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
        <Link
          href="/my-reservations"
          className="mb-6 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:text-[#ff2f78]"
        >
          Volver a Mis reservas
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#17151b] sm:text-4xl">
            Historial
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6971] sm:text-base">
            Consultá tus reservas anteriores.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-7 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Todavía no tenés reservas anteriores.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              Cuando una reserva se finalice, la vas a encontrar acá.
            </p>
            <Link
              href="/my-reservations"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
            >
              Volver a Mis reservas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <HistoryCard key={reservation.id} reservation={reservation} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function HistoryCard({ reservation }: { reservation: HistoryReservation }) {
  const dressName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const localName = reservation.locales?.nombre ?? "Confirmando local";
  const priceValue = formatPrice(reservation.vestidos?.precio);
  const priceLabel = priceValue ? `Gs. ${priceValue}` : "Consultar precio";

  return (
    <article className="flex gap-3 rounded-[1.25rem] border border-[#eee4e9] bg-white p-3 shadow-[0_8px_26px_rgba(43,43,43,0.05)] sm:gap-4 sm:p-4">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-pink-50 sm:h-28 sm:w-24">
        {reservation.vestidos?.imagen ? (
          <Image
            src={reservation.vestidos.imagen}
            alt={dressName}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs font-semibold tracking-[0.3em] text-[#ff2f78]">
            DREVA
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-bold leading-tight text-[#17151b] sm:text-base">
            {dressName}
          </h3>
          <span
            className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[reservation.status]}`}
          >
            {STATUS_LABELS[reservation.status]}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-sm text-[#6f6971]">
            <Store
              className="h-4 w-4 shrink-0 text-[#ff2f78]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="truncate">{localName}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-[#6f6971]">
            <CalendarDays
              className="h-4 w-4 shrink-0 text-[#ff2f78]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="truncate">{formatDate(reservation.event_date)}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[#252329]">
            <Tag
              className="h-4 w-4 shrink-0 text-[#ff2f78]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="truncate">{priceLabel}</span>
          </p>
        </div>
      </div>
    </article>
  );
}