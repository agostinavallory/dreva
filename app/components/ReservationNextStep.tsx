type Props = {
  status: string;
  eventDate?: string | null;
  appointmentDate?: string | null;
  dressName?: string | null;

  onAction?: () => void;
  actionDisabled?: boolean;
  actionLabel?: string;
};

const NEXT_STEP: Record<
  string,
  {
    title: string;
    description: string;
    button?: string;
  }
> = {
  pending: {
    title: "Revisa esta solicitud",
    description:
      "Una clienta quiere reservar este vestido. Verifica si está disponible para aceptar o rechazar la solicitud.",
    button: "Gestionar solicitud",
  },

  accepted: {
    title: "Esperando contacto de la clienta",
    description:
      "Ya aceptaste la solicitud. Ahora la clienta debe escribirte por WhatsApp para coordinar la cita.",
    button: "Agendar cita",
  },

  appointment_scheduled: {
    title: "Cita programada",
    description:
      "La clienta tiene una cita agendada. Cuando llegue al local, solicita su código de 4 dígitos para confirmar la entrega.",
    button: "Validar código",
  },

  confirmed: {
    title: "Reserva activa",
    description:
      "El vestido ya fue entregado. Cuando la clienta lo devuelva, finaliza la reserva.",
    button: "Finalizar reserva",
  },

  completed: {
    title: "Reserva finalizada",
    description:
      "Este proceso ya terminó correctamente. Puedes ver el resumen si lo necesitas.",
  },
};

function formatDate(date: string | null | undefined) {
  if (!date) return null;

  return new Date(date).toLocaleDateString("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ReservationNextStep({
  status,
  eventDate,
  appointmentDate,
  dressName,
  onAction,
  actionDisabled = false,
  actionLabel,
}: Props) {
  const step = NEXT_STEP[status];
const formattedEventDate = formatDate(eventDate);
const formattedAppointmentDate = formatDate(appointmentDate);


  if (!step) return null;

  return (
    <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
        Siguiente paso
      </p>

      <h2 className="mt-3 text-2xl font-bold">
  {step.title}
</h2>

<div className="mt-4 space-y-2 text-gray-600">

  {dressName && (
    <p>
      <span className="font-semibold">Vestido:</span> {dressName}
    </p>
  )}

  {status === "pending" && formattedEventDate && (
    <p>
      <span className="font-semibold">Evento:</span> {formattedEventDate}
    </p>
  )}

  {status === "appointment_scheduled" &&
    formattedAppointmentDate && (
      <p>
        <span className="font-semibold">Cita:</span>{" "}
        {formattedAppointmentDate}
      </p>
    )}

  <p className="leading-7">
    {step.description}
  </p>

</div>

      {step.button && (
        <button
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-6 rounded-xl bg-black px-5 py-3 text-white font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel ?? step.button}
        </button>
      )}

    </div>
  );
}
