// apps/web/src/shared/data/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

function parseDocumentCookies(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const out: Record<string, string> = {};
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = decodeURIComponent(p.slice(0, eq).trim());
    const value = decodeURIComponent(p.slice(eq + 1));
    out[name] = value;
  }
  return out;
}

function cookieString(name: string, value: string, options?: CookieOptions) {
  const opts = options ?? {};
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  const path = opts.path ?? "/";
  str += `; Path=${path}`;

  if (opts.maxAge !== undefined) str += `; Max-Age=${opts.maxAge}`;
  if (opts.expires) str += `; Expires=${opts.expires.toUTCString()}`;
  if (opts.domain) str += `; Domain=${opts.domain}`;
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
  if (opts.secure) str += `; Secure`;

  return str;
}

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _client = createBrowserClient(url, anon, {
    cookies: {
      getAll() {
        const parsed = parseDocumentCookies();
        return Object.entries(parsed).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = cookieString(name, value, options);
        });
      },
    },
  });

  return _client;
}
