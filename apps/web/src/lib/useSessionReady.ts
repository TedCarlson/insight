"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Marks "ready" after Supabase auth has resolved (session present or not).
 * Prevents early anon RPC calls against `schema("api")` that can produce:
 *   "permission denied for schema api"
 * on first login/redirect before the session is available in the browser client.
 */
export function useSessionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      try {
        await supabase.auth.getSession();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  return ready;
}
