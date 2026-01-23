// src/state/org.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, PcOrgChoice } from "@/lib/api";

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
  const [orgs, setOrgs] = useState<PcOrgChoice[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);

  useEffect(() => {
    // load persisted org selection
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setSelectedOrgIdState(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedOrgId) window.localStorage.setItem(STORAGE_KEY, selectedOrgId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [selectedOrgId]);

  const refreshOrgs = async () => {
    setOrgsLoading(true);
    setOrgsError(null);
    try {
      const choices = await api.pcOrgChoices();
      setOrgs(choices);

      // Auto-select if none chosen or chosen org no longer available
      if (!selectedOrgId || !choices.some(o => o.pc_org_id === selectedOrgId)) {
        setSelectedOrgIdState(choices[0]?.pc_org_id ?? null);
      }
    } catch (e: any) {
      setOrgsError(e?.message ?? "Failed to load org choices");
      setOrgs([]);
      setSelectedOrgIdState(null);
    } finally {
      setOrgsLoading(false);
    }
  };

  useEffect(() => {
    refreshOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedOrgId = (id: string | null) => setSelectedOrgIdState(id);

  const value = useMemo(
    () => ({
      orgs,
      orgsLoading,
      orgsError,
      selectedOrgId,
      setSelectedOrgId,
      refreshOrgs,
    }),
    [orgs, orgsLoading, orgsError, selectedOrgId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrg() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrg must be used within OrgProvider");
  return v;
}
