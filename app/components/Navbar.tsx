"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButton, UserGreeting } from "./AuthButton";
import { useAuth } from "@/app/providers/AuthProvider";
import { isLocalOwner } from "@/app/hooks/useIsLocalOwner";

export function Navbar() {
  const { user, loading } = useAuth();
  const [localState, setLocalState] = useState<{
    userId: string;
    isLocal: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      return;
    }

    isLocalOwner(user.id).then((result) => {
      if (!cancelled) {
        setLocalState({ userId: user.id, isLocal: result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isLocal =
    localState && localState.userId === user?.id ? localState.isLocal : null;
  const showLocalLinks = !loading && Boolean(user) && isLocal === true;

  return (
    <nav className="flex items-center justify-between px-10 py-5 bg-white/70 backdrop-blur sticky top-0 z-50" >
      <Link
        href="/"
        className="text-xl font-semibold tracking-wide text-[var(--primary)]"
      >
        DREVA
      </Link>

     <div className="flex items-center gap-4">
        {user ? <UserGreeting /> : <AuthButton />}

        {showLocalLinks && (
          <Link
            href="/my-reservations"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Mis Reservas
          </Link>
        )}
        {showLocalLinks && (
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Dashboard
          </Link>
        )}
        {(!user || showLocalLinks) && (
          <Link
            href="/favorites"
            className="text-sm font-medium text-gray-600 hover:text-black"
          >
            Favoritos
          </Link>
        )}
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
