"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  id: string | number;
  activo: boolean;
  onChanged?: () => void | Promise<void>;
};

export function VestidoStatusButton({ id, activo, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage && !errorMessage) {
      return;
    }

    const timeout = setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [successMessage, errorMessage]);

  const handleToggle = async () => {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(
      activo
        ? "¿Desactivar este vestido? Dejará de recibir nuevas solicitudes. Sus reservas, bloqueos y fotos se conservan."
        : "¿Reactivar este vestido? Volverá a estar disponible para nuevas solicitudes.",
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("vestidos")
      .update({ activo: !activo })
      .eq("id", id);

    if (error) {
      console.error("[DREVA vestidos] status update error", error);
      setErrorMessage("No pudimos actualizar el vestido. Intenta de nuevo.");
      setBusy(false);
      return;
    }

    setSuccessMessage(activo ? "Vestido desactivado." : "Vestido reactivado.");

    try {
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={busy}
        className={`rounded-full border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          activo
            ? "border-[#f3c2d2] bg-[#fff1f5] text-[#c2185b] hover:bg-[#ffe1ea]"
            : "border-[#c9e6d4] bg-[#f1fbf5] text-[#1f7a4d] hover:bg-[#e2f5ea]"
        }`}
      >
        {busy ? "Procesando..." : activo ? "Desactivar" : "Reactivar"}
      </button>

      {errorMessage && (
        <span className="text-center text-xs font-semibold text-red-500">
          {errorMessage}
        </span>
      )}

      {successMessage && (
        <span className="text-center text-xs font-semibold text-[#1f7a4d]">
          {successMessage}
        </span>
      )}
    </div>
  );
}
