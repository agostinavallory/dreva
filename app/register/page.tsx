"use client";

import Link from "next/link";
import { useState } from "react";

import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNombre) {
      setErrorMessage("Ingresa tu nombre.");
      return;
    }

    if (!trimmedApellido) {
      setErrorMessage("Ingresa tu apellido.");
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage("Ingresa un correo electronico valido.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: `${trimmedNombre} ${trimmedApellido}`,
          nombre: trimmedNombre,
          apellido: trimmedApellido,
          first_name: trimmedNombre,
          last_name: trimmedApellido,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(
        "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo.",
      );
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: data.user.id,
          nombre: trimmedNombre,
          apellido: trimmedApellido,
        },
        { onConflict: "user_id" },
      );

      if (profileError) {
        setLoading(false);
        setErrorMessage(
          "La cuenta se creo, pero no pudimos guardar tu perfil. Intenta iniciar sesion.",
        );
        return;
      }
    }

    setLoading(false);
    setSuccessMessage("Cuenta creada correctamente. Ya puedes iniciar sesion.");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_45%,#fdf2ff_100%)] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_20px_80px_rgba(255,92,168,0.12)]">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            DREVA
          </p>

          <h1 className="mt-3 text-4xl font-semibold text-[var(--ink)]">
            Crea tu cuenta
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            Guarda vestidos favoritos y reserva de forma rapida.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="text"
            placeholder="Apellido"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />

          <input
            type="email"
            placeholder="Correo electronico"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contrasena"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {errorMessage && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--primary)] py-4 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Inicia sesion
          </Link>
        </p>
      </div>
    </main>
  );
}
