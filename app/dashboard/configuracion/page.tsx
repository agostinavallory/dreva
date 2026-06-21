"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DashboardNav from "@/app/components/DashboardNav";

type Local = {
  id: string;
  owner_id: string;
  nombre: string;
  descripcion: string | null;
  ciudad: string | null;
  direccion: string | null;
};

export default function ConfiguracionPage() {
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    ciudad: "",
    direccion: "",
  });

  useEffect(() => {
    async function fetchLocal() {
      setLoading(true);

      // 🔥 OBTENER USER DIRECTO (NO DEPENDER DEL CONTEXT)
      const { data: userData } = await supabase.auth.getUser();

      const user = userData?.user;


      console.log("USER ID:", user?.id);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("locales")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();




      if (error) {
        console.log("Error:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setLocal(data);

        setForm({
          nombre: data.nombre ?? "",
          descripcion: data.descripcion ?? "",
          ciudad: data.ciudad ?? "",
          direccion: data.direccion ?? "",
        });
      }

      setLoading(false);
    }

    fetchLocal();
  }, []);

  if (loading) {
    return <p className="p-6">Cargando configuración...</p>;
  }

  if (!local) {
    return (
      <p className="p-6 text-red-500">
        No se encontró el local
      </p>
    );
  }

  async function handleSave() {
    const { error } = await supabase
      .from("locales")
      .update({
        nombre: form.nombre,
        descripcion: form.descripcion,
        ciudad: form.ciudad,
        direccion: form.direccion,
      })
      .eq("id", local.id);

    if (error) {
      alert("Error al guardar");
      return;
    }

    alert("✅ Configuración actualizada");
  }

  return (
    <main className="max-w-3xl mx-auto p-6">

<DashboardNav />

      <h1 className="text-2xl font-bold mb-6">
        Configuración del Local
      </h1>

      <div className="space-y-4">

        <input
          className="w-full border p-2 rounded"
          value={form.nombre}
          onChange={(e) =>
            setForm({ ...form, nombre: e.target.value })
          }
          placeholder="Nombre"
        />

        <input
          className="w-full border p-2 rounded"
          value={form.descripcion}
          onChange={(e) =>
            setForm({ ...form, descripcion: e.target.value })
          }
          placeholder="Descripción"
        />

        <input
          className="w-full border p-2 rounded"
          value={form.ciudad}
          onChange={(e) =>
            setForm({ ...form, ciudad: e.target.value })
          }
          placeholder="Ciudad"
        />

        <input
          className="w-full border p-2 rounded"
          value={form.direccion}
          onChange={(e) =>
            setForm({ ...form, direccion: e.target.value })
          }
          placeholder="Dirección"
        />

        <button
          onClick={handleSave}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Guardar cambios
        </button>

      </div>
    </main>
  );
}