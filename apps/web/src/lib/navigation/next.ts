// apps/web/src/lib/navigation/next.ts

// Where you want users to land when "next" is missing or invalid.
const FALLBACK = "/";

// Allowlist of valid destinations in *this* app.
// Keep this list tight; add more routes as needed.
const ALLOWED_NEXT_PREFIXES = [
  "/",              // landing
  "/home",
  "/roster",
  "/admin",
  "/onboard",
  "/access",
  "/auth/set-password",
] as const;

// Disallow redirecting back into auth machinery / doors.
// (We allow /auth/set-password above explicitly.)
const DISALLOWED_EXACT = new Set<string>(["/auth/callback", "/auth/signout"]);
const DISALLOWED_PREFIXES = ["/login"] as const;

function isAllowed(pathname: string) {
  return ALLOWED_NEXT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isDisallowed(pathname: string) {
  if (DISALLOWED_EXACT.has(pathname)) return true;
  return DISALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function normalizeNext(input: string | null): string {
  const raw = (input ?? FALLBACK).trim() || FALLBACK;

  // Must be an internal absolute path; block protocol-relative ("//...") too.
  if (!raw.startsWith("/") || raw.startsWith("//")) return FALLBACK;

  // Strip query/hash; keep redirects simple and avoid pathname weirdness.
  const pathname = raw.split("?")[0].split("#")[0];

  // Prevent loops / auth machinery
  if (isDisallowed(pathname)) return FALLBACK;

  // Prevent nonsense routes (like /that-page) from becoming the post-login destination
  if (!isAllowed(pathname)) return FALLBACK;

  // If you want to preserve query params for valid routes, change this to return `raw`.
  return pathname;
}
