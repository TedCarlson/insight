// apps/web/src/features/roster/hooks/row-module/useAssignmentTab.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type RosterMasterRow } from "@/shared/lib/api";
import { loadMasterAction, loadPositionTitlesAction } from "../rosterRowModule.actions";
import { createClient } from "@/shared/data/supabase/client";

type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
type OfficeOption = { id: string; label: string; sublabel?: string };
type RpcSchema = "api" | "public";

const EDIT_KEYS = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;

function todayISO(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function isActive(r: any): boolean {
  const end = norm(r?.end_date);
  const active = r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true;
  return !end && Boolean(active);
}

function pickActive(rows: RosterMasterRow[] | null, personId: string | null, assignmentId: string | null) {
  if (!rows?.length || !personId) return null;
  const pid = norm(personId);
  const aid = assignmentId ? norm(assignmentId) : "";

  const byPerson = rows
    .filter((r: any) => norm(r?.person_id) === pid)
    .filter((r: any) => isActive(r));

  if (byPerson.length) return byPerson[0] as any;

  if (aid) {
    const byA = rows.find((r: any) => norm(r?.assignment_id) === aid && isActive(r));
    return (byA as any) ?? null;
  }

  return null;
}

function readAssignmentId(x: any): string | null {
  if (!x) return null;
  if (typeof x === "string") return norm(x) || null;
  const direct = norm(x?.assignment_id ?? x?.id);
  if (direct) return direct;
  if (Array.isArray(x)) {
    const v = norm(x[0]?.assignment_id ?? x[0]?.id);
    return v || null;
  }
  if (Array.isArray(x?.rows)) {
    const v = norm(x.rows[0]?.assignment_id ?? x.rows[0]?.id);
    return v || null;
  }
  return null;
}

export function useAssignmentTab(args: {
  open: boolean;
  tab: "assignment" | "leadership" | "person" | "org" | "invite";
  pcOrgId: string;
  personId: string | null;
  assignmentId: string | null;
  canManage: boolean;
  modifyMode: "open" | "locked";
}) {
  const { open, tab, pcOrgId, personId, assignmentId, canManage, modifyMode } = args;

  const supabase = useMemo(() => createClient(), []);

  const [master, setMaster] = useState<RosterMasterRow[] | null>(null);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentErr, setAssignmentErr] = useState<string | null>(null);

  const [assignmentBaseline, setAssignmentBaseline] = useState<any | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<any | null>(null);

  const [startingAssignment, setStartingAssignment] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState(false);

  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  const [officeOptions, setOfficeOptions] = useState<OfficeOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);

  const canLifecycle = canManage && modifyMode === "open";

  const callRpc = useCallback(
    async (fn: string, rpcArgs: Record<string, any> | null, schema: RpcSchema = "api") => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes?.session?.access_token ?? "";

      const res = await fetch("/api/org/rpc", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ schema, fn, args: rpcArgs }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error ?? (json as any)?.message ?? `RPC failed: ${fn}`);
      return (json as any)?.data ?? null;
    },
    [supabase]
  );

  const loadMaster = useCallback(async () => {
    await loadMasterAction({
      pcOrgId,
      setLoading: setLoadingMaster,
      setErr: setMasterErr,
      setRows: (rows: any) => setMaster(Array.isArray(rows) ? rows : null),
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
      sp.set("pc_org_id", norm(pcOrgId));

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
          id: norm(o.id ?? o.office_id),
          label: String(o.label ?? o.office_name ?? o.name ?? o.id ?? o.office_id),
          sublabel: o.sublabel != null ? String(o.sublabel) : undefined,
        }))
        .filter((o: OfficeOption) => Boolean(o.id));

      rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
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

  const masterForPerson = useMemo(() => pickActive(master, personId, assignmentId), [master, personId, assignmentId]);

  const beginEditAssignment = useCallback(() => {
    if (!masterForPerson) return;

    setAssignmentErr(null);
    setEditingAssignment(true);

    const base = masterForPerson as any;
    const draft = { ...base };

    if (!draft.position_title && defaultPositionTitle) draft.position_title = defaultPositionTitle;

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
    return EDIT_KEYS.some((k) => norm((assignmentBaseline as any)?.[k]) !== norm((assignmentDraft as any)?.[k]));
  }, [assignmentBaseline, assignmentDraft]);

  const assignmentValidation = useMemo(() => {
    const start = norm((assignmentDraft as any)?.start_date);
    const end = norm((assignmentDraft as any)?.end_date);
    if (!start) return { ok: false as const, msg: "Start date is required." };
    if (end && end < start) return { ok: false as const, msg: "End date must be on or after start date." };
    return { ok: true as const, msg: "" };
  }, [assignmentDraft]);

  const saveAssignment = useCallback(async () => {
    if (!assignmentDraft) {
      setEditingAssignment(false);
      return;
    }

    const aid = norm((assignmentDraft as any)?.assignment_id) || norm((masterForPerson as any)?.assignment_id) || "";
    if (!aid) {
      setAssignmentErr("No assignment_id to save. Start assignment first, then refresh.");
      setEditingAssignment(false);
      return;
    }
    if (!assignmentValidation.ok) return setAssignmentErr(assignmentValidation.msg);
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");

    const p_patch: any = { pc_org_id: pcOrgId };
    for (const k of EDIT_KEYS) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;
      if (typeof after === "string" && !after.trim()) after = null;
      if (k === "start_date" && after == null) return setAssignmentErr("Start date is required.");
      if (norm(before) !== norm(after)) p_patch[k] = after;
    }

    const changed = Object.keys(p_patch).some((k) => k !== "pc_org_id");
    if (!changed) {
      setEditingAssignment(false);
      return;
    }

    setSavingAssignment(true);
    setAssignmentErr(null);
    try {
      await callRpc("assignment_patch", { p_assignment_id: aid, p_patch }, "public");
      setEditingAssignment(false);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }, [assignmentDraft, assignmentBaseline, assignmentValidation, pcOrgId, masterForPerson, callRpc, loadMaster]);

  const startAssignment = useCallback(async () => {
    setAssignmentErr(null);

    if (!canLifecycle) return setAssignmentErr("Not allowed.");
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");
    if (!personId) return setAssignmentErr("Missing person_id.");
    if (masterForPerson) return setAssignmentErr("Active assignment already exists.");

    setStartingAssignment(true);
    try {
      const pos = defaultPositionTitle ?? "Technician";
      const start = todayISO();

      const data = await callRpc(
        "assignment_start",
        { pc_org_id: pcOrgId, person_id: personId, start_date: start, position_title: pos },
        "public"
      );

      const createdId = readAssignmentId(data);

      await loadMaster();

      if (createdId) {
        setMaster((prev) => {
          if (!prev || !personId) return prev;
          const pid = norm(personId);
          return prev.map((r: any) => {
            if (norm(r?.person_id) !== pid) return r;
            if (norm(r?.assignment_id)) return r;
            if (!isActive(r)) return r;
            return { ...r, assignment_id: createdId };
          });
        });
      }
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to start assignment");
    } finally {
      setStartingAssignment(false);
    }
  }, [canLifecycle, pcOrgId, personId, masterForPerson, defaultPositionTitle, callRpc, loadMaster]);

  const endAssignment = useCallback(async () => {
    setAssignmentErr(null);

    if (!canLifecycle) return setAssignmentErr("Not allowed.");

    const aid = norm((masterForPerson as any)?.assignment_id) || norm(assignmentId) || "";
    if (!aid) return setAssignmentErr("No active assignment to end.");
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");

    setEndingAssignment(true);
    try {
      await callRpc("assignment_end", { pc_org_id: pcOrgId, assignment_id: aid, end_date: todayISO() }, "public");
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

  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment" && tab !== "leadership") return;
    void loadPositionTitles();
    void loadOffices();
  }, [open, tab, loadPositionTitles, loadOffices]);

  useEffect(() => {
    if (!open) return;
    void loadMaster();
  }, [open, loadMaster]);

  return {
    canManage,
    modifyMode,

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

    startAssignment,
    endAssignment,
    startingAssignment,
    endingAssignment,

    positionTitlesError,
    positionTitlesLoading,
    positionTitleOptions,
    loadPositionTitles,

    officeOptions,
    officeLoading,
    officeError,
    loadOffices,
  };
}