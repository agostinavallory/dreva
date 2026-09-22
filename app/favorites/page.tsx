"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DressCard } from "@/app/components/DressCard";
import { Navbar } from "@/app/components/Navbar";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Dress } from "@/app/page";
import { supabase } from "@/lib/supabaseClient";

function normalizeFavoriteDressIds(
  favorites: { dress_id: string | number | null }[] | null
) {
  return [
    ...new Set(
      (favorites || [])
        .map((favorite) =>
          typeof favorite.dress_id === "number"
            ? favorite.dress_id
            : Number(favorite.dress_id)
        )
        .filter((id) => Number.isInteger(id))
    ),
  ];
}

function logFavoritesDebug(message: string, details: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[favorites-page] ${message}`, details);
  }
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [favorites, setFavorites] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    const loadFavorites = async () => {
      if (!userId) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      const { data: favoriteRows, error: favoritesError } = await supabase
        .from("favorites")
        .select("dress_id")
        .eq("user_id", userId)
        .order("dress_id", { ascending: true });

      logFavoritesDebug("favorites select result", {
        userId,
        favoriteRows,
        favoritesError,
      });

      if (cancelled) {
        return;
      }

      if (favoritesError) {
        console.error("Supabase favorites select error:", favoritesError);
        setFavorites([]);
        setErrorMessage("No pudimos cargar tus favoritos en este momento.");
        setLoading(false);
        return;
      }

      const ids = normalizeFavoriteDressIds(favoriteRows);

      logFavoritesDebug("normalized dress ids", ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data: dresses, error: dressesError } = await supabase
        .from("vestidos")
        .select("*")
        .in("id", ids);

      logFavoritesDebug("vestidos select result", {
        ids,
        dresses,
        dressesError,
      });

      if (cancelled) {
        return;
      }

      if (dressesError) {
        console.error("Supabase favorite dresses select error:", dressesError);
        setFavorites([]);
        setErrorMessage("No pudimos cargar tus favoritos en este momento.");
        setLoading(false);
        return;
      }

      setFavorites((dresses || []) as Dress[]);
      setLoading(false);
    };

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, userId]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-5">
          <p className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--muted)] shadow-sm">
            Cargando tus favoritos...
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-5">
          <p className="text-sm font-medium text-[var(--muted)]">
            Redirigiendo a inicio de sesión...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-8 lg:px-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-[#17151b] sm:text-4xl">
            Mis favoritos
          </h1>
        </div>

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm font-medium text-rose-700 shadow-sm">
            {errorMessage}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-3xl border border-pink-100 bg-white p-7 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Todavía no tenés vestidos favoritos.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
              Guardá los vestidos que te encantan para encontrarlos rápido.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-80"
            >
              Explorar vestidos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
            {favorites.map((dress) => (
              <DressCard key={dress.id} dress={dress} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}