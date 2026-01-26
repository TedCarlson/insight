// apps/web/src/state/org.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type PcOrgChoice } from "@/lib/api";
import { useSession } from "@/state/session";

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
  const { ready, signedIn } = useSession();

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
    // Only hit api schema when we know we have a session
    if (!ready || !signedIn) return;

    setOrgsLoading(true);
    setOrgsError(null);

    try {
      const choices = (await api.pcOrgChoices()) ?? [];
      setOrgs(choices);

      // Auto-select if none chosen OR chosen org no longer available
      const stillValid =
        selectedOrgId &&
        choices.some((o) => String((o as any)?.pc_org_id) === String(selectedOrgId));

      if (!stillValid) {
        setSelectedOrgIdState(((choices[0] as any)?.pc_org_id as string) ?? null);
      }
    } catch (e: unknown) {
      const msg = (e as any)?.message ?? "Failed to load org choices";
      setOrgsError(msg);
      setOrgs([]);
      setSelectedOrgIdState(null);
    } finally {
      setOrgsLoading(false);
    }
  }, [ready, signedIn, selectedOrgId]);

  // Drive org lifecycle off session state (no auth listeners here)
  useEffect(() => {
    if (!ready) return;

    if (!signedIn) {
      setOrgs([]);
      setSelectedOrgIdState(null);
      setOrgsError(null);
      setOrgsLoading(false);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    void refreshOrgs();
  }, [ready, signedIn, refreshOrgs]);

  const setSelectedOrgId = useCallback((id: string | null) => setSelectedOrgIdState(id), []);

  const value = useMemo<OrgState>(
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
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}
