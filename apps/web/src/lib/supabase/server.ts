// apps/web/src/lib/supabase/server.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!anon) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

const SUPABASE_URL: string = url;
const SUPABASE_ANON_KEY: string = anon;

/**
 * Next 16.x:
 * - cookies() is async (returns Promise<ReadonlyRequestCookies>)
 * - ReadonlyRequestCookies cannot be mutated (.set not available)
 * - cookie mutation is disallowed during Server Component render anyway
 *
 * Therefore:
 * - getAll = read cookies for request context
 * - setAll = NO-OP (prevents runtime crash)
 * - auth persistence/refresh disabled (prevents internal cookie churn)
 */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        // ReadonlyRequestCookies supports getAll()
        return cookieStore.getAll();
      },
      setAll() {
        // NO-OP by design (render-safe)
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
