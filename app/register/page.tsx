import Link from "next/link";

export default function RegisterChoicePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_45%,#fdf2ff_100%)] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_20px_80px_rgba(255,92,168,0.12)]">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            DREVA
          </p>

          <h1 className="mt-3 text-4xl font-semibold text-[var(--ink)]">
            Crea tu cuenta
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            ¿Cómo querés registrarte?
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/register/clienta"
            className="block rounded-2xl border border-pink-100 px-6 py-5 transition hover:border-[var(--primary)] hover:bg-pink-50"
          >
            <p className="text-base font-semibold text-[var(--ink)]">
              Soy clienta
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Explorá vestidos, guardá favoritos y solicitá reservas.
            </p>
          </Link>

          <Link
            href="/register/local/cuenta"
            className="block rounded-2xl border border-pink-100 px-6 py-5 transition hover:border-[var(--primary)] hover:bg-pink-50"
          >
            <p className="text-base font-semibold text-[var(--ink)]">
              Tengo un local
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Publicá tus vestidos y gestioná tus reservas.
            </p>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-[var(--muted)]">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}