import Link from 'next/link';

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-4xl rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-[0_24px_80px_rgba(255,92,168,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--primary)]">
          Favoritos
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">
          Tu seleccion DREVA
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
          Esta vista queda preparada para guardar vestidos, comparar opciones y
          continuar una reserva cuando el modulo de usuarios este activo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200 transition hover:-translate-y-0.5 hover:bg-[var(--primary-dark)]"
        >
          Explorar vestidos
        </Link>
      </section>
    </main>
  );
}
