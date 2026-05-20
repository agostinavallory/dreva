"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  dressId: string | number;
};

export function FavoriteButton({ dressId }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const loadFavorite = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("dress_id", dressId)
        .maybeSingle();

      setLiked(!!data);
      setLoading(false);
    };

    loadFavorite();
  }, [dressId]);

  if (loading) {
    return null;
  }

  async function toggleFavorite(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    if (liked) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("dress_id", dressId);

      setLiked(false);
    } else {
      await supabase.from("favorites").insert({
        user_id: user.id,
        dress_id: dressId,
      });

      setLiked(true);
    }
  }

  return (
    <button
      onClick={(e) => toggleFavorite(e)}
      className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm hover:scale-110 transition"
    >
      {liked ? "❤️" : "🤍"}
    </button>
  );
}