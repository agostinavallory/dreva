"use client";

import Link from "next/link";
import { useAuth } from "@/app/providers/AuthProvider";

export function AuthButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex gap-3">
        <Link href="/login" className="text-sm font-medium">
          Iniciar sesion
        </Link>
        <Link href="/register" className="text-sm font-medium">
          Registrarse
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm border border-pink-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
          {user.email?.charAt(0).toUpperCase()}
        </div>

        <div className="hidden sm:block">
          <p className="text-xs text-gray-400">Bienvenida</p>

          <p className="max-w-[140px] truncate text-sm font-semibold text-[var(--ink)]">
            {user.email}
          </p>
        </div>
      </div>

      <button
        onClick={signOut}
        className="rounded-full border border-pink-100 px-4 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-pink-50"
      >
        Salir
      </button>
    </div>
  );
}
