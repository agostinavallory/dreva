"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EditarVestidoPage() {
  const { id } = useParams();
const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    imagen: "",
    descripcion: "",
    categoria: "",
    color: "",
    talla: "",
  });

  useEffect(() => {
    async function loadDress() {
      const { data } = await supabase
        .from("vestidos")
        .select("*")
        .eq("id", Number(id))
        .single();

      if (data) {
        setForm({
          nombre: data.nombre || "",
          precio: data.precio?.toString() || "",
          imagen: data.imagen || "",
          descripcion: data.descripcion || "",
          categoria: data.categoria || "",
          color: data.color || "",
          talla: data.talla || "",
        });
      }

      setLoading(false);
    }

    if (id) loadDress();
  }, [id]);

  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
  setForm({
    ...form,
    [e.target.name]: e.target.value,
  });
};

const handleSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

 const { data, error } = await supabase
  .from("vestidos")
  .update({
    nombre: form.nombre,
    precio: Number(form.precio),
    imagen: form.imagen,
    descripcion: form.descripcion,
    categoria: form.categoria,
    color: form.color,
    talla: form.talla,
  })
  .eq("id", Number(id))
  .select();



  if (error) {
    alert("Error al guardar cambios");
    console.error(error);
    return;
  }

alert("✅ Vestido actualizado correctamente");

  router.push("/dashboard/vestidos");
};

  if (loading) {
    return <p className="p-6">Cargando vestido...</p>;
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
  <h1 className="text-2xl font-bold mb-6">
    Editar Vestido
  </h1>

  <form
    onSubmit={handleSubmit}
    className="flex flex-col gap-4"
  >
    <input
      name="nombre"
      value={form.nombre}
      onChange={handleChange}
      placeholder="Nombre"
      className="border rounded-lg p-3"
    />

    <input
      name="precio"
      value={form.precio}
      onChange={handleChange}
      placeholder="Precio"
      className="border rounded-lg p-3"
    />

    <input
      name="imagen"
      value={form.imagen}
      onChange={handleChange}
      placeholder="URL imagen"
      className="border rounded-lg p-3"
    />

    <textarea
      name="descripcion"
      value={form.descripcion}
      onChange={handleChange}
      placeholder="Descripción"
      className="border rounded-lg p-3"
      rows={4}
    />

    <input
      name="categoria"
      value={form.categoria}
      onChange={handleChange}
      placeholder="Categoría"
      className="border rounded-lg p-3"
    />

    <input
      name="color"
      value={form.color}
      onChange={handleChange}
      placeholder="Color"
      className="border rounded-lg p-3"
    />

    <input
      name="talla"
      value={form.talla}
      onChange={handleChange}
      placeholder="Talla"
      className="border rounded-lg p-3"
    />

    <button
      type="submit"
      className="bg-black text-white rounded-xl py-3"
    >
      Guardar cambios
    </button>
  </form>
</main>
  );
}