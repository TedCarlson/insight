"use client";

import { useMemo, useState } from "react";
import type { RosterRow } from "@/lib/api";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export function useOrgTab(args: {
  row: RosterRow | null;
  pcOrgId: string;
  pcOrgName?: string | null;

  personId: string | null;

  // parent callbacks
  onClose: () => void;
  refreshCurrent: () => Promise<any> | void;

  // derived block rule comes from parent pills
  endOrgBlocked: boolean;
}) {
  const { row, pcOrgId, personId, onClose, refreshCurrent, endOrgBlocked } = args;

  const toast = useToast();
  const [orgAssociationEndedAt, setOrgAssociationEndedAt] = useState<string | null>(null);

  const orgStartDate = useMemo(() => {
    return (
      (row as any)?.pc_org_start_date ??
      (row as any)?.org_start_date ??
      (row as any)?.org_event_start_date ??
      (row as any)?.start_date ??
      null
    );
  }, [row]);

  const ended = useMemo(() => {
    return (
      orgAssociationEndedAt ??
      (row as any)?.person_pc_org_end_date ??
      (row as any)?.pc_org_end_date ??
      null
    );
  }, [orgAssociationEndedAt, row]);

  async function endPcOrgCascade() {
    if (endOrgBlocked) return;

    const ok = window.confirm(
      "End Org association for this person? This will set an end date (today) on the person ↔ org association so they return to the unassigned pool. Continue?"
    );
    if (!ok) return;

    const today = new Date().toISOString().slice(0, 10);

    try {
      if (!personId || !pcOrgId) throw new Error("Missing personId or pcOrgId");

      await api.personPcOrgEndAssociation({
        person_id: String(personId),
        pc_org_id: String(pcOrgId),
        end_date: today,
      });

      toast.push({
        title: "Org association ended",
        message: "This person is now eligible for reassignment.",
        variant: "success",
        durationMs: 3200,
      });

      setOrgAssociationEndedAt(today);

      await Promise.resolve(refreshCurrent?.());

      // close overlay so parent list refresh can remove the row
      onClose();
    } catch (e: any) {
      toast.push({
        title: "End org association failed",
        message: String(e?.message ?? e),
        variant: "danger",
        durationMs: 4200,
      });
    }
  }

  return {
    orgStartDate,
    ended,
    orgAssociationEndedAt,
    setOrgAssociationEndedAt,

    endPcOrgCascade,
  };
}