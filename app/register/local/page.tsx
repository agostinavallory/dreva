"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { getLocaleStatus } from "@/app/hooks/useIsLocalOwner";

const inputClass =
  "w-full rounded-xl border border-[#eadfe5] bg-white px-4 py-3.5 text-[15px] font-medium text-[#17151b] outline-none transition placeholder:text-[#b3a9b0] focus:border-[#ff9ec2] focus:ring-4 focus:ring-[#ffe7f0] disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#4f4951]">{label}</span>
      {children}
    </label>
  );
}

export default function LocalRegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [reload, setReload] = useState(0);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    getLocaleStatus(user.id).then((status) => {
      if (cancelled) return;
      setChecking(false);

      if (!status.ok) {
        setCheckFailed(true);
        return;
      }

      if (status.hasLocale) {
        router.replace("/dashboard");
        return;
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router, reload]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <p className="text-sm font-medium text-[var(--muted)]">
          Verificando tu cuenta...
        </p>
      </main>
    );
  }

  if (checkFailed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5">
        <div className="w-full max-w-md rounded-[1.5rem] border border-[#eee4e9] bg-white px-5 py-8 text-center shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7">
          <h1 className="text-lg font-extrabold text-[#17151b]">
            No pudimos verificar tu cuenta
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
            Revisa tu conexión e intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68]"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  if (!ready) return null;

  function handleRetry() {
    setChecking(true);
    setCheckFailed(false);
    setReady(false);
    setReload((r) => r + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrorMessage(null);

    const trimmedNombre = nombre.trim();
    const trimmedCiudad = ciudad.trim();
    const trimmedTelefono = telefono.trim();

    if (!trimmedNombre) {
      setErrorMessage("Ingresa el nombre del local.");
      return;
    }

    if (!trimmedCiudad) {
      setErrorMessage("Ingresa la ciudad del local.");
      return;
    }

    if (!trimmedTelefono) {
      setErrorMessage("Ingresa el WhatsApp del local.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("locales").insert({
        owner_id: user.id,
        nombre: trimmedNombre,
        ciudad: trimmedCiudad,
        telefono_whatsapp: trimmedTelefono,
        direccion: direccion.trim() || null,
        descripcion: descripcion.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          const status = await getLocaleStatus(user.id);

          if (status.ok && status.hasLocale) {
            router.replace("/dashboard");
          } else {
            setErrorMessage(
              "Ya existe un local con esos datos. Verifícalos e intenta de nuevo.",
            );
          }
          return;
        }
        setErrorMessage(
          "No pudimos crear tu local. Revisa los datos e intenta de nuevo.",
        );
        return;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: "local" },
      });

      if (metadataError) {
        console.warn(
          "Local creado: no se pudo reestablecer la intención de ruteo.",
          metadataError.code,
        );
      }

      router.replace("/dashboard");
    } catch {
      setErrorMessage(
        "Ocurrió un error de red. Revisa tu conexión e intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-8">
      <section className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ff2f78]">
            DREVA
          </p>

          <h1 className="mt-3 text-2xl font-extrabold text-[#17151b] sm:text-3xl">
            Datos de tu local
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-[#6d6670]">
            Con esto creamos tu local y abres tu Dashboard.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-[1.5rem] border border-[#eee4e9] bg-white px-5 py-6 shadow-[0_14px_42px_rgba(255,45,126,0.07)] sm:px-7 sm:py-8"
        >
          <Field label="Nombre del local">
            <input
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Atelier DREVA"
              disabled={saving}
            />
          </Field>

          <Field label="Ciudad">
            <input
              className={inputClass}
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej.: Asunción"
              disabled={saving}
            />
          </Field>

          <Field label="WhatsApp del local">
            <input
              type="tel"
              className={inputClass}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+595 9XX XXX XXX"
              disabled={saving}
            />
          </Field>

          <Field label="Dirección (opcional)">
            <input
              className={inputClass}
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle y número"
              disabled={saving}
            />
          </Field>

          <Field label="Descripción (opcional)">
            <textarea
              className={`${inputClass} min-h-28 resize-none leading-6`}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contanos de qué se trata tu local..."
              disabled={saving}
            />
          </Field>

          {errorMessage && (
            <p className="rounded-xl border border-[#f5c6d7] bg-[#fff4f8] px-4 py-3 text-sm font-bold text-[#d92f68]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-[#ff2f78] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,47,120,0.22)] transition hover:-translate-y-0.5 hover:bg-[#ef1f68] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creando local..." : "Crear mi local"}
          </button>
        </form>
      </section>
    </main>
  );
}