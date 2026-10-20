"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export function ProfileNavbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--dreva-color-border)] bg-white/80 backdrop-blur">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,240,246,0.65) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(255,240,246,0.65) 100%)",
          }}
        />
        <svg
          className="absolute left-0 top-0 h-full w-[120px] sm:w-[160px]"
          viewBox="0 0 160 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 0h132c-14 8-16 24-34 34-22 12-24 32-46 42-18 8-28 24-44 30-4 2-6 4-8 6V0Z"
            fill="#FFF0F6"
          />
          <path
            d="M0 0h98c-10 10-12 22-28 31-18 10-20 27-38 36-12 6-20 17-32 23V0Z"
            fill="#FBE3EF"
            opacity="0.9"
          />
          <path
            d="M0 54c20 6 26 20 46 28-12 8-28 16-46 22V54Z"
            fill="#FF5CA8"
            opacity="0.06"
          />
        </svg>
        <svg
          className="absolute right-0 top-0 h-full w-[150px] sm:w-[200px]"
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <ellipse cx="168" cy="-8" rx="88" ry="64" fill="#FFF0F6" />
          <ellipse
            cx="200"
            cy="40"
            rx="96"
            ry="82"
            fill="#FBE3EF"
            opacity="0.85"
          />
          <ellipse
            cx="150"
            cy="104"
            rx="92"
            ry="74"
            fill="#FBE3EF"
            opacity="0.6"
          />
          <ellipse
            cx="206"
            cy="14"
            rx="74"
            ry="56"
            fill="#FF5CA8"
            opacity="0.05"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-10 sm:py-6 lg:w-[88%] lg:px-0">
        <Link
          href="/"
          className="flex items-center"
          aria-label="DREVA — Inicio"
        >
          <Image
            src="/brand/dreva-logo.png"
            alt="DREVA"
            width={2172}
            height={724}
            priority
            className="h-auto w-[190px] shrink-0 -my-[16px] sm:w-[210px] sm:-my-[18px]"
          />
        </Link>

        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#f3c7d6] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--dreva-color-action)] shadow-dreva-xs backdrop-blur transition hover:border-[var(--dreva-color-brand)] hover:bg-[var(--dreva-color-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dreva-color-focus)]/40 sm:px-6 sm:py-3 sm:text-base"
        >
          <ArrowLeft
            className="h-5 w-5 shrink-0 text-[var(--dreva-color-brand)]"
            strokeWidth={2}
          />
          Volver al catálogo
        </Link>
      </div>
    </nav>
  );
}
