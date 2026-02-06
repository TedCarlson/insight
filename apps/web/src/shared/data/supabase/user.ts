// apps/web/src/shared/data/supabase/user.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Creates an "anon key" Supabase client but runs requests "as user" when Authorization header is provided.
 * This is used by the RPC gateway so auth.uid() exists inside Postgres RPC calls.
 *
 * IMPORTANT:
 * - This does NOT persist sessions (stateless)
 * - This is safe to use in route handlers
 */
export function supabaseUserClient(opts?: { authorization?: string | null; headers?: Record<string, string> }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const gatewayHeaders: Record<string, string> = {
    "x-rpc-gateway": "1",
    ...(opts?.headers ?? {}),
  };

  const auth = (opts?.authorization ?? "").trim();
  if (auth) gatewayHeaders["Authorization"] = auth;

  return createClient(url, anon, {
    global: { headers: gatewayHeaders },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}