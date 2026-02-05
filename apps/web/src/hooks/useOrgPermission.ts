"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/shared/data/supabase/client";
import { useOrg } from "@/state/org";

type Result = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
};

export function useOrgPermission(permissionKey: string): Result {
  const { selectedOrgId } = useOrg(); // This is your selected_pc_org_id (pc_org_id)
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
        // Avoid RPC/schema exposure issues by reading the grants table directly.
        const { data, error: qErr } = await supabase
          .from("pc_org_permission_grant")
          .select("pc_org_permission_grant_id")
          .eq("pc_org_id", selectedOrgId)
          .eq("permission_key", permissionKey)
          .maybeSingle();

        if (!alive) return;

        if (qErr) {
          setError(qErr.message ?? "Query error");
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
