import { supabase } from "@/lib/supabaseClient";

export const VESTIDO_IMAGE_BUCKET = "vestidos";
export const MAX_VESTIDO_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_VESTIDO_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AllowedVestidoImageType = (typeof ALLOWED_VESTIDO_IMAGE_TYPES)[number];

export type VestidoImageValidationError = "type" | "size";

const EXTENSION_BY_MIME: Record<AllowedVestidoImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateVestidoImage(
  file: File,
): VestidoImageValidationError | null {
  if (
    !ALLOWED_VESTIDO_IMAGE_TYPES.includes(file.type as AllowedVestidoImageType)
  ) {
    return "type";
  }

  if (file.size > MAX_VESTIDO_IMAGE_BYTES) {
    return "size";
  }

  return null;
}

function buildObjectPath(userId: string, file: File): string {
  const extension =
    EXTENSION_BY_MIME[file.type as AllowedVestidoImageType] ?? "jpg";

  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadVestidoImage(
  file: File,
  userId: string,
): Promise<{ path: string; publicUrl: string }> {
  const path = buildObjectPath(userId, file);

  const { error } = await supabase.storage
    .from(VESTIDO_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(VESTIDO_IMAGE_BUCKET)
    .getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

export async function deleteVestidoImage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(VESTIDO_IMAGE_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }
}
