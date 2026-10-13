import { supabase } from "@/lib/supabaseClient";

export type LocaleStatus =
  | { ok: true; hasLocale: boolean }
  | { ok: false };

export async function getLocaleStatus(userId: string): Promise<LocaleStatus> {
  try {
    const { data, error } = await supabase
      .from("locales")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) return { ok: false };

    return { ok: true, hasLocale: Boolean(data) };
  } catch {
    return { ok: false };
  }
}

export async function isLocalOwner(userId: string): Promise<boolean> {
  const status = await getLocaleStatus(userId);
  return status.ok && status.hasLocale;
}