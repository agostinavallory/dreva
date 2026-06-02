"use client";

import Link from "next/link";
import { AuthButton } from "./AuthButton";
import { useAuth } from "@/app/providers/AuthProvider";

export function Navbar() {
  const { user, loading } = useAuth();
  const role =
    (user?.app_metadata?.role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined);
  const canAccessDashboard = role === "local" || role === "admin";

  return (
    <nav className="flex items-center justify-between px-10 py-5 bg-white/70 backdrop-blur sticky top-0 z-50" >
      <Link
        href="/"
        className="text-xl font-semibold tracking-wide text-[var(--primary)]"
      >
        DREVA
      </Link>

     <div className="flex items-center gap-4">
        <AuthButton />

        {!loading && user && (
          <Link
            href="/my-reservations"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Mis Reservas
          </Link>
        )}
        {!loading && user && canAccessDashboard && (
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Dashboard
          </Link>
        )}
        <Link
          href="/favorites"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          Favoritos
        </Link>
        <Link
          href="/profile"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          Perfil
        </Link>
      </div>
    </nav>
  );
}
