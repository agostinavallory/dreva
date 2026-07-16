"use client";

import { DressCard } from "./DressCard";

type Dress = {
  id: string | number;
  nombre: string | null;
  precio: number | string | null;
  imagen: string | null;
  descripcion: string | null;
  categoria: string | null;
  talla: string | null;
  color: string | null;
  created_at: string;
  local_nombre?: string | null;
};

type Props = {
  dresses: Dress[];
};

export function CatalogSection({ dresses }: Props) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
      {dresses.map((dress) => (
        <DressCard key={dress.id} dress={dress} />
      ))}
    </div>
  );
}
