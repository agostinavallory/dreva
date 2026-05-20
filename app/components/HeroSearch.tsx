"use client";

type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export function HeroSearch({ search, setSearch }: Props) {
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-lg sm:flex-row">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="text"
        placeholder="Buscar vestidos, colores, eventos..."
        className="flex-1 rounded-xl border px-5 py-4 text-sm outline-none"
      />
    </div>
  );
}