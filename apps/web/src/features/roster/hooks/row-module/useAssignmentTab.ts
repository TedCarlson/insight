// apps/web/src/features/roster/hooks/row-module/useAssignmentTab.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type RosterMasterRow } from "@/shared/lib/api";
import { loadMasterAction, loadPositionTitlesAction } from "../rosterRowModule.actions";
import { createClient } from "@/shared/data/supabase/client";

type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

type OfficeOption = {
  id: string;
  label: string;
  sublabel?: string;
};

type RpcSchema = "api" | "public";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function norm(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function isFnMissingError(msg: string) {
  return /function .* does not exist/i.test(msg) || /schema cache/i.test(msg) || /not found/i.test(msg);
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function shortId(id: unknown) {
  if (id == null) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function pickOfficeLabel(o: any, id: string): { label: string; sublabel?: string } {
  const rawCandidates: Array<unknown> = [
    o?.label,
    o?.office_label,
    o?.office_name,
    o?.display_name,
    o?.office_display_name,
    o?.name,
    o?.office_code,
    o?.code,
  ];

  const first =
    rawCandidates
      .map((v) => String(v ?? "").trim())
      .find((s) => s.length > 0 && !(s === id && isUuidLike(s))) ?? "";

  const code = String(o?.office_code ?? o?.code ?? "").trim();
  const base = first || (isUuidLike(id) ? shortId(id) : id);

  const label = code && base && base !== code && !isUuidLike(base) ? `${code} • ${base}` : base;

  const sub = String(o?.sublabel ?? o?.sub_label ?? "").trim();
  return { label, sublabel: sub ? sub : undefined };
}

function findActiveAssignment(rows: RosterMasterRow[] | null, personId: string | null) {
  if (!rows || !personId) return null;
  const pid = String(personId);

  return (
    rows.find((r: any) => {
      if (String(r?.person_id ?? "") !== pid) return false;
      const end = r?.end_date;
      if (end !== null && String(end).trim() !== "") return false;
      return true;
    }) ?? null
  );
}

function normCmp(v: unknown) {
  if (v == null) return "";
  return String(v).trim();
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
  const { open, pcOrgId, personId, assignmentId, canManage, modifyMode } = args;

  const supabase = useMemo(() => createClient(), []);

  const [master, setMaster] = useState<RosterMasterRow[] | null>(null);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const [editingAssignment, setEditingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentErr, setAssignmentErr] = useState<string | null>(null);

  const [assignmentBaseline, setAssignmentBaseline] = useState<any | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<any | null>(null);

  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  const [officeOptions, setOfficeOptions] = useState<OfficeOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);

  const didHydrateRef = useRef(false);

  const callRpc = useCallback(
    async (fn: string, rpcArgs: Record<string, any> | null, schema: RpcSchema) => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? "";

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
        if (isFnMissingError(String(e?.message))) {
          return await callRpc(fn, publicArgs, "public");
        }
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
      const res = await fetch(`/api/meta/offices?pc_org_id=${encodeURIComponent(String(pcOrgId))}`);
      const json = await res.json().catch(() => ({}));

      const list =
        Array.isArray(json)
          ? json
          : Array.isArray((json as any)?.rows)
            ? (json as any).rows
            : Array.isArray((json as any)?.data)
              ? (json as any).data
              : [];

      const opts: OfficeOption[] = (list ?? [])
        .filter((o: any) => o && (o.id || o.office_id))
        .map((o: any) => {
          const id = String(o.id ?? o.office_id);
          const picked = pickOfficeLabel(o, id);
          return { id, label: picked.label, sublabel: picked.sublabel };
        })
        .sort((a: OfficeOption, b: OfficeOption) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        );

      setOfficeOptions(opts);
    } catch (e: any) {
      setOfficeError(e?.message ?? "Failed to load offices");
      setOfficeOptions([]);
    } finally {
      setOfficeLoading(false);
    }
  }, [pcOrgId]);

  const positionTitleOptions = useMemo(() => {
    // keep sort stable + typed params (no implicit any)
    return [...positionTitles].sort((a: PositionTitleRow, b: PositionTitleRow) => {
      const ao = Number(a.sort_order ?? 0);
      const bo = Number(b.sort_order ?? 0);
      if (ao !== bo) return ao - bo;
      return a.position_title.localeCompare(b.position_title);
    });
  }, [positionTitles]);

  const defaultPositionTitle = useMemo(() => {
    return (
      positionTitleOptions.find((t) => t.position_title === "Technician")?.position_title ??
      positionTitleOptions.find((t) => t.position_title.toLowerCase() === "technician")?.position_title ??
      "Technician"
    );
  }, [positionTitleOptions]);

  const masterForPerson = useMemo(() => findActiveAssignment(master, personId), [master, personId]);

  const canEdit = canManage && modifyMode === "open";

  const beginEditAssignment = useCallback(() => {
    if (!canEdit) {
      setAssignmentErr("Not allowed.");
      return;
    }

    setEditingAssignment(true);
    setAssignmentErr(null);

    if (masterForPerson) {
      const base = masterForPerson as any;
      const draft = { ...base };

      if (!norm(draft.position_title)) draft.position_title = defaultPositionTitle;
      if (!norm(draft.start_date)) draft.start_date = todayISODate();

      setAssignmentBaseline(base);
      setAssignmentDraft(draft);
      return;
    }

    const draft = {
      assignment_id: null,
      pc_org_id: pcOrgId,
      person_id: personId,
      position_title: defaultPositionTitle,
      tech_id: null,
      office_id: null,
      start_date: todayISODate(),
      end_date: null,
      active: true,
    };

    setAssignmentBaseline(null);
    setAssignmentDraft(draft);
  }, [canEdit, masterForPerson, pcOrgId, personId, defaultPositionTitle]);

  const cancelEditAssignment = useCallback(() => {
    setEditingAssignment(false);
    setAssignmentErr(null);
    setAssignmentDraft(masterForPerson ?? null);
    setAssignmentBaseline(null);
  }, [masterForPerson]);

  const assignmentDirty = useMemo(() => {
    if (!editingAssignment) return false;
    if (!assignmentDraft) return false;

    const base = assignmentBaseline ?? {};
    const draft = assignmentDraft ?? {};

    const keys = ["office_id", "position_title", "tech_id", "start_date", "end_date", "active"] as const;
    return keys.some((k) => normCmp(base?.[k]) !== normCmp(draft?.[k]));
  }, [editingAssignment, assignmentBaseline, assignmentDraft]);

  const assignmentValidation = useMemo(() => {
    if (!editingAssignment) return { ok: true as const, msg: "" };

    const start = (assignmentDraft as any)?.start_date ?? null;
    const end = (assignmentDraft as any)?.end_date ?? null;

    if (!isIsoDate(start)) return { ok: false as const, msg: "Start date is required." };
    if (!norm((assignmentDraft as any)?.position_title)) return { ok: false as const, msg: "Position title is required." };

    if (end && isIsoDate(end) && end < start) {
      return { ok: false as const, msg: "End date must be on or after start date." };
    }

    return { ok: true as const, msg: "" };
  }, [editingAssignment, assignmentDraft]);

  const saveAssignment = useCallback(async () => {
    if (!editingAssignment || !assignmentDraft) return;

    if (!canEdit) {
      setAssignmentErr("Not allowed.");
      return;
    }

    if (!assignmentValidation.ok) {
      setAssignmentErr(assignmentValidation.msg);
      return;
    }

    setSavingAssignment(true);
    setAssignmentErr(null);

    try {
      const aid =
        norm((assignmentDraft as any)?.assignment_id) ??
        norm((assignmentBaseline as any)?.assignment_id) ??
        norm((masterForPerson as any)?.assignment_id) ??
        norm(assignmentId);

      // CREATE
      if (!aid) {
        if (!pcOrgId || !personId) {
          setAssignmentErr("Missing identifiers.");
          return;
        }

        const start_date = String((assignmentDraft as any)?.start_date ?? todayISODate());
        const position_title = String((assignmentDraft as any)?.position_title ?? defaultPositionTitle);
        const office_id = norm((assignmentDraft as any)?.office_id);
        const tech_id = norm((assignmentDraft as any)?.tech_id);

        // Avoid overload ambiguity:
        // - call 5-arg only when office_id is present
        // - otherwise call 4-arg
        if (office_id) {
          await callRpc("assignment_start", {
            p_pc_org_id: pcOrgId,
            p_person_id: personId,
            p_position_title: position_title,
            p_start_date: start_date,
            p_office_id: office_id,
          }, "api");
        } else {
          await callRpc("assignment_start", {
            p_pc_org_id: pcOrgId,
            p_person_id: personId,
            p_position_title: position_title,
            p_start_date: start_date,
          }, "api");
        }

        // assignment_start doesn't accept tech_id; patch after insert if provided.
        // Reload master first, then resolve the active assignment ID from fresh rows.
        await loadMaster();
        if (tech_id) {
          const rows = (master ?? null) as any;
          const next = findActiveAssignment(Array.isArray(rows) ? rows : null, personId) ?? null;
          const newAid = norm((next as any)?.assignment_id);

          if (newAid) {
            await callRpc("assignment_patch", { p_assignment_id: newAid, p_patch: { tech_id, pc_org_id: pcOrgId } }, "public");
            await loadMaster();
          }
        }

        setEditingAssignment(false);
        return;
      }

      // PATCH EXISTING
      const editableKeys = ["office_id", "position_title", "tech_id", "start_date", "end_date", "active"] as const;

      const base = assignmentBaseline ?? (masterForPerson as any) ?? {};
      const draft = assignmentDraft ?? {};

      // IMPORTANT: include pc_org_id for guardrails (this was your “Missing pc_org_id” regression)
      const p_patch: any = { pc_org_id: pcOrgId };

      for (const k of editableKeys) {
        const before = base?.[k] ?? null;
        let after: any = draft?.[k] ?? null;

        if (typeof after === "string" && after.trim() === "") after = null;

        // Honor office dirty + everything else
        if (normCmp(before) !== normCmp(after)) {
          p_patch[k] = after;
        }
      }

      // Only call if something actually changed besides pc_org_id
      const changedKeys = Object.keys(p_patch).filter((k) => k !== "pc_org_id");
      if (changedKeys.length > 0) {
        await callRpc("assignment_patch", { p_assignment_id: aid, p_patch }, "public");
        await loadMaster();
      }

      setEditingAssignment(false);
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }, [
    editingAssignment,
    assignmentDraft,
    assignmentBaseline,
    assignmentId,
    assignmentValidation,
    canEdit,
    pcOrgId,
    personId,
    defaultPositionTitle,
    masterForPerson,
    callRpc,
    loadMaster,
    master,
  ]);

  useEffect(() => {
    if (!open) {
      didHydrateRef.current = false;
      setEditingAssignment(false);
      setSavingAssignment(false);
      setAssignmentErr(null);
      setAssignmentBaseline(null);
      setAssignmentDraft(null);
      return;
    }
    if (didHydrateRef.current) return;

    didHydrateRef.current = true;

    loadMaster();
    loadPositionTitles();
    loadOffices();
  }, [open, loadMaster, loadPositionTitles, loadOffices]);

  useEffect(() => {
    if (!open) return;
    if (editingAssignment) return;

    if (masterForPerson) {
      setAssignmentDraft(masterForPerson as any);
    } else {
      setAssignmentDraft(null);
    }
  }, [open, editingAssignment, masterForPerson]);

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

    beginEditAssignment,
    cancelEditAssignment,

    assignmentDirty,
    assignmentValidation,
    saveAssignment,

    // lifecycle (NO end button)
    startAssignment: beginEditAssignment,
    startingAssignment: false,
    endAssignment: undefined,
    endingAssignment: false,

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