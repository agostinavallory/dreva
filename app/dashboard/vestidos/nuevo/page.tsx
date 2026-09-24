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

const inputClass =
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3.5 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]";

const labelClass = "mb-1.5 block text-sm font-bold text-[#4f4951]";

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
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold leading-tight text-[#17151b] sm:text-3xl">
            Nuevo vestido
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
            Cargá un vestido nuevo para publicarlo en tu catálogo.
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
                autoComplete="off"
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
                autoComplete="off"
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
            Guardar vestido
          </button>
        </form>
      </div>
    </main>
  );
}