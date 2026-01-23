// apps/web/src/components/roster/RosterRowModule.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PersonRow, type RosterDrilldownRow, type RosterMasterRow, type RosterRow } from "@/lib/api";

import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

type TabKey = "person" | "org" | "assignment" | "leadership";

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


function KeyFields({
  title,
  obj,
  fields,
  emptyHint,
}: {
  title: string;
  obj: any | null | undefined;
  fields: string[];
  emptyHint?: string;
}) {
  const rows = useMemo(() => {
    if (!obj) return [];
    return fields
      .filter((k) => hasOwn(obj, k))
      .map((k) => ({ k, v: (obj as any)[k] }))
      .filter((r) => r.v !== undefined);
  }, [obj, fields]);

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
        <div className="text-sm text-[var(--to-ink-muted)]">No known key fields present (showing raw JSON below).</div>
      )}
    </Card>
  );
}

function JsonBlock({ obj, label }: { obj: any; label: string }) {
  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">{label}</div>
      <pre className="max-h-[360px] overflow-auto rounded border p-3 text-xs" style={{ borderColor: "var(--to-border)" }}>
        {formatJson(obj)}
      </pre>
    </Card>
  );
}

function pickTitleFromRow(row: any): string {
  return (
    row?.full_name ??
    row?.person_name ??
    row?.name ??
    [row?.first_name, row?.last_name].filter(Boolean).join(" ") ??
    row?.email ??
    "Roster Row"
  );
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

  const personId = row?.person_id ?? null;
  const assignmentId = row?.assignment_id ?? null;

  // Person (primary source = api.person_get)
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [personErr, setPersonErr] = useState<string | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);

  // Assignment read model (primary source for assignment tab = api.roster_master)
  const [master, setMaster] = useState<RosterMasterRow[] | null>(null);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Leadership overlays / history (primary source for leadership tab = api.roster_drilldown)
  const [drilldown, setDrilldown] = useState<RosterDrilldownRow[] | null>(null);
  const [drillErr, setDrillErr] = useState<string | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("person");
    setPerson(null);
    setPersonErr(null);
    setMaster(null);
    setMasterErr(null);
    setDrilldown(null);
    setDrillErr(null);
  }, [open, personId, assignmentId]);

  const title = useMemo(() => pickTitleFromRow(row), [row]);

  async function loadPerson() {
    if (!personId) return;
    setLoadingPerson(true);
    setPersonErr(null);
    try {
      const data = await api.personGet(String(personId));
      setPerson(data);
    } catch (e: any) {
      setPerson(null);
      setPersonErr(e?.message ?? "Failed to load person");
    } finally {
      setLoadingPerson(false);
    }
  }

  async function loadMaster() {
    setLoadingMaster(true);
    setMasterErr(null);
    try {
      const rows = await api.rosterMaster(pcOrgId);
      setMaster(rows ?? []);
    } catch (e: any) {
      setMaster(null);
      setMasterErr(e?.message ?? "Failed to load roster master");
    } finally {
      setLoadingMaster(false);
    }
  }

  async function loadDrilldown() {
    setLoadingDrill(true);
    setDrillErr(null);
    try {
      const rows = await api.rosterDrilldown(pcOrgId);
      setDrilldown(rows ?? []);
    } catch (e: any) {
      setDrilldown(null);
      setDrillErr(e?.message ?? "Failed to load drilldown");
    } finally {
      setLoadingDrill(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (personId) loadPerson();
    loadMaster();
    loadDrilldown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, personId, pcOrgId]);

  const masterForPerson = useMemo(() => {
    if (!master || !personId) return [];
    return master.filter((r) => String(r.person_id) === String(personId));
  }, [master, personId]);

  const masterForAssignment = useMemo(() => {
    if (!master || !assignmentId) return [];
    return master.filter((r) => String(r.assignment_id) === String(assignmentId));
  }, [master, assignmentId]);

  const selectedMasterRow = useMemo(() => {
    // Prefer assignment match (deterministic), fallback to person match, else null.
    return (
      (masterForAssignment.length ? masterForAssignment[0] : null) ??
      (masterForPerson.length ? masterForPerson[0] : null) ??
      null
    );
  }, [masterForAssignment, masterForPerson]);

  const drillForPerson = useMemo(() => {
    if (!drilldown || !personId) return [];
    return drilldown.filter((r) => String(r.person_id) === String(personId));
  }, [drilldown, personId]);

  const drillForAssignment = useMemo(() => {
    if (!drilldown || !assignmentId) return [];
    return drilldown.filter((r) => String(r.assignment_id) === String(assignmentId));
  }, [drilldown, assignmentId]);

  const selectionContext = useMemo(() => {
    return {
      pc_org_id: row?.pc_org_id ?? pcOrgId,
      pc_org_name: row?.pc_org_name ?? pcOrgName ?? null,
      person_id: personId,
      assignment_id: assignmentId,
    };
  }, [row, pcOrgId, pcOrgName, personId, assignmentId]);

  const orgSnapshot = useMemo(() => {
    // Deterministic: only include keys that actually exist.
    const src = selectedMasterRow ?? row ?? {};
    const keys = Object.keys(src).filter((k) => k.startsWith("pc_org") || k.startsWith("org_") || k === "org" || k === "org_id");
    const out: Record<string, any> = {};
    for (const k of keys.sort()) out[k] = (src as any)[k];
    // Always include selection context (ids) in this snapshot.
    out._selection = selectionContext;
    return out;
  }, [row, selectedMasterRow, selectionContext]);

  const options = [
    { value: "person" as const, label: "Person" },
    { value: "org" as const, label: "PC Org" },
    { value: "assignment" as const, label: "Assignment" },
    { value: "leadership" as const, label: "Leadership" },
  ];

  const refreshing = loadingPerson || loadingMaster || loadingDrill;

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
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  if (personId) loadPerson();
                  loadMaster();
                  loadDrilldown();
                }}
                disabled={refreshing}
              >
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

              <KeyFields
                title="Person (api.person_get) — key fields"
                obj={person}
                emptyHint={!personId ? "No person_id on this roster row." : loadingPerson ? "Loading person…" : "No person record returned."}
                fields={[
                  "person_id",
                  "full_name",
                  "first_name",
                  "last_name",
                  "email",
                  "mobile",
                  "phone",
                  "status",
                  "created_at",
                  "updated_at",
                ]}
              />

              {person ? <JsonBlock obj={person} label="Person (api.person_get) — raw JSON" /> : null}

              <KeyFields
                title="Selection context (from roster_current row)"
                obj={selectionContext}
                fields={["pc_org_id", "pc_org_name", "person_id", "assignment_id"]}
              />

              <JsonBlock obj={row} label="Roster row snapshot (roster_current) — raw JSON" />
            </div>
          ) : null}

          {tab === "assignment" ? (
            <div className="space-y-3">
              {masterErr ? (
                <Notice variant="danger" title="Could not load roster master">
                  {masterErr}
                </Notice>
              ) : null}

              <KeyFields
                title="Assignment (api.roster_master filtered) — key fields"
                obj={selectedMasterRow}
                emptyHint={loadingMaster ? "Loading roster master…" : "No matching row in roster_master for this selection."}
                fields={[
                  "assignment_id",
                  "person_id",
                  "pc_org_id",
                  "pc_org_name",
                  "position_title",
                  "start_date",
                  "end_date",
                  "active",
                  "assignment_active",
                  "co_name",
                  "co_type",
                  "reports_to_assignment_id",
                  "reports_to_person_id",
                  "reports_to_full_name",
                ]}
              />

              {selectedMasterRow ? (
                <JsonBlock obj={selectedMasterRow} label="Assignment row model (api.roster_master) — raw JSON" />
              ) : master ? (
                <JsonBlock
                  obj={masterForAssignment.length ? masterForAssignment : masterForPerson}
                  label="Matches (api.roster_master filtered set) — raw JSON"
                />
              ) : null}

              <KeyFields
                title="Current roster slice (roster_current row) — key fields"
                obj={row}
                fields={["assignment_id", "position_title", "start_date", "end_date", "assignment_active"]}
              />
            </div>
          ) : null}

          {tab === "leadership" ? (
            <div className="space-y-3">
              {drillErr ? (
                <Notice variant="danger" title="Could not load drilldown">
                  {drillErr}
                </Notice>
              ) : null}

              <KeyFields
                title="Leadership overlays (from roster_current row) — key fields"
                obj={row}
                fields={["reports_to_assignment_id", "reports_to_person_id", "reports_to_full_name"]}
              />

              <Card>
                <div className="mb-2 text-sm font-semibold">Leadership context (api.roster_drilldown filtered)</div>
                {loadingDrill ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">Loading drilldown…</div>
                ) : drilldown ? (
                  <pre
                    className="max-h-[360px] overflow-auto rounded border p-3 text-xs"
                    style={{ borderColor: "var(--to-border)" }}
                  >
                    {formatJson(drillForAssignment.length ? drillForAssignment : drillForPerson)}
                  </pre>
                ) : (
                  <div className="text-sm text-[var(--to-ink-muted)]">No drilldown data.</div>
                )}
              </Card>

              <div className="text-xs text-[var(--to-ink-muted)]">
                If the leadership fields you need aren’t present in drilldown yet, we’ll treat this JSON as the ground truth and then wire the
                correct endpoint next.
              </div>
            </div>
          ) : null}

          {tab === "org" ? (
            <div className="space-y-3">
              <KeyFields
                title="PC Org — selection context"
                obj={selectionContext}
                fields={["pc_org_id", "pc_org_name", "person_id", "assignment_id"]}
              />

              <Card>
                <div className="mb-2 text-sm font-semibold">Org snapshot (derived from current selection)</div>
                <pre className="max-h-[360px] overflow-auto rounded border p-3 text-xs" style={{ borderColor: "var(--to-border)" }}>
                  {formatJson(orgSnapshot)}
                </pre>
              </Card>

              <JsonBlock obj={row} label="Roster row snapshot (roster_current) — raw JSON" />
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
