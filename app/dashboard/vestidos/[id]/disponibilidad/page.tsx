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

function formatDisplayDate(iso: string) {
  const parts = iso.split("-");

  if (parts.length !== 3) {
    return iso;
  }

  const date = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const inputClass =
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]";

const labelClass = "mb-1.5 block text-sm font-bold text-[#4f4951]";

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Cargando vestido...
        </p>
      </main>
    );
  }

  if (!vestido) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Vestido no encontrado
        </p>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-red-500">
          No tenés permiso para gestionar la disponibilidad de este vestido.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold leading-tight text-[#17151b] sm:text-3xl">
            Disponibilidad
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#ff2f78]">
            {vestido.nombre}
          </p>
          <p className="mt-1.5 text-sm font-medium leading-6 text-[#6d6670]">
            Gestioná las fechas en las que este vestido no estará disponible.
          </p>
        </header>

        {/* FORMULARIO */}
        <section className="rounded-[1.5rem] border border-[#eee4e9] bg-white p-6 shadow-[0_14px_42px_rgba(38,31,36,0.06)] sm:p-8">
          <h2 className="text-xl font-extrabold leading-tight text-[#17151b]">
            Bloquear fechas
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Fecha de inicio</span>
              <input
                type="date"
                value={startDate}
                min={todayIsoDate()}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Fecha de fin</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Motivo (opcional)</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej.: mantenimiento, reparación, reserva externa..."
                className={inputClass}
              />
            </label>
          </div>

          {formError && (
            <p className="mt-4 text-sm font-medium text-red-500">{formError}</p>
          )}

          <button
            onClick={createBlock}
            className="mt-6 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68]"
          >
            Guardar bloqueo
          </button>
        </section>

        {/* BLOQUEOS */}
        <section className="mt-10 border-t border-[#eadce4] pt-8">
          <h2 className="text-xl font-extrabold leading-tight text-[#17151b]">
            Bloqueos actuales
          </h2>

          {blocks.length === 0 ? (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-[#eadce4] bg-white/70 p-8 text-center">
              <p className="text-[15px] font-bold text-[#17151b]">
                No hay fechas bloqueadas
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6d6670]">
                Este vestido está disponible según las fechas registradas.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[#eee4e9] bg-white p-4 shadow-[0_8px_24px_rgba(38,31,36,0.05)]"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[#17151b]">
                      {formatDisplayDate(block.start_date)} →{" "}
                      {formatDisplayDate(block.end_date)}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#6d6670]">
                      {block.reason || "Sin motivo"}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="shrink-0 rounded-full border border-[#f3c2d2] bg-[#fff1f5] px-4 py-2 text-sm font-semibold text-[#c2185b] transition hover:bg-[#ffe1ea]"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}