"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

type Vestido = {
  id: number;
  nombre: string;
  owner_id: string | null;
};

type DressBlock = {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
};

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function getErrorMessage(error: SupabaseErrorLike | null, fallback: string) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";

  if (code === "23514" || message.includes("dress_blocks_dates_check")) {
    return "La fecha de inicio no puede ser posterior a la fecha de fin.";
  }

  if (
    code === "23P01" ||
    code === "23505" ||
    message.includes("dress_blocks_no_overlap_excl")
  ) {
    return "El rango se superpone con otro bloqueo del mismo vestido.";
  }

  return message || fallback;
}

export default function DisponibilidadVestidoPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vestido, setVestido] = useState<Vestido | null>(null);
  const [blocks, setBlocks] = useState<DressBlock[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = vestido !== null && !!user && vestido.owner_id === user.id;

  useEffect(() => {
    let cancelled = false;

    async function loadDress() {
      const { data: dressData } = await supabase
        .from("vestidos")
        .select("id,nombre,owner_id")
        .eq("id", id)
        .single();

      if (cancelled) {
        return;
      }

      setVestido(dressData as Vestido | null);

      const { data: blocksData } = await supabase
        .from("dress_blocks")
        .select("*")
        .eq("dress_id", id)
        .order("start_date", { ascending: true });

      if (cancelled) {
        return;
      }

      setBlocks(blocksData || []);
      setLoading(false);
    }

    if (id) {
      loadDress();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function reloadBlocks() {
    const { data: blocksData } = await supabase
      .from("dress_blocks")
      .select("*")
      .eq("dress_id", id)
      .order("start_date", { ascending: true });

    setBlocks(blocksData || []);
  }

  async function createBlock() {
    setFormError(null);

    if (!startDate || !endDate) {
      setFormError("Selecciona la fecha de inicio y la fecha de fin.");
      return;
    }

    if (startDate < todayIsoDate()) {
      setFormError("La fecha de inicio no puede estar en el pasado.");
      return;
    }

    if (startDate > endDate) {
      setFormError(
        "La fecha de inicio no puede ser posterior a la fecha de fin."
      );
      return;
    }

    const { error } = await supabase.from("dress_blocks").insert({
      dress_id: id,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    });

    if (error) {
      setFormError(getErrorMessage(error, "Error creando bloqueo"));
      return;
    }

    await reloadBlocks();

    setStartDate("");
    setEndDate("");
    setReason("");
  }

  async function deleteBlock(blockId: number) {
    if (!window.confirm("¿Eliminar este bloqueo?")) {
      return;
    }

    const { error } = await supabase
      .from("dress_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      alert(getErrorMessage(error, "Error al eliminar el bloqueo"));
      return;
    }

    await reloadBlocks();
  }

  if (loading || authLoading) {
    return <main className="p-6">Cargando vestido...</main>;
  }

  if (!vestido) {
    return <main className="p-6">Vestido no encontrado</main>;
  }

  if (!canManage) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-red-500">
          No tenés permiso para gestionar la disponibilidad de este vestido.
        </p>
      </main>
    );
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
    min={todayIsoDate()}
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

<div>
  <label className="text-sm font-medium text-gray-600">
    Motivo del bloqueo (opcional)
  </label>
  <input
    type="text"
    value={reason}
    onChange={(e) => setReason(e.target.value)}
    placeholder="Ej.: mantenimiento, reparación, reserva externa..."
    className="border p-2 rounded w-full mt-1"
  />
</div>

        {formError && (
          <p className="text-sm text-red-500">{formError}</p>
        )}

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
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="mt-2 text-sm text-red-500"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}