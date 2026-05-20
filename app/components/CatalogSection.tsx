"use client";

import { useState } from "react";
import { DressCard } from "./DressCard";
import { FiltersBar } from "./FiltersBar";

type Dress = {
  id: string | number;
  nombre: string | null;
  precio: number | string | null;
  imagen: string | null;
  descripcion: string | null;
  categoria: string | null;
  talla: string | null;
  color: string | null;
};

type Props = {
  dresses: Dress[];
  categories: string[];
  sizes: string[];
  colors: string[];
};

export function CatalogSection({
  dresses,
  categories,
  sizes,
  colors,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const filteredDresses = dresses.filter((dress) => {
    return (
      (!selectedCategory || dress.categoria === selectedCategory) &&
      (!selectedSize || dress.talla === selectedSize) &&
      (!selectedColor || dress.color === selectedColor)
    );
  });

  return (
    <div>

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

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
        {filteredDresses.map((dress) => (
          <DressCard key={dress.id} dress={dress} />
        ))}
      </div>

    </div>
  );
}