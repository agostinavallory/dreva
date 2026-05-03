import Link from 'next/link';
import { Button } from '@/app/components/Button';

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-pink-100/80 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="DREVA inicio">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-white shadow-lg shadow-pink-200">
            D
          </span>
          <span>
            <span className="block text-2xl font-semibold tracking-[0.38em] text-[var(--ink)]">
              DREVA
            </span>
            <span className="block text-xs font-medium text-[var(--muted)]">
              Organiza. Elige. Reserva.
            </span>
          </span>
        </Link>

        <div className="order-3 flex w-full items-center rounded-2xl border border-pink-100 bg-[var(--soft)] px-4 py-3 shadow-inner lg:order-2 lg:max-w-xl">
          <span className="text-lg text-[var(--primary)]" aria-hidden="true">
            ?
          </span>
          <input
            className="ml-3 w-full bg-transparent text-sm font-medium text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            placeholder="Buscar vestidos, colores o estilos..."
            type="search"
          />
          <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            Filtros
          </button>
        </div>

        <div className="order-2 flex items-center gap-3 lg:order-3">
          <Link
            href="/favoritos"
            className="rounded-2xl px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-pink-50"
          >
            Favoritos
          </Link>
          <button className="rounded-2xl px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-pink-50">
            Login
          </button>
          <Button>
            Registrarse
          </Button>
        </div>
      </nav>
    </header>
  );
}
