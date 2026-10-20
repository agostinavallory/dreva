"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { isLocalOwner } from "@/app/hooks/useIsLocalOwner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage("No pudimos iniciar sesión. Revisa tu correo y contraseña.");
      return;
    }

    const loggedUser = data?.user;

    if (!loggedUser) {
      router.push("/");
      return;
    }

    const isLocal = await isLocalOwner(loggedUser.id);

    if (isLocal) {
      router.push("/dashboard");
      return;
    }

    if (loggedUser.user_metadata?.role === "local") {
      router.push("/register/local");
      return;
    }

    router.push("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#fffafd_0%,#ffffff_45%,#fdf4ff_100%)] px-4 py-10 text-dreva-text sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[#fffafd] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/backgrounds/login-dreva.png)" }}
      />

      <div className="relative z-10 w-full max-w-[520px] rounded-[20px] border border-[#ffd8e6] bg-white px-6 py-8 shadow-[0_18px_60px_rgba(255,92,168,0.1)] sm:px-10 sm:py-9">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.55em] text-[#d16a97]">
            DREVA
          </p>

          <h1 className="mt-5 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[#211d26] sm:text-[36px]">
            Bienvenida otra vez
          </h1>

          <p className="mt-2.5 text-[15px] leading-6 text-dreva-text-muted">
            Inicia sesión para guardar vestidos y gestionar tus reservas.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <label htmlFor="login-email" className="sr-only">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#d16a97]"
              strokeWidth={2}
            />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="Correo electrónico"
              className="w-full rounded-[16px] border border-[#f3c7d6] bg-white py-4 pl-11 pr-4 text-[15px] text-dreva-text outline-none transition placeholder:text-[#b3a9b0] focus:border-[#d16a97] focus:ring-4 focus:ring-[#ffe7f0]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label htmlFor="login-password" className="sr-only">
            Contraseña
          </label>
          <div className="relative">
            <Lock
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#d16a97]"
              strokeWidth={2}
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Contraseña"
              className="w-full rounded-[16px] border border-[#f3c7d6] bg-white py-4 pl-11 pr-12 text-[15px] text-dreva-text outline-none transition placeholder:text-[#b3a9b0] focus:border-[#d16a97] focus:ring-4 focus:ring-[#ffe7f0]"
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

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-[16px] bg-[#c18098] px-6 py-4 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(193,128,152,0.25)] transition hover:bg-[#a96c83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-7 text-center text-[15px] text-dreva-text-muted">
          ¿Aún no tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#c22a68] transition hover:text-dreva-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/40"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
