import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase'; // adjust if needed

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!anon) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');

const SUPABASE_URL: string = url;
const SUPABASE_ANON_KEY: string = anon;

/**
 * Repo contract:
 * - login/page.tsx does: const supabase = supabaseBrowser();
 * - Typed with Database schema
 */
export function supabaseBrowser(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function supabase(): SupabaseClient<Database> {
  return supabaseBrowser();
}

export const getSupabaseBrowser = supabaseBrowser;
