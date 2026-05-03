import Link from 'next/link';
import Image from 'next/image';
import type { Dress } from '@/app/page';

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
    <article className="group overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(255,92,168,0.18)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-pink-50">
          {dress.imagen ? (
            <Image
              alt={dress.nombre ?? 'Vestido DREVA'}
              className="object-cover transition duration-500 group-hover:scale-105"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              src={dress.imagen}
            />
          ) : (
            <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#FFF1F7,#F7E8FF)] px-8 text-center text-sm font-semibold text-[var(--primary)]">
              DREVA
            </div>
          )}
          <span className="absolute left-4 top-4 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-pink-200">
            Nuevo
          </span>
          <button
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--ink)] shadow-sm backdrop-blur transition hover:text-[var(--primary)]"
            type="button"
            aria-label="Guardar vestido"
          >
            ♡
          </button>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={href}
              className="text-lg font-semibold text-[var(--ink)] transition hover:text-[var(--primary)]"
            >
              {dress.nombre ?? 'Vestido DREVA'}
            </Link>
            <p className="mt-1 text-sm font-bold text-[var(--primary)]">
              {formatPrice(dress.precio)}
            </p>
          </div>
          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-[var(--primary)]">
            {dress.talla ?? 'Talla'}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">
          {dress.descripcion ?? 'Vestido seleccionado por DREVA para eventos especiales.'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-pink-50 pt-4 text-xs font-semibold text-[var(--muted)]">
          <span>{dress.categoria ?? 'Evento'}</span>
          <span>{dress.color ?? 'Color'}</span>
        </div>
      </div>
    </article>
  );
}
