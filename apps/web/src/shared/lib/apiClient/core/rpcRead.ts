import type { SupabaseClient } from "@/shared/data/supabase/types";
import { apiSchemaClient } from "./supabase";
import { compactRecord } from "./compact";
import { normalizeApiError } from "./errors";

/**
 * Try the same RPC with multiple argument-shapes.
 * This prevents UI drift when SQL param names are refined.
 */
export async function rpcWithFallback<T>(
  supabase: SupabaseClient,
  fn: string,
  argAttempts: Array<Record<string, any> | undefined>
): Promise<T> {
  let firstErr: any = null;

  for (const rawArgs of argAttempts) {
    const args = rawArgs ? (compactRecord(rawArgs) as Record<string, any>) : undefined;

    const client: any = apiSchemaClient(supabase) as any;
    const { data, error } = args ? await client.rpc(fn, args) : await client.rpc(fn);

    if (!error) return data as T;

    // Keep the first error so we don't mask it with a later fallback error
    if (!firstErr) firstErr = error;

    const code = (error as any)?.code;
    const msg = String((error as any)?.message ?? "");

    // Retry ONLY when it's a schema-cache/signature mismatch:
    // - PGRST202: function not found with given params
    // - PGRST203: ambiguous overload selection
    const retryable =
      code === "PGRST202" ||
      code === "PGRST203" ||
      msg.includes("schema cache") ||
      msg.includes("Could not find the function") ||
      msg.includes("Could not choose the best candidate function");

    if (!retryable) {
      throw normalizeApiError(error); // real error: stop immediately
    }
  }

  throw normalizeApiError(firstErr);
}