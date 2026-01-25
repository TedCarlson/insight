// apps/web/src/state/org.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { api, type PcOrgChoice } from "@/lib/api";
import { useSessionReady } from "@/lib/useSessionReady";

type OrgState = {
  orgs: PcOrgChoice[];
  orgsLoading: boolean;
  orgsError: string | null;

  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;

  refreshOrgs: () => Promise<void>;
};

const Ctx = createContext<OrgState | null>(null);

const STORAGE_KEY = "pc:selected_org_id";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const sessionReady = useSessionReady();

  const [orgs, setOrgs] = useState<PcOrgChoice[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);

  // Load persisted org selection (client-only)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setSelectedOrgIdState(saved);
  }, []);

  // Persist org selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedOrgId) window.localStorage.setItem(STORAGE_KEY, selectedOrgId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [selectedOrgId]);

  const refreshOrgs = useCallback(async () => {
    setOrgsLoading(true);
    setOrgsError(null);

    try {
      const choices = (await api.pcOrgChoices()) ?? [];
      setOrgs(choices);

      // Auto-select if none chosen OR chosen org no longer available
      if (!selectedOrgId || !choices.some((o) => String(o.pc_org_id) === String(selectedOrgId))) {
        setSelectedOrgIdState((choices[0]?.pc_org_id as string) ?? null);
      }
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? "Failed to load org choices";
      setOrgsError(msg);
      setOrgs([]);
      setSelectedOrgIdState(null);
    } finally {
      setOrgsLoading(false);
    }
  }, [selectedOrgId]);

  /**
   * Key fix: do NOT call api schema RPCs until auth session is ready + user exists.
   * This prevents first-login redirect flashes of:
   *   "permission denied for schema api"
   */
  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!sessionReady) return;

      // If there is no signed-in user, don't hit the api schema.
      const { data } = await supabase.auth.getUser();
      if (!alive) return;

      if (!data.user) {
        setOrgs([]);
        setSelectedOrgIdState(null);
        setOrgsError(null);
        setOrgsLoading(false);
        return;
      }

      await refreshOrgs();
    }

    void boot();

    // React to auth changes: on login, load orgs; on logout, clear.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (!alive) return;

      if (!session) {
        setOrgs([]);
        setSelectedOrgIdState(null);
        setOrgsError(null);
        setOrgsLoading(false);
        return;
      }

      await refreshOrgs();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sessionReady, supabase, refreshOrgs]);

  const setSelectedOrgId = useCallback((id: string | null) => setSelectedOrgIdState(id), []);

  const value = useMemo(
    () => ({
      orgs,
      orgsLoading,
      orgsError,
      selectedOrgId,
      setSelectedOrgId,
      refreshOrgs,
    }),
    [orgs, orgsLoading, orgsError, selectedOrgId, setSelectedOrgId, refreshOrgs]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrg() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrg must be used within OrgProvider");
  return v;
}
