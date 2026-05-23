"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DressCard } from "@/app/components/DressCard";
import { useAuth } from "@/app/providers/AuthProvider";
import type { Dress } from "@/app/page";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Dress[]>([]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      if (!userId) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: favs } = await supabase
        .from("favorites")
        .select("dress_id")
        .eq("user_id", userId);

      const ids = favs?.map((f) => f.dress_id) || [];

      if (ids.length === 0) {
        if (cancelled) {
          return;
        }

        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data: dresses } = await supabase
        .from("vestidos")
        .select("*")
        .in("id", ids);

      if (cancelled) {
        return;
      }

      setFavorites(dresses || []);
      setLoading(false);
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  if (authLoading || loading) {
  return (
    <main className="p-10">
      <p>Cargando perfil...</p>
    </main>
  );
}
  if (!user) {
    return (
      <main className="p-10">
        <p>No has iniciado sesión.</p>
      </main>
    );
  }

return (
  <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">

    <div className="mx-auto max-w-5xl">

      {/* HEADER PERFIL PRO */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-pink-50 via-white to-fuchsia-50 p-8 shadow-sm">

        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-fuchsia-200/40 blur-3xl" />

        <div className="relative">

  <div className="mb-5 flex items-center gap-4">

    {/* AVATAR */}
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500 text-2xl font-bold text-white shadow-lg shadow-pink-200">
      {user.email?.charAt(0).toUpperCase()}
    </div>

    {/* INFO */}
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
        Tu perfil en DREVA
      </p>

      <h1 className="mt-1 text-2xl font-bold text-[var(--ink)] sm:text-3xl">
        {user.email}
      </h1>

      <p className="mt-1 text-sm text-[var(--muted)]">
        Aquí puedes ver tus favoritos guardados ❤️
      </p>
    </div>

  </div>

</div>
      </div>

      {/* FAVORITOS */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-pink-100">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--ink)]">
            Mis favoritos ❤️
          </h2>

          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-[var(--primary)]">
            {favorites.length} vestidos
          </span>
        </div>

        {favorites.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Aún no tienes vestidos guardados
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {favorites.map((dress) => (
              <DressCard key={dress.id} dress={dress} />
            ))}
          </div>
        )}

      </div>

    </div>

  </main>
)};
