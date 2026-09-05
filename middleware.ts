import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { supabaseUrl, supabaseKey, AUTH_TOKEN_COOKIE } from "./lib/supabaseConfig";

const ALLOWED_ROLES = ["local", "admin"];

type SupabaseUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
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

function resolveRole(user: SupabaseUser | null): string | undefined {
  if (!user) {
    return undefined;
  }

  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;

  if (typeof appRole === "string" && appRole.length > 0) {
    return appRole;
  }

  if (typeof userRole === "string" && userRole.length > 0) {
    return userRole;
  }

  return undefined;
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

  const role = resolveRole(user);

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
