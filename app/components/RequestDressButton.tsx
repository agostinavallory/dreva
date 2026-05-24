"use client";

import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  dressId: number;
  ownerId: string | null;
  dressName: string;
};

const BLOCKING_STATUSES = ["accepted", "appointment_scheduled", "confirmed"];

function generateClientPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function RequestDressButton({ dressId, ownerId, dressName }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [eventDate, setEventDate] = useState(todayIsoDate());
  const [clientPin, setClientPin] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  function resetModal() {
    setOpen(false);
    setShowLegal(false);
    setTermsAccepted(false);
    setClientPin(null);
    setSubmitting(false);
  }

  function handleRequestReview() {
    if (authLoading) {
      return;
    }

    if (!ownerId) {
      alert("Este vestido todavia no tiene un local asignado");
      return;
    }

    if (!user) {
      alert("Debes iniciar sesion");
      return;
    }

    if (!eventDate) {
      alert("Selecciona la fecha de tu evento");
      return;
    }

    setShowLegal(true);
  }

  async function handleSubmit() {
    if (!termsAccepted) {
      alert("Debes aceptar los terminos para confirmar la solicitud.");
      return;
    }

    if (authLoading) {
      return;
    }

    if (!ownerId) {
      alert("Este vestido todavia no tiene un local asignado");
      return;
    }

    if (!user) {
      alert("Debes iniciar sesion");
      return;
    }

    if (!eventDate) {
      alert("Selecciona la fecha de tu evento");
      return;
    }

    setSubmitting(true);
    console.debug("[DREVA reservations] checking blocked stock", {
      dressId,
      eventDate,
      blockingStatuses: BLOCKING_STATUSES,
    });

    const { data: blockedReservations, error: blockedError } = await supabase
      .from("reservations")
      .select("id,status")
      .eq("dress_id", dressId)
      .eq("event_date", eventDate)
      .in("status", BLOCKING_STATUSES)
      .limit(1);

    if (blockedError) {
      console.error("[DREVA reservations] stock check error", blockedError);
      alert("No pudimos validar disponibilidad. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    if (blockedReservations && blockedReservations.length > 0) {
      alert("Este vestido ya esta bloqueado para esa fecha.");
      setSubmitting(false);
      return;
    }

    const pin = generateClientPin();
    const { error } = await supabase.from("reservations").insert({
      dress_id: dressId,
      user_id: user.id,
      owner_id: ownerId,
      event_date: eventDate,
      status: "pending",
      client_pin: pin,
    });

    if (error) {
      console.error("[DREVA reservations] create request error", error);
      alert("Error al enviar solicitud: " + error.message);
      setSubmitting(false);
      return;
    }

    console.debug("[DREVA reservations] request created", {
      dressId,
      ownerId,
      eventDate,
      status: "pending",
    });
    setClientPin(pin);
    setSubmitting(false);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {!showLegal && !clientPin && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-[var(--ink)]">
                  Solicitar vestido
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Selecciona la fecha de tu evento. DREVA enviara la solicitud
                  al local y registrara el avance del proceso.
                </p>

                <input
                  type="date"
                  value={eventDate}
                  min={todayIsoDate()}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="mt-6 w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none focus:border-black"
                />

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={resetModal}
                    className="flex-1 rounded-2xl border border-pink-200 px-4 py-3 font-semibold text-[var(--primary)]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestReview}
                    className="flex-1 rounded-2xl bg-black px-4 py-3 font-semibold text-white"
                  >
                    Enviar solicitud
                  </button>
                </div>
              </div>
            )}

            {showLegal && !clientPin && (
              <div className="bg-[linear-gradient(180deg,#fff7fb,#ffffff)] p-5 sm:p-6">
                <div className="rounded-3xl border border-pink-100 bg-white/85 p-5 shadow-[0_18px_55px_rgba(255,92,168,0.16)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                    Terminos DREVA
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--ink)]">
                    Proceso protegido por DREVA
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    Tu solicitud abre una revision del local. La cita de prueba
                    se coordina despues por WhatsApp, fuera de DREVA.
                  </p>

                  <ol className="mt-5 space-y-3">
                    <li className="flex gap-3 rounded-2xl bg-pink-50 px-4 py-3 text-sm font-medium leading-6 text-[var(--ink)]">
                      <span className="font-semibold">1.</span>
                      <span>El local revisara disponibilidad.</span>
                    </li>
                    <li className="flex gap-3 rounded-2xl bg-[#fffaf3] px-4 py-3 text-sm font-medium leading-6 text-[var(--ink)]">
                      <span className="font-semibold">2.</span>
                      <span>
                        Si acepta, podras coordinar la cita con el local por WhatsApp.
                      </span>
                    </li>
                    <li className="flex gap-3 rounded-2xl bg-[#f4fbf8] px-4 py-3 text-sm font-medium leading-6 text-[var(--ink)]">
                      <span className="font-semibold">3.</span>
                      <span>
                        En la tienda fisica, el local validara tu codigo de
                        confirmacion y completara sus requisitos: cedula,
                        contrato fisico y garantia/pagare correspondiente.
                      </span>
                    </li>
                  </ol>

                  <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-[var(--ink)]">
                    DREVA registra la solicitud y muestra el avance del proceso.
                  </div>

                  <label className="mt-5 flex gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-medium leading-6 text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-black"
                    />
                    <span>
                      Acepto el proceso de DREVA y entiendo que la cita se
                      coordina con el local por WhatsApp, y que el retiro final
                      requiere cedula, contrato fisico y garantia del local.
                    </span>
                  </label>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => {
                      setShowLegal(false);
                      setTermsAccepted(false);
                    }}
                    disabled={submitting}
                    className="flex-1 rounded-2xl border border-pink-200 bg-white px-4 py-3 font-semibold text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !termsAccepted}
                    className="flex-1 rounded-2xl bg-black px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Enviando..." : "Confirmar solicitud"}
                  </button>
                </div>
              </div>
            )}

            {clientPin && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-[var(--ink)]">
                  Solicitud enviada
                </h2>
                <div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                    Codigo de confirmacion para el local
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-[0.18em] text-[var(--ink)]">
                    {clientPin}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Guarda este codigo. El local lo valida en tienda para
                    confirmar el alquiler de {dressName}.
                  </p>
                </div>

                <button
                  onClick={resetModal}
                  className="mt-6 w-full rounded-2xl border border-pink-200 px-4 py-3 font-semibold text-[var(--primary)]"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
