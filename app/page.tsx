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
  activo?: boolean;
};

async function getDresses(): Promise<{ dresses: Dress[]; error: boolean }> {
  const { data, error } = await supabase
    .from("vestidos")
    .select("id,nombre,precio,imagen,descripcion,talla,color,largo,created_at,owner_id")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Supabase vestidos error:", error.message);
    return { dresses: [], error: true };
  }

  const dresses = (data ?? []) as Dress[];
  const ownerIds = Array.from(
    new Set(dresses.map((dress) => dress.owner_id).filter(Boolean)),
  ) as string[];

  if (ownerIds.length === 0) {
    return { dresses, error: false };
  }

  const { data: locales, error: localesError } = await supabase
    .from("locales")
    .select("owner_id,nombre")
    .in("owner_id", ownerIds);

  if (localesError) {
    console.warn("Supabase locales error:", localesError.message);
    return { dresses, error: false };
  }

  const localNames = new Map(
    (locales ?? []).map((local) => [local.owner_id, local.nombre]),
  );

  return {
    dresses: dresses.map((dress) => ({
      ...dress,
      local_nombre: dress.owner_id ? localNames.get(dress.owner_id) ?? null : null,
    })),
    error: false,
  };
}

function CatalogErrorState() {
  return (
    <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(255,92,168,0.12)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#ff2f78]">
        Catálogo no disponible
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#2b2830]">
        No pudimos cargar el catálogo
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#77727a]">
        Hubo un problema al cargar los vestidos. Vuelve a intentar en unos
        minutos.
      </p>
    </div>
  );
}

function CatalogEmptyState() {
  return (
    <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(255,92,168,0.12)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#ff2f78]">
        Catálogo
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[#2b2830]">
        Todavía no hay vestidos disponibles
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#77727a]">
        Cuando los locales publiquen sus vestidos, aparecerán acá.
      </p>
    </div>
  );
}

export default async function Home() {
  const { dresses, error } = await getDresses();
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
        {error ? (
          <CatalogErrorState />
        ) : dresses.length === 0 ? (
          <CatalogEmptyState />
        ) : (
          <HomeClient dresses={dresses} sizes={sizes} colors={colors} />
        )}
      </section>
    </main>
  );
}
