import { RequestDressButton } from '@/app/components/RequestDressButton';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import type { Dress } from '@/app/page';

function formatPrice(price: Dress['precio'] | undefined) {
  const numericPrice =
    typeof price === 'string' ? Number(price.replace(/[^\d.]/g, '')) : price;

  if (!numericPrice || Number.isNaN(numericPrice)) {
    return 'Consultar precio';
  }

  return `Gs. ${new Intl.NumberFormat('es-PY').format(numericPrice)}`;
}

export default async function DetailPage(props: PageProps<'/detalle/[id]'>) {
  const { id } = await props.params;
  const { data: dress } = await supabase
    .from('vestidos')
    .select('id,nombre,precio,imagen,descripcion,talla,color,owner_id')
    .eq('id', id)
    .maybeSingle();

  const selectedDress = dress as Dress | null;

  if (!selectedDress) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(255,92,168,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
            Vestido no disponible
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">
            No encontramos este vestido
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Puede que haya sido retirado del catálogo o que el enlace ya no esté activo.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

const { data: local } = await supabase
  .from('locales')
  .select('*')
  .eq('owner_id', selectedDress.owner_id)
  .maybeSingle();

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-sm transition hover:text-[var(--primary)]"
        >
          Volver al catálogo
        </Link>

        <section className="grid gap-8 rounded-3xl border border-pink-100 bg-white p-5 shadow-[0_24px_80px_rgba(255,92,168,0.12)] lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-pink-50">
            {selectedDress?.imagen ? (
              <Image
                alt={selectedDress.nombre ?? 'Vestido DREVA'}
               className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                src={selectedDress.imagen}
              />
            ) : (
              <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#FFF1F7,#F7E8FF)] text-3xl font-semibold tracking-[0.38em] text-[var(--primary)]">
                DREVA
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
              Detalle del vestido
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--ink)]">
              {selectedDress?.nombre ?? 'Vestido DREVA'}
            </h1>
            <p className="mt-3 text-2xl font-bold text-[var(--primary)]">
              {formatPrice(selectedDress?.precio)}
            </p>
            {local && (
  <Link
    href={`/local/${local.id}`}
    className="mt-4 block rounded-2xl border border-pink-100 bg-pink-50 p-4 transition hover:border-pink-200 hover:bg-pink-100"
  >
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
      Local
    </p>

    <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">
      {local.nombre}
    </h3>

    <p className="mt-1 text-sm text-[var(--muted)]">
      {local.ciudad}
    </p>

    <span className="mt-2 inline-block text-sm font-semibold text-[var(--primary)]">
      Ver perfil →
    </span>
  </Link>
)}


            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
              {selectedDress?.descripcion ??
                'Este vestido estará disponible para reserva cuando se complete la información del catálogo.'}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Spec label="Talla" value={selectedDress?.talla ?? 'M'} />
              <Spec label="Color" value={selectedDress?.color ?? 'Rosa'} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                  Solicitud en DREVA
                </p>
                <RequestDressButton
  dressId={Number(selectedDress?.id)}
  ownerId={selectedDress?.owner_id ?? null}
  dressName={selectedDress?.nombre ?? 'Vestido DREVA'}
/>
              </div>
             
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-pink-50 px-4 py-3">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}
