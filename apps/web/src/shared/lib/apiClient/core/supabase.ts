import type { SupabaseClient } from "@/shared/data/supabase/types";

/** Always run RPCs against the `api` schema (canonical app surface). */
export function apiSchemaClient(supabase: SupabaseClient): SupabaseClient {
  return (supabase as any).schema("api") as SupabaseClient;
}