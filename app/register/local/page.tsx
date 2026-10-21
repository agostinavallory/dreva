"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { getLocaleStatus } from "@/app/hooks/useIsLocalOwner";

const inputClass =
  "w-full rounded-[16px] border border-[#f3c7d6] bg-white px-4 py-3 text-[15px] text-dreva-text outline-none transition placeholder:text-[#b3a9b0] focus:border-[#d16a97] focus:ring-4 focus:ring-[#ffe7f0] disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4951]">
        {label}
      </span>
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
        />
        <p className="relative z-10 text-[15px] font-medium text-dreva-text-muted">
          Verificando tu cuenta...
        </p>
      </main>
    );
  }

  if (checkFailed) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
        />

        <div className="relative z-10 w-full max-w-[520px] rounded-[20px] border border-[#ffd8e6] bg-white px-6 py-6 text-center shadow-[0_18px_60px_rgba(255,92,168,0.1)] sm:px-10">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#211d26]">
            No pudimos verificar tu cuenta
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-dreva-text-muted">
            Revisa tu conexión e intenta de nuevo.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 w-full rounded-[16px] bg-[#c18098] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(193,128,152,0.25)] transition hover:bg-[#a96c83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
      />

      <section className="relative z-10 w-full max-w-[760px] rounded-[20px] border border-[#ffd8e6] bg-white px-6 py-6 shadow-[0_18px_60px_rgba(255,92,168,0.1)] sm:px-10 sm:py-7">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.55em] text-[#d16a97]">
            DREVA
          </p>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d16a97]">
            Paso 2 de 2 · Datos del local
          </p>

          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#211d26] sm:text-[30px]">
            Completá los datos de tu local
          </h1>

          <p className="mt-1.5 text-[15px] leading-6 text-dreva-text-muted">
            Agregá la información de tu local para terminar el registro.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-5 space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          <Field label="Descripción (opcional)">
            <textarea
              className={`${inputClass} min-h-[104px] resize-none leading-6`}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contanos de qué se trata tu local..."
              disabled={saving}
            />
          </Field>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-[14px] border border-[#f5c6d7] bg-dreva-error-bg px-4 py-3 text-sm font-medium leading-6 text-dreva-error"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 w-full rounded-[16px] bg-[#c18098] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(193,128,152,0.25)] transition hover:bg-[#a96c83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creando local..." : "Crear mi local"}
          </button>
        </form>
      </section>
    </main>
  );
}