import { createClient } from "@/shared/data/supabase/client";

export type RpcSchema = "api" | "public";

export function makeOrgRpcCaller() {
  const supabase = createClient();

  return async function callOrgRpc(fn: string, args: Record<string, any> | null, schema: RpcSchema = "api") {
    const { data: sessionRes } = await supabase.auth.getSession();
    const accessToken = sessionRes?.session?.access_token ?? "";

    const res = await fetch("/api/org/rpc", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ schema, fn, args }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? json?.message ?? `RPC failed: ${fn}`);
    return json?.data ?? null;
  };
}