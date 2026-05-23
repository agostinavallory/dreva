"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Reservation = {
  id: number;
  status: string;
  event_date: string | null;
  vestidos?: {
    nombre?: string | null;
    imagen?: string | null;
    precio?: string | number | null;
  } | null;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("reservations")
      .select(
        `
        *,
        vestidos (
          nombre,
          imagen,
          precio
        )
      `
      )
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return (data || []) as Reservation[];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (authLoading) {
        return;
      }

      if (!userId) {
        setReservations([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await fetchReservations(userId);

      if (cancelled) {
        return;
      }

      setReservations(data);
      setLoading(false);
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authLoading, fetchReservations, userId]);

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    if (userId) {
      const data = await fetchReservations(userId);
      setReservations(data);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando dashboard...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>No has iniciado sesion.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-3xl font-bold mb-6">Dashboard del Local</h1>

      {reservations.length === 0 ? (
        <p>No hay solicitudes todavia.</p>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="p-5 rounded-3xl border border-pink-100 bg-white shadow-sm"
            >
              <p className="font-semibold text-lg">
                {reservation.vestidos?.nombre}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Estado: {reservation.status}
              </p>

              <p className="text-sm text-gray-500">
                Fecha evento: {reservation.event_date}
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateStatus(reservation.id, "accepted")}
                  className="px-4 py-2 rounded-xl bg-green-500 text-white"
                >
                  Aceptar
                </button>

                <button
                  onClick={() => updateStatus(reservation.id, "rejected")}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
