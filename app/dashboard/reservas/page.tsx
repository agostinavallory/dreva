"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import DashboardNav from "@/app/components/DashboardNav";
import { CalendarDays, ChevronDown, Search, Shirt } from "lucide-react";

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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  appointment_scheduled: "Cita agendada",
  confirmed: "Confirmada",
  completed: "Completada",
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

type StatusFilter = "all" | ReservationStatus;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "accepted", label: "Aceptada" },
  { value: "appointment_scheduled", label: "Cita agendada" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "expired", label: "Expirada" },
];

type SortOrder = "nearest" | "farthest";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "nearest", label: "Fecha del evento (más próxima)" },
  { value: "farthest", label: "Fecha del evento (más lejana)" },
];

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

function eventDateTimestamp(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDate
    ? new Date(Number(simpleDate[1]), Number(simpleDate[2]) - 1, Number(simpleDate[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return date.getTime();
}

export default function ReservasDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clientMap, setClientMap] = useState<Map<string, ClientProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nearest");

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

  const getClientName = useCallback(
    (reservationId: string) => {
      const profile = clientMap.get(reservationId);
      if (!profile) return null;
      return [profile.nombre, profile.apellido].filter(Boolean).join(" ").trim() || null;
    },
    [clientMap],
  );

  const visibleReservations = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();

    const filtered = reservations.filter((reservation) => {
      if (statusFilter !== "all" && reservation.status !== statusFilter) {
        return false;
      }

      if (query) {
        const clientName = getClientName(reservation.id) ?? "";
        const vestidoName = reservation.vestidos?.nombre ?? "";
        const haystack = `${clientName} ${vestidoName}`.toLocaleLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const aTimestamp = eventDateTimestamp(a.event_date);
      const bTimestamp = eventDateTimestamp(b.event_date);

      if (aTimestamp !== bTimestamp) {
        if (aTimestamp === Number.POSITIVE_INFINITY) {
          return 1;
        }
        if (bTimestamp === Number.POSITIVE_INFINITY) {
          return -1;
        }
        return sortOrder === "nearest" ? aTimestamp - bTimestamp : bTimestamp - aTimestamp;
      }

      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }, [getClientName, reservations, searchTerm, sortOrder, statusFilter]);

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

        <header className="mb-8 mt-2 rounded-[1.5rem] border border-[#ffd2e2] bg-white px-5 py-6 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7">
          <h1 className="mt-2 text-2xl font-extrabold leading-tight text-[#17151b] sm:text-3xl">
            Reservas
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#6d6670]">
            Consultá todas las reservas de tus clientas.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-extrabold text-[#17151b]">
              Todavía no tenés reservas.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6d6670]">
              Cuando una clienta solicite uno de tus vestidos, aparecerá acá.
            </p>
          </div>
        ) : (
          <>
            <ReservationFilters
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />

            {visibleReservations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#e6cdd8] bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-medium leading-6 text-[#9a8f98]">
                  No se encontraron reservas con los filtros seleccionados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    clientName={getClientName(reservation.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function ReservationFilters({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortOrderChange,
}: {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
}) {
  const selectClass =
    "w-full appearance-none rounded-full border border-[#eadfe5] bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-[#17151b] outline-none transition focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]";

  return (
    <div className="mb-6 rounded-[1.5rem] border border-[#ffd2e2] bg-white px-5 py-5 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="search-reservations"
            className="block text-xs font-bold uppercase tracking-wide text-[#6d6670]"
          >
            Buscar
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a49aa4]"
              strokeWidth={2}
            />
            <input
              id="search-reservations"
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Buscar por clienta o vestido..."
              className="w-full rounded-full border border-[#eadfe5] bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]"
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:flex lg:items-end lg:gap-4">
          <div className="min-w-0 sm:min-w-44">
            <label
              htmlFor="filter-status"
              className="block text-xs font-bold uppercase tracking-wide text-[#6d6670]"
            >
              Estado
            </label>
            <div className="relative mt-2">
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(event) =>
                  onStatusFilterChange(event.target.value as StatusFilter)
                }
                className={selectClass}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8f98]"
                strokeWidth={2}
              />
            </div>
          </div>

          <div className="min-w-0 sm:min-w-52">
            <label
              htmlFor="sort-order"
              className="block text-xs font-bold uppercase tracking-wide text-[#6d6670]"
            >
              Ordenar por
            </label>
            <div className="relative mt-2">
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(event) =>
                  onSortOrderChange(event.target.value as SortOrder)
                }
                className={selectClass}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8f98]"
                strokeWidth={2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  clientName,
}: {
  reservation: Reservation;
  clientName: string | null;
}) {
  const vestidoName = reservation.vestidos?.nombre ?? "Vestido DREVA";
  const vestidoImagen = reservation.vestidos?.imagen;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_14px_42px_rgba(38,31,36,0.06)]">
      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[#fff4f8] md:h-auto md:min-h-full">
          {vestidoImagen ? (
            <Image
              src={vestidoImagen}
              alt={vestidoName}
              fill
              sizes="(max-width: 767px) 100vw, 220px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center px-5 text-center text-sm font-semibold leading-6 text-[#9a8f98]">
              Imagen del vestido no disponible
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <h3 className="truncate text-lg font-bold leading-tight text-[#17151b]">
              {clientName ?? "Clienta sin registrar"}
            </h3>
            <span
              className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                STATUS_STYLES[reservation.status]
              }`}
            >
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>

          <p className="mt-3 flex min-w-0 items-center gap-2 text-sm font-semibold leading-6 text-[#5d535c]">
            <Shirt className="h-4 w-4 shrink-0 text-[#ff2f78]" strokeWidth={2} />
            <span className="truncate">{vestidoName}</span>
          </p>

          <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold leading-6 text-[#5d535c]">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#ff2f78]" strokeWidth={2} />
            <span>Evento: {formatDate(reservation.event_date)}</span>
          </p>

          <div className="mt-auto flex flex-col pt-6 sm:items-end">
            <Link
              href={`/dashboard/reservas/${reservation.id}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-[#f3c7d6] bg-white px-5 py-2.5 text-sm font-bold text-[#d92f68] transition hover:bg-[#fff7fa] sm:w-auto lg:min-w-40"
            >
              Ver reserva
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}