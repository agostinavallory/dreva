"use client";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  onOpenFilters: () => void;
};

export function HeroSearch({ search, setSearch, onOpenFilters }: Props) {
  return (
    <div className="relative">
      <SearchIcon />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        type="text"
        placeholder="Buscar vestido..."
        className="h-[72px] w-full rounded-[1.6rem] border border-[#e5dfe3] bg-white px-16 text-lg font-medium text-[#252329] shadow-[0_14px_45px_rgba(38,31,35,0.05)] outline-none transition placeholder:text-[#9a949b] focus:border-[#ff8bb2] focus:shadow-[0_18px_55px_rgba(255,47,120,0.10)] sm:h-[88px] sm:px-20 sm:text-xl"
      />
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#312d33] transition hover:bg-[#fff2f7] sm:right-7"
      >
        <SlidersIcon />
      </button>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-6 top-1/2 h-7 w-7 -translate-y-1/2 text-[#312d33] sm:left-8"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h5M15 7h5M11 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h5M15 17h5M9 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
