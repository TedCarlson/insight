// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OWNER_LANDING = "/";
const ACTIVE_LANDING = "/";

/**
 * Public = allowed without session.
 * NOTE: "/" is public so your marketing/landing can exist.
 * If you later want "/" to be protected, remove it here.
 */
function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/access") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico"
  );
}

function safeNextParam(req: NextRequest) {
  // Preserve path + query. Never allow external redirects.
  const full = req.nextUrl.pathname + (req.nextUrl.search || "");
  return full.startsWith("/") ? full : "/";
}

function safeNextFromQuery(req: NextRequest, fallback: string) {
  const n = req.nextUrl.searchParams.get("next");
  if (!n) return fallback;
  // Prevent open redirect
  return n.startsWith("/") ? n : fallback;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Always create a response so Supabase can refresh cookies if needed.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Hard fail is better than silently bypassing auth in prod.
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return res;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  // ---- Not signed in ----
  if (!user) {
    if (isPublicPath(pathname)) return res;

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", safeNextParam(req));
    return NextResponse.redirect(redirectUrl);
  }

  // ---- Signed in ----
  // Don’t let signed-in users hang out on login routes.
  if (pathname.startsWith("/login")) {
    const dest = safeNextFromQuery(req, OWNER_LANDING);
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = dest;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Owner bypass (break-glass)
  let isOwner = false;
  try {
    const { data } = await supabase.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }
  if (isOwner) return res;

  // Gate by user_profile.status
  let status: string | null = null;
  try {
    const { data: profile, error } = await supabase
      .from("user_profile")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!error && profile) status = (profile as { status?: string }).status ?? null;
  } catch {
    status = null;
  }

  const isActive = status === "active";

  // Not active → force /access (but allow public)
  if (!isActive) {
    if (pathname.startsWith("/access")) return res;
    if (isPublicPath(pathname)) return res;

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/access";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Active users don’t need /access anymore.
  if (pathname.startsWith("/access")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = ACTIVE_LANDING;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
