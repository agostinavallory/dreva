import { CalendarDays } from "lucide-react";

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
      "Cuando la clienta llegue al local, deberá presentar su código de 4 dígitos para validar la reserva.",
    button: "Validar código",
  },

  confirmed: {
    title: "Vestido entregado",
    description:
      "El vestido ya fue entregado. Cuando la clienta lo devuelva, la reserva quedará finalizada.",
    button: "Finalizar reserva",
  },

  completed: {
    title: "Reserva finalizada",
    description:
      "Este proceso ya terminó correctamente. Puedes ver el resumen si lo necesitas.",
  },
};

export default function ReservationNextStep({
  status,
  onAction,
  actionDisabled = false,
  actionLabel,
}: Props) {
  const step = NEXT_STEP[status];

  if (!step) return null;

  return (
    <div className="mt-8 rounded-[1.5rem] border border-[#eee4e9] bg-white p-6 shadow-[0_14px_42px_rgba(38,31,36,0.06)] sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffe7f0] text-[#ff2f78]">
          <CalendarDays className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <h2 className="text-xl font-extrabold leading-tight text-[#17151b] sm:text-2xl">
          {step.title}
        </h2>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-[#6d6670]">
        {step.description}
      </p>

      {step.button && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-6 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel ?? step.button}
        </button>
      )}
    </div>
  );
}