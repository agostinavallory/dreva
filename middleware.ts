import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { supabaseUrl, supabaseKey, AUTH_TOKEN_COOKIE } from "./lib/supabaseConfig";

type SupabaseUser = {
  id: string;
};

async function fetchSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SupabaseUser;
  } catch {
    return null;
  }
}

async function isLocalOwner(accessToken: string, ownerId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/locales?select=id&owner_id=eq.${ownerId}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const rows = (await response.json()) as { id: string }[];

    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = await fetchSupabaseUser(accessToken);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const ownsLocal = await isLocalOwner(accessToken, user.id);

  if (!ownsLocal) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
