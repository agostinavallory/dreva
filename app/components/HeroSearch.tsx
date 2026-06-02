"use client";

import { useState } from "react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export function HeroSearch({ search, setSearch }: Props) {
  const [date, setDate] = useState("");

  return (
    <div className="mt-10 max-w-2xl space-y-4">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border border-[#E6E0DA] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#171717]"
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="text"
        placeholder="Color, estilo o tipo de evento (opcional)"
        className="w-full border border-[#E6E0DA] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#171717]"
      />

      <button className="w-full bg-[#171717] text-white py-3 rounded-xl text-sm font-medium">
        Ver vestidos disponibles
      </button>

    </div>
  );
}
