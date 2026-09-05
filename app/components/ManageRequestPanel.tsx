type Props = {
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  busy?: boolean;
};

export default function ManageRequestPanel({
  onAccept,
  onReject,
  onClose,
  busy = false,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">

      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        <h2 className="text-xl font-bold">
          Gestionar solicitud
        </h2>

        <p className="mt-2 text-gray-600">
          ¿Qué deseas hacer con esta solicitud?
        </p>

        <div className="mt-6 space-y-3">

          <button
            onClick={onAccept}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Procesando..." : "Aceptar solicitud"}
          </button>

          <button
            onClick={onReject}
            disabled={busy}
            className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Procesando..." : "Rechazar solicitud"}
          </button>

          <button
            onClick={onClose}
            disabled={busy}
            className="w-full rounded-xl border py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

        </div>

      </div>

    </div>
  );
}