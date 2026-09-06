import { Navbar } from "@/app/components/Navbar";
import { HomeClient } from "@/app/components/HomeClient";
import { supabase } from "@/lib/supabaseClient";

export type Dress = {
  id: string | number;
  nombre: string | null;
  precio: number | string | null;
  imagen: string | null;
  descripcion: string | null;
  talla: string | null;
  color: string | null;
  largo?: string | null;
  created_at: string;
  owner_id?: string | null;
  local_nombre?: string | null;
};

const fallbackDresses: Dress[] = [
  {
    id: "aurora",
    nombre: "Vestido Aurora",
    precio: 350000,
    imagen:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
    descripcion: "Tul rosa con detalles delicados para noches especiales.",
    talla: "M",
    color: "Rosa",
    largo: "Largo",
    created_at: "2026-05-01T00:00:00+00:00",
    owner_id: null,
    local_nombre: "Boutique L.",
  },
  {
    id: "olivia",
    nombre: "Vestido Olivia",
    precio: 320000,
    imagen:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=80",
    descripcion: "Silueta elegante en morado suave con caida fluida.",
    talla: "S",
    color: "Morado",
    largo: "Midi",
    created_at: "2026-05-02T00:00:00+00:00",
    owner_id: null,
    local_nombre: "Dress House",
  },
  {
    id: "sofia",
    nombre: "Vestido Sofia",
    precio: 300000,
    imagen:
      "https://i.pinimg.com/236x/4c/cf/74/4ccf74d2bf091c2bf5c7b4664ea66bd2.jpg",
    descripcion: "Corte princesa azul, ideal para gala y graduaciones.",
    talla: "M",
    color: "Azul",
    largo: "Largo",
    created_at: "2026-05-03T00:00:00+00:00",
    owner_id: null,
    local_nombre: "Atelier M.",
  },
  {
    id: "isabella",
    nombre: "Vestido Isabella",
    precio: 280000,
    imagen:
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80",
    descripcion: "Champagne minimalista para eventos de dia o noche.",
    talla: "L",
    color: "Champagne",
    largo: "Corto",
    created_at: "2026-05-04T00:00:00+00:00",
    owner_id: null,
    local_nombre: "La Elegante",
  },
];

async function getDresses() {
  const { data, error } = await supabase
    .from("vestidos")
    .select("id,nombre,precio,imagen,descripcion,talla,color,largo,created_at,owner_id")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Supabase vestidos error:", error.message);
  }

  const dresses = data && data.length > 0 ? (data as Dress[]) : fallbackDresses;
  const ownerIds = Array.from(
    new Set(dresses.map((dress) => dress.owner_id).filter(Boolean)),
  ) as string[];

  if (ownerIds.length === 0) {
    return dresses;
  }

  const { data: locales, error: localesError } = await supabase
    .from("locales")
    .select("owner_id,nombre")
    .in("owner_id", ownerIds);

  if (localesError) {
    console.warn("Supabase locales error:", localesError.message);
    return dresses;
  }

  const localNames = new Map(
    (locales ?? []).map((local) => [local.owner_id, local.nombre]),
  );

  return dresses.map((dress) => ({
    ...dress,
    local_nombre: dress.owner_id ? localNames.get(dress.owner_id) ?? null : null,
  }));
}

export default async function Home() {
  const dresses = await getDresses();
  const sizes = Array.from(
    new Set(dresses.map((dress) => dress.talla).filter(Boolean)),
  ) as string[];
  const colors = Array.from(
    new Set(dresses.map((dress) => dress.color).filter(Boolean)),
  ) as string[];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--dark)]">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:pt-8">
        <HomeClient dresses={dresses} sizes={sizes} colors={colors} />
      </section>
    </main>
  );
}
