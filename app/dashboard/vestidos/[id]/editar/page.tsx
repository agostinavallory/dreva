"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  ALLOWED_VESTIDO_IMAGE_TYPES,
  deleteOwnedVestidoImageByUrl,
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

export default function EditarVestidoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "",
    precio: "",
    descripcion: "",
    color: "",
    talla: "",
    largo: "",
  });

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

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
          descripcion: data.descripcion || "",
          color: data.color || "",
          talla: data.talla || "",
          largo: data.largo || "",
        });
        setCurrentImageUrl(data.imagen || null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);

    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateVestidoImage(file);

    if (validationError) {
      e.target.value = "";
      setNewImageFile(null);
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
    setNewImageFile(file);
  };

  const clearSelectedImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
    setNewImageFile(null);
    setErrorMessage(null);
  };

  async function removeOrphanImage(path: string) {
    try {
      await deleteVestidoImage(path);
    } catch (cleanupError) {
      console.warn("No se pudo eliminar la imagen huérfana:", cleanupError);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    if (!user) {
      setErrorMessage("Debes iniciar sesión para editar este vestido.");
      return;
    }

    if (newImageFile) {
      const validationError = validateVestidoImage(newImageFile);

      if (validationError) {
        setErrorMessage(
          validationError === "type"
            ? "Formato no permitido. Usá una imagen JPEG, PNG o WebP."
            : "La imagen supera el límite de 5 MB. Elegí una más liviana.",
        );
        return;
      }
    }

    setSaving(true);
    setErrorMessage(null);

    const previousImageUrl = currentImageUrl;
    let uploadedPath: string | null = null;
    let uploadedUrl: string | null = null;

    try {
      const updatePayload: {
        nombre: string;
        precio: number;
        descripcion: string;
        color: string;
        talla: string;
        largo: string | null;
        imagen?: string;
      } = {
        nombre: form.nombre,
        precio: Number(form.precio),
        descripcion: form.descripcion,
        color: form.color,
        talla: form.talla,
        largo: form.largo || null,
      };

      if (newImageFile) {
        const { path, publicUrl } = await uploadVestidoImage(
          newImageFile,
          user.id,
        );
        uploadedPath = path;
        uploadedUrl = publicUrl;
        updatePayload.imagen = publicUrl;
      }

      const { error } = await supabase
        .from("vestidos")
        .update(updatePayload)
        .eq("id", Number(id))
        .select();

      if (error) {
        console.error(error);

        if (uploadedPath) {
          await removeOrphanImage(uploadedPath);
        }

        setErrorMessage(
          "No pudimos guardar los cambios. Revisá los datos e intentá de nuevo.",
        );
        return;
      }

      if (uploadedUrl) {
        setCurrentImageUrl(uploadedUrl);

        if (previousImageUrl && previousImageUrl !== uploadedUrl) {
          try {
            await deleteOwnedVestidoImageByUrl(previousImageUrl, user.id);
          } catch (cleanupError) {
            console.warn(
              "No se pudo eliminar la imagen anterior:",
              cleanupError,
            );
          }
        }
      }

      alert("Vestido actualizado correctamente");

      router.push("/dashboard/vestidos");
    } catch (error) {
      console.error(error);

      if (uploadedPath) {
        await removeOrphanImage(uploadedPath);
        setErrorMessage(
          "No pudimos guardar los cambios. Revisá los datos e intentá de nuevo.",
        );
      } else {
        setErrorMessage(
          "No pudimos subir la foto. Revisá tu conexión e intentá de nuevo.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--dreva-color-background)] bg-[radial-gradient(120%_80%_at_0%_0%,#fff0f6_0%,rgba(255,240,246,0)_55%),radial-gradient(120%_80%_at_100%_0%,#ffe3f1_0%,rgba(255,227,241,0)_50%),radial-gradient(140%_100%_at_50%_100%,#fff0f6_0%,rgba(252,249,251,0)_60%),linear-gradient(180deg,#fffafd_0%,#fcf9fb_45%,#fdf2f9_100%)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Cargando vestido...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--dreva-color-background)] bg-[radial-gradient(120%_80%_at_0%_0%,#fff0f6_0%,rgba(255,240,246,0)_55%),radial-gradient(120%_80%_at_100%_0%,#ffe3f1_0%,rgba(255,227,241,0)_50%),radial-gradient(140%_100%_at_50%_100%,#fff0f6_0%,rgba(252,249,251,0)_60%),linear-gradient(180deg,#fffafd_0%,#fcf9fb_45%,#fdf2f9_100%)] px-4 py-8 text-[var(--foreground)] sm:px-8">
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
                disabled={saving}
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
                disabled={saving}
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
                    alt="Vista previa de la nueva foto principal"
                    className="h-40 w-32 rounded-lg object-cover"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#5f5961]">
                      Vista previa de la nueva foto. Todavía no se guardó.
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
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : currentImageUrl ? (
                <div className="flex flex-col gap-3 rounded-xl border border-[#eadfe5] bg-[#fff7fa] p-3 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImageUrl}
                    alt="Foto actual del vestido"
                    className="h-40 w-32 rounded-lg object-cover"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#5f5961]">
                      Foto actual del vestido.
                    </p>
                    <label
                      htmlFor="foto-principal"
                      className="inline-flex w-fit cursor-pointer items-center justify-center rounded-full border border-[#f3d4e0] bg-white px-4 py-2 text-sm font-bold text-[#5d535c] transition hover:border-[#ff9ec2] hover:bg-[#fff7fa] hover:text-[#ff2f78]"
                    >
                      Cambiar foto
                    </label>
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
            disabled={saving}
            className="mt-8 w-full rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </main>
  );
}
