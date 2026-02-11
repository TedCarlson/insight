// apps/web/src/features/roster/hooks/useRosterPageData.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { RosterRow } from "@/shared/lib/api";
import { api } from "@/shared/lib/api";
import { fetchActiveRosterPersonIdSet } from "@/shared/lib/activeRoster";

export type OrgMeta = {
  mso_name?: string | null;
  division_name?: string | null;
  region_name?: string | null;

  pc_lead_label?: string | null;
  pc_lead_role_key?: string | null;

  director_label?: string | null;
  director_role_key?: string | null;

  vp_label?: string | null;
  vp_role_key?: string | null;

  manager_label?: string | null;
};

export function useRosterPageData(args: {
  validatedOrgId: string | null;
  supabase: any;
  selectedRow: RosterRow | null;
  setSelectedRow: (r: RosterRow | null) => void;
  closeQuick: () => void;
  setDetailsOpen: (v: boolean) => void;
  setModifyModeLocked: () => void;
}) {
  const { validatedOrgId, supabase, selectedRow, setSelectedRow, closeQuick, setDetailsOpen, setModifyModeLocked } =
    args;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [orgMetaLoading, setOrgMetaLoading] = useState(false);
  const [orgMeta, setOrgMeta] = useState<OrgMeta | null>(null);

  // Diagnostics only
  const [activeSetSize, setActiveSetSize] = useState<number | null>(null);

  const loadOrgMeta = useCallback(async (orgId: string) => {
    try {
      setOrgMetaLoading(true);

      const res = await fetch("/api/org/roster-header", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pc_org_id: orgId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to load org meta");
      setOrgMeta(json?.data ?? null);
    } catch {
      setOrgMeta(null);
    } finally {
      setOrgMetaLoading(false);
    }
  }, []);

  const loadAll = useCallback(
    async (orgId: string) => {
      setLoading(true);
      setErr(null);

      try {
        // Active roster MUST be current memberships only.
        // We read the canonical membership set from v_roster_active and filter roster_current_full by it.
        const activeSet = await fetchActiveRosterPersonIdSet(supabase, orgId);
        setActiveSetSize(activeSet?.size ?? 0);

        const data = await api.rosterCurrentFull(orgId);
        const rawRows = Array.isArray(data) ? data : [];

        // Only show person rows that have an active membership.
        const rows = rawRows.filter((r: any) => {
          const pid = String(r?.person_id ?? "").trim();
          if (!pid) return false;
          return activeSet.has(pid);
        });

        setRoster(rows as any);

        if (selectedRow) {
          const selPid = String((selectedRow as any)?.person_id ?? "").trim();
          const next = rows.find((r: any) => String(r?.person_id ?? "").trim() === selPid) as any;
          if (next) setSelectedRow(next);
        }
      } catch (e: any) {
        // Fail closed: if we can't validate active memberships, do not show the roster.
        setErr(e?.message ?? String(e ?? "Failed to load roster"));
        setRoster([]);
        setActiveSetSize(null);
      } finally {
        setLoading(false);
      }
    },
    [selectedRow, setSelectedRow, supabase]
  );

  useEffect(() => {
    if (!validatedOrgId) {
      setRoster([]);
      setErr(null);
      setOrgMeta(null);
      setDetailsOpen(false);
      closeQuick();
      setActiveSetSize(null);
      return;
    }

    setModifyModeLocked();
    void loadOrgMeta(validatedOrgId);
    void loadAll(validatedOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatedOrgId]);

  return {
    loading,
    err,
    roster,
    orgMetaLoading,
    orgMeta,
    activeSetSize,
    loadAll,
  };
}