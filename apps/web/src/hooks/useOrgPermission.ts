"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/state/org";

type Result = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
};

export function useOrgPermission(permissionKey: string): Result {
  const { selectedOrgId } = useOrg();
  const supabase = useMemo(() => createClient(), []);
  const cacheRef = useRef<Map<string, boolean>>(new Map());

  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setError(null);

      if (!selectedOrgId || !permissionKey) {
        setLoading(false);
        setAllowed(false);
        return;
      }

      const cacheKey = `${selectedOrgId}::${permissionKey}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) {
        setLoading(false);
        setAllowed(cached);
        return;
      }

      setLoading(true);
      try {
        const { data, error: rpcErr } = await supabase.rpc("has_pc_org_permission", {
          p_pc_org_id: selectedOrgId,
          p_permission_key: permissionKey,
        });

        if (!alive) return;

        if (rpcErr) {
          setError(rpcErr.message ?? "RPC error");
          cacheRef.current.set(cacheKey, false);
          setAllowed(false);
        } else {
          const ok = !!data;
          cacheRef.current.set(cacheKey, ok);
          setAllowed(ok);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Unknown error");
        cacheRef.current.set(cacheKey, false);
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
