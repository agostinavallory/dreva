import { supabase } from "@/lib/supabaseClient";
import { supabaseUrl } from "@/lib/supabaseConfig";

export const VESTIDO_IMAGE_BUCKET = "vestidos";
export const MAX_VESTIDO_IMAGE_BYTES = 5 * 1024 * 1024;

const VESTIDO_PUBLIC_URL_PREFIX =
  `${supabaseUrl}/storage/v1/object/public/${VESTIDO_IMAGE_BUCKET}/`;

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

export function getOwnedVestidoImagePath(
  url: string | null | undefined,
  userId: string,
): string | null {
  if (!url || !userId) {
    return null;
  }

  if (!url.startsWith(VESTIDO_PUBLIC_URL_PREFIX)) {
    return null;
  }

  const withoutQuery = url
    .slice(VESTIDO_PUBLIC_URL_PREFIX.length)
    .split(/[?#]/)[0];

  let objectPath: string;

  try {
    objectPath = decodeURIComponent(withoutQuery);
  } catch {
    return null;
  }

  if (!objectPath || objectPath.includes("..")) {
    return null;
  }

  const [ownerFolder] = objectPath.split("/");

  if (ownerFolder !== userId) {
    return null;
  }

  return objectPath;
}

export async function deleteOwnedVestidoImageByUrl(
  url: string | null | undefined,
  userId: string,
): Promise<boolean> {
  const path = getOwnedVestidoImagePath(url, userId);

  if (!path) {
    return false;
  }

  await deleteVestidoImage(path);

  return true;
}
