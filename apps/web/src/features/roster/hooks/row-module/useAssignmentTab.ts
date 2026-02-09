// apps/web/src/features/roster/hooks/row-module/useAssignmentTab.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type RosterMasterRow } from "@/shared/lib/api";
import { loadMasterAction, loadPositionTitlesAction } from "../rosterRowModule.actions";
import { createClient } from "@/shared/data/supabase/client";

type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
type OfficeOption = { id: string; label: string; sublabel?: string };
type RpcSchema = "api" | "public";

function todayISODate(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isActiveAssignmentRow(r: any) {
  const end = String(r?.end_date ?? "").trim();
  const active = r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true;
  return !end && Boolean(active);
}

function normalizeOpt(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export function useAssignmentTab(args: {
  open: boolean;
  tab: "assignment" | "leadership" | "person" | "org" | "invite";
  pcOrgId: string;
  personId: string | null;
  assignmentId: string | null;

  // passed from row module
  canManage: boolean;
  modifyMode: "open" | "locked";
}) {
  const { open, tab, pcOrgId, personId, assignmentId, canManage, modifyMode } = args;

  const supabase = useMemo(() => createClient(), []);

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

  // lifecycle
  const [startingAssignment, setStartingAssignment] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState(false);

  // position titles
  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  // offices
  const [officeOptions, setOfficeOptions] = useState<OfficeOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);

  /**
   * Session-aware RPC caller (hits /api/org/rpc allowlist + gatekeeper)
   */
  const callRpc = useCallback(
    async (fn: string, rpcArgs: Record<string, any> | null, schema: RpcSchema = "api") => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const accessToken = sessionRes?.session?.access_token ?? "";

      const res = await fetch("/api/org/rpc", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ schema, fn, args: rpcArgs }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? `RPC failed: ${fn}`);
      return (json as any)?.data ?? null;
    },
    [supabase]
  );

  const loadMaster = useCallback(async () => {
    await loadMasterAction({
      pcOrgId,
      setLoading: setLoadingMaster,
      setErr: setMasterErr,
      setRows: setMaster,
    });
  }, [pcOrgId]);

  const loadPositionTitles = useCallback(async () => {
    await loadPositionTitlesAction({
      pcOrgId,
      setLoading: setPositionTitlesLoading,
      setError: setPositionTitlesError,
      setRows: setPositionTitles,
    });
  }, [pcOrgId]);

  const loadOffices = useCallback(async () => {
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

      rows.sort((a: OfficeOption, b: OfficeOption) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      );

      setOfficeOptions(rows);
    } catch (e: any) {
      setOfficeError(e?.message ?? "Failed to load offices");
      setOfficeOptions([]);
    } finally {
      setOfficeLoading(false);
    }
  }, [pcOrgId]);

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

  // active assignment row for this person
  const masterForPerson = useMemo(() => {
    if (!master || !master.length || !personId) return null;

    const pid = String(personId);
    const aid = assignmentId ? String(assignmentId) : null;

    const activeMatches = (master as any[])
      .filter((r) => String(r.person_id) === pid)
      .filter(isActiveAssignmentRow);

    if (activeMatches.length > 0) return activeMatches[0] as any;

    const byAssignment =
      (aid ? (master as any[]).find((r) => String(r.assignment_id) === aid && isActiveAssignmentRow(r)) : null) ?? null;

    return byAssignment ?? null;
  }, [master, personId, assignmentId]);

  const canLifecycle = canManage && modifyMode === "open";

  const beginEditAssignment = useCallback(() => {
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

    if (!officeOptions.length && !officeLoading) void loadOffices();
  }, [masterForPerson, defaultPositionTitle, officeOptions.length, officeLoading, loadOffices]);

  const cancelEditAssignment = useCallback(() => {
    setAssignmentErr(null);
    setEditingAssignment(false);
    setAssignmentDraft(assignmentBaseline ?? masterForPerson);
  }, [assignmentBaseline, masterForPerson]);

  const assignmentDirty = useMemo(() => {
    if (!assignmentBaseline || !assignmentDraft) return false;
    const keys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;
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

  const saveAssignment = useCallback(async () => {
    if (!assignmentDraft) {
      setEditingAssignment(false);
      return;
    }

    const aid = String((assignmentDraft as any)?.assignment_id ?? assignmentId ?? "").trim();
    if (!aid) {
      setAssignmentErr("No assignment_id to save.");
      setEditingAssignment(false);
      return;
    }

    if (!assignmentValidation.ok) {
      setAssignmentErr(assignmentValidation.msg);
      return;
    }

    if (!pcOrgId) {
      setAssignmentErr("Missing pc_org_id.");
      return;
    }

    const editableKeys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;

    // always include for gatekeeper scoping
    const p_patch: any = { pc_org_id: pcOrgId };

    for (const k of editableKeys) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;

      if (typeof after === "string" && after.trim() === "") after = null;
      if (k === "start_date" && after == null) {
        setAssignmentErr("Start date is required.");
        return;
      }

      if (String(before ?? "") !== String(after ?? "")) p_patch[k] = after;
    }

    // nothing changed (besides pc_org_id)
    const changedKeys = Object.keys(p_patch).filter((k) => k !== "pc_org_id");
    if (changedKeys.length === 0) {
      setEditingAssignment(false);
      return;
    }

    setSavingAssignment(true);
    setAssignmentErr(null);
    try {
      await callRpc(
        "assignment_patch",
        { p_assignment_id: aid, p_patch },
        "public"
      );

      setEditingAssignment(false);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }, [
    assignmentDraft,
    assignmentId,
    assignmentValidation,
    pcOrgId,
    assignmentBaseline,
    callRpc,
    loadMaster,
  ]);

  const startAssignment = useCallback(async () => {
    setAssignmentErr(null);

    if (!canLifecycle) return setAssignmentErr("Not allowed (requires Modify=open and roster_manage).");
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");
    if (!personId) return setAssignmentErr("Missing person_id.");
    if (masterForPerson) return setAssignmentErr("Active assignment already exists.");

    setStartingAssignment(true);
    try {
      const pos = defaultPositionTitle ?? "Technician";
      const start = todayISODate();

      // Prefer canonical RPC, fallback to patch-insert only if your SQL supports it.
      try {
        await callRpc(
          "assignment_start",
          { pc_org_id: pcOrgId, person_id: personId, start_date: start, position_title: pos },
          "public"
        );
      } catch {
        await callRpc(
          "assignment_patch",
          {
            p_assignment_id: null,
            p_patch: {
              pc_org_id: pcOrgId,
              person_id: personId,
              start_date: start,
              end_date: null,
              active: true,
              position_title: pos,
              tech_id: null,
              office_id: null,
            },
          },
          "public"
        );
      }

      setEditingAssignment(false);
      setAssignmentDraft(null);
      setAssignmentBaseline(null);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to start assignment");
    } finally {
      setStartingAssignment(false);
    }
  }, [canLifecycle, pcOrgId, personId, masterForPerson, defaultPositionTitle, callRpc, loadMaster]);

  const endAssignment = useCallback(async () => {
    setAssignmentErr(null);

    if (!canLifecycle) return setAssignmentErr("Not allowed (requires Modify=open and roster_manage).");

    const active = masterForPerson as any;
    const aid = String(active?.assignment_id ?? assignmentId ?? "").trim();
    if (!aid) return setAssignmentErr("No active assignment to end.");
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");

    setEndingAssignment(true);
    try {
      const end = todayISODate();

      try {
        await callRpc(
          "assignment_end",
          { pc_org_id: pcOrgId, assignment_id: aid, end_date: end },
          "public"
        );
      } catch {
        await callRpc(
          "assignment_patch",
          { p_assignment_id: aid, p_patch: { pc_org_id: pcOrgId, end_date: end, active: false } },
          "public"
        );
      }

      setEditingAssignment(false);
      setAssignmentDraft(null);
      setAssignmentBaseline(null);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to end assignment");
    } finally {
      setEndingAssignment(false);
    }
  }, [canLifecycle, masterForPerson, assignmentId, pcOrgId, callRpc, loadMaster]);

  // Load titles + offices when tab is relevant
  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment" && tab !== "leadership") return;

    const t = window.setTimeout(() => {
      void loadPositionTitles();
      void loadOffices();
    }, 0);

    return () => window.clearTimeout(t);
  }, [open, tab, loadPositionTitles, loadOffices]);

  // Load master on open
  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => {
      void loadMaster();
    }, 0);

    return () => window.clearTimeout(t);
  }, [open, loadMaster]);

  return {
    // gates for UI
    canManage,
    modifyMode,

    // master
    master,
    masterErr,
    loadingMaster,
    loadMaster,
    masterForPerson,

    // edit
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

    // lifecycle
    startAssignment,
    endAssignment,
    startingAssignment,
    endingAssignment,

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