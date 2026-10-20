import { RequestDressButton } from '@/app/components/RequestDressButton';
import { FavoriteButton } from '@/app/components/FavoriteButton';
import { ProfileNavbar } from '@/app/components/ProfileNavbar';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Palette, Ruler, Shirt, Store } from 'lucide-react';
import { DressImage } from '@/app/components/DressImage';
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

function DetailBottomWaves() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[300px] overflow-hidden"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 300V186c148-40 268-6 402 32 150 42 268 60 420 18 168-46 300-96 618-52v116H0Z"
          fill="#fff0f6"
        />
        <path
          d="M0 300v-84c190-44 320 6 470 40 168 38 300 42 452 2 176-46 316-88 518-52v94H0Z"
          fill="#fbe3ef"
          opacity="0.85"
        />
        <path
          d="M0 300v-44c240-34 380 20 560 36 190 18 340-20 520-40 150-16 260-10 360 4v44H0Z"
          fill="#ff5ca8"
          opacity="0.07"
        />
      </svg>
    </div>
  );
}

export default async function DetailPage(props: PageProps<'/detalle/[id]'>) {
  const { id } = await props.params;
  const { data: dress } = await supabase
    .from('vestidos')
    .select('id,nombre,precio,imagen,descripcion,talla,color,largo,owner_id,activo')
    .eq('id', id)
    .maybeSingle();

  const selectedDress = dress as Dress | null;

  if (!selectedDress || selectedDress.activo === false) {
    return (
      <main className="relative min-h-screen bg-dreva-background text-dreva-text">
        <DetailBottomWaves />
        <div className="relative z-10">
          <ProfileNavbar />
          <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 lg:w-[88%] lg:px-0">
            <div className="rounded-dreva-dialog border border-[#ffd8e6] bg-white px-6 py-12 text-center shadow-dreva-sm sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-dreva-action">
                Vestido no disponible
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-dreva-text sm:text-3xl">
                No encontramos este vestido
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-dreva-text-muted">
                Puede que haya sido retirado del catálogo o que el enlace ya no
                esté activo.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-dreva-brand bg-white px-6 py-3 text-sm font-semibold text-dreva-action shadow-dreva-xs transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 sm:text-base"
              >
                Volver al catálogo
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { data: local } = await supabase
    .from('locales')
    .select('*')
    .eq('owner_id', selectedDress.owner_id)
    .maybeSingle();

  const tallaValue = selectedDress?.talla?.trim() || 'Consultar';
  const colorValue = selectedDress?.color?.trim() || 'Consultar';
  const largoValue = selectedDress?.largo?.trim() || 'Consultar';
  const descripcion = selectedDress?.descripcion?.trim() || null;

  return (
    <main className="relative min-h-screen bg-dreva-background text-dreva-text">
      <DetailBottomWaves />
      <div className="relative z-10">
        <ProfileNavbar />

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-16 pt-4 sm:px-8 lg:w-[88%] lg:px-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,370px)_minmax(0,1fr)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-dreva-dialog bg-[#fdf8fa] shadow-dreva-sm">
              <DressImage
                alt={selectedDress?.nombre ?? 'Vestido DREVA'}
                className="object-contain"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 370px"
                src={selectedDress?.imagen}
                fallback={
                  <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#FFF1F7,#F7E8FF)] text-2xl font-semibold tracking-[0.38em] text-dreva-action sm:text-3xl">
                    DREVA
                  </div>
                }
              />
            </div>

            <div className="flex flex-col rounded-dreva-dialog border border-dreva-border bg-white px-5 py-6 shadow-dreva-sm sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-dreva-action">
                Detalle del vestido
              </p>
              <h1 className="mt-1.5 text-2xl font-semibold leading-tight text-dreva-text sm:text-[30px]">
                {selectedDress?.nombre ?? 'Vestido DREVA'}
              </h1>
              <p className="mt-1.5 text-2xl font-bold text-dreva-action sm:text-[28px]">
                {formatPrice(selectedDress?.precio)}
              </p>

              {local && (
                <Link
                  href={`/local/${local.id}`}
                  className="mt-3.5 flex items-start gap-3 rounded-dreva-card border border-[#ffd8e6] bg-dreva-soft px-4 py-3 transition hover:border-dreva-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-dreva-card border border-white/80 bg-white/80 text-dreva-action shadow-dreva-xs">
                    <Store className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dreva-action">
                      Local
                    </p>
                    <h3 className="mt-0.5 truncate text-base font-semibold text-dreva-text">
                      {local.nombre}
                    </h3>
                    {local.ciudad && (
                      <p className="mt-0.5 truncate text-sm text-dreva-text-muted">
                        {local.ciudad}
                      </p>
                    )}
                    <span className="mt-1 inline-block text-sm font-semibold text-dreva-action">
                      Ver perfil →
                    </span>
                  </div>
                </Link>
              )}

              <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                <Spec icon={<Shirt className="h-4 w-4" strokeWidth={2} />} label="Talla" value={tallaValue} />
                <Spec icon={<Palette className="h-4 w-4" strokeWidth={2} />} label="Color" value={colorValue} />
                <Spec icon={<Ruler className="h-4 w-4" strokeWidth={2} />} label="Largo" value={largoValue} />
              </div>

              {descripcion && (
                <div className="mt-3.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dreva-action">
                    Descripción
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-dreva-text-muted">
                    {descripcion}
                  </p>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <RequestDressButton
                  dressId={Number(selectedDress?.id)}
                  ownerId={selectedDress?.owner_id ?? null}
                  dressName={selectedDress?.nombre ?? 'Vestido DREVA'}
                />
                <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#ffd8e6] bg-dreva-soft p-1">
                  <FavoriteButton dressId={selectedDress.id} variant="home" />
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Spec({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-dreva-card border border-[#ffd8e6] bg-dreva-soft px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-dreva-action">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-dreva-text">{value}</p>
    </div>
  );
}
