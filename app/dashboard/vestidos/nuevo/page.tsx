"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

const colorOptions = [
  "Negro",
  "Blanco",
  "Beige",
  "Dorado",
  "Plateado",
  "Rosa",
  "Rojo",
  "Azul",
  "Verde",
  "Morado",
  "Amarillo",
  "Naranja",
  "Marrón",
  "Gris",
];

const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"];
const lengthOptions = ["Corto", "Midi", "Largo"];

export default function NuevoVestidoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    imagen: "",
    descripcion: "",
    color: "",
    talla: "",
    largo: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      return;
    }

    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    const { error } = await supabase.from("vestidos").insert([
      {
        nombre: form.nombre,
        precio: Number(form.precio),
        imagen: form.imagen,
        descripcion: form.descripcion,
        color: form.color,
        talla: form.talla,
        largo: form.largo || null,
        owner_id: user.id,
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

        <select
          name="color"
          value={form.color}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Seleccionar color</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>

        <select
          name="talla"
          value={form.talla}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Seleccionar talla</option>
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium text-gray-600">
          Largo del vestido
        </label>
        <select
          name="largo"
          value={form.largo}
          onChange={handleChange}
          className="border p-2 rounded"
        >
          <option value="">Seleccionar largo</option>
          {lengthOptions.map((length) => (
            <option key={length} value={length}>
              {length}
            </option>
          ))}
        </select>

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
