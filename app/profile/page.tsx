"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Heart,
  Home,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Navbar } from "@/app/components/Navbar";
import { useAuth } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  nombre: string | null;
  apellido: string | null;
};

type LoadedProfile = {
  userId: string;
  profile: Profile | null;
};

function getNameParts(profile: Profile | null) {
  return [profile?.nombre, profile?.apellido].flatMap((part) => {
    const trimmedPart = part?.trim();

    return trimmedPart ? [trimmedPart] : [];
  });
}

function getFullName(profile: Profile | null, email?: string) {
  const nameParts = getNameParts(profile);

  if (nameParts.length > 0) {
    return nameParts.join(" ");
  }

  return email ?? "Tu perfil DREVA";
}

function getInitials(profile: Profile | null, email?: string) {
  const nameParts = getNameParts(profile);

  if (nameParts.length > 0) {
    return nameParts
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  return (email?.trim().charAt(0) || "D").toUpperCase();
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [loadedProfile, setLoadedProfile] = useState<LoadedProfile | null>(null);
  const email = user?.email;
  const profile =
    loadedProfile && loadedProfile.userId === user?.id
      ? loadedProfile.profile
      : null;
  const profileName = getFullName(profile, email);
  const profileInitials = getInitials(profile, email);
  const showsEmailAsTitle = profileName === email;

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, apellido")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        setLoadedProfile({ userId, profile: null });
        return;
      }

      setLoadedProfile({ userId, profile: data });
    }

    if (!user?.id) {
      return;
    }

    loadProfile(user.id);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--dark)]">
        <div className="mx-auto max-w-md">
          <p className="rounded-[1.5rem] border border-[#f1dfe7] bg-white px-5 py-4 text-sm font-semibold text-[#77727a] shadow-sm">
            Cargando perfil...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--dark)]">
        <div className="mx-auto max-w-md rounded-[1.75rem] border border-[#f1dfe7] bg-white px-6 py-8 text-center shadow-[0_18px_55px_rgba(38,31,36,0.07)]">
          <p className="text-lg font-bold">No has iniciado sesion.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-[#ff2f78] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(255,47,120,0.22)]"
          >
            Iniciar sesion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--dark)]">
      <Navbar />

      <section className="mx-auto w-full max-w-7xl px-5 pb-28 pt-6 sm:px-8 lg:pt-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:gap-8">
          <div className="flex flex-col gap-7">
            <section className="rounded-[1.65rem] border border-[#eee4e9] bg-white px-5 py-7 shadow-[0_18px_55px_rgba(38,31,36,0.08)] sm:px-7 sm:py-8">
              <div className="flex flex-col gap-6 sm:min-h-36 sm:flex-row sm:items-center sm:gap-7">
                <InitialsAvatar initials={profileInitials} />

                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold leading-tight text-[#17151b] sm:text-3xl">
                    {profileName}
                  </h1>
                  {email && !showsEmailAsTitle && (
                    <p className="mt-2 truncate text-sm font-medium text-[#6f6971] sm:text-base">
                      {email}
                    </p>
                  )}
                  <p className="mt-6 max-w-xl text-sm leading-6 text-[#4f4951] sm:text-base">
                    Bienvenida a DREVA. Tu proximo evento comienza aqui.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.65rem] border border-[#ffd8e6] bg-[#fff0f6] px-5 py-7 shadow-[0_18px_55px_rgba(255,47,120,0.10)] sm:px-7 sm:py-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex items-start gap-5 sm:flex-1">
                  <IconBubble icon={<BadgeCheck />} variant="light" />
                  <div>
                    <h2 className="text-xl font-bold text-[#ff2f78]">
                      Cuenta DREVA
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[#4f4951]">
                      Muy pronto podras acumular puntos por cada alquiler y
                      desbloquear beneficios exclusivos.
                    </p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#ff9ac0] bg-white/70 px-5 py-3 text-sm font-bold text-[#ff2f78]">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                  Proximamente
                </span>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-7">
            <section>
              <h2 className="mb-4 text-xl font-bold text-[#252329]">
                Accesos rapidos
              </h2>

              <div className="overflow-hidden rounded-[1.5rem] border border-[#eee4e9] bg-white shadow-[0_18px_55px_rgba(38,31,36,0.07)]">
                <QuickAccessCard
                  href="/favorites"
                  icon={<Heart />}
                  title="Favoritos"
                  description="Tus vestidos guardados"
                />
                <div className="h-px bg-[#eee6eb]" />
                <QuickAccessCard
                  href="/my-reservations"
                  icon={<CalendarCheck />}
                  title="Mis Reservas"
                  description="Consulta tus solicitudes"
                />
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#eee4e9] bg-white px-5 py-5 shadow-[0_18px_55px_rgba(38,31,36,0.07)]">
              <div className="flex items-center gap-5">
                <IconBubble icon={<Settings />} />
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-[#17151b]">
                    Configuracion
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#6f6971]">
                    Cuenta, seguridad y preferencias
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <BottomProfileNav />
    </main>
  );
}

function QuickAccessCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-5 px-5 py-5 transition hover:bg-[#fff7fa]"
    >
      <IconBubble icon={icon} />
      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-bold text-[#17151b]">{title}</h3>
        <p className="mt-1 text-sm font-medium text-[#6f6971]">{description}</p>
      </div>
      <ChevronRight className="h-7 w-7 shrink-0 text-[#ff2f78]" strokeWidth={2} />
    </Link>
  );
}

function InitialsAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#ffe7f0] text-2xl font-bold leading-none text-[#ff2f78] sm:h-28 sm:w-28 sm:text-3xl">
      {initials}
    </div>
  );
}

function IconBubble({
  icon,
  large = false,
  variant = "solid",
}: {
  icon: ReactNode;
  large?: boolean;
  variant?: "solid" | "light";
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-[#ff2f78] ${
        large
          ? "h-24 w-24 sm:h-28 sm:w-28 [&_svg]:h-12 [&_svg]:w-12"
          : "h-16 w-16 [&_svg]:h-8 [&_svg]:w-8"
      } ${
        variant === "light"
          ? "border border-white/80 bg-white/70 shadow-inner"
          : "bg-[#ffe7f0]"
      }`}
    >
      {icon}
    </div>
  );
}

function BottomProfileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eee4e9] bg-white/95 px-5 py-3 shadow-[0_-18px_45px_rgba(38,31,36,0.08)] backdrop-blur sm:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1">
        <BottomNavLink href="/" label="Inicio" icon={<Home />} />
        <BottomNavLink href="/favorites" label="Favoritos" icon={<Heart />} />
        <BottomNavLink
          href="/my-reservations"
          label="Mis reservas"
          icon={<CalendarDays />}
        />
        <BottomNavLink active href="/profile" label="Perfil" icon={<UserRound />} />
      </div>
    </nav>
  );
}

function BottomNavLink({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-xs font-medium ${
        active ? "text-[#ff2f78]" : "text-[#676169]"
      } [&_svg]:h-7 [&_svg]:w-7`}
    >
      {active && (
        <span className="absolute -top-3 h-1 w-10 rounded-full bg-[#ff2f78]" />
      )}
      {icon}
      <span>{label}</span>
    </Link>
  );
}
