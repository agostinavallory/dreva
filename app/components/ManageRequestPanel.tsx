type Props = {
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
};

export default function ManageRequestPanel({
  onAccept,
  onReject,
  onClose,
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
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
          >
            Aceptar solicitud
          </button>

          <button
            onClick={onReject}
            className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white"
          >
            Rechazar solicitud
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-xl border py-3"
          >
            Cancelar
          </button>

        </div>

      </div>

    </div>
  );
}