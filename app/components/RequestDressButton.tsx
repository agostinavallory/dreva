"use client";

import { useEffect, useState } from "react";
import { CalendarDays, User } from "lucide-react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  dressId: number;
  ownerId: string | null;
  dressName: string;
};

const BLOCKING_STATUSES = ["accepted", "appointment_scheduled", "confirmed"];

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function RequestDressButton({ dressId, ownerId, dressName }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [eventDate, setEventDate] = useState(todayIsoDate());
  const [requestSent, setRequestSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!open) return;

    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [open]);

  function resetModal() {
    setOpen(false);
    setShowLegal(false);
    setTermsAccepted(false);
    setRequestSent(false);
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
      alert("Debes iniciar sesión");
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
      alert("Debes iniciar sesión");
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

const { data: manualBlocks, error: blocksError } = await supabase
  .from("dress_blocks")
  .select("id")
  .eq("dress_id", dressId)
  .lte("start_date", eventDate)
  .gte("end_date", eventDate)
  .limit(1);

    if (blockedError) {
      console.error("[DREVA reservations] stock check error", blockedError);
      alert("No pudimos validar disponibilidad. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

if (blocksError) {
  console.error("[DREVA reservations] manual block check error", blocksError);
  alert("No pudimos validar disponibilidad. Intenta de nuevo.");
  setSubmitting(false);
  return;
}

    if (blockedReservations && blockedReservations.length > 0) {
      alert("Este vestido ya esta bloqueado para esa fecha.");
      setSubmitting(false);
      return;
    }

if (manualBlocks && manualBlocks.length > 0) {
  alert("Este vestido tiene un bloqueo manual para la fecha seleccionada.");
  setSubmitting(false);
  return;
}

    const { data: dressStatus, error: dressStatusError } = await supabase
      .from("vestidos")
      .select("activo")
      .eq("id", dressId)
      .maybeSingle();

    if (dressStatusError) {
      console.error("[DREVA reservations] dress status check error", dressStatusError);
      alert("No pudimos verificar la disponibilidad del vestido. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    if (!dressStatus || dressStatus.activo !== true) {
      alert("Este vestido ya no está disponible para nuevas solicitudes.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      dress_id: dressId,
      user_id: user.id,
      owner_id: ownerId,
      event_date: eventDate,
      status: "pending",
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
    setRequestSent(true);
    setSubmitting(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-dreva-action px-6 py-3.5 text-base font-semibold text-white shadow-dreva-sm transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
      >
        <CalendarDays className="h-5 w-5 shrink-0" strokeWidth={2} />
        Solicitar vestido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-dreva-dialog border border-dreva-border bg-white shadow-dreva-lg">
            {!showLegal && !requestSent && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-dreva-text">
                  Solicitar vestido
                </h2>

                <p className="mt-2 text-sm leading-6 text-dreva-text-muted">
                  Elegí la fecha de tu evento para continuar con tu solicitud.
                </p>

                <input
                  type="date"
                  value={eventDate}
                  min={todayIsoDate()}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="mt-6 w-full rounded-dreva-control border border-dreva-border-control px-4 py-3 text-dreva-text outline-none transition focus:border-dreva-focus focus:ring-2 focus:ring-dreva-focus/25"
                />

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={resetModal}
                    className="flex-1 rounded-full border border-dreva-border bg-white px-4 py-3 font-semibold text-dreva-action transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestReview}
                    className="flex-1 rounded-full bg-dreva-action px-4 py-3 font-semibold text-white transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {showLegal && !requestSent && (
              <div className="flex max-h-[calc(100dvh-2.5rem)] flex-col bg-[linear-gradient(180deg,#fff7fb,#ffffff)]">
                <div className="shrink-0 border-b border-[#ffd8e6] px-5 py-4 sm:px-6">
                  <h2 className="text-xl font-semibold leading-tight text-dreva-text sm:text-2xl">
                    ¿Cómo funciona tu solicitud?
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-dreva-text-muted">
                    Te contamos qué pasa después de enviarla.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dreva-action text-xs font-semibold text-white">
                        1
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-6 text-dreva-text">
                          El local revisa tu solicitud
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-dreva-text-muted">
                          El local revisa tu pedido y te responde si puede
                          aceptar la solicitud para la fecha que elegiste.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dreva-action text-xs font-semibold text-white">
                        2
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-6 text-dreva-text">
                          Coordinás tu cita
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-dreva-text-muted">
                          Si acepta, tenés 48 horas para agendar una cita por
                          WhatsApp. Podés elegir una fecha posterior para ir al
                          local.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dreva-action text-xs font-semibold text-white">
                        3
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-6 text-dreva-text">
                          Te probás el vestido
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-dreva-text-muted">
                          Vas al local en la fecha acordada, te probás el vestido
                          y conocés las condiciones del alquiler para decidir si
                          querés llevarlo.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dreva-action text-xs font-semibold text-white">
                        4
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-6 text-dreva-text">
                          Confirmás el alquiler con tu PIN
                        </p>
                        <p className="mt-0.5 text-sm leading-6 text-dreva-text-muted">
                          Si decidís alquilarlo, presentás tu PIN para que el
                          local confirme la reserva en DREVA. El pago, contrato y
                          las garantías que correspondan se gestionan
                          directamente con el local.
                        </p>
                      </div>
                    </li>
                  </ol>

                  <div className="mt-4 flex gap-3 rounded-dreva-card bg-dreva-soft px-3.5 py-3">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-dreva-action" strokeWidth={2} />
                    <div>
                      <p className="text-sm font-semibold leading-6 text-dreva-text">
                        ¿Dónde veo mi solicitud y mi PIN?
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-dreva-text-muted">
                        Entrá a Perfil → Mis reservas para seguir tu solicitud y
                        encontrar tu PIN cuando esté disponible.
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 flex gap-3 rounded-dreva-card border border-dreva-border bg-white px-3.5 py-2.5 text-sm font-medium leading-6 text-dreva-text">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-dreva-action"
                    />
                    <span>
                      Entiendo que mi solicitud debe ser aceptada por el local y
                      que las condiciones del alquiler se acuerdan directamente
                      con él.
                    </span>
                  </label>
                </div>

                <div className="shrink-0 border-t border-[#ffd8e6] bg-white px-5 py-4 sm:px-6">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowLegal(false);
                        setTermsAccepted(false);
                      }}
                      disabled={submitting}
                      className="flex-1 rounded-full border border-dreva-border bg-white px-4 py-3 font-semibold text-dreva-action transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !termsAccepted}
                      className="flex-1 rounded-full bg-dreva-action px-4 py-3 font-semibold text-white transition hover:bg-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Enviando..." : "Confirmar solicitud"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {requestSent && (
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-dreva-text">
                  Solicitud enviada
                </h2>
                <div className="mt-5 rounded-dreva-card border border-[#ffd8e6] bg-dreva-soft p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dreva-action">
                    Revision del local
                  </p>
                  <p className="mt-2 text-sm leading-6 text-dreva-text-muted">
                    Tu solicitud para {dressName} fue enviada. Cuando el local
                    acepte la disponibilidad, veras tu codigo de confirmacion
                    en Mis Reservas.
                  </p>
                </div>

                <button
                  onClick={resetModal}
                  className="mt-6 w-full rounded-full border border-dreva-border bg-white px-4 py-3 font-semibold text-dreva-action transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
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
