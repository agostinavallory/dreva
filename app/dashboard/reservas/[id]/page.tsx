"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReservationNextStep from "@/app/components/ReservationNextStep";
import ManageRequestPanel from "@/app/components/ManageRequestPanel";

type Reservation = {
  id: string;
  status: string;
  event_date: string | null;
  appointment_date: string | null;

  vestidos: {
    nombre: string;
    imagen: string | null;
    precio: number | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Solicitud pendiente",
  accepted: "Disponibilidad aceptada",
  appointment_scheduled: "Cita programada",
  confirmed: "Reserva confirmada",
  completed: "Finalizada",
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
  useEffect(() => {
  async function loadReservation() {
    setLoading(true);

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        vestidos (
          nombre,
          imagen,
          precio
        )
      `)
      .eq("id", id)
      .single();

    if (!error) {
      setReservation(data);
    }

    setLoading(false);
  }

  if (id) {
    loadReservation();
  }
}, [id]);

function handlePrimaryAction() {
  switch (reservation?.status) {
    case "pending":
  setShowManagePanel(true);
  break;

    case "accepted":
      alert("Aquí registraremos la cita.");
      break;

    case "appointment_scheduled":
      alert("Aquí validaremos el PIN.");
      break;

    case "confirmed":
      alert("Aquí finalizaremos la reserva.");
      break;

    default:
      break;
  }
}

  if (loading) {
  return <main className="p-6">Cargando reserva...</main>;
}

if (!reservation) {
  return <main className="p-6">Reserva no encontrada.</main>;
}

return (
  <main className="max-w-5xl mx-auto p-6">

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
      Cita
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

<ReservationNextStep
  status={reservation.status}
  dressName={reservation.vestidos?.nombre}
  eventDate={reservation.event_date}
  appointmentDate={reservation.appointment_date}
  onAction={handlePrimaryAction}
/>

{showManagePanel && (
  <ManageRequestPanel
    onAccept={() => alert("Aceptar solicitud")}
    onReject={() => alert("Rechazar solicitud")}
    onClose={() => setShowManagePanel(false)}
  />
)}

  </main>
);
}