"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReservationNextStep from "@/app/components/ReservationNextStep";
import ManageRequestPanel from "@/app/components/ManageRequestPanel";

type Reservation = {
  id: string;
  status: string;
  event_date: string | null;
  appointment_date: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;

  vestidos: {
    nombre: string;
    imagen: string | null;
    precio: number | null;
  } | null;
};

type ClientProfile = {
  nombre: string;
  apellido: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Solicitud pendiente",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita programada",
  confirmed: "Reserva confirmada",
  completed: "Reserva completada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  accepted: "bg-blue-50 text-blue-700 border-blue-100",
  appointment_scheduled: "bg-violet-50 text-violet-700 border-violet-100",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

function formatDate(value: string | null) {
  if (!value) return "Sin definir";

  const simpleDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = simpleDate
    ? new Date(
        Number(simpleDate[1]),
        Number(simpleDate[2]) - 1,
        Number(simpleDate[3])
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PY", {
    dateStyle: "medium",
    timeStyle: simpleDate ? undefined : "short",
  }).format(date);
}

function formatPrice(value: number | null) {
  if (!value) return "-";

  return new Intl.NumberFormat("es-PY").format(value);
}

export default function ReservationPage() {
  const { id } = useParams();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [showPinPanel, setShowPinPanel] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [validatingPin, setValidatingPin] = useState(false);
  const [completingReservation, setCompletingReservation] = useState(false);
  const [managingRequest, setManagingRequest] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  const loadReservation = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        status,
        event_date,
        appointment_date,
        created_at,
        accepted_at,
        completed_at,
        cancelled_at,
        vestidos (
          nombre,
          imagen,
          precio
        )
      `)
      .eq("id", id)
      .single();

    if (!error) {
      setReservation(data as unknown as Reservation);

      const { data: profile, error: profileError } = await supabase.rpc(
        "get_reservation_client_profile",
        { p_reservation_id: id },
      );

      if (!profileError && profile && profile.length > 0) {
        const client = profile[0] as ClientProfile;
        const fullName = [client.nombre, client.apellido]
          .filter(Boolean)
          .join(" ")
          .trim();
        setClientName(fullName || null);
      } else {
        setClientName(null);
      }
    } else {
      setErrorMessage("No se pudo cargar la reserva.");
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
  if (id) {
    const timeoutId = window.setTimeout(() => {
      void loadReservation();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }
}, [id, loadReservation]);

async function handleScheduleAppointment(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!reservation || !appointmentDate || !appointmentTime) {
    alert("Selecciona la fecha y la hora de la prueba.");
    return;
  }

  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);

  if (Number.isNaN(appointmentDateTime.getTime())) {
    alert("La fecha u hora de la prueba no es valida.");
    return;
  }

  setSavingAppointment(true);

  const { error } = await supabase.rpc("transition_reservation", {
    p_reservation_id: reservation.id,
    p_action: "schedule",
    p_appointment_date: appointmentDateTime.toISOString(),
  });

  if (error) {
    console.error("[DREVA reservation detail] schedule error", error);
    alert(error.message);
    setSavingAppointment(false);
    return;
  }

  setShowSchedulePanel(false);
  setAppointmentDate("");
  setAppointmentTime("");
  await loadReservation();
  setSavingAppointment(false);
}

async function handleValidatePin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!reservation) {
    return;
  }

  if (pin.length !== 4) {
    setPinError("Ingresa el codigo de 4 digitos.");
    return;
  }

  setValidatingPin(true);
  setPinError(null);

  const { error } = await supabase.rpc("validate_reservation_pin", {
    p_reservation_id: reservation.id,
    p_pin: pin,
  });

  if (error) {
    console.error("[DREVA reservation detail] pin validation error", error);

    if (error.message.includes("Invalid PIN")) {
      setPinError("El codigo no coincide. Verifica el PIN con la clienta e intenta de nuevo.");
    } else {
      setPinError(error.message);
    }

    setValidatingPin(false);
    return;
  }

  setShowPinPanel(false);
  setPin("");
  setSuccessMessage("Reserva confirmada correctamente.");
  await loadReservation();
  setValidatingPin(false);
}

async function handleCompleteReservation() {
  if (!reservation) {
    return;
  }

  setCompletingReservation(true);
  setSuccessMessage(null);

  const { error } = await supabase.rpc("transition_reservation", {
    p_reservation_id: reservation.id,
    p_action: "complete",
    p_appointment_date: null,
  });

  if (error) {
    console.error("[DREVA reservation detail] complete error", error);
    alert(error.message);
    setCompletingReservation(false);
    return;
  }

  setSuccessMessage("Reserva finalizada correctamente.");
  await loadReservation();
  setCompletingReservation(false);
}

async function handleManageAction(action: "accept" | "reject") {
  if (!reservation) {
    return;
  }

  setManagingRequest(true);
  setSuccessMessage(null);
  setErrorMessage(null);

  const { error } = await supabase.rpc("transition_reservation", {
    p_reservation_id: reservation.id,
    p_action: action,
    p_appointment_date: null,
  });

  if (error) {
    console.error("[DREVA reservation detail] manage error", error);
    setErrorMessage(error.message);
    setManagingRequest(false);
    return;
  }

  setShowManagePanel(false);
  setManagingRequest(false);
  setSuccessMessage(
    action === "accept"
      ? "Solicitud aceptada correctamente."
      : "Solicitud rechazada.",
  );
  await loadReservation();
}


function handlePrimaryAction() {
  switch (reservation?.status) {
    case "pending":
  setShowManagePanel(true);
  break;

    case "accepted":
      setShowSchedulePanel(true);
      break;

    case "appointment_scheduled":
      setPin("");
      setPinError(null);
      setShowPinPanel(true);
      break;

    case "confirmed":
      void handleCompleteReservation();
      break;

    default:
      break;
  }
}

  if (loading) {
  return <main className="p-6">Cargando reserva...</main>;
}

if (!reservation) {
  return (
    <main className="max-w-5xl mx-auto p-6">
      <Link
        href="/dashboard/reservas"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700"
      >
        Volver a reservas
      </Link>
      <p className="text-sm text-gray-500">Reserva no encontrada.</p>
    </main>
  );
}

const timestamps: { label: string; value: string }[] = [
  {
    label: "Solicitada",
    value: reservation.created_at ? formatDate(reservation.created_at) : null,
  },
  {
    label: "Aceptada",
    value: reservation.accepted_at ? formatDate(reservation.accepted_at) : null,
  },
  {
    label: "Finalizada",
    value: reservation.completed_at ? formatDate(reservation.completed_at) : null,
  },
  {
    label: "Cancelada",
    value: reservation.cancelled_at ? formatDate(reservation.cancelled_at) : null,
  },
].filter((item): item is { label: string; value: string } => item.value !== null);

return (
  <main className="max-w-5xl mx-auto p-6">

    <Link
      href="/dashboard/reservas"
      className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700"
    >
      Volver a reservas
    </Link>

    <div className="mb-8">

  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-600">
    Reserva
  </p>

  <h1 className="mt-2 text-3xl font-bold">
    {reservation.vestidos?.nombre}
  </h1>

<div
  className={`mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${
    STATUS_STYLES[reservation.status]
  }`}
>
  {STATUS_LABELS[reservation.status]}
</div>

</div>

<div className="grid gap-4 md:grid-cols-3">

  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Evento
    </p>

    <p className="mt-2 text-lg font-semibold">
     {formatDate(reservation.event_date)}
    </p>
  </div>

  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Cita de prueba
    </p>

    <p className="mt-2 text-lg font-semibold">
     {formatDate(reservation.appointment_date)}
    </p>
  </div>

  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Precio
    </p>

    <p className="mt-2 text-lg font-semibold">
      Gs. {formatPrice(reservation.vestidos?.precio ?? null)}
    </p>
  </div>

</div>

{clientName && (
  <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase text-gray-500">
      Clienta
    </p>

    <p className="mt-2 text-lg font-semibold">
      {clientName}
    </p>
  </div>
)}


<ReservationNextStep
  status={reservation.status}
  dressName={reservation.vestidos?.nombre}
  eventDate={reservation.event_date}
  appointmentDate={reservation.appointment_date}
  onAction={handlePrimaryAction}
  actionDisabled={completingReservation}
  actionLabel={completingReservation ? "Finalizando..." : undefined}
/>

{successMessage && (
  <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
    {successMessage}
  </div>
)}

{errorMessage && (
  <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
    {errorMessage}
  </div>
)}

{timestamps.length > 0 && (
  <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
      Detalles
    </p>

    <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-gray-700">
      {timestamps.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4">
          <span className="text-gray-500">{item.label}</span>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  </div>
)}

{showManagePanel && (
  <ManageRequestPanel
    onAccept={() => handleManageAction("accept")}
    onReject={() => handleManageAction("reject")}
    onClose={() => setShowManagePanel(false)}
    busy={managingRequest}
  />
)}


{showSchedulePanel && reservation.status === "accepted" && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <form
      onSubmit={handleScheduleAppointment}
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
    >
      <h2 className="text-xl font-bold">Agendar cita</h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Registra la fecha y hora de la prueba presencial que ya coordinaron por
        WhatsApp. La fecha del evento de la clienta queda intacta.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Fecha de la prueba
          </span>
          <input
            type="date"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Hora de la prueba
          </span>
          <input
            type="time"
            value={appointmentTime}
            onChange={(event) => setAppointmentTime(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border px-4 py-3"
          />
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="submit"
          disabled={savingAppointment}
          className="w-full rounded-xl bg-black py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingAppointment ? "Agendando..." : "Agendar cita"}
        </button>

        <button
          type="button"
          onClick={() => setShowSchedulePanel(false)}
          disabled={savingAppointment}
          className="w-full rounded-xl border py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
)}

{showPinPanel && reservation.status === "appointment_scheduled" && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <form
      onSubmit={handleValidatePin}
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
    >
      <h2 className="text-xl font-bold">Validar codigo</h2>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Ingresa el PIN de 4 digitos que te muestra la clienta para confirmar la
        reserva.
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold text-gray-700">
          PIN de la clienta
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setPinError(null);
          }}
          className="mt-2 w-full rounded-xl border px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em]"
          aria-invalid={pinError ? "true" : "false"}
          required
        />
      </label>

      {pinError && (
        <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {pinError}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="submit"
          disabled={validatingPin}
          className="w-full rounded-xl bg-black py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {validatingPin ? "Validando..." : "Confirmar reserva"}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowPinPanel(false);
            setPin("");
            setPinError(null);
          }}
          disabled={validatingPin}
          className="w-full rounded-xl border py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  </div>
)}

  </main>
);
}
