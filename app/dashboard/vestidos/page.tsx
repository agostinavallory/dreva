"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
      <main className="p-6 max-w-6xl mx-auto">
        <DashboardNav />
        <p className="text-gray-500">Cargando vestidos...</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">

      <DashboardNav />

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mis Vestidos</h1>
          <p className="text-gray-500">
            Administra tu catálogo de vestidos
          </p>
        </div>

        <Link
          href="/dashboard/vestidos/nuevo"
          className="bg-black text-white px-4 py-2 rounded-xl text-sm"
        >
          + Nuevo Vestido
        </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {vestidos.map((v) => (
          <div
            key={v.id}
            className="border rounded-xl overflow-hidden shadow-sm"
          >
            {/* IMAGEN */}
            {v.imagen && (
              <img
                src={v.imagen}
                className="w-full h-56 object-cover"
                alt={v.nombre}
              />
            )}

            {/* INFO */}
            <div className="p-3">
              <h2 className="font-semibold">{v.nombre}</h2>

              <p className="text-sm text-gray-500">
                {v.color}
              </p>

              <p className="mt-1 font-bold text-pink-600">
                Gs. {v.precio}
              </p>

              {/* ACCIONES */}
              <div className="flex gap-3 mt-3">
                <Link
                  href={`/dashboard/vestidos/${v.id}/editar`}
                  className="text-sm text-blue-600"
                >
                  Editar
                </Link>

                <Link
                  href={`/dashboard/vestidos/${v.id}/disponibilidad`}
                  className="text-sm text-purple-600"
                >
                  Disponibilidad
                </Link>

                <DeleteButton id={v.id} />
              </div>
            </div>

          </div>
        ))}
      </div>

    </main>
  );
}
