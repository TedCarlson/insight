// apps/web/src/components/roster/RosterRowModule.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type PersonRow, type RosterDrilldownRow, type RosterMasterRow, type RosterRow } from "@/lib/api";

import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

type TabKey = "person" | "assignment" | "leadership";

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

  // Leadership overlays / history (primary source for leadership tab = api.roster_drilldown)
  const [drilldown, setDrilldown] = useState<RosterDrilldownRow[] | null>(null);
  const [drillErr, setDrillErr] = useState<string | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);

  const title = useMemo(() => buildTitle(row), [row]);

  const selectionContext = useMemo(() => {
    return {
      pc_org_id: pcOrgId,
      pc_org_name: pcOrgName ?? null,
      person_id: personId,
      assignment_id: assignmentId,
    };
  }, [pcOrgId, pcOrgName, personId, assignmentId]);

  const options = useMemo(
    () => [
      { value: "person" as const, label: "Person" },
      { value: "assignment" as const, label: "Assignment" },
      { value: "leadership" as const, label: "Leadership" },
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
    if (tab === "leadership") void loadDrilldown();
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
      const updated = await api.personUpsert(patch);
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

  const drillForPerson = useMemo(() => {
    if (!drilldown || !drilldown.length) return [];
    const pid = personId ? String(personId) : null;
    const aid = assignmentId ? String(assignmentId) : null;
    return drilldown.filter((r: any) => (pid && String(r.person_id) === pid) || (aid && String(r.assignment_id) === aid));
  }, [drilldown, personId, assignmentId]);

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
              <Button type="button" onClick={refreshCurrent} disabled={refreshing}>
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
                    {Object.keys((editingPerson ? personDraft : person) ?? {})
                      .sort((a, b) => a.localeCompare(b))
                      .map((k) => {
                        const displayPerson = personHuman ?? person;
                        const src: any = (editingPerson ? personDraft : displayPerson) ?? {};
                        const v = src[k];
                        const editable = ["full_name", "emails", "mobile", "fuse_emp_id", "person_notes", "person_nt_login", "person_csg_id", "active"].includes(k);

                        if (editingPerson && editable) {
                          if (k === "person_notes") {
                            return (
                              <div key={k} className="grid grid-cols-12 gap-2 text-sm">
                                <div className="col-span-4 text-[var(--to-ink-muted)]">{k}</div>
                                <div className="col-span-8">
                                  <textarea
                                    className="to-input h-auto min-h-[96px] py-2"
                                    value={(personDraft as any)?.[k] ?? ""}
                                    onChange={(e) =>
                                      setPersonDraft((p: any) => {
                                        const next: any = ensurePersonIdentity(p, row as any);
                                        next[k] = e.target.value;
                                        // if editing a non-name field, never allow full_name to become null
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

                          if (k === "active") {
                            return (
                              <div key={k} className="grid grid-cols-12 gap-2 text-sm">
                                <div className="col-span-4 text-[var(--to-ink-muted)]">{k}</div>
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
                            <div key={k} className="grid grid-cols-12 gap-2 text-sm">
                              <div className="col-span-4 text-[var(--to-ink-muted)]">{k}</div>
                              <div className="col-span-8">
                                <TextInput
                                  value={(personDraft as any)?.[k] ?? ""}
                                  onChange={(e) =>
                                      setPersonDraft((p: any) => {
                                        const next: any = ensurePersonIdentity(p, row as any);
                                        next[k] = e.target.value;
                                        // if editing a non-name field, never allow full_name to become null
                                        if (k !== "full_name" && (!next.full_name || String(next.full_name).trim() === "")) {
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

                        const display = k === "active" ? (Boolean(v) ? "Active" : "Inactive") : v ?? "—";
                        return <KVRow key={k} label={k} value={display} />;
                      })}
                  </div>
                )}
              </Card>

              {person ? <CollapsibleJson obj={person} label="Raw JSON — Person (api.person_get)" /> : null}

              <AllFieldsCard title="Selection context (from roster_current row) — all fields" obj={selectionContext} />
              <CollapsibleJson obj={row} label="Raw JSON — Roster row snapshot (roster_current)" />
            </div>
          ) : null}

          {tab === "assignment" ? (
            <div className="space-y-3">
              {masterErr ? (
                <Notice variant="danger" title="Could not load roster master">
                  {masterErr}
                </Notice>
              ) : null}

              <AllFieldsCard
                title="Assignment row (from api.roster_master) — all fields"
                obj={masterForPerson}
                emptyHint={loadingMaster ? "Loading roster master…" : "No matching assignment row found."}
              />

              {masterForPerson ? <CollapsibleJson obj={masterForPerson} label="Raw JSON — Assignment row (api.roster_master)" /> : null}
            </div>
          ) : null}

          {tab === "leadership" ? (
            <div className="space-y-3">
              {drillErr ? (
                <Notice variant="danger" title="Could not load roster drilldown">
                  {drillErr}
                </Notice>
              ) : null}

              <AllFieldsCard
                title="Leadership rows (filtered from api.roster_drilldown) — count"
                obj={{ count: drillForPerson.length }}
                emptyHint={loadingDrill ? "Loading drilldown…" : "No drilldown rows."}
              />

              {drillForPerson.length ? <CollapsibleJson obj={drillForPerson} label="Raw JSON — Leadership rows (api.roster_drilldown)" /> : null}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
