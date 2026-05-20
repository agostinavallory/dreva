"use client";
import { supabase } from '@/lib/supabaseClient';
import { useState } from "react";

type Props = {
  dressId: number;
 ownerId: string | null;
};

export function RequestDressButton({
  dressId,
  ownerId,
}: Props) {
  const [open, setOpen] = useState(false);
async function handleSubmit() {
    if (!ownerId) {
  alert("Este vestido todavía no tiene un local asignado");
  return;
}
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    alert("Debes iniciar sesión");
    return;
  }

  const { error } = await supabase.from("reservations").insert({
    dress_id: dressId,
    user_id: user.id,
    owner_id: ownerId,
    event_date: new Date().toISOString().split("T")[0],
    status: "pending",
  });

  if (error) {
   console.log("SUPABASE ERROR:", error);
alert("Error al enviar solicitud: " + error.message);
    return;
  }

  alert("Solicitud enviada correctamente");
  setOpen(false);
}
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:opacity-80"
      >
        Solicitar vestido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Solicitar vestido
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              Selecciona la fecha de tu evento.
            </p>

            <input
              type="date"
              className="mt-6 w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none focus:border-black"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-pink-200 px-4 py-3 font-semibold text-[var(--primary)]"
              >
                Cancelar
              </button>

           <button
  onClick={handleSubmit}
  className="flex-1 rounded-2xl bg-black px-4 py-3 font-semibold text-white"
>
  Confirmar solicitud
</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}