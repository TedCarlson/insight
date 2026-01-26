// apps/web/src/components/roster/RosterRowModule.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PersonRow, type RosterDrilldownRow, type RosterMasterRow, type RosterRow } from "@/lib/api";

import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Notice } from "@/components/ui/Notice";


type TabKey = "person" | "assignment" | "leadership" | "invite";

function formatJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function hasOwn(obj: any, key: string) {
  return obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key);
}

function KVRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-12 gap-2 text-sm">
      <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
      <div className="col-span-8 break-words">{value ?? "—"}</div>
    </div>
  );
}

function CollapsibleJson({ obj, label }: { obj: any; label: string }) {
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">{label}</summary>
        <pre
          className="mt-2 max-h-[360px] overflow-auto rounded border p-3 text-xs"
          style={{ borderColor: "var(--to-border)" }}
        >
          {formatJson(obj)}
        </pre>
      </details>
    </Card>
  );
}

function AllFieldsCard({ title, obj, emptyHint }: { title: string; obj: any; emptyHint?: string }) {
  const rows = useMemo(() => {
    if (!obj) return [];
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({ k, v: (obj as any)[k] }));
  }, [obj]);

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {!obj ? (
        <div className="text-sm text-[var(--to-ink-muted)]">{emptyHint ?? "No data."}</div>
      ) : rows.length ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <KVRow key={r.k} label={r.k} value={r.v} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--to-ink-muted)]">No fields.</div>
      )}
    </Card>
  );
}

function buildTitle(row: RosterRow | null) {
  if (!row) return "Roster Row";

  // Prefer a human name if present
  const name =
    (hasOwn(row, "person_name") && (row as any).person_name) ||
    (hasOwn(row, "full_name") && (row as any).full_name) ||
    (hasOwn(row, "display_name") && (row as any).display_name) ||
    null;

  const assignment =
    (hasOwn(row, "assignment_name") && (row as any).assignment_name) ||
    (hasOwn(row, "role") && (row as any).role) ||
    null;

  if (name && assignment) return `${name} — ${assignment}`;
  if (name) return String(name);
  if (assignment) return String(assignment);
  return "Roster Row";
}


function rowFallbackFullName(row: any): string | null {
  return (
    (row && (row.full_name ?? row.person_name ?? row.display_name)) ??
    null
  );
}

function seedPersonFromRow(row: any): any | null {
  if (!row) return null;
  const person_id = row.person_id ?? row.personId ?? null;
  if (!person_id) return null;

  const seed: any = {
    person_id,
    full_name: rowFallbackFullName(row),
    emails: row.emails ?? null,
    mobile: row.mobile ?? null,
    fuse_emp_id: row.fuse_emp_id ?? null,
    person_notes: row.person_notes ?? null,
    person_nt_login: row.person_nt_login ?? null,
    person_csg_id: row.person_csg_id ?? null,
    active: row.active ?? row.person_active ?? null,
    role: row.co_type ?? row.role ?? null,
    co_code: row.co_code ?? null,
    co_ref_id: row.co_ref_id ?? null,
  };

  return seed;
}

function ensurePersonIdentity(obj: any, row: any): any {
  const next: any = { ...(obj ?? {}) };

  const pid = next.person_id ?? row?.person_id ?? null;
  if (pid && !next.person_id) next.person_id = pid;

  const fn = next.full_name ?? rowFallbackFullName(row);
  if (fn && (next.full_name == null || next.full_name === "")) next.full_name = fn;

  return next;
}


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

  // Position title lookup (shared rules with OnboardWizardModal to prevent free-text drift)
  type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
  const [positionTitles, setPositionTitles] = useState<PositionTitleRow[]>([]);
  const [positionTitlesLoading, setPositionTitlesLoading] = useState(false);
  const [positionTitlesError, setPositionTitlesError] = useState<string | null>(null);

  const loadPositionTitles = async () => {
    setPositionTitlesLoading(true);
    setPositionTitlesError(null);
    try {
      const res = await fetch("/api/meta/position-titles", { method: "GET" });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `Failed to load position titles (${res.status})`);
      }
      const titles = Array.isArray(json?.titles) ? (json.titles as any[]) : [];
      setPositionTitles(
        titles
          .filter((t) => t && typeof t.position_title === "string")
          .map((t) => ({
            position_title: String(t.position_title),
            sort_order: t.sort_order ?? null,
            active: t.active ?? null,
          }))
      );
    } catch (e: any) {
      setPositionTitles([]);
      setPositionTitlesError(e?.message ?? "Failed to load position titles");
    } finally {
      setPositionTitlesLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (tab !== "assignment") return;
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
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [inviteErr, setInviteErr] = useState<string | null>(null);

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
  }, [open, inferredEmail]);

  async function sendInvite() {
    if (!assignmentId) {
      setInviteErr("No assignment_id on this roster row — cannot invite.");
      setInviteStatus("error");
      return;
    }
    const email = String(inviteEmail ?? "").trim();
    if (!email) {
      setInviteErr("Email is required.");
      setInviteStatus("error");
      return;
    }

    setInviteStatus("sending");
    setInviteErr(null);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, assignment_id: String(assignmentId) }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          (res.status === 403 ? "Not authorized to invite." : "Invite failed.");
        setInviteErr(String(msg));
        setInviteStatus("error");
        return;
      }

      setInviteStatus("sent");
      // Close modal to return to roster scanning workflow
      onClose();
    } catch (e: any) {
      setInviteErr(e?.message ?? "Invite failed.");
      setInviteStatus("error");
    }
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
      { value: "assignment" as const, label: "Assignment" },
      { value: "leadership" as const, label: "Leadership" },
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
  }, [open, row]);


  async function loadPerson() {
    if (!personId) return;
    setLoadingPerson(true);
    setPersonErr(null);
    try {
const data = await api.personGet(String(personId));
const merged = ensurePersonIdentity(data, row as any);
setPerson(merged);

// Derived display (company/contractor name) for co_ref_id/co_code
try {
  const resolved = await api.resolveCoDisplay({
    co_ref_id: (merged as any)?.co_ref_id ?? null,
    co_code: (merged as any)?.co_code ?? null,
  });
  setCoResolved(resolved);
} catch {
  setCoResolved(null);
}

// baseline drives dirty detection; draft is only for editing
setPersonBaseline(merged ? { ...(merged as any) } : null);
setPersonDraft((prev: any | null) => (editingPerson ? prev : merged ? { ...(merged as any) } : null));

    } catch (e: any) {
      setPersonErr(e?.message ?? "Failed to load person");
      setPerson(null);
      setPersonBaseline(null);
      setPersonDraft(null);
    } finally {
      setLoadingPerson(false);
    }
  }

  async function loadMaster() {
    setLoadingMaster(true);
    setMasterErr(null);
    try {
      const data = await api.rosterMaster(pcOrgId);
      setMaster(data ?? []);
    } catch (e: any) {
      setMasterErr(e?.message ?? "Failed to load roster master");
      setMaster(null);
    } finally {
      setLoadingMaster(false);
    }
  }

  async function loadDrilldown() {
    setLoadingDrill(true);
    setDrillErr(null);
    try {
      const data = await api.rosterDrilldown(pcOrgId);
      setDrilldown(data ?? []);
    } catch (e: any) {
      setDrillErr(e?.message ?? "Failed to load roster drilldown");
      setDrilldown(null);
    } finally {
      setLoadingDrill(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // lazy-by-tab: person tab loads person automatically
    if (tab === "person") void loadPerson();
    if (tab === "assignment") void loadMaster();
    if (tab === "leadership") {
      void loadDrilldown();
      // roster_master provides manager candidates for the reporting dropdown
      void loadMaster();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

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
    const match =
      master.find((r: any) => String(r.person_id) === String(personId)) ??
      master.find((r: any) => String(r.assignment_id) === String(assignmentId));
    return match ?? null;
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
    return drilldown.filter((r: any) => (pid && String(r.person_id) === pid) || (aid && String(r.assignment_id) === aid));
  }, [drilldown, personId, assignmentId]);

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
    const childId = String(assignmentId ?? "");
    return rows
      .filter((r) => {
        const aid = String(r?.assignment_id ?? "");
        if (!aid) return false;
        if (childId && aid === childId) return false;
        const active = Boolean(r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true);
        return active;
      })
      .map((r) => {
        const aid = String(r?.assignment_id ?? "");
        const name = (r?.full_name ?? r?.person_name ?? r?.name ?? r?.reports_to_full_name ?? "—") as string;
        const title = (r?.position_title ?? r?.title ?? "") as string;
        const label = title ? `${name} — ${title}` : name;
        return { value: aid, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [master, assignmentId]);

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
      const reportingId = (leadershipContext as any)?.reports_to_reporting_id
        ? String((leadershipContext as any).reports_to_reporting_id)
        : null;

      // Clear manager: end-date the current relationship (cannot null parent_assignment_id).
      if (!selectedParent) {
        if (reportingId) {
          await api.assignmentReportingUpsert({
            assignment_reporting_id: reportingId,
            child_assignment_id: childId,
            parent_assignment_id: baselineParent,
            start_date: (leadershipContext as any)?.reports_to_start_date ?? today,
            end_date: today,
          });
        }
        setEditingLeadership(false);
        await loadDrilldown();
        return;
      }

      // Set/change manager
      await api.assignmentReportingUpsert({
        assignment_reporting_id: reportingId,
        child_assignment_id: childId,
        parent_assignment_id: selectedParent,
        start_date: (leadershipContext as any)?.reports_to_start_date ?? (masterForPerson as any)?.start_date ?? today,
        end_date: null,
      });

      setEditingLeadership(false);
      await loadDrilldown();
    } catch (e: any) {
      setLeadershipErr(e?.message ?? "Failed to save reporting relationship");
    } finally {
      setSavingLeadership(false);
    }
  }


  const refreshCurrent = async () => {
    if (tab === "person") return loadPerson();
    if (tab === "assignment") return loadMaster();
    if (tab === "leadership") return loadDrilldown();
  };

  const refreshing =
    (tab === "person" && loadingPerson) || (tab === "assignment" && loadingMaster) || (tab === "leadership" && loadingDrill);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate">{title}</div>
          <div className="shrink-0 text-xs text-[var(--to-ink-muted)]">
            {pcOrgName ?? "Org"} • {String(pcOrgId).slice(0, 8)}
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
            <div className="space-y-3">
              {personErr ? (
                <Notice variant="danger" title="Could not load person">
                  {personErr}
                </Notice>
              ) : null}

              <Card>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Person (api.person_get) — all fields (human readable)</div>
                    <div className="text-xs text-[var(--to-ink-muted)]">This view is the source of truth. Edit inline to test hydration and write.</div>
                  </div>

                  {!editingPerson ? (
                    <Button onClick={beginEditPerson} disabled={!person || loadingPerson}>
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={cancelEditPerson} disabled={savingPerson}>
                        Cancel
                      </Button>
                      <Button onClick={savePerson} disabled={savingPerson}>
                        {savingPerson ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {!personId ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">No person_id on this roster row.</div>
                ) : loadingPerson && !person ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">Loading person…</div>
                ) : !person ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">No person record returned.</div>
                ) : (
                  <div className="space-y-2">
                    {PERSON_FIELDS.map(({ key, label }) => {
                      const displayPerson = (personHuman ?? person) as any;
                      const src: any = (editingPerson ? personDraft : displayPerson) ?? {};
                      const v = src[key as any];
                      const editable = ["full_name", "emails", "mobile", "fuse_emp_id", "person_notes", "person_nt_login", "person_csg_id", "active"].includes(String(key));

                      if (editingPerson && editable) {
                        if (key === "person_notes") {
                          return (
                            <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                              <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                              <div className="col-span-8">
                                <textarea
                                  className="to-input h-auto min-h-[96px] py-2"
                                  value={(personDraft as any)?.[key] ?? ""}
                                  onChange={(e) =>
                                    setPersonDraft((p: any) => {
                                      const next: any = ensurePersonIdentity(p, row as any);
                                      next[key] = e.target.value;
                                      if (!next.full_name || String(next.full_name).trim() === "") {
                                        const fb = (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                                        if (fb) next.full_name = fb;
                                      }
                                      return next;
                                    })
                                  }
                                />
                              </div>
                            </div>
                          );
                        }

                        if (key === "active") {
                          return (
                            <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                              <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                              <div className="col-span-8">
                                <SegmentedControl
                                  value={String(Boolean((personDraft as any)?.active))}
                                  onChange={(next) =>
                                    setPersonDraft((p: any) => {
                                      const n: any = ensurePersonIdentity(p, row as any);
                                      n.active = next === "true";
                                      if (!n.full_name || String(n.full_name).trim() === "") {
                                        const fb = (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                                        if (fb) n.full_name = fb;
                                      }
                                      return n;
                                    })
                                  }
                                  options={[
                                    { value: "true", label: "Active" },
                                    { value: "false", label: "Inactive" },
                                  ]}
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                            <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                            <div className="col-span-8">
                              <TextInput
                                value={(personDraft as any)?.[key] ?? ""}
                                onChange={(e) =>
                                  setPersonDraft((p: any) => {
                                    const next: any = ensurePersonIdentity(p, row as any);
                                    next[key] = e.target.value;
                                    if (key !== "full_name" && (!next.full_name || String(next.full_name).trim() === "")) {
                                      const fb = (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                                      if (fb) next.full_name = fb;
                                    }
                                    return next;
                                  })
                                }
                              />
                            </div>
                          </div>
                        );
                      }

                      const display = key === "active" ? (Boolean(v) ? "Active" : "Inactive") : v ?? "—";
                      return <KVRow key={String(key)} label={label} value={display} />;
                    })}
                  </div>
                )}
              </Card>

              {person ? (
                <Card title="Company / Role">
                  <div className="space-y-1">
                    <KVRow
                      label="Organization"
                      value={coResolved?.name ?? (person as any)?.co_code ?? (person as any)?.co_ref_id ?? "—"}
                    />
                    <KVRow label="Type" value={coResolved?.kind ?? (row as any)?.co_type ?? "—"} />
                    <KVRow label="Role" value={(person as any)?.role ?? (row as any)?.role ?? "—"} />
                    <KVRow label="Code" value={(person as any)?.co_code ?? "—"} />
                  </div>
                </Card>
              ) : null}

</div>
          ) : null}

          

          {tab === "invite" ? (
            <div className="space-y-3">
              <Card title="Invite to app">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--to-ink-muted)]">
                      Sends a Supabase invite email to this person. (Owner-only for launch; managers+ later.)
                    </div>
                    <div className="text-xs text-[var(--to-ink-muted)]">
                      Status:{" "}
                      <span
                        className={
                          invitePill.tone === "success"
                            ? "text-[var(--to-status-success)]"
                            : invitePill.tone === "danger"
                            ? "text-[var(--to-status-danger)]"
                            : "text-[var(--to-ink-muted)]"
                        }
                      >
                        {invitePill.label}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={sendInvite}
                    disabled={inviteStatus === "sending" || !assignmentId || !String(inviteEmail ?? "").trim()}
                  >
                    {inviteStatus === "sending" ? "Sending…" : inviteStatus === "sent" ? "Resend invite" : "Send invite"}
                  </Button>
                </div>

                {!assignmentId ? (
                  <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
                    This roster row has no <code className="px-1">assignment_id</code>. Add an assignment before inviting.
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-4 text-[var(--to-ink-muted)]">Email</div>
                  <div className="col-span-8">
                    <TextInput value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={inferredEmail || "name@company.com"} />
                    <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                      Prefilled from the person record. Edit before sending if needed.
                    </div>
                  </div>
                </div>

                {inviteErr ? (
                  <div className="mt-3">
                    <Notice variant="danger" title="Invite failed">
                      {inviteErr}
                    </Notice>
                  </div>
                ) : null}
              </Card>
            </div>
          ) : null}

{tab === "assignment" ? (
            <div className="space-y-3">
              {masterErr ? (
                <Notice variant="danger" title="Could not load roster master">
                  {masterErr}
                </Notice>
              ) : null}

              {assignmentErr ? (
                <Notice variant="danger" title="Could not save assignment">
                  {assignmentErr}
                </Notice>
              ) : null}

              <Card title="Assignment">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--to-ink-muted)]">
                      Assignment is the source of truth for position + dates. Edit inline to confirm hydration and write.
                    </div>
                    {!masterForPerson && !loadingMaster ? (
                      <div className="text-sm text-[var(--to-ink-muted)]">No matching assignment row found.</div>
                    ) : null}
                  </div>

                  {!editingAssignment ? (
                    <Button onClick={beginEditAssignment} disabled={!masterForPerson || loadingMaster}>
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={cancelEditAssignment} disabled={savingAssignment}>
                        Cancel
                      </Button>
                      <Button
                        onClick={saveAssignment}
                        disabled={savingAssignment || !assignmentDirty || !assignmentValidation.ok}
                      >
                        {savingAssignment ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {loadingMaster && !masterForPerson ? (
                  <div className="mt-3 text-sm text-[var(--to-ink-muted)]">Loading roster master…</div>
                ) : masterForPerson ? (
                  <div className="mt-3 space-y-2">
                    {/* Position title */}
                    {editingAssignment ? (
                      <div className="grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-4 text-[var(--to-ink-muted)]">Position title</div>
                        <div className="col-span-8">
                          {positionTitlesError ? (
                            <div className="mb-2">
                              <Notice variant="danger" title="Could not load position titles">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm">{positionTitlesError}</div>
                                  <Button variant="ghost" onClick={loadPositionTitles} disabled={positionTitlesLoading}>
                                    Retry
                                  </Button>
                                </div>
                              </Notice>
                            </div>
                          ) : null}

                          <Select
                            value={(assignmentDraft as any)?.position_title ?? ""}
                            onChange={(e) =>
                              setAssignmentDraft((a: any) => ({
                                ...(a ?? {}),
                                position_title: e.target.value,
                              }))
                            }
                            disabled={positionTitlesLoading}
                          >
                            <option value="">
                              {positionTitlesLoading ? "Loading titles…" : "Select a title…"}
                            </option>
                            {positionTitleOptions.map((t) => (
                              <option key={t.position_title} value={t.position_title}>
                                {t.position_title}
                              </option>
                            ))}
                          </Select>
                          <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                            (This references <code className="px-1">position_title</code> lookup; save will fail if invalid.)
                          </div>
                        </div>
                      </div>
                    ) : (
                      <KVRow label="Position title" value={(masterForPerson as any)?.position_title ?? "—"} />
                    )}

                    {/* Tech ID (optional) */}
                    {editingAssignment ? (
                      <div className="grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-4 text-[var(--to-ink-muted)]">Tech ID</div>
                        <div className="col-span-8">
                          <TextInput
                            value={(assignmentDraft as any)?.tech_id ?? ""}
                            onChange={(e) =>
                              setAssignmentDraft((a: any) => ({
                                ...(a ?? {}),
                                tech_id: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <KVRow label="Tech ID" value={(masterForPerson as any)?.tech_id ?? (row as any)?.tech_id ?? "—"} />
                    )}

                    {/* Start date (required) */}
                    {editingAssignment ? (
                      <div className="grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-4 text-[var(--to-ink-muted)]">Start date</div>
                        <div className="col-span-8">
                          <input
                            className="to-input"
                            type="date"
                            value={(assignmentDraft as any)?.start_date ?? ""}
                            onChange={(e) =>
                              setAssignmentDraft((a: any) => ({
                                ...(a ?? {}),
                                start_date: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <KVRow label="Start date" value={(masterForPerson as any)?.start_date ?? "—"} />
                    )}

                    {/* End date (optional) */}
                    {editingAssignment ? (
                      <div className="grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-4 text-[var(--to-ink-muted)]">End date</div>
                        <div className="col-span-8">
                          <input
                            className="to-input"
                            type="date"
                            value={(assignmentDraft as any)?.end_date ?? ""}
                            onChange={(e) =>
                              setAssignmentDraft((a: any) => ({
                                ...(a ?? {}),
                                end_date: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <KVRow label="End date" value={(masterForPerson as any)?.end_date ?? "—"} />
                    )}

                    {/* Active */}
                    {editingAssignment ? (
                      <div className="grid grid-cols-12 gap-2 text-sm">
                        <div className="col-span-4 text-[var(--to-ink-muted)]">Status</div>
                        <div className="col-span-8">
                          <SegmentedControl
                            value={String(
                              Boolean(
                                (assignmentDraft as any)?.active ?? (assignmentDraft as any)?.assignment_active
                              )
                            )}
                            onChange={(next) =>
                              setAssignmentDraft((a: any) => ({
                                ...(a ?? {}),
                                active: next === "true",
                              }))
                            }
                            options={[
                              { value: "true", label: "Active" },
                              { value: "false", label: "Inactive" },
                            ]}
                          />
                        </div>
                      </div>
                    ) : (
                      <KVRow
                        label="Status"
                        value={
                          Boolean((masterForPerson as any)?.active ?? (masterForPerson as any)?.assignment_active)
                            ? "Active"
                            : "Inactive"
                        }
                      />
                    )}

                    {/* Reporting (read-only) */}
                    <KVRow label="Reports to" value={(masterForPerson as any)?.reports_to_full_name ?? "—"} />
                  </div>
                ) : null}

                {editingAssignment && !assignmentValidation.ok ? (
                  <div className="mt-3 text-sm text-[var(--to-status-danger)]">{assignmentValidation.msg}</div>
                ) : null}
              </Card>
            </div>
          ) : null}

          {tab === "leadership" ? (
            <div className="space-y-3">
              {drillErr ? (
                <Notice variant="danger" title="Could not load roster drilldown">
                  {drillErr}
                </Notice>
              ) : null}

              {leadershipErr ? (
                <Notice variant="danger" title="Could not save leadership">
                  {leadershipErr}
                </Notice>
              ) : null}

              <Card title="Leadership">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--to-ink-muted)]">
                      Reporting relationship is stored in <code className="px-1">Assignment</code>. Edit ends current and starts new.
                    </div>
                    {loadingDrill && !drillForPerson.length ? (
                      <div className="text-sm text-[var(--to-ink-muted)]">Loading leadership…</div>
                    ) : null}
                  </div>

                  {!editingLeadership ? (
                    <Button onClick={beginEditLeadership} disabled={!assignmentId || loadingDrill}>
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={cancelEditLeadership} disabled={savingLeadership}>
                        Cancel
                      </Button>
                      <Button onClick={saveLeadership} disabled={savingLeadership}>
                        {savingLeadership ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {!editingLeadership ? (
                    <>
                      <KVRow label="Reports to" value={leadershipContext.reports_to_full_name ?? "—"} />
                      <KVRow label="Manager assignment_id" value={leadershipContext.reports_to_assignment_id ?? "—"} />
                    </>
                  ) : (
                    <div className="grid grid-cols-12 gap-2 text-sm">
                      <div className="col-span-4 text-[var(--to-ink-muted)]">Reports to</div>
                      <div className="col-span-8 space-y-2">
                        <select
                          className="to-input"
                          value={(leadershipDraft as any)?.reports_to_assignment_id ?? ""}
                          onChange={(e) =>
                            setLeadershipDraft({
                              reports_to_assignment_id: e.target.value,
                            })
                          }
                        >
                          <option value="">— No manager (end current relationship) —</option>
                          {managerOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-[var(--to-ink-muted)]">
                          If you don’t see the right manager here, ensure they have an active assignment in this org.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Keep scaffolding until handshake is verified */}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
