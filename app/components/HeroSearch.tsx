"use client";

type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export function HeroSearch({ search, setSearch }: Props) {
  return (
    <div className="relative">
      <SearchIcon />
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        type="text"
        placeholder="Buscar vestido..."
        className="h-[52px] w-full rounded-dreva-control border border-dreva-border bg-dreva-surface pl-14 pr-4 text-base font-medium text-dreva-text shadow-dreva-sm outline-none transition placeholder:text-dreva-text-muted focus:border-dreva-focus focus:ring-2 focus:ring-dreva-focus/25 sm:h-[70px] sm:pl-20 sm:text-xl"
      />
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
