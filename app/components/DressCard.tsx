import Link from "next/link";
import type { Dress } from "@/app/page";
import { DressImage } from "./DressImage";
import { FavoriteButton } from "./FavoriteButton";

function formatPrice(price: Dress["precio"]) {
  const numericPrice =
    typeof price === "string" ? Number(price.replace(/[^\d.]/g, "")) : price;

  if (!numericPrice || Number.isNaN(numericPrice)) {
    return "Consultar precio";
  }

  return `Gs. ${new Intl.NumberFormat("es-PY").format(numericPrice)}`;
}

type DressCardVariant = "default" | "home";

type DressCardProps = {
  dress: Dress;
  variant?: DressCardVariant;
};

function hasTag(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function DressCard({ dress, variant = "default" }: DressCardProps) {
  const href = `/detalle/${dress.id}`;
  const isHome = variant === "home";

  const articleClass = isHome
    ? "group relative overflow-hidden rounded-2xl border border-[#eee6ea] bg-white shadow-[0_12px_34px_rgba(28,23,30,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(255,47,120,0.12)]"
    : "group relative overflow-hidden rounded-[1.2rem] border border-[#eee6ea] bg-white shadow-[0_12px_34px_rgba(28,23,30,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(255,47,120,0.12)]";

  const imageWrapperClass = isHome
    ? "relative aspect-[4/5] overflow-hidden bg-[#f4eef1]"
    : "relative aspect-[4/4.65] overflow-hidden bg-[#f4eef1]";

  const infoClass = isHome ? "space-y-1 px-4 pb-5 pt-4" : "space-y-1 px-4 py-4";

  const showSizeTag = isHome && hasTag(dress.talla);
  const showColorTag = isHome && hasTag(dress.color);

  return (
    <article className={articleClass}>
      <Link href={href} className="block">
        <div className={imageWrapperClass}>
          <DressImage
            src={dress.imagen}
            alt={dress.nombre ?? "Vestido"}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-105"
            fallback={
              <div className="flex h-full items-center justify-center text-sm font-medium text-[#9a949b]">
                Sin imagen
              </div>
            }
          />
        </div>

        <div className={infoClass}>
          <h3 className="truncate text-base font-semibold text-[#2b2830]">
            {dress.nombre ?? "Vestido"}
          </h3>
          <p className="truncate text-sm font-medium text-[#5f5961]">
            {dress.local_nombre ?? "Local DREVA"}
          </p>
          <p className="pt-1 text-base font-bold text-[#ff2f78]">
            {formatPrice(dress.precio)}
          </p>
          {(showSizeTag || showColorTag) && (
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {showSizeTag && (
                <span className="rounded-full bg-[#f7eef2] px-2 py-0.5 text-xs font-medium text-[#615b63]">
                  Talla {dress.talla}
                </span>
              )}
              {showColorTag && (
                <span className="rounded-full bg-[#f7eef2] px-2 py-0.5 text-xs font-medium text-[#615b63]">
                  {dress.color}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton dressId={dress.id} />
      </div>
    </article>
  );
}
