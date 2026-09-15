"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Pencil, Plus, Shirt } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { DeleteButton } from "@/app/components/DeleteButton";
import DashboardNav from "@/app/components/DashboardNav";
import { useAuth } from "@/app/providers/AuthProvider";

type Vestido = {
  id: number;
  nombre: string;
  color: string | null;
  precio: number | string | null;
  imagen: string | null;
};

export default function VestidosDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [vestidos, setVestidos] = useState<Vestido[] | null>(null);

  const fetchVestidos = useCallback(async (ownerId: string) => {
    const { data, error } = await supabase
      .from("vestidos")
      .select("*")
      .eq("owner_id", ownerId)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error cargando vestidos:", error);
    }

    return (data || []) as Vestido[];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVestidos() {
      if (authLoading) {
        return;
      }

      if (!userId) {
        setVestidos([]);
        return;
      }

      const data = await fetchVestidos(userId);

      if (!cancelled) {
        setVestidos(data);
      }
    }

    loadVestidos();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchVestidos, userId]);

  if (authLoading || vestidos === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Cargando vestidos...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-6xl">
        <DashboardNav />

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-[#17151b] sm:text-3xl">
              Mis vestidos
            </h1>
            <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
              Administrá el catálogo de tu local
            </p>
          </div>

          <Link
            href="/dashboard/vestidos/nuevo"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Nuevo vestido
          </Link>
        </div>

        {vestidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-[#eee4e9] bg-white px-6 py-14 text-center shadow-[0_14px_42px_rgba(38,31,36,0.05)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffe7f0] text-[#ff2f78]">
              <Shirt className="h-7 w-7" strokeWidth={2} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-[#17151b]">
              Todavía no tenés vestidos publicados
            </h2>
            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-[#6d6670]">
              Subí tu primer vestido para que las clientas empiecen a descubrir
              tu catálogo.
            </p>
            <Link
              href="/dashboard/vestidos/nuevo"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Publicar mi primer vestido
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vestidos.map((v) => (
              <article
                key={v.id}
                className="relative overflow-hidden rounded-[1.2rem] border border-[#eee6ea] bg-white shadow-[0_12px_34px_rgba(28,23,30,0.07)]"
              >
                {/* IMAGEN */}
                <div className="relative aspect-[4/4.6] overflow-hidden bg-white">
                  {v.imagen ? (
                    <img
                      src={v.imagen}
                      alt={v.nombre}
                      className="block h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-[#9a949b]">
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="flex flex-col p-4">
                  <h3 className="truncate text-base font-semibold text-[#2b2830]">
                    {v.nombre}
                  </h3>

                  <p className="mt-1 truncate text-sm font-medium text-[#5f5961]">
                    {v.color || "Color no especificado"}
                  </p>

                  <p className="mt-1 text-base font-bold text-[#ff2f78]">
                    Gs. {v.precio}
                  </p>

                  {/* ACCIONES */}
                  <div className="mt-4 flex flex-col gap-2 border-t border-[#f4e3eb] pt-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/dashboard/vestidos/${v.id}/editar`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78]"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2.5} />
                      Editar
                    </Link>

                    <Link
                      href={`/dashboard/vestidos/${v.id}/disponibilidad`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78]"
                    >
                      <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
                      Disponibilidad
                    </Link>

                    <span className="flex items-center justify-center py-1">
                      <DeleteButton id={v.id} />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}