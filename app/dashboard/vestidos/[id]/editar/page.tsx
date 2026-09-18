"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

const inputClass =
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3.5 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]";

const labelClass = "mb-1.5 block text-sm font-bold text-[#4f4951]";

export default function EditarVestidoPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    imagen: "",
    descripcion: "",
    color: "",
    talla: "",
    largo: "",
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
          color: data.color || "",
          talla: data.talla || "",
          largo: data.largo || "",
        });
      }

      setLoading(false);
    }

    if (id) loadDress();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase
      .from("vestidos")
      .update({
        nombre: form.nombre,
        precio: Number(form.precio),
        imagen: form.imagen,
        descripcion: form.descripcion,
        color: form.color,
        talla: form.talla,
        largo: form.largo || null,
      })
      .eq("id", Number(id))
      .select();

    if (error) {
      alert("Error al guardar cambios");
      console.error(error);
      return;
    }

    alert("Vestido actualizado correctamente");

    router.push("/dashboard/vestidos");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Cargando vestido...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold leading-tight text-[#17151b] sm:text-3xl">
            Editar vestido
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
            Actualizá la información de este vestido.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.5rem] border border-[#eee4e9] bg-white p-6 shadow-[0_14px_42px_rgba(38,31,36,0.06)] sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={labelClass}>Nombre del vestido</span>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Precio de alquiler (Gs.)</span>
              <input
                name="precio"
                value={form.precio}
                onChange={handleChange}
                placeholder="Precio"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Imagen del vestido</span>
              <input
                name="imagen"
                value={form.imagen}
                onChange={handleChange}
                placeholder="URL imagen"
                className={inputClass}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Descripción</span>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Descripción"
                className={`${inputClass} min-h-28 resize-y`}
                rows={4}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Color</span>
              <select
                name="color"
                value={form.color}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Seleccionar color</option>
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Talla</span>
              <select
                name="talla"
                value={form.talla}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Seleccionar talla</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Largo del vestido</span>
              <select
                name="largo"
                value={form.largo}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Seleccionar largo</option>
                {lengthOptions.map((length) => (
                  <option key={length} value={length}>
                    {length}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="mt-8 w-full rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68]"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </main>
  );
}