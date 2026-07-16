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
        dress.color?.toLowerCase().includes(normalizedSearch) ||
        dress.categoria?.toLowerCase().includes(normalizedSearch);

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
  const resultLabel = eventDate
    ? "Vestidos disponibles para tu fecha"
    : "Vestidos disponibles";
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
    <div className="space-y-6">
      <HeroSearch
        search={search}
        setSearch={setSearch}
        onOpenFilters={() => setActiveDrawer("color")}
      />

      <section className="rounded-[1.75rem] border border-[#ff7bab] bg-white px-5 py-5 shadow-[0_18px_60px_rgba(255,45,126,0.08)] sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffe5ef] text-[#ff2f78]">
              <CalendarIcon />
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#ff2f78] sm:text-2xl">
                Fecha del evento
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#77727a] sm:text-base">
                Selecciona la fecha de tu evento para ver vestidos disponibles.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openEventDatePicker}
            className="inline-flex cursor-pointer items-center justify-center gap-3 rounded-full px-1 py-2 text-sm font-bold text-[#ff2f78] transition hover:bg-[#fff2f7] sm:px-4"
          >
            <CalendarIcon small />
            <span>{eventDate ? formatEventDate(eventDate) : "Elegir fecha"}</span>
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
        <div className="flex flex-wrap items-center gap-3">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-2 rounded-xl border border-[#ffc6d9] bg-white px-4 py-2 text-sm font-semibold text-[#ff2f78] shadow-sm transition hover:border-[#ff2f78]"
            >
              {chip.label}
              <CloseIcon />
            </button>
          ))}

          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto inline-flex items-center gap-2 px-2 py-2 text-sm font-semibold text-[#ff2f78] transition hover:text-[#d9195d]"
          >
            Limpiar todo
            <TrashIcon />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xl font-bold text-[#252329] sm:text-2xl">
            {resultLabel}
          </p>
          {eventDate && (
            <p className="mt-1 text-sm font-semibold text-[#77727a]">
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
          className="inline-flex w-fit items-center gap-3 rounded-xl border border-[#e8e2e6] bg-white px-4 py-3 text-sm font-semibold text-[#252329] shadow-sm"
        >
          {sortMode === "recent" ? "✓ Mas recientes" : "Mas recientes"}
          <ChevronDownIcon />
        </button>
      </div>

      {sortedDresses.length === 0 ? (
        <div className="rounded-[1.75rem] border border-[#f2dbe4] bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#252329]">
            {eventDate
              ? "No encontramos vestidos disponibles para esta fecha"
              : "No encontramos vestidos con esos filtros"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#77727a]">
            {eventDate
              ? "Prueba cambiar la fecha o ajustar los filtros."
              : "Ajusta la busqueda, color, talla o precio para ver mas opciones."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_35px_rgba(255,47,120,0.25)]"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
          {sortedDresses.map((dress) => (
            <DressCard key={dress.id} dress={dress} />
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
      <div className="relative w-full rounded-t-[2rem] bg-white px-6 pb-7 pt-4 shadow-[0_-24px_80px_rgba(29,24,32,0.18)] sm:px-12">
        <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-[#d8d2d6]" />
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#171417]">
            {titleByFilter[activeDrawer]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-[#4b454d] transition hover:bg-[#f7f2f5]"
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
                className="flex flex-col items-center gap-2 text-sm font-medium text-[#615b63]"
              >
                <span
                  className={`h-12 w-12 rounded-full border-2 shadow-sm ${
                    selectedColor === color
                      ? "border-[#ff5f98] ring-4 ring-[#ffe1ec]"
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
            className="rounded-full border border-[#e7dfe4] bg-white px-6 py-4 text-sm font-bold text-[#ff2f78] transition hover:border-[#ff2f78]"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#ff2f78] px-6 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(255,47,120,0.28)] transition hover:bg-[#ef1f68]"
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
      className={`rounded-2xl border px-5 py-4 text-sm font-bold transition ${
        active
          ? "border-[#ff2f78] bg-[#fff1f6] text-[#ff2f78]"
          : "border-[#eee7eb] bg-white text-[#2b282d] hover:border-[#ff9fbe]"
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
