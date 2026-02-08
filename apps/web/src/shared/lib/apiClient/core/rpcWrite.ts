import type { SupabaseClient } from "@/shared/data/supabase/types";
import { ensureSessionFresh, getAccessToken } from "./session";

export async function rpcWrite<T>(
  supabase: SupabaseClient,
  input: {
    schema: "api" | "public";
    fn: string;
    args?: Record<string, any> | null;
  }
): Promise<T> {
  await ensureSessionFresh(supabase);

  const token = await getAccessToken(supabase);

  const res = await fetch("/api/org/rpc", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ schema: input.schema, fn: input.fn, args: input.args ?? null }),
  });

  const json: any = await res.json().catch(() => ({}));

  if (!res.ok || !json?.ok) {
    const msg = json?.error ?? json?.message ?? `RPC write failed (${res.status})`;
    const err: any = new Error(String(msg));
    err.status = res.status;
    err.code = json?.code ?? undefined;
    err.details = json?.details ?? null;
    err.debug = json?.debug ?? null;
    throw err;
  }

  return (json?.data as T) ?? (json as T);
}