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

  const title: ReactNode = (
    <div className="flex items-center justify-between w-full">
      <div className="space-y-1">
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
      <Badge>{step.toUpperCase()}</Badge>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {step !== "person" ? (
            <Button variant="secondary"
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
              variant="secondary" type="button" onClick={onFinish} disabled={loading} className="whitespace-nowrap min-w-[120px]">
              Finish
            </Button>
          ) : null}
        </div>
      }
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
  value: { position_title: string; start_date: string };
  onChange: (next: { position_title: string; start_date: string }) => void;
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
}: {
  loading: boolean;
  leaders: RosterCurrentFullRow[];
  leaderAssignmentId: string;
  onLeaderAssignmentIdChange: (v: string) => void;
}) {
  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm font-medium">Leadership (optional)</div>
      <Notice variant="info" title="Optional">
        If you know who they report to, set it now. If not, finish onboarding and the manager can set it later from
        Roster.
      </Notice>

      <Field label={loading ? "Loading roster…" : "Reports to (optional)"}>
        <Select value={leaderAssignmentId} onChange={(e) => onLeaderAssignmentIdChange(e.target.value)}>
          <option value="">None / set later</option>
          {leaders.map((r: any) => (
            <option key={String(r.assignment_id)} value={String(r.assignment_id)}>
              {(r.full_name ?? r.person_name ?? "—") as any}
            </option>
          ))}
        </Select>
      </Field>
    </Card>
  );
}
