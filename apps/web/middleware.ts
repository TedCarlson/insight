// apps/web/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OWNER_LANDING = "/";
const ACTIVE_LANDING = "/";

/**
 * Public UI routes (no session required).
 */
function isPublicUiPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico"
  );
}

/**
 * Public API routes (no session required).
 * Keep this extremely tight.
 */
function isPublicApiPath(pathname: string) {
  return pathname.startsWith("/api/auth/");
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

/**
 * Allowlist for "next" redirects after login.
 * Keep this tight to avoid redirecting to nonsense/404s.
 */
const ALLOWED_NEXT_PREFIXES = [
  "/",
  "/home",
  "/admin",
  "/org",
  "/access",
  "/roster",
  "/onboard",
  "/route-lock",
  "/metrics",
  "/locate",
] as const;


function isAllowedNextPath(pathname: string) {
  return ALLOWED_NEXT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function safeNextParam(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/")) return "/";
  if (!isAllowedNextPath(pathname)) return "/";
  return pathname + (req.nextUrl.search || "");
}

const DISALLOWED_NEXT_PREFIXES = ["/login", "/access", "/auth"] as const;

function isDisallowedNextPath(pathname: string) {
  return DISALLOWED_NEXT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function safeNextFromQuery(req: NextRequest, fallback: string) {
  const raw = req.nextUrl.searchParams.get("next");
  if (!raw) return fallback;

  // Only internal absolute paths; block protocol-relative
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;

  // Strip query/hash
  const pathname = raw.split("?")[0].split("#")[0];

  // Prevent loops back into auth doors
  if (isDisallowedNextPath(pathname)) return fallback;

  // Prevent nonsense/404 redirects
  if (!isAllowedNextPath(pathname)) return fallback;

  return pathname;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ✅ HARD BLOCK: /dev/kit should never render in non-development environments.
  // This must run BEFORE any auth redirects, so logged-out users also go to "/".
  if (pathname.startsWith("/dev/kit") && process.env.NODE_ENV !== "development") {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Always create a response so Supabase can refresh cookies if needed.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return res;
  }

  // Public paths short-circuit early (still allow /api/auth/* without session)
  if (isPublicUiPath(pathname) || isPublicApiPath(pathname)) {
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
    // API requests should return JSON 401 (not redirect HTML)
    if (isApiPath(pathname)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", safeNextParam(req));
    return NextResponse.redirect(redirectUrl);
  }

  // ---- Signed in ----
  // Don’t let signed-in users linger on login routes.
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
    isOwner = Boolean(data);
  } catch {
    isOwner = false;
  }

  if (!isOwner) {
    // Fetch profile status for gating
    const { data: profile, error: profileErr } = await supabase
      .from("user_profile")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // If profile missing or error, force /access
    if (profileErr || !profile) {
      if (isApiPath(pathname)) {
        return NextResponse.json({ ok: false, error: "forbidden_inactive" }, { status: 403 });
      }

      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/access";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    // Inactive users must go to /access (UI) or get 403 (API)
    if (profile.status !== "active") {
      if (isApiPath(pathname)) {
        return NextResponse.json({ ok: false, error: "forbidden_inactive" }, { status: 403 });
      }

      // Allow /access itself
      if (pathname.startsWith("/access")) return res;

      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/access";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
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
