"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Local = {
  id: string;
  owner_id: string;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
};

type Vestido = {
  id: number;
  nombre: string;
  imagen: string | null;
  precio: number | null;
};

export default function LocalProfilePage() {
  const { id } = useParams();

  const [local, setLocal] = useState<Local | null>(null);
  const [vestidos, setVestidos] = useState<Vestido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // 1. traer local por ID del local
const { data: localData } = await supabase
  .from("locales")
  .select("*")
  .eq("id", id)
  .single();

setLocal(localData);

// 2. traer vestidos usando owner_id del local
const { data: vestidosData } = await supabase
  .from("vestidos")
  .select("*")
  .eq("owner_id", localData.owner_id);

      setVestidos(vestidosData || []);

      setLoading(false);
    }

    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 text-center">Cargando perfil del local...</div>
    );
  }

  if (!local) {
    return (
      <div className="p-10 text-center">
        Local no encontrado
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold">{local.nombre}</h1>
        <p className="text-gray-500 mt-1">{local.ubicacion}</p>
        <p className="mt-3 text-sm text-gray-600">
          {local.descripcion}
        </p>
      </div>

      {/* GRID VESTIDOS */}
      <h2 className="text-xl font-semibold mb-4">
        Vestidos disponibles
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {vestidos.map((v) => (
          <div key={v.id} className="border rounded-xl overflow-hidden">
            {v.imagen && (
              <Image
                src={v.imagen}
                alt={v.nombre}
                width={400}
                height={500}
                className="object-cover"
              />
            )}
            <div className="p-3">
              <p className="font-semibold">{v.nombre}</p>
              {v.precio && (
                <p className="text-sm text-gray-500">
                  Gs. {v.precio}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}