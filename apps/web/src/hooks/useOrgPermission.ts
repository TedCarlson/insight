/**
 * IMPORTANT:
 * Do NOT query pc_org_permission_grant directly.
 * All permission checks must use api.has_pc_org_permission()
 * to stay aligned with RLS contract.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/shared/data/supabase/client";
import { useOrg } from "@/state/org";

type Result = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
};

type CacheEntry = { value: boolean; at: number };

// Short TTL so the UI reflects toggles quickly but still avoids API spam.
const TTL_MS = 15_000;

export function useOrgPermission(permissionKey: string): Result {
  const { selectedOrgId } = useOrg();
  const supabase = useMemo(() => createClient(), []);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setError(null);

      const pcOrgId = String(selectedOrgId ?? "").trim();
      const permKey = String(permissionKey ?? "").trim();

      if (!pcOrgId || !permKey) {
        setLoading(false);
        setAllowed(false);
        return;
      }

      const cacheKey = `${pcOrgId}::${permKey}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < TTL_MS) {
        setLoading(false);
        setAllowed(cached.value);
        return;
      }

      setLoading(true);

      try {
        // Use the canonical permission check (same contract RLS relies on).
        const apiClient: any = (supabase as any).schema ? (supabase as any).schema("api") : supabase;

        const { data, error: rpcErr } = await apiClient.rpc("has_pc_org_permission", {
          p_pc_org_id: pcOrgId,
          p_permission_key: permKey,
        });

        if (!alive) return;

        if (rpcErr) {
          setError(rpcErr.message ?? "Permission check failed");
          cacheRef.current.set(cacheKey, { value: false, at: Date.now() });
          setAllowed(false);
        } else {
          const ok = Boolean(data);
          cacheRef.current.set(cacheKey, { value: ok, at: Date.now() });
          setAllowed(ok);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Unknown error");
        cacheRef.current.set(cacheKey, { value: false, at: Date.now() });
        setAllowed(false);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [selectedOrgId, permissionKey, supabase]);

  return { loading, allowed, error };
}