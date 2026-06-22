"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Vestido = {
  id: number;
  nombre: string;
};

type DressBlock = {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
};

export default function DisponibilidadVestidoPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [vestido, setVestido] = useState<Vestido | null>(null);
  const [blocks, setBlocks] = useState<DressBlock[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    async function loadDress() {
      const { data } = await supabase
        .from("vestidos")
        .select("id,nombre")
        .eq("id", id)
        .single();

      setVestido(data);

      const { data: blocksData } = await supabase
        .from("dress_blocks")
        .select("*")
        .eq("dress_id", id)
        .order("start_date", { ascending: true });

      setBlocks(blocksData || []);

      setLoading(false);
    }

    if (id) loadDress();
  }, [id]);

  async function createBlock() {
    if (!startDate || !endDate) return;

    const { error } = await supabase.from("dress_blocks").insert({
      dress_id: id,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    });

    if (error) {
      alert("Error creando bloqueo");
      return;
    }

    const { data: blocksData } = await supabase
      .from("dress_blocks")
      .select("*")
      .eq("dress_id", id)
      .order("start_date", { ascending: true });

    setBlocks(blocksData || []);

    setStartDate("");
    setEndDate("");
    setReason("");
  }

  if (loading) {
    return <main className="p-6">Cargando vestido...</main>;
  }

  if (!vestido) {
    return <main className="p-6">Vestido no encontrado</main>;
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Disponibilidad</h1>

      <p className="text-gray-500 mt-1">{vestido.nombre}</p>

      {/* FORMULARIO */}
      <div className="mt-6 border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Agregar bloqueo</h3>

      

        <div>
  <label className="text-sm font-medium text-gray-600">
    Fecha de inicio
  </label>
  <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    className="border p-2 rounded w-full mt-1"
  />
</div>

<div>
  <label className="text-sm font-medium text-gray-600">
    Fecha de fin
  </label>
  <input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    className="border p-2 rounded w-full mt-1"
  />
</div>

        <button
          onClick={createBlock}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Guardar bloqueo
        </button>
      </div>

      {/* BLOQUEOS */}
      <div className="mt-8">
        <h2 className="font-semibold mb-3">Bloqueos actuales</h2>

        {blocks.length === 0 ? (
          <p className="text-gray-500">No hay fechas bloqueadas.</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.id} className="border rounded-xl p-3">
                <p className="font-medium">
                  {block.start_date} → {block.end_date}
                </p>
                <p className="text-sm text-gray-500">
                  {block.reason || "Sin motivo"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}