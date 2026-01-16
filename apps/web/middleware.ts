//apps/web/middleware.ts

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const OWNER_LANDING = "/home";
const ACTIVE_LANDING = "/assignment"; // or "/person"

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/access")
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Always create a response so Supabase can refresh cookies if needed.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // If not signed in, only allow public routes.
  if (!user) {
    if (isPublicPath(pathname)) return res;

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Signed-in users shouldn't hang out on the login page.
  if (pathname.startsWith("/login")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/home";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Owner bypass: owners should always be able to access the app.
  // (Lets you keep a private "break-glass" account.)
  let isOwner = false;
  try {
    const { data } = await supabase.rpc("is_owner");
    isOwner = !!data;
  } catch {
    isOwner = false;
  }

  if (isOwner) return res;

  // Check user_profile.status to decide whether they can access the app.
  // user_profile has RLS: user can read only their own row.
  let status: string | null = null;
  try {
    const { data: profile, error } = await supabase
      .from("user_profile")
      .select("status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!error) status = (profile as any)?.status ?? null;
  } catch {
    status = null;
  }

  const isActive = status === "active";

  // If not active, keep them on /access (and allow public routes).
  if (!isActive) {
    if (pathname.startsWith("/access")) return res;
    if (isPublicPath(pathname)) return res;

    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/access";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Active users don't need /access anymore.
  if (pathname.startsWith("/access")) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/home";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
