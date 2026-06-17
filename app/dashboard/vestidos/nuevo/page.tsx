"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function NuevoVestidoPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    imagen: "",
    descripcion: "",
    categoria: "",
    color: "",
    talla: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ownerId = "7b27d1c5-2173-4b42-b345-1af6f549d4fc";

    const { error } = await supabase.from("vestidos").insert([
      {
        nombre: form.nombre,
        precio: Number(form.precio),
        imagen: form.imagen,
        descripcion: form.descripcion,
        categoria: form.categoria,
        color: form.color,
        talla: form.talla,
        owner_id: ownerId,
      },
    ]);

    if (error) {
      alert("Error al crear vestido");
      console.error(error);
      return;
    }

    router.push("/dashboard/vestidos");
  };

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Nuevo Vestido</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        <input
          name="nombre"
          placeholder="Nombre"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          name="precio"
          placeholder="Precio"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          name="imagen"
          placeholder="URL de imagen"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <textarea
          name="descripcion"
          placeholder="Descripción"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          name="categoria"
          placeholder="Categoría"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          name="color"
          placeholder="Color"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <input
          name="talla"
          placeholder="Talla"
          onChange={handleChange}
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white py-2 rounded-xl mt-3"
        >
          Guardar vestido
        </button>
      </form>
    </main>
  );
}