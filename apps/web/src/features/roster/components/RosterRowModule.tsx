//apps/web/src/features/roster/components/RosterRowModule.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PersonRow, type RosterDrilldownRow, type RosterMasterRow, type RosterRow } from "@/lib/api";

import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { AffiliationSelector, type AffiliationOption } from "@/components/affiliation/AffiliationSelector";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/shared/data/supabase/client";

import { PersonTab } from "./row-module/PersonTab";
import { OrgTab } from "./row-module/OrgTab";
import { AssignmentTab } from "./row-module/AssignmentTab";
import { LeadershipTab } from "./row-module/LeadershipTab";
import { InviteTab } from "./row-module/InviteTab";

import {
  loadPositionTitlesAction,
  loadPersonAction,
  loadMasterAction,
  loadDrilldownAction,
  sendInviteAction,
} from "./rosterRowModule.actions";

import {
  type TabKey,
  formatJson,
  hasOwn,
  KVRow,
  CollapsibleJson,
  AllFieldsCard,
  buildTitle,
  rowFallbackFullName,
  seedPersonFromRow,
  ensurePersonIdentity,
} from "./rosterRowModule.helpers";

import { useRosterRowModule } from "./row-module/useRosterRowModule";

export function RosterRowModule({
  open,
  onClose,
  pcOrgId,
  pcOrgName,
  row,
}: {
  open: boolean;
  onClose: () => void;
  pcOrgId: string;
  pcOrgName?: string | null;
  row: RosterRow | null;
}) {
  const [tab, setTab] = useState<TabKey>("person");
  const [orgAssociationEndedAt, setOrgAssociationEndedAt] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const personId = (row as any)?.person_id ?? null;
  const assignmentId = (row as any)?.assignment_id ?? null;

  // Person (primary source = api.person_get)
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [personErr, setPersonErr] = useState<string | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  const [editingPerson, setEditingPerson] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [personBaseline, setPersonBaseline] = useState<any | null>(null);
  const [personDraft, setPersonDraft] = useState<any | null>(null);


  const [coResolved, setCoResolved] = useState<{ kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null>(null);


  const personHuman = useMemo(() => {
    if (!person) return null;
    const base: any = { ...(person as any) };

    const coId = (person as any)?.co_ref_id ?? null;
    const coCode = (person as any)?.co_code ?? null;

    if (coResolved?.name) {
      // Display company/contractor name only (no UUID/code)
      base.co_ref_id = coResolved.name;
    }


    return base;
  }, [person, coResolved]);
  // Assignment read model (primary source for assignment tab = api.roster_master)
  const [master, setMaster] = useState<RosterMasterRow[] | null>(null);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Assignment inline-edit (non-destructive, guarded)
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentErr, setAssignmentErr] = useState<string | null>(null);
  const [assignmentBaseline, setAssignmentBaseline] = useState<any | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<any | null>(null);

  // Position title lookup 
  type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

 const loadPositionTitles = async () => {
  await loadPositionTitlesAction({
    pcOrgId,
    setLoading: setPositionTitlesLoading,
    setError: setPositionTitlesError,
    setRows: setPositionTitles,
  });
};

  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment" && tab !== "leadership") return;
    void loadPositionTitles();
  }, [open, tab]);
  const positionTitleOptions = useMemo(() => {
    const list = [...positionTitles];
    // server already sorts, but keep deterministic
    list.sort(
      (a, b) =>
        Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || a.position_title.localeCompare(b.position_title)
    );
    return list;
  }, [positionTitles]);

  const defaultPositionTitle = useMemo(() => {
    // Prefer exact match; fall back to case-insensitive match
    const exact = positionTitleOptions.find((t) => t.position_title === "Technician")?.position_title;
    if (exact) return exact;

    const ci = positionTitleOptions.find((t) => t.position_title.toLowerCase() === "technician")?.position_title;
    return ci ?? null;
  }, [positionTitleOptions]);

  useEffect(() => {
    // Only set a default if nothing is selected yet (prevents clobbering hydration)
    if (!editingAssignment) return;
    if ((assignmentDraft as any)?.position_title) return;
    if (!defaultPositionTitle) return;

    setAssignmentDraft((a: any) => ({ ...(a ?? {}), position_title: defaultPositionTitle }));
  }, [editingAssignment, assignmentDraft, defaultPositionTitle]);

  // Leadership overlays / history (primary source for leadership tab = api.roster_drilldown)
  const [drilldown, setDrilldown] = useState<RosterDrilldownRow[] | null>(null);
  const [drillErr, setDrillErr] = useState<string | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  // Leadership inline-edit (reporting relationship)
  const [editingLeadership, setEditingLeadership] = useState(false);
  const [savingLeadership, setSavingLeadership] = useState(false);
  const [leadershipErr, setLeadershipErr] = useState<string | null>(null);
  const [leadershipBaseline, setLeadershipBaseline] = useState<any | null>(null);
  const [leadershipDraft, setLeadershipDraft] = useState<any | null>(null);


  const title = useMemo(() => buildTitle(row), [row]);

  const selectionContext = useMemo(() => {
    return {
      pc_org_id: pcOrgId,
      pc_org_name: pcOrgName ?? null,
      person_id: personId,
      assignment_id: assignmentId,
    };
  }, [pcOrgId, pcOrgName, personId, assignmentId]);


  // Invite workflow (email is sent by server route; server enforces owner-only for launch)
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  // Keep modal open + show wiring on success
  const [inviteOk, setInviteOk] = useState<string | null>(null);



  const inferredEmail = useMemo(() => {
    const s =
      String((person as any)?.emails ?? (row as any)?.emails ?? (row as any)?.email ?? "").trim();
    if (!s) return "";
    const first = s
      .split(/[;,\n]+/)
      .map((x) => x.trim())
      .filter(Boolean)[0];
    return first ?? "";
  }, [person, row]);

  useEffect(() => {
    if (!open) return;
    // Seed invite email from the person row (editable)
    setInviteEmail((prev) => prev || inferredEmail);
    setInviteStatus("idle");
    setInviteErr(null);
    setInviteOk(null);
  }, [open, inferredEmail]);

  async function sendInvite() {
  await sendInviteAction({
    assignmentId: assignmentId ? String(assignmentId) : "",
    email: String(inviteEmail ?? ""),

    setStatus: setInviteStatus,
    setErr: setInviteErr,
    setOk: setInviteOk,
  });
}


  const invitePill = useMemo(() => {
    if (inviteStatus === "sending") return { label: "Sending…", tone: "neutral" as const };
    if (inviteStatus === "sent") return { label: "Sent", tone: "success" as const };
    if (inviteStatus === "error") return { label: "Error", tone: "danger" as const };
    return { label: "Not sent", tone: "neutral" as const };
  }, [inviteStatus]);
  const PERSON_FIELDS = [
    { key: "full_name", label: "Full name" },
    { key: "emails", label: "Emails" },
    { key: "mobile", label: "Mobile" },
    { key: "fuse_emp_id", label: "Fuse employee ID" },
    { key: "person_nt_login", label: "NT login" },
    { key: "person_csg_id", label: "CSG ID" },
    { key: "active", label: "Status" },
    { key: "person_notes", label: "Notes" },
  ] as const;

  const options = useMemo(
    () => [
      { value: "person" as const, label: "Person" },
      { value: "org" as const, label: "Org" },
      { value: "leadership" as const, label: "Leadership" },
      { value: "assignment" as const, label: "Assignments" },
      { value: "invite" as const, label: "Invite" },
    ],
    []
  );


  useEffect(() => {
    if (!open) return;

    // Reset module state when opening a new row
    setTab("person");

    // IMPORTANT: seed identity from the roster row so drafts never degrade to null
    const seeded = ensurePersonIdentity(seedPersonFromRow(row as any), row as any);

    setPerson(seeded?.person_id ? (seeded as any) : null);
    setPersonBaseline(seeded?.person_id ? { ...(seeded as any) } : null);
    setPersonDraft(seeded?.person_id ? { ...(seeded as any) } : null);

    setPersonErr(null);
    setLoadingPerson(false);
    setEditingPerson(false);
    setSavingPerson(false);

    setMaster(null);
    setMasterErr(null);
    setLoadingMaster(false);

    setDrilldown(null);
    setDrillErr(null);
    setLoadingDrill(false);
    setOrgAssociationEndedAt(null);
  }, [open, row]);


  async function loadPerson() {
    if (!personId) return;

    await loadPersonAction({
      personId: String(personId),
      row: row as any,
      editingPerson,
      ensurePersonIdentity,

      setLoading: setLoadingPerson,
      setErr: setPersonErr,

      setPerson,
      setBaseline: setPersonBaseline,
      setDraft: setPersonDraft,

      setCoResolved,
    });
  }

  async function loadMaster() {
  await loadMasterAction({
    pcOrgId,
    setLoading: setLoadingMaster,
    setErr: setMasterErr,
    setRows: setMaster,
  });
}

  async function loadDrilldown() {
  await loadDrilldownAction({
    pcOrgId,
    setLoading: setLoadingDrill,
    setErr: setDrillErr,
    setRows: setDrilldown,
  });
}

  useEffect(() => {
    if (!open) return;

    // Hydrate status pills immediately on open (even if user never visits these tabs)
    void loadMaster();
    void loadDrilldown();

    // Lazy-by-tab: only fetch the person row when the Person tab is active
    if (tab === "person") void loadPerson();

    // Other tabs reuse the hydrated master/drilldown state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, pcOrgId]);


  function beginEditPerson() {
    if (!person) return;
    setEditingPerson(true);
    const merged = ensurePersonIdentity(person, row as any);
    setPersonBaseline({ ...(merged as any) });
    setPersonDraft({ ...(merged as any) });
  }

  function cancelEditPerson() {
    setEditingPerson(false);
    setPersonDraft(personBaseline ? { ...personBaseline } : person ? { ...(person as any) } : null);
  }

  async function savePerson() {
    if (!personId || !personBaseline || !personDraft) {
      setEditingPerson(false);
      return;
    }

    // Only these fields are editable inline; everything else is display-only.
    const editableKeys = [
      "full_name",
      "emails",
      "mobile",
      "fuse_emp_id",
      "person_notes",
      "person_nt_login",
      "person_csg_id",
      "active",
      // Affiliation + derived fields
      "co_ref_id",
      "co_code",
      "role",
    ] as const;

    const patch: any = { person_id: String(personId) };

    // Guardrails: ensure identity fields never degrade to null.
    const fallbackName =
      (personBaseline as any)?.full_name ?? (personDraft as any)?.full_name ?? rowFallbackFullName(row as any);

    if (!fallbackName || String(fallbackName).trim() === "") {
      setPersonErr("Full name is required.");
      setEditingPerson(false);
      return;
    }

    for (const k of editableKeys) {
      const before = (personBaseline as any)[k];
      const after = (personDraft as any)[k];

      const isBool = k === "active";
      const normBefore = isBool ? Boolean(before) : before === "" ? null : before ?? null;
      const normAfter = isBool ? Boolean(after) : after === "" ? null : after ?? null;

      if (normAfter !== normBefore) patch[k] = normAfter;
    }

    // No dirty fields
    if (Object.keys(patch).length === 1) {
      setEditingPerson(false);
      return;
    }

    // Always send a non-null full_name whenever we write (prevents NOT NULL failures on insert-path upserts)
    if (!("full_name" in patch) || patch.full_name == null || String(patch.full_name).trim() === "") {
      const draftName = (personDraft as any)?.full_name ?? fallbackName;
      if (!draftName || String(draftName).trim() === "") {
        setPersonErr("Full name is required.");
        return;
      }
      patch.full_name = String(draftName);
    }

    setSavingPerson(true);
    setPersonErr(null);
    try {
      const updated = await api.personUpsertWithGrants(patch);
      setEditingPerson(false);
      if (updated) {
        setPerson(updated);
        setPersonBaseline({ ...(updated as any) });
        setPersonDraft({ ...(updated as any) });

        // Refresh derived display for Company/Contractor name + kind
        try {
          const resolved = await api.resolveCoDisplay({
            co_ref_id: (updated as any)?.co_ref_id ?? null,
            co_code: (updated as any)?.co_code ?? null,
          });
          setCoResolved(resolved);
        } catch {
          setCoResolved(null);
        }
      } else {
        await loadPerson();
      }
    } catch (e: any) {
      setPersonErr(e?.message ?? "Failed to save person");
    } finally {
      setSavingPerson(false);
    }
  }

  const masterForPerson = useMemo(() => {
    if (!master || !master.length || !personId) return null;

    const pid = String(personId);
    const aid = assignmentId ? String(assignmentId) : null;

    const isActive = (r: any) => {
      const end = String(r?.end_date ?? "").trim();
      const active = r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true;
      return !end && Boolean(active);
    };

    const activeMatches = (master as any[]).filter((r) => String(r.person_id) === pid).filter(isActive);
    if (activeMatches.length > 0) return activeMatches[0] as any;

    const byAssignment =
      (aid ? (master as any[]).find((r) => String(r.assignment_id) === aid && isActive(r)) : null) ?? null;

    return byAssignment ?? null;
  }, [master, personId, assignmentId]);


  useEffect(() => {
    // Keep baseline/draft synced to the loaded record (but don't clobber while editing).
    if (!masterForPerson) {
      setAssignmentBaseline(null);
      setAssignmentDraft(null);
      setEditingAssignment(false);
      return;
    }
    if (!editingAssignment) {
      setAssignmentBaseline(masterForPerson);
      setAssignmentDraft(masterForPerson);
    }
  }, [masterForPerson, editingAssignment]);

  const assignmentDirty = useMemo(() => {
    if (!assignmentBaseline || !assignmentDraft) return false;
    const keys = ["position_title", "start_date", "end_date", "active", "tech_id"];
    return keys.some((k) => {
      const a = (assignmentBaseline as any)?.[k] ?? null;
      const b = (assignmentDraft as any)?.[k] ?? null;
      return String(a ?? "") !== String(b ?? "");
    });
  }, [assignmentBaseline, assignmentDraft]);

  const assignmentValidation = useMemo(() => {
    const start = (assignmentDraft as any)?.start_date ?? null;
    const end = (assignmentDraft as any)?.end_date ?? null;

    if (!start || String(start).trim() === "") return { ok: false, msg: "Start date is required." };

    // YYYY-MM-DD lexical compare works for date ordering.
    if (end && String(end).trim() !== "" && String(end) < String(start)) {
      return { ok: false, msg: "End date must be on or after start date." };
    }

    return { ok: true as const, msg: "" };
  }, [assignmentDraft]);

  function beginEditAssignment() {
    if (!masterForPerson) return;
    setAssignmentErr(null);
    setEditingAssignment(true);
    setAssignmentBaseline(masterForPerson);
    setAssignmentDraft(masterForPerson);
  }

  function cancelEditAssignment() {
    setAssignmentErr(null);
    setEditingAssignment(false);
    setAssignmentDraft(assignmentBaseline ?? masterForPerson);
  }

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

    // Build a minimal patch (only changed fields).
    const editableKeys = ["position_title", "start_date", "end_date", "active", "tech_id"] as const;
    const patch: any = { assignment_id: aid };

    for (const k of editableKeys) {
      const before = (assignmentBaseline as any)?.[k] ?? null;
      let after: any = (assignmentDraft as any)?.[k] ?? null;

      // Normalize empty strings => null for nullable columns (end_date, position_title, tech_id)
      if (typeof after === "string" && after.trim() === "") after = null;

      // start_date is NOT NULL in schema; keep it as string
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

      // Refetch master to confirm handshake end-to-end
      await loadMaster();
    } catch (e: any) {
      setAssignmentErr(e?.message ?? "Failed to save assignment");
    } finally {
      setSavingAssignment(false);
    }
  }


  const drillForPerson = useMemo(() => {
    if (!drilldown || !drilldown.length) return [];
    const pid = personId ? String(personId) : null;
    const aid = assignmentId ? String(assignmentId) : null;

    const isActiveRel = (r: any) => {
      const end = String(
        (
          r?.reports_to_end_date ??
          r?.assignment_reporting_end_date ??
          r?.reporting_end_date ??
          r?.end_date ??
          ""
        )
      ).trim();
      return !end;
    };


    return drilldown
      .filter((r: any) => (pid && String(r.person_id) === pid) || (aid && String(r.assignment_id) === aid))
      .filter(isActiveRel);
  }, [drilldown, personId, assignmentId]);

  // --- Derived "Set / Not set" signals (active-only, no hard blocks) ---
  const activeAssignmentCount = useMemo(() => {
    if (!Array.isArray(master) || !personId) return 0;
    return (master as any[])
      .filter((r) => String(r?.person_id ?? "") === String(personId))
      .filter((r) => {
        const end = String(r?.end_date ?? "").trim();
        const active = Boolean(r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true);
        return active && !end;
      }).length;
  }, [master, personId]);

  const activeLeadershipCount = useMemo(() => {
    // Prefer source-of-truth for "current" reports-to (same as what Assignment tab displays)
    const m: any = masterForPerson as any;

    const masterHasLeader =
      !!m?.reports_to_assignment_id || !!m?.reports_to_person_id || !!String(m?.reports_to_full_name ?? "").trim();

    // masterForPerson is already active-only; still guard for safety
    const masterActive =
      m &&
      !String(m?.end_date ?? "").trim() &&
      Boolean(m?.active ?? m?.assignment_active ?? m?.assignment_record_active ?? true);

    if (masterHasLeader && masterActive) return 1;

    // Fallback to drilldown-derived view (history overlays)
    if (!Array.isArray(drillForPerson)) return 0;

    return (drillForPerson as any[]).filter((r) => {
      const hasLeader =
        !!r?.reports_to_assignment_id ||
        !!r?.reports_to_person_id ||
        !!String(r?.reports_to_full_name ?? "").trim() ||
        !!r?.reports_to_reporting_id ||
        !!r?.assignment_reporting_id ||
        !!r?.reporting_id;

      const end = String(
        (r?.reports_to_end_date ?? r?.assignment_reporting_end_date ?? r?.reporting_end_date ?? "")
      ).trim();

      return hasLeader && !end;
    }).length;
  }, [masterForPerson, drillForPerson]);


  const leadershipContext = useMemo(() => {
    const first = drillForPerson?.[0] ?? null;

    return {
      child_assignment_id: String(assignmentId ?? (row as any)?.assignment_id ?? ""),
      pc_org_id: String(pcOrgId ?? ""),
      reports_to_full_name:
        (first as any)?.reports_to_full_name ?? (row as any)?.reports_to_full_name ?? null,
      reports_to_assignment_id:
        (first as any)?.reports_to_assignment_id ?? (row as any)?.reports_to_assignment_id ?? null,

      // These exist on roster_row_module_v / roster_current_full (if provided in row)
      reports_to_reporting_id: (row as any)?.reports_to_reporting_id ?? null,
      reports_to_start_date: (row as any)?.reports_to_start_date ?? null,
      reports_to_end_date: (row as any)?.reports_to_end_date ?? null,
    };
  }, [drillForPerson, row, assignmentId, pcOrgId]);

  const toast = useToast();

  const orgStartDate =
    (row as any)?.pc_org_start_date ??
    (row as any)?.org_start_date ??
    (row as any)?.org_event_start_date ??
    (row as any)?.start_date ??
    null;

  function Pill({ label, ok, title }: { label: string; ok: boolean; title: string }) {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
        style={
          ok
            ? { background: "rgba(34, 197, 94, 0.14)", color: "var(--to-status-success)" }
            : { background: "rgba(249, 115, 22, 0.16)", color: "var(--to-status-warning)" }
        }
        title={title}
        aria-label={title}
      >
        {String(label ?? "").slice(0, 1).toUpperCase()}
      </span>
    );
  }



  const recordStatus = useMemo(() => {
    const personOk = !!String((personDraft ?? person ?? {})?.full_name ?? "").trim();



    // "Org" is set when there is a current pcOrgId AND the association is not ended.
    // We use a local "ended" flag to immediately flip pills after the action, without waiting for parent refresh.
    const ended =
      orgAssociationEndedAt ??
      (row as any)?.person_pc_org_end_date ??
      (row as any)?.pc_org_end_date ??
      null;

    const orgOk = !!String(pcOrgId ?? "").trim() && !String(ended ?? "").trim();
    const assignmentOk = activeAssignmentCount > 0;
    const leadershipOk = activeLeadershipCount > 0;

    const missing: string[] = [];
    if (!personOk) missing.push("Person");
    if (!orgOk) missing.push("Org");
    if (!assignmentOk) missing.push("Assignments");
    if (!leadershipOk) missing.push("Leadership");

    return { personOk, orgOk, assignmentOk, leadershipOk, missing, complete: missing.length === 0 };
  }, [personDraft, person, pcOrgId, row, orgAssociationEndedAt, activeAssignmentCount, activeLeadershipCount]);
  const endOrgBlocked = recordStatus.assignmentOk && recordStatus.leadershipOk;

  async function endPcOrgCascade() {
    // NOTE: This does NOT end the PC Org itself (dimension table).
    // It ends THIS PERSON'S association to the current PC Org (person_pc_org).
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

      // Flip Org pill immediately in this overlay session
      setOrgAssociationEndedAt(today);

      await refreshCurrent();

      // Close the overlay so the parent roster re-fetches and the person disappears from the list.
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

  useEffect(() => {
    // Keep baseline/draft in sync while not editing.
    if (!editingLeadership) {
      setLeadershipBaseline(leadershipContext);
      setLeadershipDraft({
        reports_to_assignment_id: leadershipContext.reports_to_assignment_id ? String(leadershipContext.reports_to_assignment_id) : "",
      });
    }
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

    // Determine whether sort_order increases with seniority (preferred) or decreases.
    const techSo = sortOrderByTitle.get("Technician");
    const supSo = sortOrderByTitle.get("Supervisor");
    const sortIncreasesWithSeniority =
      typeof techSo === "number" && typeof supSo === "number" ? techSo < supSo : true;

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

    const childIsITG = isITG({ affiliation: childAff });
    const childIsBP = norm(childTitle).includes("bp") || norm(childAff).includes("bp");
    const childIsContractor = isContractorPerson(childAff);
    const childIsTech = norm(childTitle).includes("technician");
    const childIsSupervisor = norm(childTitle).includes("supervisor");

    const candidatePassesAffiliationRules = (r: any) => {
      // Always allow ITG leadership as available (still rank gated)
      if (isITG(r)) return true;

      // BP position titles should report to ITG (company POC)
      if (childIsBP) return false;

      // ITG/company reports to ITG/company
      if (childIsITG) return false;

      // Contractor logic
      if (childIsContractor) {
        const candAff = String(r?.affiliation ?? r?.co_name ?? r?.company_name ?? r?.contractor_name ?? "");
        const sameContractor = norm(candAff) === norm(childAff);

        // Contractor technicians can report to BP Supervisors when present + ITG fallback (handled above)
        if (childIsTech) {
          const candBP = isBP(r);
          const candSupOrAbove = isHigherRank(String(r?.position_title ?? r?.title ?? "")) || norm(r?.position_title ?? "").includes("supervisor") || norm(r?.position_title ?? "").includes("manager") || norm(r?.position_title ?? "").includes("director");
          if (candBP && candSupOrAbove) return true;
          return sameContractor;
        }

        // Contractor supervisors/managers: same contractor (and ITG fallback already allowed)
        return sameContractor;
      }

      // Default: keep same affiliation (company → company)
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
      // Rank constraint: min next upward rank + all above
      if (!isHigherRank(candTitle)) return false;

      // Affiliation constraint
      return candidatePassesAffiliationRules(r);
    });

    // Safety net: if filtering is too tight, relax progressively so user isn't blocked.
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
    setLeadershipBaseline(leadershipContext);
    setLeadershipDraft({
      reports_to_assignment_id: leadershipContext.reports_to_assignment_id ? String(leadershipContext.reports_to_assignment_id) : "",
    });
  }

  function cancelEditLeadership() {
    setLeadershipErr(null);
    setEditingLeadership(false);
    setLeadershipDraft({
      reports_to_assignment_id: leadershipContext.reports_to_assignment_id ? String(leadershipContext.reports_to_assignment_id) : "",
    });
  }

  async function saveLeadership() {
    const childId = String(assignmentId ?? "");
    if (!childId) {
      setLeadershipErr("No assignment_id for this roster row.");
      setEditingLeadership(false);
      return;
    }

    const selectedParent = String((leadershipDraft as any)?.reports_to_assignment_id ?? "").trim();
    const baselineParent = String((leadershipContext as any)?.reports_to_assignment_id ?? "").trim();

    if (selectedParent === childId) {
      setLeadershipErr("An assignment cannot report to itself.");
      return;
    }

    // No change
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

      // 1) End current relationship if one exists
      if (currentReportingId) {
        await api.assignmentReportingUpsert({
          assignment_reporting_id: currentReportingId,
          child_assignment_id: childId,
          parent_assignment_id: baselineParent || (leadershipContext as any)?.reports_to_assignment_id,
          start_date: currentStartDate || today,
          end_date: today,
        });
      }

      // 2) If user picked a new manager, start a NEW relationship row with start_date=today
      //    (Do NOT reuse old start_date; unique grain is (child, parent, start_date) and start_date must differ for history.)
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
  
  const { refreshCurrent, refreshing } = useRosterRowModule({
  tab,
  loadPerson,
  loadMaster,
  loadDrilldown,
  loadingPerson,
  loadingMaster,
  loadingDrill,
});

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 truncate">{title}</div>
            <div className="shrink-0 text-xs text-[var(--to-ink-muted)]">
              {pcOrgName ?? "Org"} • {String(pcOrgId).slice(0, 8)}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Pill label="P" ok={recordStatus.personOk} title={recordStatus.personOk ? "Person: set" : "Person: not set"} />
            <Pill label="O" ok={recordStatus.orgOk} title={recordStatus.orgOk ? "Org: set" : "Org: not set"} />
            <Pill label="L" ok={recordStatus.leadershipOk} title={recordStatus.leadershipOk ? "Leadership: set" : "Leadership: not set"} />
            <Pill label="A" ok={recordStatus.assignmentOk} title={recordStatus.assignmentOk ? "Assignments: set" : "Assignments: not set"} />
          </div>

        </div>
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {!row ? (
        <div className="text-sm text-[var(--to-ink-muted)]">No row selected.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SegmentedControl value={tab} onChange={setTab} options={options} />
            <div className="flex items-center gap-2">
              <Button variant="secondary" type="button" onClick={refreshCurrent} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>

            </div>
          </div>

          {tab === "person" ? (
            <PersonTab
              row={row as any}
              personId={personId ? String(personId) : null}
              person={person}
              personHuman={personHuman}
              personErr={personErr}
              loadingPerson={loadingPerson}
              editingPerson={editingPerson}
              savingPerson={savingPerson}
              personBaseline={personBaseline}
              personDraft={personDraft}
              setPersonDraft={setPersonDraft as any}
              beginEditPerson={beginEditPerson}
              cancelEditPerson={cancelEditPerson}
              savePerson={savePerson}
              coResolved={coResolved}
              setCoResolved={setCoResolved as any}
            />
          ) : null}

          {tab === "invite" ? (
            <InviteTab
              row={row}
              assignmentId={assignmentId ? String(assignmentId) : null}
              inferredEmail={inferredEmail}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteStatus={inviteStatus}
              invitePill={invitePill}
              inviteErr={inviteErr}
              inviteOk={inviteOk}
              sendInvite={sendInvite}
            />
          ) : null}

          {tab === "org" ? (
            <OrgTab
              row={row}
              pcOrgName={pcOrgName}
              orgStartDate={orgStartDate}
              endOrgBlocked={endOrgBlocked}
              endOrgBlockedTitle={
                endOrgBlocked
                  ? "Cannot end org association while an active Assignment AND Leadership relationship exist. End/close those first."
                  : "End Org association"
              }
              endPcOrgCascade={endPcOrgCascade}
            />
          ) : null}

          {tab === "assignment" ? (
            <AssignmentTab
              masterErr={masterErr}
              assignmentErr={assignmentErr}
              loadingMaster={loadingMaster}
              masterForPerson={masterForPerson}
              row={row as any}
              editingAssignment={editingAssignment}
              savingAssignment={savingAssignment}
              assignmentDraft={assignmentDraft}
              assignmentDirty={assignmentDirty}
              assignmentValidation={assignmentValidation}
              positionTitlesError={positionTitlesError}
              positionTitlesLoading={positionTitlesLoading}
              positionTitleOptions={positionTitleOptions}
              loadPositionTitles={loadPositionTitles}
              beginEditAssignment={beginEditAssignment}
              cancelEditAssignment={cancelEditAssignment}
              saveAssignment={saveAssignment}
              setAssignmentDraft={setAssignmentDraft as any}
            />
          ) : null}

          {tab === "leadership" ? (
              <LeadershipTab
                row={row}
                drillErr={drillErr}
                leadershipErr={leadershipErr}
                loadingDrill={loadingDrill}
                drillForPersonLen={drillForPerson.length}
                editingLeadership={editingLeadership}
                savingLeadership={savingLeadership}
                assignmentId={assignmentId ? String(assignmentId) : null}
                leadershipContext={{
                  reports_to_full_name: leadershipContext.reports_to_full_name ?? null,
                  reports_to_assignment_id: leadershipContext.reports_to_assignment_id
                    ? String(leadershipContext.reports_to_assignment_id)
                    : null,
                }}
                leadershipDraftReportsToAssignmentId={String((leadershipDraft as any)?.reports_to_assignment_id ?? "")}
                managerOptions={managerOptions}
                beginEditLeadership={beginEditLeadership}
                cancelEditLeadership={cancelEditLeadership}
                saveLeadership={saveLeadership}
                setLeadershipDraftReportsToAssignmentId={(v) => setLeadershipDraft({ reports_to_assignment_id: v })}
              />
            ) : null}
        </div>
      )}
    </Modal>
  );
}