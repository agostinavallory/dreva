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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,240,246,0.65) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(255,240,246,0.65) 100%)",
          }}
        />
        <svg
          className="absolute left-0 top-0 h-full w-[120px] sm:w-[160px]"
          viewBox="0 0 160 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 0h132c-14 8-16 24-34 34-22 12-24 32-46 42-18 8-28 24-44 30-4 2-6 4-8 6V0Z"
            fill="#FFF0F6"
          />
          <path
            d="M0 0h98c-10 10-12 22-28 31-18 10-20 27-38 36-12 6-20 17-32 23V0Z"
            fill="#FBE3EF"
            opacity="0.9"
          />
          <path
            d="M0 54c20 6 26 20 46 28-12 8-28 16-46 22V54Z"
            fill="#FF5CA8"
            opacity="0.06"
          />
        </svg>
        <svg
          className="absolute right-0 top-0 h-full w-[150px] sm:w-[200px]"
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <ellipse cx="168" cy="-8" rx="88" ry="64" fill="#FFF0F6" />
          <ellipse
            cx="200"
            cy="40"
            rx="96"
            ry="82"
            fill="#FBE3EF"
            opacity="0.85"
          />
          <ellipse
            cx="150"
            cy="104"
            rx="92"
            ry="74"
            fill="#FBE3EF"
            opacity="0.6"
          />
          <ellipse
            cx="206"
            cy="14"
            rx="74"
            ry="56"
            fill="#FF5CA8"
            opacity="0.05"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-10 sm:py-6 lg:w-[88%] lg:px-0">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#F7E0EB] bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:gap-2.5 sm:px-2.5 sm:py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#BD8095] text-sm font-semibold text-white">
                {initial}
              </span>
              <span className="hidden min-w-0 flex-col pr-1 sm:flex">
                <span className="text-[10px] font-medium leading-tight text-[var(--dreva-color-text-muted)]">
                  Bienvenida
                </span>
                <span className="max-w-[110px] truncate text-[13px] font-semibold leading-tight text-[var(--dreva-color-text)]">
                  {displayName}
                </span>
              </span>
            </div>

            <span
              aria-hidden="true"
              className="h-7 w-px shrink-0 bg-[var(--dreva-color-border)]"
            />

            <Link
              href="/profile"
              className="whitespace-nowrap text-[13px] font-semibold text-[var(--dreva-color-text-muted)] transition hover:text-[var(--dreva-color-action)] sm:text-sm"
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
