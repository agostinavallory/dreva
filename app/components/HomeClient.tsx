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

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-pink-100 bg-white px-6 py-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            No encontramos vestidos con esos filtros
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
            Prueba cambiar la búsqueda, la talla, el color o la categoría. La
            disponibilidad por fecha se mantiene sin cambios en esta fase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mt-10 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dress) => (
            <DressCard key={dress.id} dress={dress} />
          ))}
        </div>
      )}
    </>
  );
}
