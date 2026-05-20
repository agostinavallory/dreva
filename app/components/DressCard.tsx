import Link from 'next/link';
import Image from 'next/image';
import type { Dress } from '@/app/page';
import { FavoriteButton } from "./FavoriteButton";

function formatPrice(price: Dress['precio']) {
  const numericPrice =
    typeof price === 'string' ? Number(price.replace(/[^\d.]/g, '')) : price;

  if (!numericPrice || Number.isNaN(numericPrice)) {
    return 'Consultar precio';
  }

  return `Gs. ${new Intl.NumberFormat('es-PY').format(numericPrice)}`;
}

export function DressCard({ dress }: { dress: Dress }) {
  const href = `/detalle/${dress.id}`;

  return (
   <article className="group cursor-pointer transition duration-300 hover:-translate-y-1">
      <Link href={href} className="block">
        
        {/* IMAGEN */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 shadow-sm transition duration-300 group-hover:shadow-xl group-hover:shadow-pink-100">
          {dress.imagen ? (
            <Image
              src={dress.imagen}
              alt={dress.nombre ?? 'Vestido'}
              fill
              className="object-cover transition duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Sin imagen
            </div>
          )}

          {/* BOTÓN FAVORITO */}
          <div className="absolute top-3 right-3">
           <FavoriteButton dressId={dress.id} />
          </div>
        </div>

        {/* INFO */}
        <div className="mt-3 px-1">
          <h3 className="text-sm font-medium text-[var(--ink)]">
            {dress.nombre ?? 'Vestido'}
          </h3>

          <p className="text-sm font-semibold text-[var(--primary)] mt-1">
            {formatPrice(dress.precio)}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            {dress.categoria} • {dress.color}
          </p>
        </div>

      </Link>
    </article>
  );
}