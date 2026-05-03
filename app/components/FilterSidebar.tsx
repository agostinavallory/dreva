import { Button } from '@/app/components/Button';

type FilterSidebarProps = {
  categories: string[];
  sizes: string[];
  colors: string[];
};

const defaultCategories = ['XV anos', 'Bodas', 'Fiestas', 'Graduaciones'];
const defaultSizes = ['XS', 'S', 'M', 'L', 'XL'];
const colorMap: Record<string, string> = {
  Rosa: 'bg-[#FF5CA8]',
  Verde: 'bg-[#2FA84F]',
  Azul: 'bg-[#6D83F2]',
  Negro: 'bg-[#1A1A20]',
  Champagne: 'bg-[#F1D3B3]',
  Rojo: 'bg-[#E53E3E]',
  Lila: 'bg-[#D8B4FE]',
};

export function FilterSidebar({
  categories,
  colors,
  sizes,
}: FilterSidebarProps) {
  const categoryOptions = categories.length ? categories : defaultCategories;
  const sizeOptions = sizes.length ? sizes : defaultSizes;
  const colorOptions = colors.length ? colors : ['Rosa', 'Lila', 'Azul', 'Verde', 'Negro'];

  return (
    <aside className="h-fit rounded-3xl border border-pink-100 bg-white p-5 shadow-[0_20px_60px_rgba(255,92,168,0.10)] lg:sticky lg:top-28">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            Explorar
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink)]">
            Filtros
          </h2>
        </div>
        <button className="text-xs font-semibold text-[var(--primary)]">
          Limpiar
        </button>
      </div>

      <FilterGroup title="Categoria">
        <div className="grid grid-cols-2 gap-2">
          {categoryOptions.map((category, index) => (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 rounded-2xl border border-pink-100 px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-pink-200 hover:bg-pink-50"
            >
              <input
                className="accent-[var(--primary)]"
                defaultChecked={index === 0}
                type="checkbox"
              />
              {category}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Talla">
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((size, index) => (
            <button
              key={size}
              className={`h-10 min-w-10 rounded-full border px-3 text-sm font-semibold transition ${
                index === 0
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-pink-100'
                  : 'border-pink-100 text-[var(--ink)] hover:border-pink-200 hover:bg-pink-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className="flex flex-wrap gap-3">
          {colorOptions.map((color) => (
            <button
              key={color}
              className="group flex flex-col items-center gap-2 text-[11px] font-medium text-[var(--muted)]"
              title={color}
            >
              <span
                className={`h-9 w-9 rounded-full border-4 border-white shadow-md ring-1 ring-pink-100 transition group-hover:scale-110 ${
                  colorMap[color] ?? 'bg-gradient-to-br from-pink-300 to-purple-300'
                }`}
              />
              {color}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Precio">
        <div>
          <div className="h-1.5 rounded-full bg-pink-100">
            <div className="h-1.5 w-3/4 rounded-full bg-[var(--primary)]" />
          </div>
          <div className="mt-3 flex justify-between text-xs font-medium text-[var(--muted)]">
            <span>Gs. 0</span>
            <span>Gs. 1.000.000+</span>
          </div>
        </div>
      </FilterGroup>

      <Button className="mt-2 w-full py-3">
        Aplicar filtros
      </Button>
    </aside>
  );
}

function FilterGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mb-6 border-b border-pink-50 pb-6 last:border-b-0">
      <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">{title}</h3>
      {children}
    </section>
  );
}
