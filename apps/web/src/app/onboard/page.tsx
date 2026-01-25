// apps/web/src/app/onboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type PersonRow, type AssignmentRow, type RosterCurrentFullRow } from "@/lib/api";
import { useOrg } from "@/state/org";

import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { EmptyState } from "@/components/ui/EmptyState";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow } from "@/components/ui/DataTable";
import { TextInput } from "@/components/ui/TextInput";
import { Badge } from "@/components/ui/Badge";

import { OnboardWizardModal } from "@/components/onboard/OnboardWizardModal";

type Mode = "unassigned" | "all";
type StatusFilter = "all" | "active" | "inactive";

type WizardMode = "add" | "select";
type WizardStep = "person" | "org" | "assignment" | "leadership";

function safeName(p: PersonRow | null | undefined) {
  return (p?.full_name ?? (p as any)?.first_name ?? (p as any)?.last_name ?? "—") as string;
}

function orgDisplayName(orgs: any[], pc_org_id: string) {
  const hit = orgs.find((o: any) => String(o.pc_org_id) === String(pc_org_id));
  return (hit?.pc_org_name ?? hit?.org_name ?? hit?.name ?? null) as string | null;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function applyStatusFilter(list: PersonRow[], statusFilter: StatusFilter): PersonRow[] {
  if (statusFilter === "all") return list;
  return list.filter((p: any) => (statusFilter === "active" ? p?.active !== false : p?.active === false));
}

export default function OnboardPage() {
  const router = useRouter();
  const { selectedOrgId, orgs, orgsLoading } = useOrg();

  const validatedOrgId = useMemo(() => {
    if (orgsLoading) return null;
    if (!selectedOrgId) return null;
    return orgs.some((o: any) => String(o.pc_org_id) === String(selectedOrgId)) ? selectedOrgId : null;
  }, [selectedOrgId, orgs, orgsLoading]);

  const selectedOrgName = useMemo(() => {
    if (!validatedOrgId) return null;
    return orgDisplayName(orgs as any[], validatedOrgId);
  }, [orgs, validatedOrgId]);

  // Default view: unassigned, but can switch to all.
  const [mode, setMode] = useState<Mode>("unassigned");
  // Secondary filter: quick dial-in for active/inactive. (Search still hits all people.)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [query, setQuery] = useState("");

  const [rows, setRows] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>("select");
  const [step, setStep] = useState<WizardStep>("person");

  const [personDraft, setPersonDraft] = useState<PersonRow | null>(null);
  const [personSaved, setPersonSaved] = useState<PersonRow | null>(null);

  // Person-level affiliation input: user-friendly, derived fields stay hidden.
  const [employmentType, setEmploymentType] = useState<"" | "company" | "contractor">("");

  const [assignmentDraft, setAssignmentDraft] = useState<{
    position_title: string;
    start_date: string;
    tech_id: string;
  }>({ position_title: "", start_date: todayIsoDate(), tech_id: "" });

  const [createdAssignment, setCreatedAssignment] = useState<AssignmentRow | null>(null);

  // Leadership step
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leaders, setLeaders] = useState<RosterCurrentFullRow[]>([]);
  const [leaderAssignmentId, setLeaderAssignmentId] = useState<string>("");

  const canLoad = Boolean(validatedOrgId);

  /**
   * Load list for the table.
   *
   * Rules:
   * - Default view is "Unassigned", but user can switch to "All".
   * - Search must be unambiguous: when query is non-empty, search the full directory
   *   (assigned/unassigned, active/inactive) regardless of the current mode.
   * - Secondary toggle (active/inactive) is applied client-side as a quick dial.
   */
  async function loadPeople(nextMode: Mode, nextQuery: string, nextStatus: StatusFilter) {
    if (!validatedOrgId) {
      setRows([]);
      setErr(null);
      setLoading(false);
      return;
    }

    const q = (nextQuery ?? "").trim();
    setLoading(true);
    setErr(null);

    try {
      let r: PersonRow[] = [];

      if (q.length > 0) {
        // Unambiguous global search.
        r = await api.peopleAll(q, 50);
      } else if (nextMode === "unassigned") {
        r = await api.peopleGlobalUnassignedSearch("", 50);
      } else {
        r = await api.peopleAll("", 50);
      }

      setRows(applyStatusFilter(r, nextStatus));
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Failed to load people");
    } finally {
      setLoading(false);
    }
  }

  // Debounced load on query/mode/status/org
  useEffect(() => {
    const t = setTimeout(() => {
      if (!validatedOrgId) return;
      loadPeople(mode, query, statusFilter);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, query, statusFilter, validatedOrgId]);

  function resetWizardState() {
    setStep("person");
    setPersonDraft(null);
    setPersonSaved(null);
    setEmploymentType("");
    setAssignmentDraft({ position_title: "", start_date: todayIsoDate(), tech_id: "" });
    setCreatedAssignment(null);
    setLeaderAssignmentId("");
    setLeaders([]);
    setLeadersLoading(false);
  }

  function openAddWizard() {
    resetWizardState();
    setWizardMode("add");
    setWizardOpen(true);

    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    setPersonDraft({ person_id: id, full_name: "", emails: "", mobile: "", active: true } as any);
  }

  async function openSelectWizard(row: PersonRow) {
    resetWizardState();
    setWizardMode("select");
    setWizardOpen(true);
    setLoading(true);
    setErr(null);

    try {
      const p = await api.personGet(String(row.person_id));
      setPersonDraft(p ?? row);
      setPersonSaved(p ?? row);

      // best-effort infer to reduce re-entry, derived fields remain hidden
      const role = String((p as any)?.role ?? (row as any)?.role ?? "");
      if (/contract/i.test(role)) setEmploymentType("contractor");
      else if (/hire|employee|company/i.test(role)) setEmploymentType("company");
    } catch (e: any) {
      setPersonDraft(row);
      setPersonSaved(row);
      setErr(e?.message ?? "Failed to load person");
    } finally {
      setLoading(false);
    }
  }

  async function savePerson(): Promise<boolean> {
    if (!personDraft?.person_id) return false;

    if (!personDraft.full_name || String(personDraft.full_name).trim().length < 2) {
      setErr("Full name is required.");
      return false;
    }
    const co_ref_id = (personDraft as any).co_ref_id ?? null;
    const co_code = (personDraft as any).co_code ?? null;
    if (!co_ref_id && !co_code) {
      setErr("Organization affiliation is required.");
      return false;
    }

    setLoading(true);
    setErr(null);

    try {
      // Derived fields are handled by the app/DB. We only send direct user inputs.
      const saved = await api.personUpsert({
        person_id: String(personDraft.person_id),
        full_name: personDraft.full_name ?? null,
        emails: (personDraft as any).emails ?? (personDraft as any).email ?? null,
        mobile: personDraft.mobile ?? null,
        fuse_emp_id: (personDraft as any).fuse_emp_id ?? null,
        person_notes: (personDraft as any).person_notes ?? null,
        person_nt_login: (personDraft as any).person_nt_login ?? null,
        person_csg_id: (personDraft as any).person_csg_id ?? null,
        active: (personDraft as any).active ?? null,
        co_ref_id: (personDraft as any).co_ref_id ?? null,
        co_code: (personDraft as any).co_code ?? null,
      });

      setPersonSaved(saved ?? personDraft);
      setStep("org");
      return true;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save person");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function proceedFromOrg() {
    if (!validatedOrgId) {
      setErr("No scoped org selected. Open Roster to select an org first.");
      return;
    }
    setErr(null);
    setStep("assignment");
  }

  async function createAssignment(): Promise<boolean> {
  if (!validatedOrgId) return false;
  const pid = personSaved?.person_id ?? personDraft?.person_id;
  if (!pid) return false;

  if (!assignmentDraft.start_date) {
    setErr("Start date is required.");
    return false;
  }

  setLoading(true);
  setErr(null);

  try {
    // 1) Create the assignment via wizard RPC
    const a = await api.wizardProcessToRoster({
      pc_org_id: validatedOrgId,
      person_id: String(pid),
      position_title: assignmentDraft.position_title || null,
      start_date: assignmentDraft.start_date,
    });

    // 2) Persist tech_id to the assignment row (wizard RPC doesn't write it)
    const techId = String(assignmentDraft.tech_id ?? "").trim();
    let created = a;

    if (techId) {
      const updated = await api.assignmentUpdate({
        assignment_id: a.assignment_id,
        tech_id: techId,
      });
      if (updated) created = updated;
    }

    setCreatedAssignment(created);
    setStep("leadership");
    return true;
  } catch (e: any) {
    setErr(e?.message ?? "Failed to create assignment");
    return false;
  } finally {
    setLoading(false);
  }
}


  async function loadLeadersOnce() {
    if (!validatedOrgId) return;
    if (leadersLoading || leaders.length > 0) return;

    setLeadersLoading(true);
    try {
      const r = await api.rosterCurrentFull(validatedOrgId, null);
      setLeaders(r);
    } catch {
      setLeaders([]);
    } finally {
      setLeadersLoading(false);
    }
  }

  useEffect(() => {
    if (wizardOpen && step === "leadership") loadLeadersOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen, step, validatedOrgId]);

  async function finishLeadership() {
    // Optional step: allow empty selection
    if (!leaderAssignmentId || !createdAssignment?.assignment_id) {
      setWizardOpen(false);
      await loadPeople(mode, query, statusFilter);
      return;
    }

    try {
      setLoading(true);
      setErr(null);
      await api.assignmentReportingUpsert({
        child_assignment_id: createdAssignment.assignment_id,
        parent_assignment_id: leaderAssignmentId,
        start_date: (createdAssignment as any)?.start_date ?? assignmentDraft.start_date,
        end_date: null,
      });
      setWizardOpen(false);
      await loadPeople(mode, query, statusFilter);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save leadership relationship");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Onboard"
        subtitle="Add or select a person and place them onto your scoped roster."
        actions={
          <Button variant="secondary" type="button" onClick={() => router.push("/roster")}>
            Roster
          </Button>
        }
      />

      {!validatedOrgId ? (
        <Card className="p-4 space-y-3">
          <Notice variant="warning" title="No scoped org selected">
            Select a PC Org in the header to continue. Org scope is inherited across the app.
          </Notice>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={() => router.push("/roster")}>
              Go to Roster
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-[var(--to-ink-muted)]">Scoped PC Org</div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{selectedOrgName ?? "—"}</div>
                <Badge>{String(validatedOrgId).slice(0, 8)}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SegmentedControl<Mode>
                value={mode}
                onChange={(v) => setMode(v)}
                options={[
                  { value: "unassigned", label: "Unassigned" },
                  { value: "all", label: "All People" },
                ]}
              />

              <SegmentedControl<StatusFilter>
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />

              <Button onClick={openAddWizard}>+ Add person</Button>
            </div>
          </Card>

          <Toolbar
            left={
              <div className="flex items-center gap-2 w-full">
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="w-full"
                />
                <Button variant="ghost" onClick={() => loadPeople(mode, query, statusFilter)} disabled={!canLoad || loading}>
                  Refresh
                </Button>
              </div>
            }
          />

          {err ? (
            <Notice variant="danger" title="Error">
              {err}
            </Notice>
          ) : null}

          {loading ? (
            <Card className="p-8">
              <div className="text-sm text-[var(--to-ink-muted)]">Loading…</div>
            </Card>
          ) : rows.length === 0 ? (
            <EmptyState title="No results" message="Try a different search, or switch modes." />
          ) : (
            <PeopleTable rows={rows} onOpen={openSelectWizard} />
          )}

          <OnboardWizardModal
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            wizardMode={wizardMode}
            step={step}
            setStep={setStep}
            loading={loading}
            error={err}
            scopedOrgId={validatedOrgId}
            scopedOrgName={selectedOrgName}
            personDraft={personDraft}
            personSaved={personSaved}
            employmentType={employmentType}
            onEmploymentTypeChange={setEmploymentType}
            onPersonChange={(patch) => setPersonDraft((prev) => ({ ...(prev ?? {}), ...patch }))}
            assignmentDraft={assignmentDraft}
            onAssignmentChange={setAssignmentDraft}
            leadersLoading={leadersLoading}
            leaders={leaders}
            leaderAssignmentId={leaderAssignmentId}
            onLeaderAssignmentIdChange={setLeaderAssignmentId}
            onSavePerson={savePerson}
            onProceedOrg={proceedFromOrg}
            onCreateAssignment={createAssignment}
            onFinish={finishLeadership}
            childAssignmentId={createdAssignment?.assignment_id ?? ""}
          />
        </>
      )}
    </PageShell>
  );
}

function PeopleTable({ rows, onOpen }: { rows: PersonRow[]; onOpen: (row: PersonRow) => void }) {
  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: "minmax(14rem,1fr) minmax(18rem,1fr) 10rem 6rem 10rem",
    }),
    []
  );

  return (
    <DataTable layout="fixed" gridStyle={gridStyle}>
      <DataTableHeader>
        <div>Name</div>
        <div>Emails</div>
        <div>Mobile</div>
        <div>Active</div>
        <div></div>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((r) => {
          const active = (r as any).active;
          return (
            <DataTableRow key={String(r.person_id)} onClick={() => onOpen(r)} className="cursor-pointer">
              <div className="truncate">{safeName(r)}</div>
              <div className="truncate">{(r as any).emails ?? (r as any).email ?? "—"}</div>
              <div className="truncate">{r.mobile ?? "—"}</div>
              <div className="truncate">{active === false ? "No" : "Yes"}</div>
              <div className="text-right">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(r);
                  }}
                >
                  Onboard
                </Button>
              </div>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
