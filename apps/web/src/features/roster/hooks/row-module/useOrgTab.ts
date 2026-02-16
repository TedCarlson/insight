"use client";

import { useMemo } from "react";
import { api } from "@/shared/lib/api";
import type { RosterRow } from "@/shared/lib/api";

export type OrgMeta = {
  mso_name?: string | null;
  division_name?: string | null;
  region_name?: string | null;
};

export function useOrgTab(props: {
  row: RosterRow | null;
  pcOrgId: string;
  pcOrgName: string | null;
  personId: string | null;
  onClose: () => void;
  refreshCurrent: () => Promise<void> | void;

  // from parent
  endOrgBlocked: boolean;

  // ✅ org meta for the selected PC-ORG
  orgMeta?: OrgMeta | null;
}) {
  const { row, personId, pcOrgId, pcOrgName, onClose, refreshCurrent, endOrgBlocked, orgMeta } = props;

  const orgStartDate = useMemo(() => {
    const s =
      (row as any)?.person_pc_org_start_date ??
      (row as any)?.pc_org_start_date ??
      (row as any)?.org_start_date ??
      (row as any)?.start_date ??
      null;
    return s ? String(s) : null;
  }, [row]);

  const orgAssociationEndedAt = useMemo(() => {
    const s = (row as any)?.person_pc_org_end_date ?? (row as any)?.pc_org_end_date ?? null;
    return s ? String(s) : null;
  }, [row]);

  // These are computed in RosterRowModule and attached to row props (via parent file)
  // But we also recompute defensively here if present.
  const activeAssignmentCount = useMemo(() => {
    const v = (row as any)?.activeAssignmentCount;
    if (Number.isFinite(Number(v))) return Number(v);
    return 0;
  }, [row]);

  const activeLeadershipCount = useMemo(() => {
    const v = (row as any)?.activeLeadershipCount;
    if (Number.isFinite(Number(v))) return Number(v);
    return 0;
  }, [row]);

  const hardBlocked = endOrgBlocked;
  const blockedByDownstream = activeAssignmentCount > 0 || activeLeadershipCount > 0;

  const endPcOrgDisabled = hardBlocked || blockedByDownstream;

  const endPcOrgDisabledTitle = hardBlocked
    ? "You do not have permission to end org associations, or roster is locked."
    : blockedByDownstream
      ? "End assignments and leadership first (then you can end org association)."
      : "End Org association";

  async function endPcOrgCascade() {
    if (endPcOrgDisabled) return;
    if (!personId) return;

    const ok = window.confirm(
      "End Org association for this person? This will set an end date (today) on the person ↔ org association so they return to the unassigned pool. Continue?"
    );
    if (!ok) return;

    await api.personPcOrgEndAssociation({
      pc_org_id: pcOrgId,
      person_id: personId,
    });

    await refreshCurrent();
    onClose();
  }

  return {
    pcOrgName,
    orgStartDate,
    orgAssociationEndedAt,

    // ✅ expose org meta (PC-ORG level)
    msoName: orgMeta?.mso_name ?? null,
    divisionName: orgMeta?.division_name ?? null,
    regionName: orgMeta?.region_name ?? null,

    // expose to UI
    endPcOrgCascade,
    endOrgBlocked: endPcOrgDisabled,
    endOrgBlockedTitle: endPcOrgDisabledTitle,
  };
}