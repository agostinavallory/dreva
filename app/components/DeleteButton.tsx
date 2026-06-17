"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function DeleteButton({ id }: { id: string | number }) {
  const router = useRouter();

  const handleDelete = async () => {
    const confirm = window.confirm("¿Eliminar este vestido?");
    if (!confirm) return;

    const { error } = await supabase
      .from("vestidos")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error al eliminar");
      return;
    }

    router.refresh();
  };

  return (
    <button onClick={handleDelete} className="text-sm text-red-500">
      Eliminar
    </button>
  );
}