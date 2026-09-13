import { supabase } from "@/lib/supabaseClient";

export async function isLocalOwner(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("locales")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data);
  } catch {
    return false;
  }
}