"use client";

import { useEffect, useState } from "react";
import { DressCard } from "@/app/components/DressCard";
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
      setErrorMessage(null);

      if (!userId) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      setLoading(true);

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
        setErrorMessage(favoritesError.message);
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
        setErrorMessage(dressesError.message);
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
  }, [authLoading, userId]);

  if (authLoading || loading) {
    return <p className="p-10">Cargando favoritos...</p>;
  }

  if (!user) {
    return <p className="p-10">No has iniciado sesion.</p>;
  }

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold mb-6">Mis favoritos</h1>

      {errorMessage ? (
        <p className="text-sm text-red-600">
          No se pudieron cargar tus favoritos: {errorMessage}
        </p>
      ) : favorites.length === 0 ? (
        <p>No tienes favoritos aun.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
          {favorites.map((dress) => (
            <DressCard key={dress.id} dress={dress} />
          ))}
        </div>
      )}
    </main>
  );
}
