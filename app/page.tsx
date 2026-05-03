import { DressCard } from '@/app/components/DressCard';
import { FilterSidebar } from '@/app/components/FilterSidebar';
import { Navbar } from '@/app/components/Navbar';
import { supabase } from '@/lib/supabaseClient';

export type Dress = {
  id: string | number;
  nombre: string | null;
  precio: number | string | null;
  imagen: string | null;
  descripcion: string | null;
  categoria: string | null;
  talla: string | null;
  color: string | null;
};

const fallbackDresses: Dress[] = [
  {
    id: 'aurora',
    nombre: 'Vestido Aurora',
    precio: 350000,
    imagen:
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Tul rosa con detalles delicados para noches especiales.',
    categoria: 'XV anos',
    talla: 'M',
    color: 'Rosa',
  },
  {
    id: 'olivia',
    nombre: 'Vestido Olivia',
    precio: 320000,
    imagen:
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Silueta elegante en verde suave con caida fluida.',
    categoria: 'Boda',
    talla: 'S',
    color: 'Verde',
  },
  {
    id: 'sofia',
    nombre: 'Vestido Sofia',
    precio: 300000,
    imagen:
      'https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Corte princesa azul, ideal para gala y graduaciones.',
    categoria: 'Graduacion',
    talla: 'M',
    color: 'Azul',
  },
  {
    id: 'isabella',
    nombre: 'Vestido Isabella',
    precio: 280000,
    imagen:
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Champagne minimalista para eventos de dia o noche.',
    categoria: 'Fiesta',
    talla: 'L',
    color: 'Champagne',
  },
];

async function getDresses() {
  const { data, error } = await supabase
    .from('vestidos')
    .select('id,nombre,precio,imagen,descripcion,categoria,talla,color')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Supabase vestidos error:', error.message);
  }

  return data && data.length > 0 ? (data as Dress[]) : fallbackDresses;
}

export default async function Home() {
  const dresses = await getDresses();
  const categories = Array.from(
    new Set(dresses.map((dress) => dress.categoria).filter(Boolean)),
  ) as string[];
  const sizes = Array.from(
    new Set(dresses.map((dress) => dress.talla).filter(Boolean)),
  ) as string[];
  const colors = Array.from(
    new Set(dresses.map((dress) => dress.color).filter(Boolean)),
  ) as string[];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[300px_1fr] lg:pt-10">
        <FilterSidebar categories={categories} colors={colors} sizes={sizes} />

        <div className="min-w-0">
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
                Catalogo curado
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
                Vestidos listos para reservar
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Explora prendas elegantes por talla, color y ocasion. DREVA
                conecta tu evento con el vestido perfecto, sin complicaciones.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-pink-100 bg-white/80 p-2 shadow-sm">
              {[
                ['24h', 'Respuesta'],
                ['+80', 'Vestidos'],
                ['MVP', 'Reserva'],
              ].map(([value, label]) => (
                <div key={label} className="px-3 py-2 text-center">
                  <p className="text-lg font-semibold text-[var(--ink)]">
                    {value}
                  </p>
                  <p className="text-[11px] font-medium text-[var(--muted)]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {dresses.map((dress) => (
              <DressCard key={dress.id} dress={dress} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
