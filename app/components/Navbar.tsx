import { AuthButton } from "./AuthButton";
export function Navbar() {
  return (
      
    <nav className="flex items-center justify-between px-10 py-5 bg-white/70 backdrop-blur sticky top-0 z-50" >
      
     {/* LOGO */}
      <h1 className="text-xl font-semibold tracking-wide text-[var(--primary)]">
        DREVA
      </h1>

      {/* ACTIONS */}
     <div className="flex items-center gap-4">
  <AuthButton />

  <a
    href="/favorites"
    className="text-sm font-medium text-gray-600 hover:text-black"
  >
    Favoritos
  </a>
  <a
  href="/profile"
  className="text-sm font-medium text-gray-600 hover:text-black"
>
  Perfil
</a>
</div>

    </nav>
  );
}
