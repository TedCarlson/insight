// apps/web/src/state/org.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

async function getServerSelectedOrg(): Promise<string | null> {
  const res = await fetch("/api/profile/select-org", { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const v = String(json?.selected_pc_org_id ?? "").trim();
  return v ? v : null;
}

async function setServerSelectedOrg(id: string | null): Promise<void> {
  const res = await fetch("/api/profile/select-org", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ selected_pc_org_id: id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? "Failed to persist org selection");
  }
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { ready, signedIn } = useSession();

  const [orgs, setOrgs] = useState<PcOrgChoice[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);

  const lastPersistedRef = useRef<string | null>(null);
  const didInitRef = useRef(false);

  // Load persisted org selection (client-only fallback)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setSelectedOrgIdState(saved);
  }, []);

  // Persist org selection to localStorage (still useful for instant UI)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedOrgId) window.localStorage.setItem(STORAGE_KEY, selectedOrgId);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [selectedOrgId]);

  const refreshOrgs = useCallback(async () => {
    if (!ready || !signedIn) return;

    setOrgsLoading(true);
    setOrgsError(null);

    try {
      const choices = (await api.pcOrgChoices()) ?? [];
      setOrgs(choices);

      const serverSelected = await getServerSelectedOrg();

      const isValid = (id: string | null) =>
        !!id && choices.some((o) => String((o as any)?.pc_org_id ?? "").trim() === String(id).trim());

      const localSelected = selectedOrgId;

      // Prefer server selection if valid; else local if valid; else first choice
      const next =
        (isValid(serverSelected) ? serverSelected : null) ??
        (isValid(localSelected) ? localSelected : null) ??
        (String((choices[0] as any)?.pc_org_id ?? "").trim() || null);

      setSelectedOrgIdState(next);

      // Heal server if missing/outdated
      if (next && next !== serverSelected) {
        try {
          await setServerSelectedOrg(next);
          lastPersistedRef.current = next;
        } catch (e: any) {
          setOrgsError(e?.message ?? "Failed to persist org selection");
        }
      } else {
        lastPersistedRef.current = serverSelected;
      }
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load org choices";
      setOrgsError(msg);
      setOrgs([]);
      setSelectedOrgIdState(null);
    } finally {
      setOrgsLoading(false);
      didInitRef.current = true;
    }
  }, [ready, signedIn, selectedOrgId]);

  // Drive org lifecycle off session state
  useEffect(() => {
    if (!ready) return;

    if (!signedIn) {
      setOrgs([]);
      setSelectedOrgIdState(null);
      setOrgsError(null);
      setOrgsLoading(false);
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      lastPersistedRef.current = null;
      didInitRef.current = false;
      return;
    }

    void refreshOrgs();
  }, [ready, signedIn, refreshOrgs]);

  // When selection changes (dropdown), persist to server immediately.
  useEffect(() => {
    if (!ready || !signedIn) return;
    if (!didInitRef.current) return;

    // Avoid re-posting the same value in loops
    if ((selectedOrgId ?? null) === (lastPersistedRef.current ?? null)) return;

    let cancelled = false;

    (async () => {
      try {
        await setServerSelectedOrg(selectedOrgId ?? null);
        if (!cancelled) lastPersistedRef.current = selectedOrgId ?? null;
      } catch (e: any) {
        if (cancelled) return;
        setOrgsError(e?.message ?? "Failed to persist org selection");

        // Re-sync from server (authoritative) on failure
        try {
          const serverSelected = await getServerSelectedOrg();
          const id = serverSelected ? serverSelected : null;
          setSelectedOrgIdState(id);
          lastPersistedRef.current = id;
        } catch {
          // keep local; error already set
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedOrgId, ready, signedIn]);

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