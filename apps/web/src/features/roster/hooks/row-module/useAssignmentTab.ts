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

/* ------------------------------ helpers ------------------------------ */

function todayISODate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function norm(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function isFnMissingError(msg: string) {
  return /function .* does not exist/i.test(msg) || /schema cache/i.test(msg) || /not found/i.test(msg);
}

function shortId(id: unknown) {
  if (id == null) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * If backend only gives UUIDs, never show raw UUID as label.
 * Prefer code/name when available.
 */
function pickOfficeLabel(o: any, id: string): { label: string; sublabel?: string } {
  const candidates: Array<unknown> = [
    o?.label,
    o?.office_name,
    o?.office_label,
    o?.display_name,
    o?.office_display_name,
    o?.name,
    o?.office_code,
    o?.code,
  ];

  const first = candidates.map((v) => String(v ?? "").trim()).find((s) => s.length > 0) ?? "";

  const baseLabel =
    first && !(first === id && isUuidLike(first))
      ? first
      : isUuidLike(id)
        ? shortId(id)
        : first || shortId(id);

  const sub = String(o?.sublabel ?? o?.sub_label ?? "").trim();
  const sublabel = sub ? sub : undefined;

  const code = String(o?.office_code ?? o?.code ?? "").trim();
  if (code && baseLabel && baseLabel !== code && !isUuidLike(baseLabel)) {
    return { label: `${code} • ${baseLabel}`, sublabel };
  }

  return { label: baseLabel, sublabel };
}

/**
 * Source-of-truth resolver:
 *  - same person_id
 *  - end_date is NULL / empty
 */
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

/* ------------------------------ hook ------------------------------ */

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

  // hydrate once per module open
  const didHydrateRef = useRef(false);

  /* ------------------------------ rpc ------------------------------ */

  const callRpc = useCallback(
    async (fn: string, args: Record<string, any> | null, schema: RpcSchema) => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? "";

      const res = await fetch("/api/org/rpc", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ schema, fn, args }),
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

  /* ------------------------------ loaders ------------------------------ */

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

      const rows: OfficeOption[] = (list ?? [])
        .filter((o: any) => o && (o.id || o.office_id))
        .map((o: any) => {
          const id = String(o.id ?? o.office_id);
          const picked = pickOfficeLabel(o, id);
          return {
            id,
            label: picked.label,
            sublabel: picked.sublabel,
          };
        })
        .sort((a: OfficeOption, b: OfficeOption) =>
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

  /* ------------------------------ derived ------------------------------ */

  const positionTitleOptions = useMemo(() => {
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
      null
    );
  }, [positionTitleOptions]);

  const masterForPerson = useMemo(() => findActiveAssignment(master, personId), [master, personId]);
  const canLifecycle = canManage && modifyMode === "open";

  /* ------------------------------ edit flow ------------------------------ */

  const beginEditAssignment = useCallback(() => {
    if (!masterForPerson) return;

    setEditingAssignment(true);
    setAssignmentErr(null);

    const base = masterForPerson as any;
    const draft = { ...base };
    if (!draft.position_title && defaultPositionTitle) {
      draft.position_title = defaultPositionTitle;
    }

    setAssignmentBaseline(base);
    setAssignmentDraft(draft);
  }, [masterForPerson, defaultPositionTitle]);

  const cancelEditAssignment = useCallback(() => {
    setEditingAssignment(false);
    setAssignmentErr(null);
    setAssignmentDraft(assignmentBaseline ?? masterForPerson);
  }, [assignmentBaseline, masterForPerson]);

  // ✅ ANY dirty field => enable Save (no special casing)
  const assignmentDirty = useMemo(() => {
    if (!assignmentBaseline || !assignmentDraft) return false;

    const keys = [
      "office_id",
      "position_title",
      "tech_id",
      "start_date",
      "end_date",
      "active",
    ] as const;

    return keys.some((k) => String((assignmentBaseline as any)?.[k] ?? "") !== String((assignmentDraft as any)?.[k] ?? ""));
  }, [assignmentBaseline, assignmentDraft]);

  // ✅ always present (prevents `reading 'ok'` crash)
  const assignmentValidation = useMemo(() => {
    if (!editingAssignment) return { ok: true as const, msg: "" };
    const start = (assignmentDraft as any)?.start_date ?? null;
    const end = (assignmentDraft as any)?.end_date ?? null;

    if (!start || String(start).trim() === "") return { ok: false as const, msg: "Start date is required." };
    if (end && String(end).trim() !== "" && String(end) < String(start))
      return { ok: false as const, msg: "End date must be on or after start date." };

    return { ok: true as const, msg: "" };
  }, [assignmentDraft, editingAssignment]);

  // ✅ save only changed fields
  const saveAssignment = useCallback(async () => {
    if (!assignmentDraft || !assignmentBaseline) {
      setEditingAssignment(false);
      return;
    }

    if (!assignmentValidation.ok) {
      setAssignmentErr(assignmentValidation.msg);
      return;
    }

    const aid =
      norm((assignmentDraft as any)?.assignment_id) ??
      norm((assignmentBaseline as any)?.assignment_id) ??
      norm((masterForPerson as any)?.assignment_id) ??
      norm(assignmentId);

    if (!aid) {
      setAssignmentErr("No assignment_id on this row.");
      return;
    }

    const editableKeys = [
      "office_id",
      "position_title",
      "tech_id",
      "start_date",
      "end_date",
      "active",
    ] as const;

    const p_patch: any = { pc_org_id: pcOrgId };

    for (const k of editableKeys) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;

      if (typeof after === "string" && after.trim() === "") after = null;
      if (k === "start_date" && after == null) {
        setAssignmentErr("Start date is required.");
        return;
      }

      if (String(before ?? "") !== String(after ?? "")) {
        p_patch[k] = after;
      }
    }

    const changed = Object.keys(p_patch).filter((k) => k !== "pc_org_id");
    if (changed.length === 0) {
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
  }, [
    assignmentDraft,
    assignmentBaseline,
    assignmentId,
    assignmentValidation,
    pcOrgId,
    masterForPerson,
    callRpc,
    loadMaster,
  ]);

  /* ------------------------------ lifecycle ------------------------------ */

  const startAssignment = useCallback(async () => {
    if (masterForPerson) return;

    if (!canLifecycle) return setAssignmentErr("Not allowed.");
    if (!pcOrgId || !personId) return setAssignmentErr("Missing identifiers.");

    setStartingAssignment(true);
    try {
      await callRpcApiThenPublic(
        "assignment_start",
        {
          p_pc_org_id: pcOrgId,
          p_person_id: personId,
          p_position_title: defaultPositionTitle ?? "Technician",
          p_start_date: todayISODate(),
        },
        {
          pc_org_id: pcOrgId,
          person_id: personId,
          position_title: defaultPositionTitle ?? "Technician",
          start_date: todayISODate(),
        }
      );

      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to start assignment");
    } finally {
      setStartingAssignment(false);
    }
  }, [masterForPerson, canLifecycle, pcOrgId, personId, defaultPositionTitle, callRpcApiThenPublic, loadMaster]);

  /* ------------------------------ hydration ------------------------------ */

  useEffect(() => {
    if (!open) {
      didHydrateRef.current = false;
      return;
    }
    if (didHydrateRef.current) return;

    didHydrateRef.current = true;

    loadMaster();
    loadPositionTitles();
    loadOffices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ------------------------------ api ------------------------------ */

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

    startAssignment,
    startingAssignment,

    positionTitlesError,
    positionTitlesLoading,
    positionTitleOptions,

    officeOptions,
    officeLoading,
    officeError,
  };
}