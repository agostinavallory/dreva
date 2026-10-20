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
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ProfileNavbar } from "@/app/components/ProfileNavbar";
import { useAuth } from "@/app/providers/AuthProvider";
import { isLocalOwner } from "@/app/hooks/useIsLocalOwner";
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
  const { user, loading: authLoading, signOut } = useAuth();
  const [loadedProfile, setLoadedProfile] = useState<LoadedProfile | null>(null);
  const [isLocal, setIsLocal] = useState<boolean | null>(null);
  const email = user?.email;
  const profile =
    loadedProfile && loadedProfile.userId === user?.id
      ? loadedProfile.profile
      : null;
  const profileName = getFullName(profile, email);
  const profileInitials = getInitials(profile, email);
  const showsEmailAsTitle = profileName === email;
  const showsDashboard = !authLoading && Boolean(user) && isLocal === true;

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

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      return;
    }

    isLocalOwner(user.id).then((result) => {
      if (!cancelled) {
        setIsLocal(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--dreva-color-background)] px-6 py-10 text-[var(--dreva-color-text)]">
        <div className="mx-auto max-w-md">
          <p className="rounded-dreva-card border border-[var(--dreva-color-border)] bg-white px-5 py-4 text-sm font-semibold text-[var(--dreva-color-text-muted)] shadow-dreva-sm">
            Cargando perfil...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--dreva-color-background)] px-6 py-10 text-[var(--dreva-color-text)]">
        <div className="mx-auto max-w-md rounded-dreva-dialog border border-[var(--dreva-color-border)] bg-white px-6 py-8 text-center shadow-dreva-md">
          <p className="text-lg font-bold">No has iniciado sesion.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-[var(--dreva-color-action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--dreva-color-action-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/40"
          >
            Iniciar sesion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-[var(--dreva-color-background)] text-[var(--dreva-color-text)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[300px] overflow-hidden"
      >
        <svg
          className="absolute inset-x-0 bottom-0 h-full w-full"
          viewBox="0 0 1440 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 300V186c148-40 268-6 402 32 150 42 268 60 420 18 168-46 300-96 618-52v116H0Z"
            fill="#fff0f6"
          />
          <path
            d="M0 300v-84c190-44 320 6 470 40 168 38 300 42 452 2 176-46 316-88 518-52v94H0Z"
            fill="#fbe3ef"
            opacity="0.85"
          />
          <path
            d="M0 300v-44c240-34 380 20 560 36 190 18 340-20 520-40 150-16 260-10 360 4v44H0Z"
            fill="#ff5ca8"
            opacity="0.07"
          />
        </svg>
      </div>

      <div className="relative z-10">
        <ProfileNavbar />

        <section className="mx-auto w-full max-w-[1280px] px-5 pb-10 pt-6 sm:px-8 lg:w-[88%] lg:px-0 lg:pt-7">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-10">
            <div className="flex flex-col gap-5">
              <section className="rounded-[20px] border border-[var(--dreva-color-border)] bg-white px-6 py-6 shadow-dreva-sm sm:min-h-[180px] sm:px-7 sm:py-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--dreva-color-soft)] text-2xl font-bold leading-none text-[var(--dreva-color-action)] sm:h-[100px] sm:w-[100px] sm:text-3xl">
                    {profileInitials}
                  </span>

                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold leading-tight text-[#211d26] sm:text-[28px]">
                      {profileName}
                    </h1>
                    {email && !showsEmailAsTitle && (
                      <p className="mt-1.5 truncate text-sm font-medium text-[#635b66]">
                        {email}
                      </p>
                    )}
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#635b66]">
                      Bienvenida a DREVA. Tu proximo evento comienza aqui.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-[#ffd8e6] bg-[var(--dreva-color-soft)] px-6 py-6 shadow-dreva-xs sm:min-h-[165px] sm:px-7 sm:py-7">
                <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[var(--dreva-color-brand)]">
                    <BadgeCheck className="h-6 w-6" strokeWidth={2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] font-semibold leading-tight text-[var(--dreva-color-action)]">
                      Puntos DREVA
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#211d26]">
                      Estamos preparando un programa de beneficios para la
                      comunidad DREVA. Pronto compartiremos más detalles.
                    </p>
                  </div>

                  <span className="inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border border-[var(--dreva-color-brand)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--dreva-color-action)] sm:mt-1">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                    Próximamente
                  </span>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6">
              <section>
                <h2 className="mb-4 text-xl font-bold text-[#211d26]">
                  Mis accesos
                </h2>

                <div className="flex flex-col gap-4">
                  <QuickAccessCard
                    href="/favorites"
                    icon={<Heart className="h-6 w-6" strokeWidth={2} />}
                    title="Favoritos"
                    description="Tus vestidos guardados"
                  />

                  <QuickAccessCard
                    href="/my-reservations"
                    icon={
                      <CalendarCheck className="h-6 w-6" strokeWidth={2} />
                    }
                    title="Mis Reservas"
                    description="Tus solicitudes"
                  />

                  {showsDashboard && (
                    <QuickAccessCard
                      href="/dashboard"
                      icon={
                        <LayoutDashboard className="h-6 w-6" strokeWidth={2} />
                      }
                      title="Dashboard"
                      description="Gestión de tu local"
                    />
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="mt-7 border-t border-[var(--dreva-color-border)] pt-6 pb-24 lg:pb-8">
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2.5 rounded-full border border-[var(--dreva-color-brand)] bg-white px-6 py-2.5 text-base font-semibold text-[var(--dreva-color-action)] shadow-dreva-xs transition hover:bg-[var(--dreva-color-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/40"
            >
              <LogOut
                className="h-5 w-5 text-[var(--dreva-color-brand)]"
                strokeWidth={2}
              />
              Cerrar sesión
            </button>
          </div>
        </section>
      </div>

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
      className="group flex items-center gap-4 rounded-dreva-card border border-[var(--dreva-color-border)] bg-white px-5 py-5 shadow-dreva-sm transition hover:border-[#f3c7d6] hover:shadow-dreva-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/30 sm:min-h-[98px] sm:px-6"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--dreva-color-soft)] text-[var(--dreva-color-brand)] sm:h-[56px] sm:w-[56px]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold text-[#211d26]">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium text-[#635b66]">
          {description}
        </span>
      </span>
      <ChevronRight
        className="h-6 w-6 shrink-0 text-[var(--dreva-color-brand)] transition group-hover:translate-x-0.5"
        strokeWidth={2}
      />
    </Link>
  );
}

function BottomProfileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--dreva-color-border)] bg-white/95 px-5 py-3 shadow-[0_-18px_45px_rgba(38,31,36,0.08)] backdrop-blur sm:px-8 lg:hidden">
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
        active ? "text-[var(--dreva-color-action)]" : "text-[#676169]"
      } [&_svg]:h-7 [&_svg]:w-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/30`}
    >
      {active && (
        <span className="absolute -top-3 h-1 w-10 rounded-full bg-[var(--dreva-color-brand)]" />
      )}
      {icon}
      <span>{label}</span>
    </Link>
  );
}
