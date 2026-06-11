"use client";

import { useState } from "react";
import { HeroSearch } from "./HeroSearch";
import { FiltersBar } from "./FiltersBar";
import { DressCard } from "./DressCard";
import { Dress } from "@/app/page";

type Props = {
  dresses: Dress[];
  categories: string[];
  sizes: string[];
  colors: string[];
};

export function HomeClient({
  dresses,
  categories,
  sizes,
  colors,
}: Props) {
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [selectedSize, setSelectedSize] =
    useState<string | null>(null);

  const [selectedColor, setSelectedColor] =
    useState<string | null>(null);

  const filtered = dresses.filter((dress) => {
    const matchesSearch =
      dress.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      dress.color?.toLowerCase().includes(search.toLowerCase()) ||
      dress.categoria?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      !selectedCategory || dress.categoria === selectedCategory;

    const matchesSize =
      !selectedSize || dress.talla === selectedSize;

    const matchesColor =
      !selectedColor || dress.color === selectedColor;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSize &&
      matchesColor
    );
  });
  const hasActiveFilters =
    search.trim().length > 0 ||
    Boolean(selectedCategory) ||
    Boolean(selectedSize) ||
    Boolean(selectedColor);
  const resultLabel =
    filtered.length === 1
      ? "1 vestido encontrado"
      : `${filtered.length} vestidos encontrados`;

  function clearFilters() {
    setSearch("");
    setSelectedCategory(null);
    setSelectedSize(null);
    setSelectedColor(null);
  }

  return (
    <>
      <HeroSearch search={search} setSearch={setSearch} />

      <FiltersBar
        categories={categories}
        sizes={sizes}
        colors={colors}
        selectedCategory={selectedCategory}
        selectedSize={selectedSize}
        selectedColor={selectedColor}
        setSelectedCategory={setSelectedCategory}
        setSelectedSize={setSelectedSize}
        setSelectedColor={setSelectedColor}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--ink)]">
          {resultLabel}
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-fit rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:border-[var(--primary)] hover:text-[var(--ink)]"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-pink-100 bg-white px-6 py-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            No encontramos vestidos con esos filtros
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Prueba ajustar la búsqueda, la talla, el color o la categoría para
            ver más opciones disponibles.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
            >
              Limpiar filtros
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-pink-200 px-5 py-3 text-sm font-semibold text-[var(--primary)] transition hover:border-[var(--primary)]"
            >
              Ver todos los vestidos
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dress) => (
            <DressCard key={dress.id} dress={dress} />
          ))}
        </div>
      )}
    </>
  );
}
