"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import DashboardNav from "@/app/components/DashboardNav";

type Local = {
  id: string;
  owner_id: string;
  nombre: string;
  descripcion: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono_whatsapp: string | null;
};

type SaveStatus = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3.5 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#4f4951]">{label}</span>
      {children}
    </label>
  );
}

export default function ConfiguracionPage() {
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    ciudad: "",
    direccion: "",
    telefono_whatsapp: "",
  });

  useEffect(() => {
    async function fetchLocal() {
      setLoading(true);

      // 🔥 OBTENER USER DIRECTO (NO DEPENDER DEL CONTEXT)
      const { data: userData } = await supabase.auth.getUser();

      const user = userData?.user;

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
          telefono_whatsapp: data.telefono_whatsapp ?? "",
        });
      }

      setLoading(false);
    }

    fetchLocal();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Cargando configuración...
        </p>
      </main>
    );
  }

  if (!local) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[#d92f68]">
          No se encontró el local para esta cuenta.
        </p>
      </main>
    );
  }

  async function handleSave() {
    if (!local || saveStatus === "saving") {
      return;
    }

    setSaveStatus("saving");

    const { error } = await supabase
      .from("locales")
      .update({
        nombre: form.nombre,
        descripcion: form.descripcion,
        ciudad: form.ciudad,
        direccion: form.direccion,
        telefono_whatsapp: form.telefono_whatsapp || null,
      })
      .eq("id", local.id);

    setSaveStatus(error ? "error" : "success");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] sm:px-8">
      <section className="mx-auto max-w-4xl">
        <DashboardNav />

        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#17151b] sm:text-3xl">
            Configuración
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
            Desde acá administrás la información pública de tu local.
          </p>
        </header>

        <div className="rounded-[1.5rem] border border-[#eee4e9] bg-white px-5 py-6 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7 sm:py-8">
          <h2 className="text-lg font-extrabold text-[#17151b]">
            Información del local
          </h2>

          <div className="mt-6 space-y-5">
            <Field label="Nombre del local">
              <input
                className={inputClass}
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
                placeholder="Ej.: Atelier DREVA"
              />
            </Field>

            <Field label="Descripción">
              <textarea
                className={`${inputClass} min-h-28 resize-none leading-6`}
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                placeholder="Contanos de qué se trata tu local..."
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ciudad">
                <input
                  className={inputClass}
                  value={form.ciudad}
                  onChange={(e) =>
                    setForm({ ...form, ciudad: e.target.value })
                  }
                  placeholder="Ej.: Asunción"
                />
              </Field>

              <Field label="Dirección">
                <input
                  className={inputClass}
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  placeholder="Calle y número"
                />
              </Field>
            </div>

            <Field label="WhatsApp del local">
              <input
                type="tel"
                className={inputClass}
                value={form.telefono_whatsapp}
                onChange={(e) =>
                  setForm({ ...form, telefono_whatsapp: e.target.value })
                }
                placeholder="+595 9XX XXX XXX"
              />
            </Field>
          </div>

          {saveStatus === "success" && (
            <p className="mt-6 rounded-xl border border-[#ccefe0] bg-[#f0fff8] px-4 py-3 text-sm font-bold text-[#247a50]">
              Cambios guardados correctamente.
            </p>
          )}

          {saveStatus === "error" && (
            <p className="mt-6 rounded-xl border border-[#f5c6d7] bg-[#fff4f8] px-4 py-3 text-sm font-bold text-[#d92f68]">
              No se pudieron guardar los cambios. Volvé a intentar.
            </p>
          )}

          <div className="mt-7 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Save className="h-4 w-4" strokeWidth={2.5} />
              {saveStatus === "saving" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}