// apps/web/src/features/roster/OnboardDrawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AdminOverlay from "@/app/(prod)/_shared/AdminOverlay";
import { fetchCompanyOptions, type CompanyOption } from "@/app/(prod)/_shared/dropdowns";
import { createClient } from "@/app/(prod)/_shared/supabase";

import type { RosterRow } from "@/features/roster/RosterPageShell";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LeadershipInspector from "@/app/(prod)/leadership/LeadershipInspector";

// ---------------------------------------------
// Types
// ---------------------------------------------
export type UnassignedPersonRow = {
  person_id: string;
  full_name: string | null;
  emails: unknown;
  mobile: string | null;
  person_active: boolean | null;
  person_role: string | null;
};

type Stage = "person" | "assignment" | "leadership" | "review";

type DerivedAffiliation =
  | {
      employer_type: "company" | "contractor";
      co_ref_id: string;
      employer_code: string;
    }
  | null;

// ---------------------------------------------
// UI helpers
// ---------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function TabButton(props: { active: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(
        "rounded-xl border px-3 py-1.5 text-sm transition",
        "border-[var(--to-border)]",
        props.active ? "bg-[var(--to-surface-soft)]" : "bg-[var(--to-surface)] hover:bg-[var(--to-surface-soft)]",
        props.disabled ? "opacity-60 cursor-not-allowed" : ""
      )}
    >
      {props.label}
    </button>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label}</div>
      <input
        type={props.type ?? "text"}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={cx(
          "mt-1 w-full rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm",
          props.disabled ? "opacity-60 cursor-not-allowed" : ""
        )}
      />
    </label>
  );
}

function Textarea(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label}</div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        rows={4}
        className="mt-1 w-full resize-none rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
      />
    </label>
  );
}

function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm font-medium">{props.value ? "Active" : "Inactive"}</div>
        <button
          type="button"
          onClick={() => props.onChange(!props.value)}
          className={cx(
            "rounded-xl px-3 py-2 text-sm",
            props.value
              ? "bg-[var(--to-ink)] text-[var(--to-surface)]"
              : "border border-[var(--to-border)] bg-[var(--to-surface)] hover:bg-[var(--to-surface-soft)]"
          )}
        >
          Toggle
        </button>
      </div>
    </div>
  );
}

function Pill(props: { label: string; tone?: "neutral" | "good" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-900 border-emerald-500/20"
      : tone === "warn"
        ? "bg-amber-500/10 text-amber-900 border-amber-500/20"
        : "bg-[var(--to-surface-soft)] text-[var(--to-ink)] border-[var(--to-border)]";
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", cls)}>{props.label}</span>;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function formatEmails(emails: unknown): string {
  if (!emails) return "";
  if (Array.isArray(emails)) return emails.filter((x) => typeof x === "string" && x.trim().length > 0).join(", ");
  if (typeof emails === "string") return emails;
  try {
    return JSON.stringify(emails);
  } catch {
    return String(emails);
  }
}

// ---------------------------------------------
// Affiliation utilities (Company / Contractor)
// ---------------------------------------------
function parseAffiliationKey(v: string): { employer_type: "company" | "contractor"; co_ref_id: string } | null {
  if (!v) return null;
  const idx = v.indexOf(":");
  if (idx <= 0) return null;
  const left = v.slice(0, idx);
  const right = v.slice(idx + 1);
  if ((left !== "company" && left !== "contractor") || !right) return null;
  return { employer_type: left, co_ref_id: right };
}

function deriveAffiliation(v: string, options: CompanyOption[]): DerivedAffiliation {
  const base = parseAffiliationKey(v);
  if (!base) return null;

  const opt = options.find((o) => o.source_type === base.employer_type && o.id === base.co_ref_id) ?? null;
  const employer_code = opt?.code?.trim() || "";
  if (!employer_code) return null;

  return {
    employer_type: base.employer_type,
    co_ref_id: base.co_ref_id,
    employer_code,
  };
}

function AffiliationSelect(props: {
  value: string;
  onChange: (v: string) => void;
  options: CompanyOption[];
  loading: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const disabled = props.disabled || props.loading;

  return (
    <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label ?? "Affiliation (Company / Contractor)"}</div>

      <select
        className="mt-2 w-full rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
        value={props.value}
        disabled={disabled}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">{props.loading ? "Loading…" : "Select affiliation…"}</option>

        {props.options.map((opt) => {
          const encoded = `${opt.source_type}:${opt.id}`;
          const suffix = opt.code ? ` (${opt.code})` : "";
          return (
            <option key={encoded} value={encoded}>
              {opt.label}
              {suffix}
            </option>
          );
        })}
      </select>

      <div className="mt-2 text-xs text-[var(--to-ink-muted)]">{props.value ? "Selected." : "Required to proceed."}</div>
    </div>
  );
}

// ---------------------------------------------
// Session / PC Org context resolution
// ---------------------------------------------
async function resolveSessionContext(supabase: ReturnType<typeof createClient>): Promise<{
  userId: string | null;
  pcOrgId: string | null;
  pcOrgName: string | null;
  source: string | null;
  error: string | null;
}> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { userId: null, pcOrgId: null, pcOrgName: null, source: null, error: userErr.message };
    const user = userData?.user ?? null;
    const userId = user?.id ?? null;

    // 1) Check metadata first (fastest and common for "active org" patterns)
    const meta: any = user?.user_metadata ?? {};
    const appMeta: any = user?.app_metadata ?? {};
    const candidates = [
      meta.pc_org_id,
      meta.active_pc_org_id,
      meta.default_pc_org_id,
      meta.pcOrgId,
      appMeta.pc_org_id,
      appMeta.active_pc_org_id,
      appMeta.default_pc_org_id,
      appMeta.pcOrgId,
    ].filter(Boolean);

    if (candidates.length) {
      return {
        userId,
        pcOrgId: String(candidates[0]),
        pcOrgName: null,
        source: "auth metadata",
        error: null,
      };
    }

    if (!userId) return { userId: null, pcOrgId: null, pcOrgName: null, source: null, error: "No auth user in session." };

    // 2) Try likely profile tables/columns (best-effort; safe if tables don't exist)
    const profileAttempts: Array<{ table: string; idCol: string; orgCol: string; nameCol?: string }> = [
      { table: "user_profile", idCol: "user_id", orgCol: "pc_org_id", nameCol: "pc_org_name" },
      { table: "user_profile", idCol: "user_id", orgCol: "active_pc_org_id", nameCol: "active_pc_org_name" },
      { table: "profiles", idCol: "id", orgCol: "pc_org_id", nameCol: "pc_org_name" },
      { table: "profiles", idCol: "id", orgCol: "active_pc_org_id", nameCol: "active_pc_org_name" },
      { table: "profile", idCol: "id", orgCol: "pc_org_id", nameCol: "pc_org_name" },
      { table: "profile", idCol: "id", orgCol: "active_pc_org_id", nameCol: "active_pc_org_name" },
    ];

    for (const a of profileAttempts) {
      try {
        const sel = a.nameCol ? `${a.orgCol},${a.nameCol}` : a.orgCol;
        const { data, error } = await supabase.from(a.table as any).select(sel).eq(a.idCol as any, userId).maybeSingle();
        if (error) continue;
        const org = (data as any)?.[a.orgCol];
        if (org) {
          return {
            userId,
            pcOrgId: String(org),
            pcOrgName: a.nameCol ? String((data as any)?.[a.nameCol] ?? "") || null : null,
            source: a.table,
            error: null,
          };
        }
      } catch {
        // ignore table not found, etc.
      }
    }

    // 3) Final fallback: if you have a "user_pc_org_membership" style table
    const membershipAttempts: Array<{ table: string; idCol: string; orgCol: string }> = [
      { table: "pc_org_member", idCol: "user_id", orgCol: "pc_org_id" },
      { table: "pc_org_members", idCol: "user_id", orgCol: "pc_org_id" },
      { table: "user_pc_org", idCol: "user_id", orgCol: "pc_org_id" },
      { table: "user_pc_org_membership", idCol: "user_id", orgCol: "pc_org_id" },
    ];

    for (const a of membershipAttempts) {
      try {
        const { data, error } = await supabase.from(a.table as any).select(a.orgCol).eq(a.idCol as any, userId).limit(1);
        if (error) continue;
        const org = (data as any)?.[0]?.[a.orgCol];
        if (org) return { userId, pcOrgId: String(org), pcOrgName: null, source: a.table, error: null };
      } catch {
        // ignore
      }
    }

    return {
      userId,
      pcOrgId: null,
      pcOrgName: null,
      source: null,
      error: "No pc_org_id found in auth metadata or profile tables. Paste a PC Org ID in Assignment step.",
    };
  } catch (e: any) {
    return { userId: null, pcOrgId: null, pcOrgName: null, source: null, error: e?.message ?? "Failed to read session." };
  }
}

// ---------------------------------------------
// Main component
// ---------------------------------------------
export function OnboardDrawer(props: {
  open: boolean;
  onClose: () => void;
  unassigned: UnassignedPersonRow[];
  onOnboarded?: (row: RosterRow) => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // ---------- NEW: session scope ----------
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionPcOrgId, setSessionPcOrgId] = useState<string>("");
  const [sessionPcOrgName, setSessionPcOrgName] = useState<string | null>(null);
  const [sessionScopeSource, setSessionScopeSource] = useState<string | null>(null);
  const [sessionScopeError, setSessionScopeError] = useState<string | null>(null);

  // ---------- stage control ----------
  const [stage, setStage] = useState<Stage>("person");
  const [onboardedRow, setOnboardedRow] = useState<RosterRow | null>(null);

  // ---------- original OnboardDrawer state ----------
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [search, setSearch] = useState("");
  const [localUnassigned, setLocalUnassigned] = useState<UnassignedPersonRow[]>(props.unassigned);

  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Pick mode
  const [picked, setPicked] = useState<UnassignedPersonRow | null>(null);
  const [pickedAffiliationValue, setPickedAffiliationValue] = useState<string>("");

  // Pick-mode extra fields
  const [pickedActive, setPickedActive] = useState(true);
  const [pickedFuseEmpId, setPickedFuseEmpId] = useState("");
  const [pickedNtLogin, setPickedNtLogin] = useState("");
  const [pickedCsgId, setPickedCsgId] = useState("");
  const [pickedNotes, setPickedNotes] = useState("");

  // New person draft
  const [fullName, setFullName] = useState("");
  const [newAffiliationValue, setNewAffiliationValue] = useState<string>("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [newFuseEmpId, setNewFuseEmpId] = useState("");
  const [newNtLogin, setNewNtLogin] = useState("");
  const [newCsgId, setNewCsgId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newActive, setNewActive] = useState(true);

  // UI action state
  const [actionBusy, setActionBusy] = useState<null | "continue" | "create">(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ---------- Assignment draft ----------
  const [assignmentPcOrgId, setAssignmentPcOrgId] = useState<string>(""); // inherited from session
  const [assignmentPositionTitle, setAssignmentPositionTitle] = useState<string>("Technician");
  const [assignmentTechId, setAssignmentTechId] = useState<string>("");
  const [assignmentStartDate, setAssignmentStartDate] = useState<string>("");
  const [assignmentEndDate, setAssignmentEndDate] = useState<string>("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);

  // ---------- Leadership ----------
  const [leadershipOpen, setLeadershipOpen] = useState(false);
  const [leadershipRefreshKey, setLeadershipRefreshKey] = useState(0);
  const [assignmentsForLeadership, setAssignmentsForLeadership] = useState<any[]>([]);
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [leadershipLoadError, setLeadershipLoadError] = useState<string | null>(null);

  const stageWasAutoAdvancedRef = useRef(false);

  useEffect(() => {
    setLocalUnassigned(props.unassigned);
  }, [props.unassigned]);

  // Load dropdowns + session context whenever overlay opens
  useEffect(() => {
    if (!props.open) return;

    let cancelled = false;

    // company/contractor dropdowns
    setCompanyLoading(true);
    setCompanyError(null);
    fetchCompanyOptions()
      .then((opts) => {
        if (cancelled) return;
        setCompanyOptions(opts);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCompanyError(err?.message ?? "Failed to load affiliation options");
      })
      .finally(() => {
        if (cancelled) return;
        setCompanyLoading(false);
      });

    // session scope (pc org)
    (async () => {
      const ctx = await resolveSessionContext(supabase);
      if (cancelled) return;

      setSessionUserId(ctx.userId);
      setSessionPcOrgId(ctx.pcOrgId ? String(ctx.pcOrgId) : "");
      setSessionPcOrgName(ctx.pcOrgName);
      setSessionScopeSource(ctx.source);
      setSessionScopeError(ctx.error);

      // Inherit into Assignment PC Org field (user can override)
      if (ctx.pcOrgId) setAssignmentPcOrgId(String(ctx.pcOrgId));
    })();

    return () => {
      cancelled = true
    };
  }, [props.open, supabase]);

  // reset on close
  useEffect(() => {
    if (!props.open) {
      setStage("person");
      setOnboardedRow(null);
      setCreatedAssignmentId(null);

      setMode("pick");
      setPicked(null);
      setPickedAffiliationValue("");
      setNewAffiliationValue("");
      setSearch("");

      setActionBusy(null);
      setActionError(null);

      setAssignmentPcOrgId("");
      setAssignmentPositionTitle("Technician");
      setAssignmentTechId("");
      setAssignmentStartDate("");
      setAssignmentEndDate("");
      setAssignmentSaving(false);
      setAssignmentError(null);

      setLeadershipOpen(false);
      setLeadershipRefreshKey(0);
      setAssignmentsForLeadership([]);
      setLeadershipLoading(false);
      setLeadershipLoadError(null);

      setSessionUserId(null);
      setSessionPcOrgId("");
      setSessionPcOrgName(null);
      setSessionScopeSource(null);
      setSessionScopeError(null);

      stageWasAutoAdvancedRef.current = false;
    }
  }, [props.open]);

  // filtered list
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return localUnassigned;

    return localUnassigned.filter((p) => {
      const name = normalize(p.full_name ?? "");
      const mob = normalize(p.mobile ?? "");
      const em = normalize(formatEmails(p.emails));
      return name.includes(q) || mob.includes(q) || em.includes(q);
    });
  }, [search, localUnassigned]);

  // duplicates
  const possibleDuplicates = useMemo(() => {
    const name = normalize(mode === "pick" ? picked?.full_name ?? "" : fullName);
    const mob = normalize(mode === "pick" ? picked?.mobile ?? "" : mobile);
    const em = normalize(mode === "pick" ? formatEmails(picked?.emails) : email);

    if (!name && !mob && !em) return [];

    const scoreOf = (p: UnassignedPersonRow) => {
      const pName = normalize(p.full_name ?? "");
      const pMob = normalize(p.mobile ?? "");
      const pEm = normalize(formatEmails(p.emails));

      const nameHit = name && pName && (pName.includes(name) || name.includes(pName));
      const mobileHit = mob && pMob && (pMob.includes(mob) || mob.includes(pMob));
      const emailHit = em && pEm && (pEm.includes(em) || em.includes(pEm));

      const score = (nameHit ? 2 : 0) + (mobileHit ? 2 : 0) + (emailHit ? 2 : 0);
      return { score, nameHit: Boolean(nameHit), mobileHit: Boolean(mobileHit), emailHit: Boolean(emailHit) };
    };

    const candidates = localUnassigned
      .map((p) => ({ p, ...scoreOf(p) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    return candidates.slice(0, 8);
  }, [mode, picked, fullName, mobile, email, localUnassigned]);

  // affiliation derivation
  const pickedDerived = useMemo(
    () => deriveAffiliation(pickedAffiliationValue, companyOptions),
    [pickedAffiliationValue, companyOptions]
  );
  const newDerived = useMemo(() => deriveAffiliation(newAffiliationValue, companyOptions), [newAffiliationValue, companyOptions]);

  const canContinuePicked = Boolean(picked?.person_id) && Boolean(pickedDerived);
  const canCreateNew = Boolean(fullName.trim()) && Boolean(newDerived);

  async function postJson<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      const msg = data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data as T;
  }

  function resetPickSelection() {
    setPicked(null);
    setPickedAffiliationValue("");
    setPickedActive(true);
    setPickedFuseEmpId("");
    setPickedNtLogin("");
    setPickedCsgId("");
    setPickedNotes("");
  }

  // ---------------------------------------------
  // Person + Membership (existing)
  // ---------------------------------------------
  async function handleContinue() {
    if (!picked || !pickedDerived) return;

    setActionError(null);
    setActionBusy("continue");
    try {
      const data = await postJson<{ ok: true; roster_row: RosterRow }>(`/api/org/membership`, {
        person_id: picked.person_id,
        co_ref_id: pickedDerived.co_ref_id,
        co_code: pickedDerived.employer_code,
        employer_type: pickedDerived.employer_type,

        active: pickedActive,
        fuse_emp_id: pickedFuseEmpId.trim() || null,
        person_nt_login: pickedNtLogin.trim() || null,
        person_csg_id: pickedCsgId.trim() || null,
        person_notes: pickedNotes.trim() || null,
      });

      setOnboardedRow(data.roster_row);
      props.onOnboarded?.(data.roster_row);
      router.refresh();

      setStage("assignment");
      stageWasAutoAdvancedRef.current = true;

      // Ensure we still have inherited pc_org_id even if membership row doesn't provide it
      if (sessionPcOrgId && !assignmentPcOrgId) setAssignmentPcOrgId(sessionPcOrgId);
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to continue");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleCreatePerson() {
    if (!newDerived) return;

    setActionError(null);
    setActionBusy("create");
    try {
      const created = await postJson<{ ok: true; person: UnassignedPersonRow }>(`/api/org/onboard`, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        mobile: mobile.trim() || null,

        co_ref_id: newDerived.co_ref_id,
        co_code: newDerived.employer_code,
        employer_type: newDerived.employer_type,

        active: newActive,
        fuse_emp_id: newFuseEmpId.trim() || null,
        person_nt_login: newNtLogin.trim() || null,
        person_csg_id: newCsgId.trim() || null,
        person_notes: newNotes.trim() || null,
      });

      setLocalUnassigned((prev) => [created.person, ...prev]);

      const data = await postJson<{ ok: true; roster_row: RosterRow }>(`/api/org/membership`, {
        person_id: created.person.person_id,
        co_ref_id: newDerived.co_ref_id,
        co_code: newDerived.employer_code,
        employer_type: newDerived.employer_type,

        active: newActive,
        fuse_emp_id: newFuseEmpId.trim() || null,
        person_nt_login: newNtLogin.trim() || null,
        person_csg_id: newCsgId.trim() || null,
        person_notes: newNotes.trim() || null,
      });

      setOnboardedRow(data.roster_row);
      props.onOnboarded?.(data.roster_row);
      router.refresh();

      setStage("assignment");
      stageWasAutoAdvancedRef.current = true;

      if (sessionPcOrgId && !assignmentPcOrgId) setAssignmentPcOrgId(sessionPcOrgId);

      // clear draft (keep overlay open)
      setFullName("");
      setEmail("");
      setMobile("");
      setNewAffiliationValue("");

      setNewActive(true);
      setNewFuseEmpId("");
      setNewNtLogin("");
      setNewCsgId("");
      setNewNotes("");
    } catch (e: any) {
      setActionError(e?.message ?? "Failed to create person");
    } finally {
      setActionBusy(null);
    }
  }

  // ---------------------------------------------
  // Assignment (core record #3) — inherits pc_org_id from session/profile
  // ---------------------------------------------
  const canSaveAssignment = !!onboardedRow?.person_id && !!assignmentPcOrgId.trim() && !!assignmentPositionTitle?.trim() && !assignmentSaving;

  async function handleSaveAssignment() {
    setAssignmentError(null);
    if (!onboardedRow) {
      setAssignmentError("No onboarded roster row available.");
      return;
    }
    const personId = (onboardedRow as any).person_id as string | undefined;
    if (!personId) {
      setAssignmentError("Missing person_id.");
      return;
    }
    const pcOrgId = assignmentPcOrgId.trim();
    if (!pcOrgId) {
      setAssignmentError("Missing pc_org_id. This should inherit from your session. Paste a PC Org ID to continue.");
      return;
    }

    setAssignmentSaving(true);
    try {
      const payload: any = {
        person_id: personId,
        pc_org_id: pcOrgId,
        position_title: assignmentPositionTitle.trim(),
        tech_id: assignmentTechId.trim() || null,
        start_date: assignmentStartDate ? assignmentStartDate : null,
        end_date: assignmentEndDate ? assignmentEndDate : null,
      };

      // NOTE: If your writable table is named differently, change "assignment" to it.
      const { data, error } = await supabase.from("assignment" as any).insert([payload]).select("assignment_id").single();
      if (error) throw new Error(error.message);

      const newId = (data as any)?.assignment_id ? String((data as any).assignment_id) : null;
      setCreatedAssignmentId(newId);

      router.refresh();
      setStage("leadership");
    } catch (e: any) {
      setAssignmentError(e?.message ?? "Failed to create assignment (RLS?)");
    } finally {
      setAssignmentSaving(false);
    }
  }

  // ---------------------------------------------
  // Leadership — use inherited pc_org_id as scope for assignment list
  // ---------------------------------------------
  async function loadAssignmentsForLeadership() {
    if (!props.open) return;
    const pcOrgId = assignmentPcOrgId.trim();
    if (!pcOrgId) return;

    setLeadershipLoading(true);
    setLeadershipLoadError(null);

    const sources = ["assignment_admin_v", "assignment_roster_v", "assignment_v", "assignment"];

    for (const src of sources) {
      try {
        const { data, error } = await supabase
          .from(src as any)
          .select("assignment_id, person_id, pc_org_id, full_name, pc_org_name, position_title, tech_id")
          .eq("pc_org_id", pcOrgId)
          .limit(500);

        if (error) throw new Error(error.message);

        const rows = (data ?? []).map((r: any) => ({
          assignment_id: r.assignment_id ? String(r.assignment_id) : null,
          person_id: r.person_id ? String(r.person_id) : null,
          pc_org_id: r.pc_org_id ? String(r.pc_org_id) : null,
          full_name: r.full_name ?? null,
          pc_org_name: r.pc_org_name ?? null,
          position_title: r.position_title ?? null,
          tech_id: r.tech_id ?? null,
        }));

        if (createdAssignmentId && !rows.some((x: any) => x.assignment_id === createdAssignmentId)) {
          rows.unshift({
            assignment_id: createdAssignmentId,
            person_id: (onboardedRow as any)?.person_id ?? null,
            pc_org_id: pcOrgId,
            full_name: (onboardedRow as any)?.full_name ?? null,
            pc_org_name: sessionPcOrgName ?? null,
            position_title: assignmentPositionTitle ?? null,
            tech_id: assignmentTechId ?? null,
          });
        }

        setAssignmentsForLeadership(rows);
        setLeadershipLoading(false);
        return;
      } catch (e: any) {
        if (src === sources[sources.length - 1]) {
          setLeadershipLoadError(e?.message ?? "Failed to load assignments for leadership");
        }
      }
    }

    setLeadershipLoading(false);
  }

  useEffect(() => {
    if (!props.open) return;
    if (stage !== "leadership" && stage !== "review") return;
    loadAssignmentsForLeadership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, stage, assignmentPcOrgId, createdAssignmentId, leadershipRefreshKey]);

  // ---------------------------------------------
  // Footer
  // ---------------------------------------------
  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--to-ink-muted)]">
        <span>Onboarding:</span>
        <Pill label="Person" tone={stage === "person" ? "good" : onboardedRow ? "good" : "neutral"} />
        <span className="opacity-40">›</span>
        <Pill label="Assignment" tone={stage === "assignment" ? "good" : createdAssignmentId ? "good" : "neutral"} />
        <span className="opacity-40">›</span>
        <Pill label="Leadership" tone={stage === "leadership" ? "good" : stage === "review" ? "good" : "neutral"} />
        <span className="opacity-40">›</span>
        <Pill label="Review" tone={stage === "review" ? "good" : "neutral"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => props.onClose()}
          className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
        >
          Close
        </button>

        {stage === "person" ? (
          <>
            {mode === "pick" && picked ? (
              <button
                type="button"
                onClick={() => {
                  resetPickSelection();
                  setActionError(null);
                }}
                className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
              >
                Clear selection
              </button>
            ) : null}

            {mode === "pick" ? (
              <button
                type="button"
                disabled={!canContinuePicked || actionBusy !== null}
                onClick={handleContinue}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--to-ink)] text-[var(--to-surface)]",
                  (!canContinuePicked || actionBusy !== null) && "opacity-60 cursor-not-allowed"
                )}
              >
                {actionBusy === "continue" ? "Continuing…" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canCreateNew || actionBusy !== null}
                onClick={handleCreatePerson}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--to-ink)] text-[var(--to-surface)]",
                  (!canCreateNew || actionBusy !== null) && "opacity-60 cursor-not-allowed"
                )}
              >
                {actionBusy === "create" ? "Creating…" : "Create person"}
              </button>
            )}
          </>
        ) : stage === "assignment" ? (
          <>
            <button
              type="button"
              onClick={() => setStage("person")}
              className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
            >
              Back
            </button>

            <button
              type="button"
              disabled={!canSaveAssignment}
              onClick={handleSaveAssignment}
              className={cx(
                "rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--to-ink)] text-[var(--to-surface)]",
                !canSaveAssignment && "opacity-60 cursor-not-allowed"
              )}
            >
              {assignmentSaving ? "Saving…" : "Save assignment"}
            </button>
          </>
        ) : stage === "leadership" ? (
          <>
            <button
              type="button"
              onClick={() => setStage("assignment")}
              className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => setStage("review")}
              className="rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--to-ink)] text-[var(--to-surface)]"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStage("leadership")}
              className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => props.onClose()}
              className="rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--to-ink)] text-[var(--to-surface)]"
            >
              Finish
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------
  // Right panel (duplicates + context)
  // ---------------------------------------------
  const rightPanel = (
    <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)]">
      <div className="border-b border-[var(--to-border)] px-4 py-3">
        <div className="text-sm font-semibold">{stage === "person" ? "Possible duplicates" : "Session scope"}</div>
        <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
          {stage === "person"
            ? "Heads-up only. Use existing when appropriate."
            : "PC Org is inherited from your session/profile and applied to the Assignment."}
        </div>
      </div>

      {stage === "person" ? (
        <div className="divide-y divide-[var(--to-border)]">
          {possibleDuplicates.length ? (
            possibleDuplicates.map(({ p, score, nameHit, mobileHit, emailHit }) => (
              <div key={p.person_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.full_name || "—"}</div>
                    <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                      {p.mobile || "—"} • {formatEmails(p.emails) || "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">
                      score {score} • {nameHit ? "name " : ""}
                      {mobileHit ? "mobile " : ""}
                      {emailHit ? "email" : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("pick");
                      setSearch(p.full_name ?? "");
                      setPicked(p);
                      setPickedAffiliationValue("");
                      setPickedActive(p.person_active ?? true)
                      setPickedFuseEmpId("");
                      setPickedNtLogin("");
                      setPickedCsgId("");
                      setPickedNotes("");
                      setActionError(null);
                    }}
                    className="shrink-0 rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
                  >
                    Use existing
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-4 text-sm text-[var(--to-ink-muted)]">No potential duplicates yet.</div>
          )}
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <div className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
            <div className="text-xs text-[var(--to-ink-muted)]">User</div>
            <div className="mt-1 text-sm">{sessionUserId ? sessionUserId : "—"}</div>
          </div>

          <div className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-[var(--to-ink-muted)]">PC Org</div>
                <div className="mt-1 text-sm">
                  {assignmentPcOrgId ? assignmentPcOrgId : "—"}
                  {sessionPcOrgName ? <span className="text-xs text-[var(--to-ink-muted)]"> • {sessionPcOrgName}</span> : null}
                </div>
              </div>
              <Pill label={sessionScopeSource ?? "manual"} tone={assignmentPcOrgId ? "good" : "warn"} />
            </div>

            {sessionScopeError ? (
              <div className="mt-2 text-xs text-[var(--to-ink-muted)]">{sessionScopeError}</div>
            ) : null}
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            If your RLS policies depend on profile scoping, this PC Org must match your session scope.
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------
  // Main render
  // ---------------------------------------------
  return (
    <AdminOverlay
      open={props.open}
      mode="create"
      title="+ Onboard"
      subtitle="Draft core records: Person → Assignment → Leadership"
      widthClassName="w-[1100px] max-w-[96vw]"
      onClose={props.onClose}
      footer={footer}
    >
      {companyError ? (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="font-semibold">Affiliation options warning</div>
          <div className="mt-1 opacity-90">{companyError}</div>
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <div className="font-semibold">Action failed</div>
          <div className="mt-1 opacity-90">{actionError}</div>
        </div>
      ) : null}

      {/* Stage tabs */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <TabButton active={stage === "person"} label="Person" onClick={() => setStage("person")} />
          <TabButton active={stage === "assignment"} label="Assignment" disabled={!onboardedRow} onClick={() => setStage("assignment")} />
          <TabButton active={stage === "leadership"} label="Leadership" disabled={!createdAssignmentId && stage !== "leadership" && stage !== "review"} onClick={() => setStage("leadership")} />
          <TabButton active={stage === "review"} label="Review" disabled={stage !== "review"} onClick={() => setStage("review")} />
        </div>

        {stage !== "person" ? (
          <div className="text-xs text-[var(--to-ink-muted)]">
            PC Org (session): <span className="font-medium">{assignmentPcOrgId || "—"}</span>
          </div>
        ) : null}
      </div>

      {/* Split view */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT */}
        <div>
          {stage === "person" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <TabButton
                    active={mode === "pick"}
                    label="Unassigned People"
                    onClick={() => {
                      setMode("pick");
                      setActionError(null);
                    }}
                  />
                  <TabButton
                    active={mode === "new"}
                    label="New Person"
                    onClick={() => {
                      setMode("new");
                      resetPickSelection();
                      setActionError(null);
                    }}
                  />
                </div>
              </div>

              {mode === "pick" ? (
                <div className="mt-3 space-y-3">
                  <Input label="Search" value={search} onChange={setSearch} placeholder="Name, phone, email…" />

                  <div className="overflow-hidden rounded-2xl border border-[var(--to-border)]">
                    <div className="bg-[var(--to-surface-soft)] px-4 py-2 text-xs font-semibold">
                      Unassigned ({filtered.length})
                    </div>

                    <div className="max-h-[52vh] overflow-auto divide-y divide-[var(--to-border)]">
                      {filtered.map((p) => (
                        <div key={p.person_id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{p.full_name ?? "—"}</div>
                            <div className="mt-0.5 truncate text-xs text-[var(--to-ink-muted)]">
                              {p.mobile ?? "—"} • {formatEmails(p.emails) || "—"}
                            </div>
                            <div className="mt-0.5 text-[10px] text-[var(--to-ink-muted)]">person_id: {p.person_id}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setPicked(p);
                              setPickedAffiliationValue("");
                              setPickedActive(p.person_active ?? true);
                              setPickedFuseEmpId("");
                              setPickedNtLogin("");
                              setPickedCsgId("");
                              setPickedNotes("");
                              setActionError(null);
                            }}
                            className="shrink-0 rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
                          >
                            Select
                          </button>
                        </div>
                      ))}

                      {filtered.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-[var(--to-ink-muted)]">No matches.</div>
                      ) : null}
                    </div>
                  </div>

                  {picked ? (
                    <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
                      <div className="text-xs font-semibold">Selected</div>
                      <div className="mt-1 text-sm font-medium">{picked.full_name ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
                        {picked.mobile ?? "—"} • {formatEmails(picked.emails) || "—"}
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">person_id: {picked.person_id}</div>

                      <div className="mt-3">
                        <AffiliationSelect
                          value={pickedAffiliationValue}
                          onChange={setPickedAffiliationValue}
                          options={companyOptions}
                          loading={companyLoading}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input label="Fuse Emp ID" value={pickedFuseEmpId} onChange={setPickedFuseEmpId} />
                        <Input label="NT Login" value={pickedNtLogin} onChange={setPickedNtLogin} />
                        <Input label="CSG ID" value={pickedCsgId} onChange={setPickedCsgId} />
                      </div>

                      <div className="mt-3">
                        <Textarea label="Notes" value={pickedNotes} onChange={setPickedNotes} placeholder="Notes…" />
                      </div>

                      <div className="mt-3">
                        <Toggle label="Person Active" value={pickedActive} onChange={setPickedActive} />
                      </div>

                      <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
                        Continue is enabled once Affiliation is selected.
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  <Input label="Full name" value={fullName} onChange={setFullName} placeholder="First Last" />

                  <AffiliationSelect value={newAffiliationValue} onChange={setNewAffiliationValue} options={companyOptions} loading={companyLoading} />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Email" value={email} onChange={setEmail} placeholder="name@domain.com" />
                    <Input label="Mobile" value={mobile} onChange={setMobile} placeholder="(xxx) xxx-xxxx" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Fuse Emp ID" value={newFuseEmpId} onChange={setNewFuseEmpId} />
                    <Input label="NT Login" value={newNtLogin} onChange={setNewNtLogin} />
                    <Input label="CSG ID" value={newCsgId} onChange={setNewCsgId} />
                  </div>

                  <Textarea label="Notes" value={newNotes} onChange={setNewNotes} placeholder="Notes…" />
                  <Toggle label="Person Active" value={newActive} onChange={setNewActive} />
                </div>
              )}
            </>
          ) : stage === "assignment" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
                <div className="text-xs font-semibold">Assignment scope</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  PC Org is inherited from your session/profile so RLS can validate it.
                </div>
              </div>

              <Input
                label="PC Org ID"
                value={assignmentPcOrgId}
                onChange={setAssignmentPcOrgId}
                placeholder="Inherited from session (or paste manually)"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Position Title" value={assignmentPositionTitle} onChange={setAssignmentPositionTitle} placeholder="Technician" />
                <Input label="Tech ID" value={assignmentTechId} onChange={setAssignmentTechId} placeholder="Existing system tech id (optional)" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Start Date" type="date" value={assignmentStartDate} onChange={setAssignmentStartDate} />
                <Input label="End Date" type="date" value={assignmentEndDate} onChange={setAssignmentEndDate} />
              </div>

              {assignmentError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
                  <div className="font-semibold">Assignment error</div>
                  <div className="mt-1 opacity-90">{assignmentError}</div>
                </div>
              ) : null}

              {!assignmentPcOrgId ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <div className="font-semibold">PC Org required</div>
                  <div className="mt-1 opacity-90">
                    We could not infer your PC Org from session/profile. Paste it above (e.g. your pc org 410 id).
                  </div>
                </div>
              ) : null}
            </div>
          ) : stage === "leadership" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
                <div className="text-xs font-semibold">Leadership (draft)</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                  Use the leadership editor to link reporting (schedule can be added later in edit workflows).
                </div>
              </div>

              {leadershipLoadError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
                  <div className="font-semibold">Leadership loading error</div>
                  <div className="mt-1 opacity-90">{leadershipLoadError}</div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Assignments in this PC Org</div>
                  <button
                    type="button"
                    onClick={() => setLeadershipRefreshKey((v) => v + 1)}
                    className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
                  Loaded: {leadershipLoading ? "Loading…" : String(assignmentsForLeadership.length)}
                </div>

                <div className="mt-3 max-h-[42vh] overflow-auto divide-y divide-[var(--to-border)] rounded-xl border border-[var(--to-border)]">
                  {assignmentsForLeadership.length ? (
                    assignmentsForLeadership.map((a: any) => (
                      <div key={a.assignment_id ?? Math.random()} className="px-3 py-2">
                        <div className="text-sm font-medium">{a.full_name ?? "—"}</div>
                        <div className="text-xs text-[var(--to-ink-muted)]">
                          {a.position_title ?? "—"} • {a.pc_org_name ?? assignmentPcOrgId}
                        </div>
                        <div className="text-[10px] text-[var(--to-ink-muted)]">assignment_id: {a.assignment_id ?? "—"}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-sm text-[var(--to-ink-muted)]">No assignments loaded.</div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLeadershipOpen(true)}
                    className="rounded-xl bg-[var(--to-ink)] px-4 py-2 text-sm text-[var(--to-surface)]"
                  >
                    Open leadership editor
                  </button>

                  <button
                    type="button"
                    onClick={() => setStage("review")}
                    className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-4 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
                  >
                    Skip for now
                  </button>
                </div>
              </div>

              {/* LeadershipInspector (optional) */}
              {/* If this import path doesn't match your project, remove this block and drive leadership elsewhere. */}
              {leadershipOpen ? (
                <LeadershipInspector
                  // @ts-ignore - inspector typing can vary by app; this is best-effort wiring
                  open={leadershipOpen}
                  mode="create"
                  edge={null}
                  assignments={assignmentsForLeadership as any}
                  onClose={() => setLeadershipOpen(false)}
                  onSaved={() => {
                    setLeadershipOpen(false);
                    setLeadershipRefreshKey((v) => v + 1);
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
                <div className="text-xs font-semibold">Review</div>
                <div className="mt-1 text-xs text-[var(--to-ink-muted)]">Core records drafted. You can finish now.</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
                  <div className="text-xs text-[var(--to-ink-muted)]">Person</div>
                  <div className="mt-1 text-sm font-medium">{(onboardedRow as any)?.full_name ?? "—"}</div>
                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">person_id: {(onboardedRow as any)?.person_id ?? "—"}</div>
                </div>

                <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-3">
                  <div className="text-xs text-[var(--to-ink-muted)]">Assignment</div>
                  <div className="mt-1 text-sm font-medium">{assignmentPositionTitle || "—"}</div>
                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">assignment_id: {createdAssignmentId ?? "—"}</div>
                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">pc_org_id: {assignmentPcOrgId || "—"}</div>
                </div>
              </div>

              <div className="text-xs text-[var(--to-ink-muted)]">
                Next: scheduling is deferred to the edit workflows; this onboarding focuses on drafting core records.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div>{rightPanel}</div>
      </div>
    </AdminOverlay>
  );
}
