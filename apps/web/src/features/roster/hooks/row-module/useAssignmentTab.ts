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

/**
 * 🔑 SOURCE-OF-TRUTH RESOLVER
 *
 * If the roster table shows an active assignment,
 * the module MUST agree.
 *
 * Rules:
 *  - same person_id
 *  - end_date is NULL / empty
 *  - no guessing on assignment_id variants
 *  - DB view semantics win
 */
function findActiveAssignment(
  rows: RosterMasterRow[] | null,
  personId: string | null
) {
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
      const res = await fetch(`/api/meta/offices?pc_org_id=${pcOrgId}`);
      const json = await res.json().catch(() => ({}));
      const rows = Array.isArray(json?.rows) ? json.rows : [];

      setOfficeOptions(
        rows.map((o: any) => ({
          id: String(o.id ?? o.office_id),
          label: String(o.office_name ?? o.name ?? o.id),
          sublabel: o.sublabel ? String(o.sublabel) : undefined,
        }))
      );
    } catch (e: any) {
      setOfficeError(e?.message ?? "Failed to load offices");
      setOfficeOptions([]);
    } finally {
      setOfficeLoading(false);
    }
  }, [pcOrgId]);

  /* ------------------------------ derived ------------------------------ */

  const positionTitleOptions = useMemo(() => {
    return [...positionTitles].sort((a, b) => {
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

  const masterForPerson = useMemo(
    () => findActiveAssignment(master, personId),
    [master, personId]
  );

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
  }, [open, loadMaster, loadPositionTitles, loadOffices]);

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