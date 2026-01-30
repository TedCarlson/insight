"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/state/org";

type Result = {
  loading: boolean;
  canManageConsole: boolean;
  error: string | null;
};

export function useOrgConsoleAccess(): Result {
  const { selectedOrgId } = useOrg();
  const supabase = useMemo(() => createClient(), []);

  // Cache per org id to avoid repeated RPC calls when users bounce around
  const cacheRef = useRef<Map<string, boolean>>(new Map());

  const [loading, setLoading] = useState(false);
  const [canManageConsole, setCanManageConsole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setError(null);

      if (!selectedOrgId) {
        setLoading(false);
        setCanManageConsole(false);
        return;
      }

      const cached = cacheRef.current.get(selectedOrgId);
      if (cached !== undefined) {
        setLoading(false);
        setCanManageConsole(cached);
        return;
      }

      setLoading(true);
      try {
        const { data, error: rpcErr } = await supabase.rpc("can_manage_pc_org_console", {
          p_pc_org_id: selectedOrgId,
        });

        if (!alive) return;

        if (rpcErr) {
          setError(rpcErr.message ?? "RPC error");
          cacheRef.current.set(selectedOrgId, false);
          setCanManageConsole(false);
        } else {
          const ok = !!data;
          cacheRef.current.set(selectedOrgId, ok);
          setCanManageConsole(ok);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Unknown error");
        cacheRef.current.set(selectedOrgId, false);
        setCanManageConsole(false);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [selectedOrgId, supabase]);

  return { loading, canManageConsole, error };
}
