type Props = {
  categories: string[];
  sizes: string[];
  colors: string[];
};

export function FilterSidebar({ categories, sizes, colors }: Props) {
  return (
    <aside className="space-y-6">

      {/* TÍTULO */}
      <div>
        <p className="text-xs font-semibold tracking-[0.3em] text-[var(--primary)] uppercase">
          Filtros
        </p>
      </div>

      {/* CATEGORÍAS */}
      <div>
        <p className="text-sm font-medium mb-2 text-[var(--ink)]">
          Categoría
        </p>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              className="px-3 py-1.5 rounded-full bg-white border border-pink-100 text-sm hover:bg-pink-50 transition"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* TALLAS */}
      <div>
        <p className="text-sm font-medium mb-2 text-[var(--ink)]">
          Talla
        </p>

        <div className="flex gap-2 flex-wrap">
          {sizes.map((size) => (
            <button
              key={size}
              className="w-10 h-10 rounded-full border border-pink-100 flex items-center justify-center text-sm hover:bg-pink-50 transition"
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* COLORES */}
      <div>
        <p className="text-sm font-medium mb-2 text-[var(--ink)]">
          Color
        </p>

        <div className="flex gap-3 flex-wrap">
          {colors.map((color) => (
            <div
              key={color}
              className="w-6 h-6 rounded-full border border-gray-200"
              style={{ backgroundColor: color.toLowerCase() }}
            />
          ))}
        </div>
      </div>

    </aside>
  );
}
