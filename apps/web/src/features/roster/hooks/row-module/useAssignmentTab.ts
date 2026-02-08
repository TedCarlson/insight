"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type RosterMasterRow } from "@/shared/lib/api";
import { loadMasterAction, loadPositionTitlesAction } from "../rosterRowModule.actions";

type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
type OfficeOption = { id: string; label: string; sublabel?: string };

export function useAssignmentTab(args: {
  open: boolean;
  tab: "assignment" | "leadership" | "person" | "org" | "invite";
  pcOrgId: string;

  personId: string | null;
  assignmentId: string | null;
}) {
  const { open, tab, pcOrgId, personId, assignmentId } = args;

  // master
  const [master, setMaster] = useState<RosterMasterRow[] | null>(null);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // edit state
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentErr, setAssignmentErr] = useState<string | null>(null);

  const [assignmentBaseline, setAssignmentBaseline] = useState<any | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<any | null>(null);

  // position titles
  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  // offices (scoped to pc_org, active-only)
  const [officeOptions, setOfficeOptions] = useState<OfficeOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);

  const loadMaster = async () => {
    await loadMasterAction({
      pcOrgId,
      setLoading: setLoadingMaster,
      setErr: setMasterErr,
      setRows: setMaster,
    });
  };

  const loadPositionTitles = async () => {
    await loadPositionTitlesAction({
      pcOrgId,
      setLoading: setPositionTitlesLoading,
      setError: setPositionTitlesError,
      setRows: setPositionTitles,
    });
  };

  const loadOffices = async () => {
    if (!pcOrgId) return;

    setOfficeLoading(true);
    setOfficeError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("pc_org_id", String(pcOrgId));

      const res = await fetch(`/api/meta/offices?${sp.toString()}`, { method: "GET" });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg = (json as any)?.error || (json as any)?.message || `Failed to load offices (${res.status})`;
        setOfficeError(String(msg));
        setOfficeOptions([]);
        return;
      }

      const list = Array.isArray((json as any)?.rows) ? (json as any).rows : Array.isArray(json) ? json : [];
      const rows: OfficeOption[] = list
        .filter((o: any) => o && (o.id || o.office_id))
        .map((o: any) => ({
          id: String(o.id ?? o.office_id),
          label: String(o.label ?? o.office_name ?? o.name ?? o.id ?? o.office_id),
          sublabel: o.sublabel != null ? String(o.sublabel) : undefined,
        }));

      rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      setOfficeOptions(rows);
    } catch (e: any) {
      setOfficeError(e?.message ?? "Failed to load offices");
      setOfficeOptions([]);
    } finally {
      setOfficeLoading(false);
    }
  };

  const positionTitleOptions = useMemo(() => {
    const list = [...(positionTitles ?? [])];
    list.sort(
      (a, b) =>
        Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) ||
        a.position_title.localeCompare(b.position_title)
    );
    return list;
  }, [positionTitles]);

  const defaultPositionTitle = useMemo(() => {
    const exact = positionTitleOptions.find((t) => t.position_title === "Technician")?.position_title;
    if (exact) return exact;
    const ci = positionTitleOptions.find((t) => t.position_title.toLowerCase() === "technician")?.position_title;
    return ci ?? null;
  }, [positionTitleOptions]);

  // computed active master row for this person/assignment
  const masterForPerson = useMemo(() => {
    if (!master || !master.length || !personId) return null;

    const pid = String(personId);
    const aid = assignmentId ? String(assignmentId) : null;

    const isActive = (r: any) => {
      const end = String(r?.end_date ?? "").trim();
      const active = r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true;
      return !end && Boolean(active);
    };

    const activeMatches = (master as any[])
      .filter((r) => String(r.person_id) === pid)
      .filter(isActive);

    if (activeMatches.length > 0) return activeMatches[0] as any;

    const byAssignment =
      (aid ? (master as any[]).find((r) => String(r.assignment_id) === aid && isActive(r)) : null) ?? null;

    return byAssignment ?? null;
  }, [master, personId, assignmentId]);

  function beginEditAssignment() {
    if (!masterForPerson) return;

    setAssignmentErr(null);
    setEditingAssignment(true);

    const base = masterForPerson;
    const draft = { ...(base as any) };

    if (!draft.position_title && defaultPositionTitle) {
      draft.position_title = defaultPositionTitle;
    }

    setAssignmentBaseline(base);
    setAssignmentDraft(draft);

    // ensure office dropdown is hydrated
    if (!officeOptions.length && !officeLoading) {
      void loadOffices();
    }
  }

  function cancelEditAssignment() {
    setAssignmentErr(null);
    setEditingAssignment(false);
    setAssignmentDraft(assignmentBaseline ?? masterForPerson);
  }

  const assignmentDirty = useMemo(() => {
    if (!assignmentBaseline || !assignmentDraft) return false;
    const keys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"];
    return keys.some(
      (k) => String((assignmentBaseline as any)?.[k] ?? "") !== String((assignmentDraft as any)?.[k] ?? "")
    );
  }, [assignmentBaseline, assignmentDraft]);

  const assignmentValidation = useMemo(() => {
    const start = (assignmentDraft as any)?.start_date ?? null;
    const end = (assignmentDraft as any)?.end_date ?? null;

    if (!start || String(start).trim() === "") return { ok: false as const, msg: "Start date is required." };
    if (end && String(end).trim() !== "" && String(end) < String(start)) {
      return { ok: false as const, msg: "End date must be on or after start date." };
    }
    return { ok: true as const, msg: "" };
  }, [assignmentDraft]);

  async function saveAssignment() {
    if (!assignmentDraft) {
      setEditingAssignment(false);
      return;
    }

    const aid = String((assignmentDraft as any)?.assignment_id ?? assignmentId ?? "");
    if (!aid) {
      setAssignmentErr("No assignment_id to save.");
      setEditingAssignment(false);
      return;
    }

    if (!assignmentValidation.ok) {
      setAssignmentErr(assignmentValidation.msg);
      return;
    }

    const editableKeys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;
    const patch: any = { assignment_id: aid };

    for (const k of editableKeys) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;

      if (typeof after === "string" && after.trim() === "") after = null;
      if (k === "start_date" && after == null) {
        setAssignmentErr("Start date is required.");
        return;
      }

      if (String(before ?? "") !== String(after ?? "")) patch[k] = after;
    }

    if (Object.keys(patch).length <= 1) {
      setEditingAssignment(false);
      return;
    }

    setSavingAssignment(true);
    setAssignmentErr(null);
    try {
      await api.assignmentUpdate(patch);
      setEditingAssignment(false);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }

  // Load titles + offices when tab is relevant
  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment" && tab !== "leadership") return;

    const t = window.setTimeout(() => {
      void loadPositionTitles();
      void loadOffices();
    }, 0);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, pcOrgId]);

  // Load master on open
  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => {
      void loadMaster();
    }, 0);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pcOrgId]);

  return {
    master,
    masterErr,
    loadingMaster,
    loadMaster,

    masterForPerson,

    editingAssignment,
    savingAssignment,
    assignmentErr,

    assignmentBaseline,
    assignmentDraft,
    setAssignmentDraft,

    assignmentDirty,
    assignmentValidation,

    beginEditAssignment,
    cancelEditAssignment,
    saveAssignment,

    // titles
    positionTitlesError,
    positionTitlesLoading,
    positionTitleOptions,
    loadPositionTitles,

    // offices
    officeOptions,
    officeLoading,
    officeError,
    loadOffices,
  };
}