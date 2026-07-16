import Image from "next/image";
import Link from "next/link";
import type { Dress } from "@/app/page";
import { FavoriteButton } from "./FavoriteButton";

function formatPrice(price: Dress["precio"]) {
  const numericPrice =
    typeof price === "string" ? Number(price.replace(/[^\d.]/g, "")) : price;

  if (!numericPrice || Number.isNaN(numericPrice)) {
    return "Consultar precio";
  }

  return `Gs. ${new Intl.NumberFormat("es-PY").format(numericPrice)}`;
}

export function DressCard({ dress }: { dress: Dress }) {
  const href = `/detalle/${dress.id}`;

  return (
    <article className="group relative overflow-hidden rounded-[1.2rem] border border-[#eee6ea] bg-white shadow-[0_12px_34px_rgba(28,23,30,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(255,47,120,0.12)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/4.65] overflow-hidden bg-[#f4eef1]">
          {dress.imagen ? (
            <Image
              src={dress.imagen}
              alt={dress.nombre ?? "Vestido"}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-[#9a949b]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="space-y-1 px-4 py-4">
          <h3 className="truncate text-base font-semibold text-[#2b2830]">
            {dress.nombre ?? "Vestido"}
          </h3>
          <p className="truncate text-sm font-medium text-[#5f5961]">
            {dress.local_nombre ?? "Local DREVA"}
          </p>
          <p className="pt-1 text-base font-bold text-[#ff2f78]">
            {formatPrice(dress.precio)}
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton dressId={dress.id} />
      </div>
    </article>
  );
}
