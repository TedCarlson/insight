"use client";

import { useEffect, useMemo, useState } from "react";
import type { RosterDrilldownRow, RosterMasterRow, RosterRow } from "@/lib/api";
import { api } from "@/lib/api";
import { loadDrilldownAction } from "../rosterRowModule.actions";

type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };

export function useLeadershipTab(args: {
  open: boolean;
  pcOrgId: string;

  row: RosterRow | null;

  personId: string | null;
  assignmentId: string | null;

  // depends on master + titles (for managerOptions)
  master: RosterMasterRow[] | null;
  masterForPerson: any | null;
  positionTitles: PositionTitleRow[]; // pass the same list your assignment hook loaded
}) {
  const { open, pcOrgId, row, personId, assignmentId, master, masterForPerson, positionTitles } = args;

  const [drilldown, setDrilldown] = useState<RosterDrilldownRow[] | null>(null);
  const [drillErr, setDrillErr] = useState<string | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  const [editingLeadership, setEditingLeadership] = useState(false);
  const [savingLeadership, setSavingLeadership] = useState(false);
  const [leadershipErr, setLeadershipErr] = useState<string | null>(null);

  const [leadershipDraft, setLeadershipDraft] = useState<{ reports_to_assignment_id: string }>({
    reports_to_assignment_id: "",
  });

  const loadDrilldown = async () => {
    await loadDrilldownAction({
      pcOrgId,
      setLoading: setLoadingDrill,
      setErr: setDrillErr,
      setRows: setDrilldown,
    });
  };

  useEffect(() => {
    if (!open) return;
    void loadDrilldown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pcOrgId]);

  const drillForPerson = useMemo(() => {
    if (!drilldown || !drilldown.length) return [];
    const pid = personId ? String(personId) : null;
    const aid = assignmentId ? String(assignmentId) : null;

    const isActiveRel = (r: any) => {
      const end = String(
        (r?.reports_to_end_date ??
          r?.assignment_reporting_end_date ??
          r?.reporting_end_date ??
          r?.end_date ??
          "") as any
      ).trim();
      return !end;
    };

    return (drilldown as any[])
      .filter((r) => (pid && String(r.person_id) === pid) || (aid && String(r.assignment_id) === aid))
      .filter(isActiveRel);
  }, [drilldown, personId, assignmentId]);

  const leadershipContext = useMemo(() => {
    const first = (drillForPerson as any[])?.[0] ?? null;

    return {
      reports_to_full_name: (first as any)?.reports_to_full_name ?? (row as any)?.reports_to_full_name ?? null,
      reports_to_assignment_id:
        (first as any)?.reports_to_assignment_id ?? (row as any)?.reports_to_assignment_id ?? null,

      // for history update paths
      reports_to_reporting_id: (row as any)?.reports_to_reporting_id ?? null,
      reports_to_start_date: (row as any)?.reports_to_start_date ?? null,
      reports_to_end_date: (row as any)?.reports_to_end_date ?? null,
    };
  }, [drillForPerson, row]);

  // keep draft synced while not editing
  useEffect(() => {
    if (editingLeadership) return;
    setLeadershipDraft({
      reports_to_assignment_id: leadershipContext.reports_to_assignment_id
        ? String(leadershipContext.reports_to_assignment_id)
        : "",
    });
  }, [leadershipContext, editingLeadership]);

  const managerOptions = useMemo(() => {
    const rows: any[] = (master ?? []) as any[];
    const childAssignmentId = String(assignmentId ?? "");
    const childTitle = String((masterForPerson as any)?.position_title ?? (row as any)?.position_title ?? "");
    const childAff = String(
      (row as any)?.affiliation ??
      (row as any)?.co_name ??
      (row as any)?.company_name ??
      (row as any)?.contractor_name ??
      ""
    );

    const norm = (s: any) => String(s ?? "").toLowerCase().trim();

    const isITG = (r: any) => {
      const aff = norm(r?.affiliation ?? r?.co_name ?? r?.company_name ?? r?.contractor_name ?? "");
      return aff.includes("integrated tech") || aff === "itg" || aff.includes("itg ");
    };

    const isBP = (r: any) => {
      const aff = norm(r?.affiliation ?? r?.co_name ?? r?.company_name ?? "");
      const title = norm(r?.position_title ?? r?.title ?? "");
      return title.includes("bp") || aff.includes("bp");
    };

    const isContractorPerson = (affRaw: string) => {
      const aff = norm(affRaw);
      if (!aff) return false;
      if (aff.includes("integrated tech") || aff.startsWith("itg")) return false;
      if (aff.includes("bp")) return false;
      return true;
    };

    const titleRankFallback = (titleRaw: string) => {
      const t = norm(titleRaw);
      if (t.includes("technician")) return 10;
      if (t.includes("supervisor")) return 20;
      if (t.includes("manager")) return 30;
      if (t.includes("director")) return 40;
      if (t.includes("vp") || t.includes("vice president")) return 50;
      return 25;
    };

    const sortOrderByTitle = new Map<string, number>();
    for (const pt of positionTitles ?? []) {
      const key = String((pt as any)?.position_title ?? "").trim();
      const so = Number((pt as any)?.sort_order ?? NaN);
      if (key && Number.isFinite(so)) sortOrderByTitle.set(key, so);
    }

    const techSo = sortOrderByTitle.get("Technician");
    const supSo = sortOrderByTitle.get("Supervisor");
    const sortIncreasesWithSeniority = typeof techSo === "number" && typeof supSo === "number" ? techSo < supSo : true;

    const getRank = (titleRaw: string) => {
      const t = String(titleRaw ?? "").trim();
      const so = sortOrderByTitle.get(t);
      if (typeof so === "number") return so;
      return titleRankFallback(t);
    };

    const childRank = getRank(childTitle);
    const isHigherRank = (candidateTitle: string) => {
      const candRank = getRank(candidateTitle);
      return sortIncreasesWithSeniority ? candRank > childRank : candRank < childRank;
    };

    const childIsBP = norm(childTitle).includes("bp") || norm(childAff).includes("bp");
    const childIsContractor = isContractorPerson(childAff);
    const childIsTech = norm(childTitle).includes("technician");

    const candidatePassesAffiliationRules = (r: any) => {
      if (isITG(r)) return true;
      if (childIsBP) return false; // BP should report to ITG
      if (norm(childAff).includes("integrated tech") || norm(childAff).startsWith("itg")) return false;

      if (childIsContractor) {
        const candAff = String(r?.affiliation ?? r?.co_name ?? r?.company_name ?? r?.contractor_name ?? "");
        const sameContractor = norm(candAff) === norm(childAff);

        if (childIsTech) {
          const candBP = isBP(r);
          const candTitle = String(r?.position_title ?? r?.title ?? "");
          const candSupOrAbove =
            isHigherRank(candTitle) ||
            norm(candTitle).includes("supervisor") ||
            norm(candTitle).includes("manager") ||
            norm(candTitle).includes("director");

          if (candBP && candSupOrAbove) return true;
          return sameContractor;
        }

        return sameContractor;
      }

      const candAff = String(r?.affiliation ?? r?.co_name ?? r?.company_name ?? r?.contractor_name ?? "");
      return norm(candAff) === norm(childAff);
    };

    const candidates = rows.filter((r) => {
      const aid = String(r?.assignment_id ?? "");
      if (!aid) return false;
      if (childAssignmentId && aid === childAssignmentId) return false;

      const active = Boolean(r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true);
      if (!active) return false;

      const candTitle = String(r?.position_title ?? r?.title ?? "");
      if (!isHigherRank(candTitle)) return false;

      return candidatePassesAffiliationRules(r);
    });

    const relaxed = candidates.length
      ? candidates
      : rows.filter((r) => {
        const aid = String(r?.assignment_id ?? "");
        if (!aid) return false;
        if (childAssignmentId && aid === childAssignmentId) return false;
        const active = Boolean(r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true);
        if (!active) return false;
        const candTitle = String(r?.position_title ?? r?.title ?? "");
        return isHigherRank(candTitle) && (isITG(r) || norm(String(r?.affiliation ?? r?.co_name ?? "")) === norm(childAff));
      });

    const finalList = relaxed.length ? relaxed : rows.filter((r) => Boolean(String(r?.assignment_id ?? "")));

    return finalList
      .map((r) => {
        const aid = String(r?.assignment_id ?? "");
        const name = (r?.full_name ?? r?.person_name ?? r?.name ?? r?.reports_to_full_name ?? "—") as string;
        const title = (r?.position_title ?? r?.title ?? "") as string;
        const aff = String(r?.affiliation ?? r?.co_name ?? "");
        const label = title ? `${name} — ${title}${aff ? ` (${aff})` : ""}` : `${name}${aff ? ` (${aff})` : ""}`;
        return { value: aid, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [master, assignmentId, masterForPerson, row, positionTitles]);

  function beginEditLeadership() {
    setLeadershipErr(null);
    setEditingLeadership(true);
    setLeadershipDraft({
      reports_to_assignment_id: leadershipContext.reports_to_assignment_id
        ? String(leadershipContext.reports_to_assignment_id)
        : "",
    });
  }

  function cancelEditLeadership() {
    setLeadershipErr(null);
    setEditingLeadership(false);
    setLeadershipDraft({
      reports_to_assignment_id: leadershipContext.reports_to_assignment_id
        ? String(leadershipContext.reports_to_assignment_id)
        : "",
    });
  }

  async function saveLeadership() {
    const childId = String(assignmentId ?? "");
    if (!childId) {
      setLeadershipErr("No assignment_id for this roster row.");
      setEditingLeadership(false);
      return;
    }

    const selectedParent = String(leadershipDraft?.reports_to_assignment_id ?? "").trim();
    const baselineParent = String((leadershipContext as any)?.reports_to_assignment_id ?? "").trim();

    if (selectedParent === childId) {
      setLeadershipErr("An assignment cannot report to itself.");
      return;
    }

    if (selectedParent === baselineParent) {
      setEditingLeadership(false);
      return;
    }

    setSavingLeadership(true);
    setLeadershipErr(null);

    try {
      const today = new Date().toISOString().slice(0, 10);

      const currentReportingId = (leadershipContext as any)?.reports_to_reporting_id
        ? String((leadershipContext as any).reports_to_reporting_id)
        : null;

      const currentStartDate = String((leadershipContext as any)?.reports_to_start_date ?? "").trim();

      if (currentReportingId) {
        await api.assignmentReportingUpsert({
          assignment_reporting_id: currentReportingId,
          child_assignment_id: childId,
          parent_assignment_id: baselineParent || (leadershipContext as any)?.reports_to_assignment_id,
          start_date: currentStartDate || today,
          end_date: today,
        });
      }

      if (selectedParent) {
        await api.assignmentReportingUpsert({
          assignment_reporting_id: null,
          child_assignment_id: childId,
          parent_assignment_id: selectedParent,
          start_date: today,
          end_date: null,
        });
      }

      setEditingLeadership(false);
      await loadDrilldown();
    } catch (e: any) {
      setLeadershipErr(e?.message ?? "Failed to save reporting relationship");
    } finally {
      setSavingLeadership(false);
    }
  }

  return {
    drilldown,
    drillErr,
    loadingDrill,
    loadDrilldown,

    drillForPerson,
    leadershipContext,

    editingLeadership,
    savingLeadership,
    leadershipErr,

    leadershipDraft,
    setLeadershipDraft,

    managerOptions,

    beginEditLeadership,
    cancelEditLeadership,
    saveLeadership,
  };
}