import { Dress } from "@/app/page";
import { DressCard } from "./DressCard";

type Props = {
  categories: string[];
  sizes: string[];
  colors: string[];

  selectedCategory: string | null;
  selectedSize: string | null;
  selectedColor: string | null;

  setSelectedCategory: (value: string | null) => void;
  setSelectedSize: (value: string | null) => void;
  setSelectedColor: (value: string | null) => void;
};
export function FiltersBar({
  categories,
  sizes,
  colors,
  selectedCategory,
  selectedSize,
  selectedColor,
  setSelectedCategory,
  setSelectedSize,
  setSelectedColor,
}: Props) {
 

  

  return (
    <div className="mb-10 bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
    Categoría
    </p>
      {/* CATEGORÍAS */}
      <div className="flex gap-3 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setSelectedCategory(cat === selectedCategory ? null : cat)
            }
            className={`px-4 py-2 rounded-full border text-sm transition ${
              selectedCategory === cat
                ? "bg-[var(--primary)] text-white"
                : "bg-white border-pink-100 hover:bg-pink-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    
      <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
        Talla
      </p>

  <div className="flex gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() =>
              setSelectedSize(size === selectedSize ? null : size)
            }
            className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm ${
              selectedSize === size
                ? "bg-[var(--primary)] text-white"
                : "border-pink-100 hover:bg-pink-50"
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
      <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
        Color
      </p>
      {/* COLORES */}
      <div className="flex gap-3">
        {colors.map((color) => (
          <div
            key={color}
            onClick={() =>
              setSelectedColor(color === selectedColor ? null : color)
            }
            className={`w-6 h-6 rounded-full cursor-pointer border ${
              selectedColor === color
                ? "ring-2 ring-[var(--primary)]"
                : ""
            }`}
            style={{ backgroundColor: color.toLowerCase() }}
          />
        ))}
      </div>

      
    </div>
  );
}