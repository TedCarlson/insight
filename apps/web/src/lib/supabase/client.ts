// apps/web/src/lib/supabase/client.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!anon) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY");

// ✅ TS now knows these are strings
const SUPABASE_URL: string = url;
const SUPABASE_ANON_KEY: string = anon;

/**
 * Repo contract:
 * - login/page.tsx does: const supabase = supabaseBrowser();
 * So supabaseBrowser MUST be a function that returns a client.
 */
export function supabaseBrowser(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function supabase(): SupabaseClient {
  return supabaseBrowser();
}

export const getSupabaseBrowser = supabaseBrowser;
