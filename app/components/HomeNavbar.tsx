"use client";

import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";

import { useAuth } from "@/app/providers/AuthProvider";

function getDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const nombre = typeof meta.nombre === "string" ? meta.nombre.trim() : "";

  return fullName || nombre || user.email || "";
}

export function HomeNavbar() {
  const { user, loading } = useAuth();
  const displayName = user ? getDisplayName(user) : "";
  const initial = displayName.charAt(0).toUpperCase() || "D";

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--dreva-color-border)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-10 sm:py-6 lg:px-16">
        <Link
          href="/"
          className="flex items-center"
          aria-label="DREVA — Inicio"
        >
          <Image
            src="/brand/dreva-logo.png"
            alt="DREVA"
            width={2172}
            height={724}
            priority
            className="h-auto w-[190px] shrink-0 -my-[16px] sm:w-[210px] sm:-my-[18px]"
          />
        </Link>

        {loading ? null : user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dreva-color-soft)] text-sm font-bold text-[var(--dreva-color-action)]">
                {initial}
              </span>
              <span className="hidden max-w-[140px] truncate text-sm font-semibold text-[var(--dreva-color-text)] sm:block">
                {displayName}
              </span>
            </div>

            <Link
              href="/profile"
              className="whitespace-nowrap text-sm font-semibold text-[var(--dreva-color-text-muted)] transition hover:text-[var(--dreva-color-action)]"
            >
              Perfil
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-semibold text-[var(--dreva-color-text)] transition hover:text-[var(--dreva-color-action)]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-full bg-[var(--dreva-color-action)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--dreva-color-action-hover)] sm:px-4"
            >
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
