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

function norm(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function isFnMissingError(msg: string) {
  return /function .* does not exist/i.test(msg) || /schema cache/i.test(msg) || /not found/i.test(msg);
}

function isActiveAssignmentRow(r: any) {
  const idOk = Boolean(norm(r?.assignment_id));
  if (!idOk) return false;

  const end = String(r?.end_date ?? "").trim();
  const active = r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true;
  return !end && Boolean(active);
}

function findActiveAssignment(rows: RosterMasterRow[] | null, personId: string | null) {
  if (!rows || !rows.length || !personId) return null;
  const pid = String(personId);
  return (
    (rows as any[])
      .filter((r) => String(r?.person_id ?? "") === pid)
      .filter(isActiveAssignmentRow)[0] ?? null
  );
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

  const callRpc = useCallback(
    async (fn: string, rpcArgs: Record<string, any> | null, schema: RpcSchema): Promise<any> => {
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
      return json?.data ?? null;
    },
    [supabase]
  );

  const callRpcApiThenPublic = useCallback(
    async (fn: string, apiArgs: Record<string, any>, publicArgs: Record<string, any>) => {
      try {
        return await callRpc(fn, apiArgs, "api");
      } catch (e: any) {
        const msg = String(e?.message ?? "");
        if (isFnMissingError(msg)) return await callRpc(fn, publicArgs, "public");
        throw e;
      }
    },
    [callRpc]
  );

  const loadMaster = useCallback(async () => {
    await loadMasterAction({
      pcOrgId,
      setLoading: setLoadingMaster,
      setErr: setMasterErr,
      setRows: (rows: any) => setMaster(Array.isArray(rows) ? (rows as RosterMasterRow[]) : null),
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

  const masterForPerson = useMemo(() => findActiveAssignment(master, personId), [master, personId]);
  const canLifecycle = canManage && modifyMode === "open";

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
    const keys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;
    return keys.some(
      (k) => String((assignmentBaseline as any)?.[k] ?? "") !== String((assignmentDraft as any)?.[k] ?? "")
    );
  }, [assignmentBaseline, assignmentDraft]);

  const assignmentValidation = useMemo(() => {
    const start = (assignmentDraft as any)?.start_date ?? null;
    const end = (assignmentDraft as any)?.end_date ?? null;

    if (!start || String(start).trim() === "") return { ok: false as const, msg: "Start date is required." };
    if (end && String(end).trim() !== "" && String(end) < String(start))
      return { ok: false as const, msg: "End date must be on or after start date." };
    return { ok: true as const, msg: "" };
  }, [assignmentDraft]);

  const saveAssignment = useCallback(async () => {
    if (!assignmentDraft) {
      setEditingAssignment(false);
      return;
    }

    const aid =
      norm((assignmentDraft as any)?.assignment_id) ??
      norm((masterForPerson as any)?.assignment_id) ??
      norm(assignmentId);

    if (!aid) {
      setAssignmentErr("No assignment_id. Start assignment first.");
      setEditingAssignment(false);
      return;
    }

    if (!assignmentValidation.ok) return setAssignmentErr(assignmentValidation.msg);
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");

    const editableKeys = ["position_title", "start_date", "end_date", "active", "tech_id", "office_id"] as const;
    const p_patch: any = { pc_org_id: pcOrgId };

    for (const k of editableKeys) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;
      if (typeof after === "string" && after.trim() === "") after = null;
      if (k === "start_date" && after == null) return setAssignmentErr("Start date is required.");
      if (String(before ?? "") !== String(after ?? "")) p_patch[k] = after;
    }

    const changed = Object.keys(p_patch).filter((k) => k !== "pc_org_id");
    if (changed.length === 0) {
      setEditingAssignment(false);
      return;
    }

    setSavingAssignment(true);
    setAssignmentErr(null);
    try {
      // assignment_patch is listed as public in your allowlist; keep it deterministic
      await callRpc("assignment_patch", { p_assignment_id: aid, p_patch }, "public");
      setEditingAssignment(false);
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }, [assignmentDraft, assignmentBaseline, assignmentId, assignmentValidation, pcOrgId, masterForPerson, callRpc, loadMaster]);

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

      await callRpcApiThenPublic(
        "assignment_start",
        {
          p_pc_org_id: pcOrgId,
          p_person_id: personId,
          p_position_title: pos,
          p_start_date: start,
          p_office_id: null,
        },
        {
          pc_org_id: pcOrgId,
          person_id: personId,
          position_title: pos,
          start_date: start,
        }
      );

      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to start assignment");
    } finally {
      setStartingAssignment(false);
    }
  }, [canLifecycle, pcOrgId, personId, masterForPerson, defaultPositionTitle, callRpcApiThenPublic, loadMaster]);

  const endAssignment = useCallback(async () => {
    setAssignmentErr(null);

    if (!canLifecycle) return setAssignmentErr("Not allowed (requires Modify=open and roster_manage).");
    if (!pcOrgId) return setAssignmentErr("Missing pc_org_id.");

    const aid = norm((masterForPerson as any)?.assignment_id) ?? norm(assignmentId);
    if (!aid) return setAssignmentErr("No active assignment to end.");

    setEndingAssignment(true);
    try {
      const end = todayISODate();

      await callRpcApiThenPublic(
        "assignment_end",
        { p_pc_org_id: pcOrgId, p_assignment_id: aid, p_end_date: end },
        { pc_org_id: pcOrgId, assignment_id: aid, end_date: end }
      );

      setEditingAssignment(false);
      setAssignmentDraft(null);
      setAssignmentBaseline(null);

      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to end assignment");
    } finally {
      setEndingAssignment(false);
    }
  }, [canLifecycle, pcOrgId, masterForPerson, assignmentId, callRpcApiThenPublic, loadMaster]);

  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment" && tab !== "leadership") return;
    const t = window.setTimeout(() => {
      void loadPositionTitles();
      void loadOffices();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, tab, loadPositionTitles, loadOffices]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void loadMaster(), 0);
    return () => window.clearTimeout(t);
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