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
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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
            className={`px-3 py-1 rounded-full text-sm transition ${
  selectedCategory === cat
    ? "bg-[#171717] text-white"
    : "text-[#6B6B6B] hover:text-[#171717]"
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
           className={`px-3 py-1 rounded-full text-xs transition ${
  selectedSize === size
    ? "bg-[#171717] text-white"
    : "text-[#6B6B6B] hover:text-[#171717]"
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
          <button
  key={color}
  onClick={() =>
    setSelectedColor(color === selectedColor ? null : color)
  }
  className={`px-3 py-1 rounded-full text-xs border transition ${
    selectedColor === color
      ? "bg-[#171717] text-white border-[#171717]"
      : "text-[#6B6B6B] border-[#E6E0DA] hover:border-[#171717]"
  }`}
>
  {color}
</button>
        ))}
      </div>

      
    </div>
  );
}
