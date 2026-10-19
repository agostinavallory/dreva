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
        className="h-[52px] w-full rounded-dreva-control border border-dreva-border bg-dreva-surface px-14 text-base font-medium text-dreva-text shadow-dreva-sm outline-none transition placeholder:text-dreva-text-muted focus:border-dreva-focus focus:ring-2 focus:ring-dreva-focus/25 sm:h-[88px] sm:px-20 sm:text-xl"
      />
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-dreva-text-muted transition hover:bg-dreva-soft hover:text-dreva-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreva-focus/30 sm:right-7"
      >
        <SlidersIcon />
      </button>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-dreva-text-muted sm:left-8 sm:h-7 sm:w-7"
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
