"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
export default function LoginPage() {
    const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  router.push("/");
}
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff1f7_0%,#ffffff_45%,#fdf2ff_100%)] flex items-center justify-center px-6">

      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_20px_80px_rgba(255,92,168,0.12)]">

        <div className="mb-8 text-center">

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--primary)]">
            DREVA
          </p>

          <h1 className="mt-3 text-4xl font-semibold text-[var(--ink)]">
            Bienvenida otra vez
          </h1>

          <p className="mt-3 text-sm text-[var(--muted)]">
            Inicia sesión para guardar vestidos y gestionar tus reservas.
          </p>

        </div>

       <form onSubmit={handleLogin} className="space-y-4">

          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
         />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-pink-100 px-5 py-4 outline-none transition focus:border-[var(--primary)]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--primary)] py-4 text-sm font-semibold text-white transition hover:scale-[1.01]"
          >{loading ? "Entrando..." : "Iniciar sesión"}
        
          </button>

        </form>

      </div>

    </main>
  );
}