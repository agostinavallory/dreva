"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DressCard } from "@/app/components/DressCard";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("favorites")
        .select("dress_id")
        .eq("user_id", user.id);

      const ids = data?.map((f) => f.dress_id) || [];

      const { data: dresses } = await supabase
        .from("vestidos")
        .select("*")
        .in("id", ids);

      setFavorites(dresses || []);
      setLoading(false);
    };

    loadFavorites();
  }, []);

  if (loading) {
    return <p className="p-10">Cargando favoritos...</p>;
  }

  return (
    <main className="min-h-screen p-10">
      <h1 className="text-2xl font-bold mb-6">Mis favoritos ❤️</h1>

      {favorites.length === 0 ? (
        <p>No tienes favoritos aún.</p>
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