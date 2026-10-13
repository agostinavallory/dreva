import Image from "next/image";
import type { ReactNode } from "react";

import { supabaseUrl } from "@/lib/supabaseConfig";

const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/";

type ClassifiedSource =
  | { kind: "fallback" }
  | { kind: "storage"; url: string }
  | { kind: "external"; url: string };

function classifySource(src: string | null | undefined): ClassifiedSource {
  const value = typeof src === "string" ? src.trim() : "";

  if (!value) {
    return { kind: "fallback" };
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return { kind: "fallback" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { kind: "fallback" };
  }

  try {
    const storageOrigin = new URL(supabaseUrl).origin;

    if (
      parsed.origin === storageOrigin &&
      parsed.pathname.startsWith(STORAGE_PUBLIC_PATH)
    ) {
      return { kind: "storage", url: value };
    }
  } catch {
    return { kind: "external", url: value };
  }

  return { kind: "external", url: value };
}

const defaultFallback = (
  <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#9a949b]">
    Sin imagen
  </div>
);

export type DressImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  fallback?: ReactNode;
};

export function DressImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fill = false,
  width,
  height,
  fallback,
}: DressImageProps) {
  const classified = classifySource(src);

  if (classified.kind === "fallback") {
    return <>{fallback ?? defaultFallback}</>;
  }

  if (classified.kind === "storage") {
    return fill ? (
      <Image
        src={classified.url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
      />
    ) : (
      <Image
        src={classified.url}
        alt={alt}
        width={width ?? 0}
        height={height ?? 0}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  const externalClassName = fill
    ? ["absolute inset-0 h-full w-full", className].filter(Boolean).join(" ")
    : className;

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={classified.url} alt={alt} className={externalClassName} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={classified.url}
      alt={alt}
      width={width}
      height={height}
      className={externalClassName}
    />
  );
}
