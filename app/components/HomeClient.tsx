"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dress } from "@/app/page";
import { supabase } from "@/lib/supabaseClient";
import { DressCard } from "./DressCard";
import { FiltersBar, FilterType } from "./FiltersBar";
import { HeroSearch } from "./HeroSearch";

type Props = {
  dresses: Dress[];
  sizes: string[];
  colors: string[];
};

type PriceFilter = {
  label: string;
  value: number;
};

type SortMode = "default" | "recent";

const priceOptions: PriceFilter[] = [
  { label: "Hasta Gs. 200.000", value: 200000 },
  { label: "Hasta Gs. 250.000", value: 250000 },
  { label: "Hasta Gs. 300.000", value: 300000 },
  { label: "Hasta Gs. 400.000", value: 400000 },
];

const lengthOptions = ["Corto", "Midi", "Largo"];
const blockingReservationStatuses = [
  "accepted",
  "appointment_scheduled",
  "confirmed",
];

function toNumberPrice(price: Dress["precio"]) {
  const numericPrice =
    typeof price === "string" ? Number(price.replace(/[^\d.]/g, "")) : price;

  return typeof numericPrice === "number" && !Number.isNaN(numericPrice)
    ? numericPrice
    : null;
}

function formatEventDate(date: string) {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  return new Intl.DateTimeFormat("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

function formatShortEventDate(date: string) {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  return new Intl.DateTimeFormat("es-PY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function normalizeDressId(dressId: Dress["id"]) {
  return String(dressId);
}

export function HomeClient({ dresses, sizes, colors }: Props) {
  const [search, setSearch] = useState("");
  const [eventDate, setEventDate] = useState("");
  const eventDateInputRef = useRef<HTMLInputElement>(null);
  const [unavailableDressIds, setUnavailableDressIds] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceFilter | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<FilterType | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  useEffect(() => {
    let cancelled = false;

    async function loadUnavailableDresses() {
      if (!eventDate) {
        setUnavailableDressIds([]);
        return;
      }

      const [reservationsResult, blocksResult] = await Promise.all([
        supabase
          .from("reservations")
          .select("dress_id")
          .eq("event_date", eventDate)
          .in("status", blockingReservationStatuses),
        supabase
          .from("dress_blocks")
          .select("dress_id")
          .lte("start_date", eventDate)
          .gte("end_date", eventDate),
      ]);

      if (cancelled) {
        return;
      }

      if (reservationsResult.error || blocksResult.error) {
        console.error("[DREVA home] availability lookup error", {
          reservationsError: reservationsResult.error,
          blocksError: blocksResult.error,
        });
      }

      const blockedIds = new Set<string>();

      reservationsResult.data?.forEach((reservation) => {
        if (reservation.dress_id !== null && reservation.dress_id !== undefined) {
          blockedIds.add(String(reservation.dress_id));
        }
      });

      blocksResult.data?.forEach((block) => {
        if (block.dress_id !== null && block.dress_id !== undefined) {
          blockedIds.add(String(block.dress_id));
        }
      });

      setUnavailableDressIds(Array.from(blockedIds));
    }

    loadUnavailableDresses();

    return () => {
      cancelled = true;
    };
  }, [eventDate]);

  const filtered = useMemo(() => {
    const unavailableIds = new Set(unavailableDressIds);

    return dresses.filter((dress) => {
      const normalizedSearch = search.toLowerCase().trim();
      const matchesAvailability =
        !eventDate || !unavailableIds.has(normalizeDressId(dress.id));
      const matchesSearch =
        normalizedSearch.length === 0 ||
        dress.nombre?.toLowerCase().includes(normalizedSearch) ||
        dress.color?.toLowerCase().includes(normalizedSearch);

      const matchesSize = !selectedSize || dress.talla === selectedSize;
      const matchesColor = !selectedColor || dress.color === selectedColor;
      const matchesLength = !selectedLength || dress.largo === selectedLength;
      const price = toNumberPrice(dress.precio);
      const matchesPrice =
        !selectedPrice || (price !== null && price <= selectedPrice.value);

      return (
        matchesAvailability &&
        matchesSearch &&
        matchesSize &&
        matchesColor &&
        matchesLength &&
        matchesPrice
      );
    });
  }, [
    dresses,
    eventDate,
    search,
    selectedColor,
    selectedLength,
    selectedPrice,
    selectedSize,
    unavailableDressIds,
  ]);

  const activeChips = [
    eventDate
      ? {
          key: "date",
          label: `Fecha: ${formatEventDate(eventDate)}`,
          onRemove: () => setEventDate(""),
        }
      : null,
    selectedColor
      ? {
          key: "color",
          label: selectedColor,
          onRemove: () => setSelectedColor(null),
        }
      : null,
    selectedSize
      ? {
          key: "size",
          label: `Talla ${selectedSize}`,
          onRemove: () => setSelectedSize(null),
        }
      : null,
    selectedLength
      ? {
          key: "length",
          label: selectedLength,
          onRemove: () => setSelectedLength(null),
        }
      : null,
    selectedPrice
      ? {
          key: "price",
          label: selectedPrice.label.replace("Hasta ", ""),
          onRemove: () => setSelectedPrice(null),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;

  const hasActiveFilters = activeChips.length > 0 || search.trim().length > 0;
  const resultLabel = "Explorá vestidos";
  const sortedDresses = useMemo(() => {
    if (sortMode === "default") {
      return filtered;
    }

    return [...filtered].sort(
      (firstDress, secondDress) =>
        new Date(secondDress.created_at).getTime() -
        new Date(firstDress.created_at).getTime(),
    );
  }, [filtered, sortMode]);

  function clearFilters() {
    setSearch("");
    setEventDate("");
    setSelectedSize(null);
    setSelectedColor(null);
    setSelectedLength(null);
    setSelectedPrice(null);
  }

  function openEventDatePicker() {
    const input = eventDateInputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <HeroSearch
        search={search}
        setSearch={setSearch}
      />

      <section className="rounded-[22px] border border-[#ff8fbb] bg-white px-5 py-5 shadow-dreva-xs sm:px-8 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffe4f0] text-[#ff1684] sm:h-[60px] sm:w-[60px]">
              <CalendarIcon />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#ff1684] sm:text-2xl">
                Fecha del evento
              </h1>
              <p className="mt-1.5 text-[15px] leading-6 text-[#5f6b7a] sm:text-base">
                El local confirmará la disponibilidad para la fecha de tu evento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openEventDatePicker}
            aria-label={
              eventDate
                ? `Fecha del evento: ${formatEventDate(eventDate)}. Cambiar fecha`
                : "Elegir fecha del evento"
            }
            className="inline-flex h-11 w-full cursor-pointer items-center gap-2 rounded-[13px] bg-dreva-action px-5 text-base font-semibold text-white shadow-[0_10px_24px_rgba(255,22,132,0.28)] transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff1684]/40 sm:h-[60px] sm:w-[208px]"
          >
            <CalendarIcon small />
            <span className="flex-1 truncate text-center">
              {eventDate ? formatShortEventDate(eventDate) : "Elegir fecha"}
            </span>
            <ChevronRightIcon />
          </button>
          <input
            ref={eventDateInputRef}
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      </section>

      <FiltersBar
        colors={colors}
        sizes={sizes}
        lengthOptions={lengthOptions}
        priceOptions={priceOptions}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        selectedLength={selectedLength}
        selectedPrice={selectedPrice}
        onOpenFilter={setActiveDrawer}
      />

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-dreva-border bg-dreva-soft px-3.5 py-1.5 text-xs font-semibold text-dreva-action shadow-dreva-xs transition hover:border-dreva-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30 sm:text-sm"
            >
              <span className="truncate">{chip.label}</span>
              <CloseIcon />
            </button>
          ))}

          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-dreva-action transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30"
          >
            Limpiar todo
            <TrashIcon />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xl font-bold text-dreva-text sm:text-2xl">
            {resultLabel}
          </p>
          {eventDate && (
            <p className="mt-1 text-sm font-semibold text-dreva-text-muted">
              Evento: {formatEventDate(eventDate)}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-pressed={sortMode === "recent"}
          onClick={() =>
            setSortMode((current) =>
              current === "recent" ? "default" : "recent",
            )
          }
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-dreva-control border border-dreva-border bg-dreva-surface px-4 text-sm font-semibold text-dreva-text shadow-dreva-xs transition hover:border-dreva-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30"
        >
          {sortMode === "recent" ? "✓ Más recientes" : "Más recientes"}
          <ChevronDownIcon />
        </button>
      </div>

      {sortedDresses.length === 0 ? (
        <div className="rounded-dreva-card border border-dreva-border bg-dreva-surface px-6 py-12 text-center shadow-dreva-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-dreva-soft text-dreva-action">
            <SearchOffIcon />
          </div>
          <h2 className="mt-5 text-xl font-bold text-dreva-text">
            {eventDate
              ? "No encontramos vestidos disponibles para esta fecha"
              : "No encontramos vestidos con esos filtros"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-dreva-text-muted">
            {eventDate
              ? "Probá cambiar la fecha o ajustar los filtros."
              : "Ajustá la búsqueda, color, talla o precio para ver más opciones."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-dreva-action px-6 py-3 text-sm font-bold text-white shadow-dreva-md transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
          {sortedDresses.map((dress) => (
            <DressCard key={dress.id} dress={dress} variant="home" />
          ))}
        </div>
      )}

      {activeDrawer && (
        <FilterDrawer
          activeDrawer={activeDrawer}
          colors={colors}
          sizes={sizes}
          lengthOptions={lengthOptions}
          priceOptions={priceOptions}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          selectedLength={selectedLength}
          selectedPrice={selectedPrice}
          setSelectedColor={setSelectedColor}
          setSelectedSize={setSelectedSize}
          setSelectedLength={setSelectedLength}
          setSelectedPrice={setSelectedPrice}
          onClose={() => setActiveDrawer(null)}
        />
      )}
    </div>
  );
}

type DrawerProps = {
  activeDrawer: FilterType;
  colors: string[];
  sizes: string[];
  lengthOptions: string[];
  priceOptions: PriceFilter[];
  selectedColor: string | null;
  selectedSize: string | null;
  selectedLength: string | null;
  selectedPrice: PriceFilter | null;
  setSelectedColor: (value: string | null) => void;
  setSelectedSize: (value: string | null) => void;
  setSelectedLength: (value: string | null) => void;
  setSelectedPrice: (value: PriceFilter | null) => void;
  onClose: () => void;
};

function FilterDrawer({
  activeDrawer,
  colors,
  sizes,
  lengthOptions,
  priceOptions,
  selectedColor,
  selectedSize,
  selectedLength,
  selectedPrice,
  setSelectedColor,
  setSelectedSize,
  setSelectedLength,
  setSelectedPrice,
  onClose,
}: DrawerProps) {
  const titleByFilter: Record<FilterType, string> = {
    color: "Color",
    size: "Talla",
    length: "Largo",
    price: "Precio",
  };

  function clearCurrentFilter() {
    if (activeDrawer === "color") setSelectedColor(null);
    if (activeDrawer === "size") setSelectedSize(null);
    if (activeDrawer === "length") setSelectedLength(null);
    if (activeDrawer === "price") setSelectedPrice(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/20 px-0 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Cerrar filtros"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-h-[90dvh] overflow-y-auto rounded-t-dreva-dialog border-t border-dreva-border bg-dreva-surface px-6 pb-7 pt-4 shadow-dreva-lg sm:mx-auto sm:max-w-3xl sm:px-12">
        <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-dreva-border" />
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-xl font-bold text-dreva-text">
            {titleByFilter[activeDrawer]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-dreva-text-muted transition hover:bg-dreva-soft hover:text-dreva-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30"
          >
            <CloseLargeIcon />
          </button>
        </div>

        {activeDrawer === "color" && (
          <div className="grid grid-cols-4 gap-5 sm:grid-cols-8">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-pressed={selectedColor === color}
                className="flex flex-col items-center gap-2 rounded-dreva-control text-sm font-medium text-dreva-text-muted transition hover:text-dreva-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30"
              >
                <span
                  className={`h-12 w-12 rounded-full border-2 shadow-dreva-xs ${
                    selectedColor === color
                      ? "border-dreva-action ring-4 ring-dreva-soft"
                      : "border-white"
                  }`}
                  style={{ backgroundColor: colorToHex(color) }}
                />
                {color}
              </button>
            ))}
          </div>
        )}

        {activeDrawer === "size" && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {sizes.map((size) => (
              <FilterOption
                key={size}
                label={size}
                active={selectedSize === size}
                onClick={() => setSelectedSize(size)}
              />
            ))}
          </div>
        )}

        {activeDrawer === "length" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {lengthOptions.map((length) => (
              <FilterOption
                key={length}
                label={length}
                active={selectedLength === length}
                onClick={() => setSelectedLength(length)}
              />
            ))}
          </div>
        )}

        {activeDrawer === "price" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {priceOptions.map((price) => (
              <FilterOption
                key={price.value}
                label={price.label}
                active={selectedPrice?.value === price.value}
                onClick={() => setSelectedPrice(price)}
              />
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={clearCurrentFilter}
            className="rounded-full border border-dreva-border bg-dreva-surface px-6 py-4 text-sm font-bold text-dreva-action transition hover:border-dreva-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-dreva-action px-6 py-4 text-sm font-bold text-white shadow-dreva-md transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-dreva-control border px-5 py-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30 ${
        active
          ? "border-dreva-action bg-dreva-soft text-dreva-action"
          : "border-dreva-border bg-dreva-surface text-dreva-text hover:border-dreva-brand/50"
      }`}
    >
      {label}
    </button>
  );
}

function colorToHex(color: string) {
  const normalized = color.toLowerCase();
  const palette: Record<string, string> = {
    rosa: "#ff9ac2",
    rojo: "#e9281c",
    negro: "#19191a",
    azul: "#216ed0",
    verde: "#43a047",
    dorado: "#f2bf45",
    plateado: "#d6d6d6",
    lila: "#c78be8",
    morado: "#9b5dcc",
    champagne: "#ead0b5",
    blanco: "#f6f4f3",
  };

  return palette[normalized] ?? "#f3a5c3";
}

function CalendarIcon({ small = false }: { small?: boolean }) {
  const size = small ? 22 : 30;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3v3M17 3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SearchOffIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function CloseLargeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
