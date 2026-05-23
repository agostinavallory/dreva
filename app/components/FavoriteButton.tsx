"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  dressId: string | number;
};

function normalizeDressId(dressId: string | number) {
  const numericDressId =
    typeof dressId === "number" ? dressId : Number(dressId);

  return Number.isInteger(numericDressId) ? numericDressId : null;
}

function logFavoriteDebug(message: string, details: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[favorites] ${message}`, details);
  }
}

export function FavoriteButton({ dressId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const normalizedDressId = normalizeDressId(dressId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    const loadFavorite = async () => {
      if (!userId) {
        setLiked(false);
        setLoading(false);
        return;
      }

      if (normalizedDressId === null) {
        console.error("Invalid favorite dress id:", dressId);
        setLiked(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("favorites")
        .select("user_id,dress_id")
        .eq("user_id", userId)
        .eq("dress_id", normalizedDressId)
        .maybeSingle();

      logFavoriteDebug("lookup result", {
        userId,
        dressId: normalizedDressId,
        data,
        error,
      });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Supabase favorite lookup error:", error);
        setLiked(false);
        setLoading(false);
        return;
      }

      setLiked(!!data);
      setLoading(false);
    };

    loadFavorite();

    return () => {
      cancelled = true;
    };
  }, [authLoading, dressId, normalizedDressId, userId]);

  if (authLoading || loading) {
    return null;
  }

  async function toggleFavorite(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      alert("Debes iniciar sesion");
      return;
    }

    if (normalizedDressId === null) {
      alert("No se puede guardar este vestido porque su ID no es valido.");
      console.error("Invalid favorite dress id:", dressId);
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);

    if (liked) {
      const { error, count } = await supabase
        .from("favorites")
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .eq("dress_id", normalizedDressId);

      logFavoriteDebug("delete result", {
        userId,
        dressId: normalizedDressId,
        count,
        error,
      });

      if (error) {
        console.error("Supabase favorite delete error:", error);
        alert("No se pudo quitar de favoritos: " + error.message);
        setSaving(false);
        return;
      }

      setLiked(false);
      setSaving(false);
      return;
    }

    const payload = {
      user_id: userId,
      dress_id: normalizedDressId,
    };

    const { data, error } = await supabase
      .from("favorites")
      .insert(payload)
      .select("user_id,dress_id")
      .single();

    logFavoriteDebug("insert result", {
      payload,
      data,
      error,
    });

    if (error) {
      console.error("Supabase favorite insert error:", error);
      alert("No se pudo guardar en favoritos: " + error.message);
      setSaving(false);
      return;
    }

    if (!data) {
      console.error("Supabase favorite insert returned no row:", payload);
      alert("No se pudo confirmar el favorito guardado.");
      setSaving(false);
      return;
    }

    setLiked(true);
    setSaving(false);
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={saving}
      aria-pressed={liked}
      className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm hover:scale-110 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}
    </button>
  );
}
