"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReservations(userId: string) {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        vestidos (
          nombre,
          imagen,
          precio
        )
      `)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReservations(data || []);
  }

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);

      if (!user) {
        setLoading(false);
        return;
      }

      await fetchReservations(user.id);

      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      fetchReservations(user.id);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Cargando dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-3xl font-bold mb-6">
        Dashboard del Local
      </h1>

      {reservations.length === 0 ? (
        <p>No hay solicitudes todavía.</p>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-3xl border border-pink-100 bg-white shadow-sm"
            >
              <p className="font-semibold text-lg">
                {r.vestidos?.nombre}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Estado: {r.status}
              </p>

              <p className="text-sm text-gray-500">
                Fecha evento: {r.event_date}
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateStatus(r.id, "accepted")}
                  className="px-4 py-2 rounded-xl bg-green-500 text-white"
                >
                  Aceptar
                </button>

                <button
                  onClick={() => updateStatus(r.id, "rejected")}
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