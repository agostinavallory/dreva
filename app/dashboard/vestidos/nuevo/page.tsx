"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  ALLOWED_VESTIDO_IMAGE_TYPES,
  deleteVestidoImage,
  uploadVestidoImage,
  validateVestidoImage,
} from "@/lib/uploadVestidoImage";

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
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3.5 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0] disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "mb-1.5 block text-sm font-bold text-[#4f4951]";

export default function NuevoVestidoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    descripcion: "",
    color: "",
    talla: "",
    largo: "",
  });

  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);

    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateVestidoImage(file);

    if (validationError) {
      e.target.value = "";
      setImagenFile(null);
      setErrorMessage(
        validationError === "type"
          ? "Formato no permitido. Usá una imagen JPEG, PNG o WebP."
          : "La imagen supera el límite de 5 MB. Elegí una más liviana.",
      );
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;

    setPreviewUrl(nextPreviewUrl);
    setImagenFile(file);
  };

  const clearSelectedImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
    setImagenFile(null);
    setErrorMessage(null);
  };

  async function removeOrphanImage(path: string) {
    try {
      await deleteVestidoImage(path);
    } catch (cleanupError) {
      console.warn("No se pudo eliminar la imagen huérfana:", cleanupError);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (publishing || authLoading) {
      return;
    }

    if (!user) {
      setErrorMessage("Debes iniciar sesión para publicar un vestido.");
      return;
    }

    if (!imagenFile) {
      setErrorMessage("Seleccioná una foto principal para tu vestido.");
      return;
    }

    const validationError = validateVestidoImage(imagenFile);

    if (validationError) {
      setErrorMessage(
        validationError === "type"
          ? "Formato no permitido. Usá una imagen JPEG, PNG o WebP."
          : "La imagen supera el límite de 5 MB. Elegí una más liviana.",
      );
      return;
    }

    setPublishing(true);
    setErrorMessage(null);

    let uploadedPath: string | null = null;

    try {
      const { path, publicUrl } = await uploadVestidoImage(imagenFile, user.id);
      uploadedPath = path;

      const { error } = await supabase.from("vestidos").insert([
        {
          nombre: form.nombre,
          precio: Number(form.precio),
          imagen: publicUrl,
          descripcion: form.descripcion,
          color: form.color,
          talla: form.talla,
          largo: form.largo || null,
          owner_id: user.id,
        },
      ]);

      if (error) {
        console.error(error);
        await removeOrphanImage(path);
        setErrorMessage(
          "No pudimos publicar el vestido. Revisá los datos e intentá de nuevo.",
        );
        return;
      }

      router.push("/dashboard/vestidos");
    } catch (error) {
      console.error(error);

      if (uploadedPath) {
        await removeOrphanImage(uploadedPath);
        setErrorMessage(
          "No pudimos publicar el vestido. Revisá los datos e intentá de nuevo.",
        );
      } else {
        setErrorMessage(
          "No pudimos subir la foto. Revisá tu conexión e intentá de nuevo.",
        );
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--dreva-color-background)] bg-[radial-gradient(120%_80%_at_0%_0%,#fff0f6_0%,rgba(255,240,246,0)_55%),radial-gradient(120%_80%_at_100%_0%,#ffe3f1_0%,rgba(255,227,241,0)_50%),radial-gradient(140%_100%_at_50%_100%,#fff0f6_0%,rgba(252,249,251,0)_60%),linear-gradient(180deg,#fffafd_0%,#fcf9fb_45%,#fdf2f9_100%)] px-4 py-5 text-[var(--foreground)] sm:px-8">
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
                disabled={publishing}
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
                disabled={publishing}
                className={inputClass}
              />
            </label>

            <div className="block sm:col-span-2">
              <span className={labelClass}>Foto principal</span>

              {previewUrl ? (
                <div className="flex flex-col gap-3 rounded-xl border border-[#eadfe5] bg-[#fff7fa] p-3 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vista previa de la foto principal"
                    className="h-40 w-32 rounded-lg object-cover"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#5f5961]">
                      Esta será la foto principal del vestido.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <label
                        htmlFor="foto-principal"
                        className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78]"
                      >
                        Cambiar foto
                      </label>
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        disabled={publishing}
                        className="inline-flex items-center justify-center rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="foto-principal"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#eadfe5] bg-[#fff7fa] px-4 py-8 text-center transition hover:border-[#ff9ec2] hover:bg-[#fff0f6]"
                >
                  <span className="text-sm font-bold text-[#ff2f78]">
                    Elegir foto
                  </span>
                  <span className="text-xs font-medium text-[#9a949b]">
                    JPEG, PNG o WebP · hasta 5 MB
                  </span>
                  <span className="text-xs font-medium text-[#9a949b]">
                    Una sola foto principal.
                  </span>
                </label>
              )}

              <input
                id="foto-principal"
                type="file"
                accept={ALLOWED_VESTIDO_IMAGE_TYPES.join(",")}
                onChange={handleFileChange}
                disabled={publishing}
                className="sr-only"
              />
            </div>

            <label className="block sm:col-span-2">
              <span className={labelClass}>Descripción</span>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Descripción"
                disabled={publishing}
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
                disabled={publishing}
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
                disabled={publishing}
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
                disabled={publishing}
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

          {errorMessage && (
            <p className="mt-6 rounded-xl border border-[#f5c6d7] bg-[#fff4f8] px-4 py-3 text-sm font-bold text-[#d92f68]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={publishing || authLoading}
            className="mt-8 w-full rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishing ? "Publicando vestido..." : "Guardar vestido"}
          </button>
        </form>
      </div>
    </main>
  );
}
