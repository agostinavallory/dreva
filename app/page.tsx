import { HeroSearch } from "@/app/components/HeroSearch";
import { CatalogSection } from '@/app/components/CatalogSection';
import { Navbar } from '@/app/components/Navbar';
import { supabase } from '@/lib/supabaseClient';
import { HomeClient } from "@/app/components/HomeClient";

export type Dress = {
  id: string | number;
  nombre: string | null;
  precio: number | string | null;
  imagen: string | null;
  descripcion: string | null;
  categoria: string | null;
  talla: string | null;
  color: string | null;
  owner_id?: string | null;
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
    descripcion: 'Silueta elegante en morado suave con caida fluida.',
    categoria: 'Boda',
    talla: 'S',
    color: 'Morado',
  },
  {
    id: 'sofia',
    nombre: 'Vestido Sofia',
    precio: 300000,
    imagen:
      'https://i.pinimg.com/236x/4c/cf/74/4ccf74d2bf091c2bf5c7b4664ea66bd2.jpg',
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

    <section className="mx-auto w-full max-w-7xl px-8 pb-16 pt-10 sm:px-8 lg:pt-10">

      {/* HERO */}
      <div className="relative mb-12 overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_45%,#fdf2ff_100%)] px-6 py-10 shadow-[0_20px_80px_rgba(255,92,168,0.10)] sm:px-10 lg:px-14 lg:py-14">

        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-fuchsia-100/40 blur-3xl" />

        <div className="relative z-10 max-w-3xl">

          <p className="mb-4 inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--primary)] shadow-sm backdrop-blur">
            DREVA · Fashion Rental
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
            Encuentra el vestido perfecto para tu próximo evento
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Explora vestidos elegantes para bodas, graduaciones, fiestas y XV años.
            Reserva de forma rápida, moderna y sin complicaciones.
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-6">

            <div>
              <p className="text-2xl font-bold text-[var(--ink)]">+80</p>
              <p className="text-sm text-[var(--muted)]">Vestidos disponibles</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-[var(--ink)]">24h</p>
              <p className="text-sm text-[var(--muted)]">Respuesta rápida</p>
            </div>

            <div>
              <p className="text-2xl font-bold text-[var(--ink)]">MVP</p>
              <p className="text-sm text-[var(--muted)]">Reserva simplificada</p>
            </div>

          </div>

        </div>
      </div>

      {/* CATÁLOGO */}
      <div className="min-w-0">
       <HomeClient
        dresses={dresses}
        categories={categories}
        sizes={sizes}
      colors={colors}
      />
      </div>

    </section>
  </main>
)};