"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarX2,
  Home,
  Settings,
  Shirt,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/vestidos", label: "Mis vestidos", icon: Shirt },
  { href: "/dashboard/reservas", label: "Reservas", icon: CalendarX2 },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-[#eadfe5] pb-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              active
                ? "bg-[#ffe7f0] text-[#ff2f78]"
                : "text-[#302b33] hover:bg-white hover:text-[#ff2f78]"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}