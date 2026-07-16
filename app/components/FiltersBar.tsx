export type FilterType = "color" | "size" | "length" | "price";

type PriceFilter = {
  label: string;
  value: number;
};

type Props = {
  colors: string[];
  sizes: string[];
  lengthOptions: string[];
  priceOptions: PriceFilter[];
  selectedColor: string | null;
  selectedSize: string | null;
  selectedLength: string | null;
  selectedPrice: PriceFilter | null;
  onOpenFilter: (filter: FilterType) => void;
};

const filters: Array<{
  type: FilterType;
  label: string;
  icon: "palette" | "dress" | "ruler" | "tag";
}> = [
  { type: "color", label: "Color", icon: "palette" },
  { type: "length", label: "Largo", icon: "dress" },
  { type: "size", label: "Talla", icon: "ruler" },
  { type: "price", label: "Precio", icon: "tag" },
];

export function FiltersBar({
  selectedColor,
  selectedSize,
  selectedLength,
  selectedPrice,
  onOpenFilter,
}: Props) {
  function getLabel(filter: FilterType) {
    if (filter === "color") return selectedColor ?? "Color";
    if (filter === "size") return selectedSize ? `Talla ${selectedSize}` : "Talla";
    if (filter === "length") return selectedLength ?? "Largo";
    if (filter === "price") return selectedPrice?.label ?? "Precio";
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
      {filters.map((filter) => (
        <button
          key={filter.type}
          type="button"
          onClick={() => onOpenFilter(filter.type)}
          className="flex min-h-16 items-center justify-center gap-3 rounded-[1.4rem] border border-[#e8e2e6] bg-white px-4 py-3 text-sm font-bold text-[#29252b] shadow-[0_10px_30px_rgba(38,31,35,0.04)] transition hover:border-[#ff9dbd] hover:shadow-[0_14px_35px_rgba(255,47,120,0.08)] sm:text-base"
        >
          <FilterIcon name={filter.icon} />
          <span className="truncate">{getLabel(filter.type)}</span>
          <ChevronDownIcon />
        </button>
      ))}
    </div>
  );
}

function FilterIcon({ name }: { name: "palette" | "dress" | "ruler" | "tag" }) {
  if (name === "palette") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 4a8 8 0 0 0-8 8.3C4.1 16.8 7.7 20 12.1 20h1.2a2 2 0 0 0 1.4-3.4 1.2 1.2 0 0 1 .8-2.1H17a3 3 0 0 0 3-3.2C19.8 7.2 16.3 4 12 4Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M8.2 11h.1M10.2 8h.1M14 8.2h.1M16 11.2h.1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  if (name === "dress") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 4h6l-1 4 3.5 10.5A1.1 1.1 0 0 1 16.5 20h-9A1.1 1.1 0 0 1 6.5 18.5L10 8 9 4Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M9.5 4 12 8l2.5-4M8.2 13h7.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (name === "ruler") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 15.5 15.5 4 20 8.5 8.5 20 4 15.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="m8 15 1.5 1.5M10.5 12.5l1.5 1.5M13 10l1.5 1.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4.5 12.5 12 20l8-8V4h-8l-7.5 8.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M16 8h.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="ml-auto h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
