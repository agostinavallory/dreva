"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

export default function LocalCuentaRegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submitted = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading || submitted.current) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Ingresa un correo electronico valido.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    submitted.current = true;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { role: "local" },
        },
      });

      if (error) {
        setLoading(false);
        submitted.current = false;
        setErrorMessage(
          "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo.",
        );
        return;
      }

      setLoading(false);

      if (data.user && data.session) {
        router.push("/register/local");
        return;
      }

      setSuccessMessage(
        "Cuenta creada. Revisa tu correo para confirmarla; luego inicia sesion y completa los datos de tu local.",
      );
    } catch {
      setLoading(false);
      submitted.current = false;
      setErrorMessage(
        "Ocurrio un error de red. Revisa tu conexion e intenta de nuevo.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_45%,#fdf2ff_100%)] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_20px_80px_rgba(255,92,168,0.12)]">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            DREVA
          </p>

          <h1 className="mt-3 text-4xl font-semibold text-[var(--ink)]">
            Crea tu cuenta del local
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            Primero tu cuenta; después completamos los datos de tu local.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Link
            href="/register"
            className="font-semibold text-[var(--primary)]"
          >
            Elegir otro tipo de registro
          </Link>
        </p>
      </div>
    </main>
  );
}