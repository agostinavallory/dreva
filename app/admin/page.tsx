import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-pink-100 bg-white p-8 shadow-[0_24px_80px_rgba(255,92,168,0.12)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">
              Panel del local
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Base visual para cargar vestidos, revisar solicitudes y gestionar
              disponibilidad en futuras iteraciones.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-2xl border border-pink-200 px-5 py-3 text-center text-sm font-semibold text-[var(--primary)] transition hover:bg-pink-50"
          >
            Ver marketplace
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['12', 'Vestidos activos'],
            ['8', 'Solicitudes pendientes'],
            ['24', 'Reservas confirmadas'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-3xl bg-pink-50 p-5">
              <p className="text-3xl font-semibold text-[var(--ink)]">{value}</p>
              <p className="mt-2 text-sm font-medium text-[var(--muted)]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
