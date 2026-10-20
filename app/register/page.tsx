import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
      />

      <div className="relative z-10 w-full max-w-[520px] rounded-[20px] border border-[#ffd8e6] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(255,92,168,0.1)] sm:px-10 sm:py-9">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.55em] text-[#d16a97]">
            DREVA
          </p>

          <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#211d26] sm:text-[36px]">
            Crea tu cuenta
          </h1>

          <p className="mt-2.5 text-[15px] leading-6 text-dreva-text-muted">
            ¿Cómo querés registrarte?
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/register/clienta"
            className="group flex items-center justify-between gap-4 rounded-[16px] border border-[#f3c7d6] bg-white px-5 py-4 transition hover:border-[#d16a97] hover:bg-[#fff7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 sm:px-6 sm:py-5"
          >
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold text-[#211d26]">
                Soy clienta
              </span>
              <span className="mt-1 block text-sm leading-6 text-dreva-text-muted">
                Explorá vestidos, guardá favoritos y solicitá reservas.
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-5 w-5 shrink-0 text-[#d16a97] transition group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>

          <Link
            href="/register/local/cuenta"
            className="group flex items-center justify-between gap-4 rounded-[16px] border border-[#f3c7d6] bg-white px-5 py-4 transition hover:border-[#d16a97] hover:bg-[#fff7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 sm:px-6 sm:py-5"
          >
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold text-[#211d26]">
                Tengo un local
              </span>
              <span className="mt-1 block text-sm leading-6 text-dreva-text-muted">
                Publicá tus vestidos y gestioná tus reservas.
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-5 w-5 shrink-0 text-[#d16a97] transition group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>

        <p className="mt-7 text-center text-[15px] text-dreva-text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#c22a68] transition hover:text-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
