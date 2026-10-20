"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, HeartOff } from "lucide-react";

import { DressCard } from "@/app/components/DressCard";
import { ProfileNavbar } from "@/app/components/ProfileNavbar";
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

function FavoriteBottomWaves() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[300px] overflow-hidden"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 300V186c148-40 268-6 402 32 150 42 268 60 420 18 168-46 300-96 618-52v116H0Z"
          fill="#fff0f6"
        />
        <path
          d="M0 300v-84c190-44 320 6 470 40 168 38 300 42 452 2 176-46 316-88 518-52v94H0Z"
          fill="#fbe3ef"
          opacity="0.85"
        />
        <path
          d="M0 300v-44c240-34 380 20 560 36 190 18 340-20 520-40 150-16 260-10 360 4v44H0Z"
          fill="#ff5ca8"
          opacity="0.07"
        />
      </svg>
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [favorites, setFavorites] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasStoredFavorites, setHasStoredFavorites] = useState(false);

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

      setHasStoredFavorites(ids.length > 0);

      logFavoritesDebug("normalized dress ids", ids);

      if (ids.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data: dresses, error: dressesError } = await supabase
        .from("vestidos")
        .select("*")
        .in("id", ids)
        .eq("activo", true);

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
      <main className="min-h-screen bg-[var(--dreva-color-background)] text-[var(--dreva-color-text)]">
        <ProfileNavbar />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-center justify-center px-5 lg:w-[88%]">
          <p className="rounded-full border border-[var(--dreva-color-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--dreva-color-text-muted)] shadow-dreva-sm">
            Cargando tus favoritos...
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--dreva-color-background)] text-[var(--dreva-color-text)]">
        <ProfileNavbar />
        <section className="mx-auto flex min-h-[70vh] w-full max-w-[1280px] items-center justify-center px-5 lg:w-[88%]">
          <p className="text-sm font-medium text-[var(--dreva-color-text-muted)]">
            Redirigiendo a inicio de sesión...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[var(--dreva-color-background)] text-[var(--dreva-color-text)]">
      <FavoriteBottomWaves />

      <div className="relative z-10">
        <ProfileNavbar />

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8 lg:w-[88%] lg:px-0 lg:pt-7">
          <header className="mb-8">
            <h1 className="text-[30px] font-bold tracking-tight text-[#211d26] sm:text-[34px]">
              Mis favoritos
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#635b66] sm:text-base">
              Guardá los vestidos que te encantan para encontrarlos
              rápidamente.
            </p>
          </header>

          {errorMessage ? (
            <div className="rounded-dreva-dialog border border-[var(--dreva-color-border)] bg-white p-6 text-sm font-medium text-[var(--dreva-color-error)] shadow-dreva-sm sm:max-w-2xl">
              {errorMessage}
            </div>
          ) : favorites.length === 0 ? (
            <div className="rounded-dreva-dialog border border-[#ffd8e6] bg-white px-6 py-6 text-center shadow-dreva-sm sm:px-8 sm:py-7">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--dreva-color-soft)] text-[var(--dreva-color-brand)]">
                {hasStoredFavorites ? (
                  <HeartOff className="h-6 w-6" strokeWidth={1.8} />
                ) : (
                  <Heart className="h-6 w-6" strokeWidth={1.8} />
                )}
              </span>

              {hasStoredFavorites ? (
                <>
                  <h2 className="text-lg font-semibold text-[#211d26] sm:text-xl">
                    Tus vestidos favoritos no están disponibles actualmente.
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#635b66]">
                    Guardaste estos vestidos, pero ahora no están publicados.
                    Tus favoritos se conservan y volverás a verlos cuando estén
                    disponibles.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-[#211d26] sm:text-xl">
                    Todavía no tenés vestidos favoritos.
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#635b66]">
                    Guardá los vestidos que te encantan para encontrarlos
                    rápido.
                  </p>
                </>
              )}

              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f3c7d6] bg-white px-6 py-3 text-sm font-semibold text-[var(--dreva-color-action)] shadow-dreva-xs transition hover:border-[var(--dreva-color-brand)] hover:bg-[var(--dreva-color-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/40 sm:text-base"
              >
                Explorar vestidos
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[var(--dreva-color-brand)]"
                  strokeWidth={2}
                />
              </Link>
            </div>
          ) : (
            <div className="grid max-w-[1040px] grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
              {favorites.map((dress) => (
                <DressCard key={dress.id} dress={dress} variant="home" />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
