"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

export default function LocalCuentaRegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
      />

      <div className="relative z-10 w-full max-w-[520px] rounded-[20px] border border-[#ffd8e6] bg-white px-6 py-5 shadow-[0_18px_60px_rgba(255,92,168,0.1)] sm:px-10 sm:py-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.55em] text-[#d16a97]">
            DREVA
          </p>

          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d16a97]">
            Paso 1 de 2 · Cuenta de acceso
          </p>

          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#211d26] sm:text-[30px]">
            Creá tu cuenta
          </h1>

          <p className="mt-1.5 text-[15px] leading-6 text-dreva-text-muted">
            Primero creamos tu cuenta. Después completás los datos de tu local.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label htmlFor="local-cuenta-email" className="sr-only">
            Correo electrónico
          </label>
          <input
            id="local-cuenta-email"
            type="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            className="w-full rounded-[16px] border border-[#f3c7d6] bg-white px-4 py-3 text-[15px] text-dreva-text outline-none transition placeholder:text-[#b3a9b0] focus:border-[#d16a97] focus:ring-4 focus:ring-[#ffe7f0]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="local-cuenta-password" className="sr-only">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="local-cuenta-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Contraseña"
              className="w-full rounded-[16px] border border-[#f3c7d6] bg-white py-3 pl-4 pr-12 text-[15px] text-dreva-text outline-none transition placeholder:text-[#b3a9b0] focus:border-[#d16a97] focus:ring-4 focus:ring-[#ffe7f0]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#d16a97] transition hover:bg-dreva-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              ) : (
                <Eye className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-[14px] border border-[#f5c6d7] bg-dreva-error-bg px-4 py-3 text-sm font-medium leading-6 text-dreva-error"
            >
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p
              role="status"
              className="rounded-[14px] border border-[#cdedd9] bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
            >
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-[16px] bg-[#c18098] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(193,128,152,0.25)] transition hover:bg-[#a96c83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta y continuar"}
          </button>
        </form>

        <p className="mt-5 text-center text-[15px] text-dreva-text-muted">
          <Link
            href="/register"
            className="font-semibold text-[#c22a68] transition hover:text-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
          >
            Elegir otro tipo de registro
          </Link>
        </p>
      </div>
    </main>
  );
}
