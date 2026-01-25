// apps/web/src/components/onboard/OnboardWizardModal.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { PersonRow, RosterCurrentFullRow } from "@/lib/api";

import { AffiliationSelector, type AffiliationOption } from "@/components/affiliation/AffiliationSelector";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

export type WizardMode = "add" | "select";
export type WizardStep = "person" | "org" | "assignment" | "leadership";

const POSITION_RANK: Record<string, number> = {
  "Admin": 80,
  "VP": 70,
  "Director": 60,
  "Regional Manager": 50,
  "Project Manager": 40,
  "ITG Supervisor": 30,
  "BP Owner": 25,
  "BP Supervisor": 20,
  "Technician": 10,
};

function posRank(title: string | null | undefined): number | null {
  const t = String(title ?? "").trim();
  if (!t) return null;
  return Object.prototype.hasOwnProperty.call(POSITION_RANK, t) ? POSITION_RANK[t] : null;
}

function isTechnicianTitle(title: string | null | undefined): boolean {
  return String(title ?? "").trim() === "Technician";
}

function safeName(p: PersonRow | null | undefined) {
  return (p?.full_name ?? (p as any)?.first_name ?? (p as any)?.last_name ?? "—") as string;
}

function inferAffiliationKind(person: any, employmentType: "" | "company" | "contractor"): "company" | "contractor" | null {
  if (employmentType) return employmentType;
  const role = String(person?.role ?? "").toLowerCase();
  if (role.includes("contract")) return "contractor";
  if (role.includes("hire")) return "company";
  return null;
}

function toAffiliationValue(person: any, employmentType: "" | "company" | "contractor"): AffiliationOption | null {
  const co_ref_id = person?.co_ref_id ?? person?.affiliation_ref_id ?? person?.org_ref_id;
  if (!co_ref_id) return null;

  const kind = inferAffiliationKind(person, employmentType) ?? "company";
  const name =
    person?.co_name ??
    person?.affiliation_name ??
    person?.company_name ??
    person?.contractor_name ??
    person?.co_code ??
    "Selected";

  return {
    kind,
    co_ref_id: String(co_ref_id),
    co_code: person?.co_code ? String(person.co_code) : null,
    name: String(name),
  };
}

export function OnboardWizardModal(props: {
  open: boolean;
  onClose: () => void;

  wizardMode: WizardMode;

  step: WizardStep;
  setStep: (s: WizardStep) => void;

  loading: boolean;
  error: string | null;

  scopedOrgId: string | null;
  scopedOrgName: string | null;

  personDraft: PersonRow | null;
  personSaved: PersonRow | null;

  /** Kept for backward compatibility with existing container logic.
   *  The Person step now uses AffiliationSelector; selecting affiliation will update this value.
   */
  employmentType: "" | "company" | "contractor";
  onEmploymentTypeChange: (v: "" | "company" | "contractor") => void;

  onPersonChange: (patch: Partial<PersonRow>) => void;

  assignmentDraft: { position_title: string; start_date: string };
  onAssignmentChange: (next: { position_title: string; start_date: string }) => void;

  childAssignmentId?: string;
  
  leadersLoading: boolean;
  leaders: RosterCurrentFullRow[];
  leaderAssignmentId: string;
  onLeaderAssignmentIdChange: (v: string) => void;

  onSavePerson: () => Promise<boolean>;
  onProceedOrg: () => void;
  onCreateAssignment: () => Promise<boolean>;
  onFinish: () => Promise<void>;
}) {
  const {
    open,
    onClose,
    wizardMode,
    step,
    setStep,
    loading,
    error,
    scopedOrgId,
    scopedOrgName,
    personDraft,
    personSaved,
    employmentType,
    onEmploymentTypeChange,
    onPersonChange,
    assignmentDraft,
    onAssignmentChange,
    childAssignmentId,
    leadersLoading,
    leaders,
    leaderAssignmentId,
    onLeaderAssignmentIdChange,
    onSavePerson,
    onProceedOrg,
    onCreateAssignment,
    onFinish,
  } = props;

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
          .map((t) => ({ position_title: String(t.position_title), sort_order: t.sort_order ?? null, active: t.active ?? null }))
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
    if (step !== "assignment") return;
    void loadPositionTitles();
  }, [open, step]);

  const positionTitleOptions = useMemo(() => {
    const list = [...positionTitles];
    // server already sorts, but keep deterministic
    list.sort((a, b) => (Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)) || a.position_title.localeCompare(b.position_title));
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
    if (!open) return;
    if (step !== "assignment") return;

    // Only set a default if nothing is selected yet
    if (assignmentDraft.position_title) return;

    if (!defaultPositionTitle) return;

    onAssignmentChange({ ...assignmentDraft, position_title: defaultPositionTitle });
  }, [open, step, assignmentDraft, defaultPositionTitle, onAssignmentChange]);

  const affiliationValue = toAffiliationValue(personDraft, employmentType);

  const canContinuePerson =
    Boolean(personDraft?.full_name && String(personDraft.full_name).trim().length >= 2) &&
    (Boolean((personDraft as any)?.co_ref_id) || Boolean((personDraft as any)?.affiliation_id) || Boolean(affiliationValue?.co_ref_id));

  const canProceedOrg = Boolean(scopedOrgId);

  const canCreateAssignment =
    Boolean(canProceedOrg) &&
    Boolean((personSaved?.person_id ?? personDraft?.person_id)) &&
    Boolean(assignmentDraft?.position_title && String(assignmentDraft.position_title).trim().length > 0) &&
    Boolean(assignmentDraft?.start_date && String(assignmentDraft.start_date).trim().length > 0);

  function onBack() {
    if (step === "org") setStep("person");
    else if (step === "assignment") setStep("org");
    else if (step === "leadership") setStep("assignment");
  }
const headerActions: ReactNode = (
  <div className="flex items-center gap-2">
    {step !== "person" ? (
      <Button
        variant="secondary"
        type="button"
        onClick={onBack}
        disabled={loading}
        className="whitespace-nowrap"
      >
        Back
      </Button>
    ) : null}

    {step === "person" ? (
      <Button
        variant="secondary"
        type="button"
        onClick={onSavePerson}
        disabled={loading || !canContinuePerson}
        className="whitespace-nowrap min-w-[140px]"
      >
        Save & Continue
      </Button>
    ) : null}

    {step === "org" ? (
      <Button
        variant="secondary"
        type="button"
        onClick={onProceedOrg}
        disabled={loading || !canProceedOrg}
        className="whitespace-nowrap min-w-[120px]"
      >
        Continue
      </Button>
    ) : null}

    {step === "assignment" ? (
      <Button
        variant="secondary"
        type="button"
        onClick={onCreateAssignment}
        disabled={loading || !canCreateAssignment}
        className="whitespace-nowrap min-w-[140px]"
      >
        Add to roster
      </Button>
    ) : null}

    {step === "leadership" ? (
      <Button
        variant="secondary"
        type="button"
        onClick={onFinish}
        disabled={loading}
        className="whitespace-nowrap min-w-[120px]"
      >
        Finish
      </Button>
    ) : null}
  </div>
);

      const title: ReactNode = (
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-1 min-w-0">
          <div className="text-sm font-medium">{wizardMode === "add" ? "Add & Onboard" : "Onboard person"}</div>
          <div className="text-xs text-[var(--to-ink-muted)]">
            {safeName(personSaved ?? personDraft)}{" "}
            {personDraft?.person_id ? `· ${String(personDraft.person_id).slice(0, 8)}` : ""}{" "}
            {scopedOrgId ? (
              <span className="text-[var(--to-ink-muted)]">
                • {scopedOrgName ?? "Org"} • {String(scopedOrgId).slice(0, 8)}
              </span>
            ) : (
              <span className="text-[var(--to-ink-muted)]">• {scopedOrgName ?? "Org"}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge>{step.toUpperCase()}</Badge>
          {headerActions}
        </div>
      </div>
    );


  return (
  <Modal
    open={open}
    onClose={onClose}
    title={
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-1 min-w-0">
          <div className="text-sm font-medium">
            {wizardMode === "add" ? "Add & Onboard" : "Onboard person"}
          </div>
          <div className="text-xs text-[var(--to-ink-muted)]">
            {safeName(personSaved ?? personDraft)}
            {personDraft?.person_id ? ` · ${String(personDraft.person_id).slice(0, 8)}` : ""}
            {scopedOrgId ? (
              <span className="text-[var(--to-ink-muted)]">
                {" "}
                • {scopedOrgName ?? "Org"} • {String(scopedOrgId).slice(0, 8)}
              </span>
            ) : (
              <span className="text-[var(--to-ink-muted)]"> • {scopedOrgName ?? "Org"}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge>{step.toUpperCase()}</Badge>

          <div className="flex items-center gap-2">
            {step !== "person" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onBack}
                disabled={loading}
                className="whitespace-nowrap"
              >
                Back
              </Button>
            ) : null}

            {step === "person" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onSavePerson}
                disabled={loading || !canContinuePerson}
                className="whitespace-nowrap min-w-[140px]"
              >
                Save & Continue
              </Button>
            ) : null}

            {step === "org" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onProceedOrg}
                disabled={loading || !canProceedOrg}
                className="whitespace-nowrap min-w-[120px]"
              >
                Continue
              </Button>
            ) : null}

            {step === "assignment" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onCreateAssignment}
                disabled={loading || !canCreateAssignment}
                className="whitespace-nowrap min-w-[140px]"
              >
                Add to roster
              </Button>
            ) : null}

            {step === "leadership" ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onFinish}
                disabled={loading}
                className="whitespace-nowrap min-w-[120px]"
              >
                Finish
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    }
    size="lg"
    footer={<div />}
  >
    <div className="space-y-6">
      {error ? (
        <Notice variant="danger" title="Error">
          {error}
        </Notice>
      ) : null}

      {step === "person" ? (
        <WizardPersonStep
          person={personDraft}
          affiliationValue={affiliationValue}
          employmentType={employmentType}
          onEmploymentTypeChange={onEmploymentTypeChange}
          onChange={onPersonChange}
        />
      ) : null}

      {step === "org" ? <WizardOrgStep pc_org_id={scopedOrgId} pc_org_name={scopedOrgName} /> : null}

      {step === "assignment" ? (
        <WizardAssignmentStep
          value={assignmentDraft}
          onChange={onAssignmentChange}
          titles={positionTitleOptions}
          titlesLoading={positionTitlesLoading}
          titlesError={positionTitlesError}
          onRetryLoadTitles={loadPositionTitles}
        />
      ) : null}

      {step === "leadership" ? (
        <WizardLeadershipStep
          loading={leadersLoading}
          leaders={leaders}
          leaderAssignmentId={leaderAssignmentId}
          onLeaderAssignmentIdChange={onLeaderAssignmentIdChange}
          childAssignmentId={childAssignmentId ?? ""}
          childAffiliation={affiliationValue ?? null}
          childPositionTitle={assignmentDraft.position_title}
        />
      ) : null}
    </div>
  </Modal>
);

}

function WizardPersonStep({
  person,
  affiliationValue,
  employmentType,
  onEmploymentTypeChange,
  onChange,
}: {
  person: PersonRow | null;
  affiliationValue: AffiliationOption | null;
  employmentType: "" | "company" | "contractor";
  onEmploymentTypeChange: (v: "" | "company" | "contractor") => void;
  onChange: (patch: Partial<PersonRow>) => void;
}) {
  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium">Person</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full name">
          <TextInput
            value={(person?.full_name ?? "") as any}
            onChange={(e) => onChange({ full_name: e.target.value })}
            placeholder="First Last"
          />
        </Field>

        <Field label="Emails">
          <TextInput
            value={(((person as any)?.emails ?? (person as any)?.email) ?? "") as any}
            onChange={(e) => onChange({ emails: e.target.value } as any)}
            placeholder="name@company.com"
          />
        </Field>

        <Field label="Mobile">
          <TextInput
            value={(person?.mobile ?? "") as any}
            onChange={(e) => onChange({ mobile: e.target.value })}
            placeholder="(555) 555-5555"
          />
        </Field>

        <Field label="Fuse employee ID">
          <TextInput
            value={((person as any)?.fuse_emp_id ?? "") as any}
            onChange={(e) => onChange({ fuse_emp_id: e.target.value } as any)}
            placeholder="e.g., 220959"
          />
        </Field>

        <Field label="NT login">
          <TextInput
            value={((person as any)?.person_nt_login ?? "") as any}
            onChange={(e) => onChange({ person_nt_login: e.target.value } as any)}
            placeholder="e.g., jdoe"
          />
        </Field>

        <Field label="CSG ID">
          <TextInput
            value={((person as any)?.person_csg_id ?? "") as any}
            onChange={(e) => onChange({ person_csg_id: e.target.value } as any)}
            placeholder="e.g., 123456"
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea
              className="to-input h-auto min-h-[96px] py-2"
              value={((person as any)?.person_notes ?? "") as any}
              onChange={(e) => onChange({ person_notes: (e.currentTarget as any).value } as any)}
              placeholder="Notes (optional)"
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <AffiliationSelector
            value={affiliationValue}
            onChange={(next) => {
              if (!next) {
                onEmploymentTypeChange("");
                onChange({ co_ref_id: null as any, co_code: null as any } as any);
                return;
              }
              // Minimal writes only. Role/derived fields are handled server-side.
              onEmploymentTypeChange(next.kind);
              onChange({ co_ref_id: next.co_ref_id as any, co_code: next.co_code as any } as any);
            }}
            label="Affiliation"
            required
            limit={25}
          />
        </div>
      </div>
    </Card>
  );
}
function WizardOrgStep({ pc_org_id, pc_org_name }: { pc_org_id: string | null; pc_org_name: string | null }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Org</div>
      <Notice variant="info" title="Scoped org (inherited)">
        This onboarding flow uses your current org scope (same as Roster).
      </Notice>
      <div className="flex items-center justify-between">
        <div className="text-sm">{pc_org_name ?? "—"}</div>
        <Badge>{pc_org_id ? String(pc_org_id).slice(0, 8) : "—"}</Badge>
      </div>
    </Card>
  );
}

function WizardAssignmentStep({
  value,
  onChange,
  titles,
  titlesLoading,
  titlesError,
  onRetryLoadTitles,
}: {
  value: { position_title: string; start_date: string; tech_id: string };
  onChange: (next: { position_title: string; start_date: string; tech_id: string }) => void;
  titles: { position_title: string }[];
  titlesLoading: boolean;
  titlesError: string | null;
  onRetryLoadTitles: () => void;
}) {
  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium">Assignment</div>
      <Notice variant="info" title="Position title is required">
        Position titles are governed by the <code className="px-1">position_title</code> lookup (no free-text).
      </Notice>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Position title">
          <Select
            value={value.position_title}
            onChange={(e) => onChange({ ...value, position_title: e.target.value })}
            disabled={titlesLoading}
          >
            <option value="">{titlesLoading ? "Loading titles…" : "Select a title…"}</option>
            {titles.map((t) => (
              <option key={t.position_title} value={t.position_title}>
                {t.position_title}
              </option>
            ))}
          </Select>
          {titlesError ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="text-xs text-[var(--to-status-danger)]">{titlesError}</div>
              <Button variant="secondary" type="button" onClick={onRetryLoadTitles} className="whitespace-nowrap">
                Retry
              </Button>
            </div>
          ) : null}
        </Field>
        <Field label="Tech ID">
          <TextInput
            value={value.tech_id}
            onChange={(e) => onChange({ ...value, tech_id: e.target.value })}
            placeholder="Tech ID"
          />
        </Field>
        <Field label="Start date">
          <TextInput
            type="date"
            value={value.start_date}
            onChange={(e) => onChange({ ...value, start_date: e.target.value })}
          />
        </Field></div>
      <Notice variant="warning" title="Roster rule">
        Assignment creation is enforced on the server.
      </Notice>
    </Card>
  );
}

function WizardLeadershipStep({
  loading,
  leaders,
  leaderAssignmentId,
  onLeaderAssignmentIdChange,
  childAssignmentId,
  childAffiliation,
  childPositionTitle,
}: {
  loading: boolean;
  leaders: RosterCurrentFullRow[];
  leaderAssignmentId: string;
  onLeaderAssignmentIdChange: (v: string) => void;
  childAssignmentId: string;
  childAffiliation: AffiliationOption | null;
  childPositionTitle: string;
}) {
  const managerOptions = useMemo(() => {
  const rows: any[] = (leaders ?? []) as any[];
  const childId = String(childAssignmentId ?? "");
  const childTitle = String(childPositionTitle ?? "").trim();

  // Helper to build label like roster: Name — Title
  const toLabel = (r: any) => {
    const name = (r?.full_name ?? r?.person_name ?? r?.name ?? "—") as string;
    const title = String(r?.position_title ?? r?.title ?? "").trim();
    return title ? `${name} — ${title}` : name;
  };

  // Child affiliation (may be null by type; in practice should be set)
  const childCoRef = String(childAffiliation?.co_ref_id ?? "").trim();
  const childCoCode = childAffiliation?.co_code ? String(childAffiliation.co_code).trim() : "";

  // Candidate base filter: active, not self, manager not Technician
  const base = rows.filter((r) => {
    const aid = String(r?.assignment_id ?? "");
    if (!aid) return false;
    if (childId && aid === childId) return false;

    const active = Boolean(r?.active ?? r?.assignment_active ?? r?.assignment_record_active ?? true);
    if (!active) return false;

    const mgrTitle = String(r?.position_title ?? r?.title ?? "").trim();
    if (mgrTitle === "Technician") return false; // never selectable parent

    return true;
  });

  // Affiliation gating with BP exceptions:
  // - default: same affiliation only
  // - BP Owner / BP Supervisor: allowed to pick ITG Supervisor even if different affiliation
  const isSameAffiliation = (r: any) => {
    const rCoRef = String(r?.co_ref_id ?? "").trim();
    const rCoCode = String(r?.co_code ?? "").trim();
    if (childCoRef) return rCoRef === childCoRef;
    if (childCoCode) return rCoCode === childCoCode;
    return true; // if child affiliation missing, don't block
  };

  const allowCrossToITGSupervisor =
    childTitle === "BP Owner" || childTitle === "BP Supervisor";

  const candidates = base.filter((r) => {
    const mgrTitle = String(r?.position_title ?? r?.title ?? "").trim();
    if (allowCrossToITGSupervisor && mgrTitle === "ITG Supervisor") return true;
    return isSameAffiliation(r);
  });

  // Group candidates by position_title
  const byTitle = new Map<string, { value: string; label: string }[]>();
  for (const r of candidates) {
    const title = String(r?.position_title ?? r?.title ?? "").trim();
    const aid = String(r?.assignment_id ?? "");
    if (!title || !aid) continue;
    const arr = byTitle.get(title) ?? [];
    arr.push({ value: aid, label: toLabel(r) });
    byTitle.set(title, arr);
  }

  // Sort labels within each title
  for (const [t, arr] of byTitle.entries()) {
    arr.sort((a, b) => a.label.localeCompare(b.label));
    byTitle.set(t, arr);
  }

  // Choose “next logical manager title that exists” rules.
  // Return ALL options for that chosen title (if multiple people share the role).
  const pickFirstExistingTitle = (titles: string[]) => {
    for (const t of titles) {
      const arr = byTitle.get(t);
      if (arr && arr.length) return arr;
    }
    return [];
  };

  // Titles that never need a "reports to" in this app
  if (childTitle === "VP" || childTitle === "Admin") return [];

  if (childTitle === "Director") {
    return pickFirstExistingTitle(["VP"]);
  }

  if (childTitle === "Regional Manager") {
    return pickFirstExistingTitle(["Director", "VP"]);
  }

  if (childTitle === "Project Manager") {
    // can report to RM if exists; otherwise up
    return pickFirstExistingTitle(["Regional Manager", "Director", "VP"]);
  }

  if (childTitle === "ITG Supervisor") {
    // flex up to next logical manager options
    return pickFirstExistingTitle(["Project Manager", "Regional Manager", "Director", "VP"]);
  }

  if (childTitle === "BP Owner") {
    // can be set to ITG Supervisor
    return pickFirstExistingTitle(["ITG Supervisor", "Project Manager", "Regional Manager", "Director", "VP"]);
  }

  if (childTitle === "BP Supervisor") {
    // must report to ITG Supervisor; if none exists, then next above
    return pickFirstExistingTitle(["ITG Supervisor", "Project Manager", "Regional Manager", "Director", "VP"]);
  }

  if (childTitle === "Technician") {
    // always reports to associated leadership.
    // Primary: nearest leader roles above (ITG Sup for ITG, BP Sup/Owner for BP), else next up.
    // Note: this stays inside same affiliation unless ITG Supervisor exists and child is BP,
    // in which case ITG Supervisor will appear only if allowCrossToITGSupervisor is true (it's not),
    // so Technicians stay "within their affiliation" by default.
    return pickFirstExistingTitle([
      "ITG Supervisor",
      "BP Supervisor",
      "BP Owner",
      "Project Manager",
      "Regional Manager",
      "Director",
      "VP",
    ]);
  }

  // Unknown title: fall back to showing all candidates (still active/self/tech excluded)
  const all = Array.from(byTitle.values()).flat();
  all.sort((a, b) => a.label.localeCompare(b.label));
  return all;
}, [leaders, childAssignmentId, childAffiliation, childPositionTitle]);


  const hasOptions = managerOptions.length > 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium">Leadership (optional)</div>

      {!hasOptions ? (
        <Notice variant="info" title="Can do later">
          No valid next-level leader exists for this person’s affiliation + rank in the current roster scope. You can finish onboarding and set leadership later from Roster.
        </Notice>
      ) : (
        <Notice variant="info" title="Optional">
          Select the nearest valid next-level leader (filtered by affiliation + rank). You can also skip and set it later from Roster.
        </Notice>
      )}

      <Field label={loading ? "Loading roster…" : "Reports to (optional)"}>
        <Select value={leaderAssignmentId} onChange={(e) => onLeaderAssignmentIdChange(e.target.value)}>
          <option value="">— None / set later —</option>
          {managerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>
    </Card>
  );
}