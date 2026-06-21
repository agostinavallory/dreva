"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNav() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      pathname === href
        ? "bg-black text-white"
        : "hover:bg-gray-100"
    }`;

  return (
    <nav className="mb-6 flex gap-3 border-b pb-4">
      <Link href="/dashboard" className={linkClass("/dashboard")}>
        Dashboard
      </Link>

      <Link
        href="/dashboard/vestidos"
        className={linkClass("/dashboard/vestidos")}
      >
        Mis Vestidos
      </Link>

      <Link
        href="/dashboard/configuracion"
        className={linkClass("/dashboard/configuracion")}
      >
        Configuración
      </Link>
    </nav>
  );
}