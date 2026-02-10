// apps/web/src/features/roster/components/row-module/AssignmentTab.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Notice } from "@/components/ui/Notice";

import { KVRow } from "../rosterRowModule.helpers";

type PositionTitleRow = { position_title: string; sort_order?: number | null; active?: boolean | null };
type OfficeOption = { id: string; label: string; sublabel?: string };

function shortId(id: unknown) {
  if (id == null) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export function AssignmentTab(props: {
  masterErr: string | null;
  assignmentErr: string | null;
  loadingMaster: boolean;

  masterForPerson: any | null;
  row: any;

  // existing edit flow
  editingAssignment: boolean;
  savingAssignment: boolean;

  assignmentDraft: any | null;

  assignmentDirty: boolean;

  // ✅ make optional because hook wiring can briefly pass undefined
  assignmentValidation?: { ok: boolean; msg: string };

  positionTitlesError: string | null;
  positionTitlesLoading: boolean;
  positionTitleOptions: PositionTitleRow[];
  loadPositionTitles: () => void;

  // office picker
  officeOptions?: OfficeOption[];
  officeLoading?: boolean;
  officeError?: string | null;
  loadOffices?: () => void;

  beginEditAssignment: () => void;
  cancelEditAssignment: () => void;
  saveAssignment: () => void;

  setAssignmentDraft: (updater: any) => void;

  // assignment lifecycle controls (start/end)
  canManage?: boolean; // roster_manage OR owner
  modifyMode?: "open" | "locked";
  startingAssignment?: boolean;
  endingAssignment?: boolean;
  startAssignment?: () => void;
  endAssignment?: () => void;
}) {
  const {
    masterErr,
    assignmentErr,
    loadingMaster,
    masterForPerson,
    row,

    editingAssignment,
    savingAssignment,
    assignmentDraft,
    assignmentDirty,

    // ✅ safe default prevents runtime crash
    assignmentValidation = { ok: true, msg: "" },

    positionTitlesError,
    positionTitlesLoading,
    positionTitleOptions,
    loadPositionTitles,

    officeOptions = [],
    officeLoading = false,
    officeError = null,
    loadOffices,

    beginEditAssignment,
    cancelEditAssignment,
    saveAssignment,
    setAssignmentDraft,

    canManage = false,
    modifyMode = "locked",
    startingAssignment = false,
    endingAssignment = false,
    startAssignment,
    endAssignment,
  } = props;

  const hasActiveAssignment = Boolean(masterForPerson);
  const canShowLifecycleButtons = canManage && modifyMode === "open";

  const officeLabel = (office_id: unknown) => {
    const id = office_id == null ? "" : String(office_id);
    if (!id) return "—";
    const match = officeOptions.find((o) => String(o.id) === id);
    return match?.label ?? shortId(id);
  };

  const currentOfficeLabel =
    (masterForPerson as any)?.office_name ??
    officeLabel((masterForPerson as any)?.office_id ?? (assignmentDraft as any)?.office_id ?? null);

  return (
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
              Assignment is the source of truth for position + dates.
            </div>

            {!hasActiveAssignment && !loadingMaster ? (
              <div className="text-sm text-[var(--to-ink-muted)]">
                No active assignment found. Start one to enable assignment editing + full roster actions.
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Start/End Assignment buttons (only when Modify=open + roster_manage) */}
            {canShowLifecycleButtons ? (
              hasActiveAssignment ? (
                <Button
                  variant="secondary"
                  onClick={endAssignment}
                  disabled={loadingMaster || savingAssignment || endingAssignment || !endAssignment}
                  title={!endAssignment ? "endAssignment handler not wired yet" : undefined}
                >
                  {endingAssignment ? "Ending…" : "End assignment"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={startAssignment}
                  disabled={loadingMaster || savingAssignment || startingAssignment || !startAssignment}
                  title={!startAssignment ? "startAssignment handler not wired yet" : undefined}
                >
                  {startingAssignment ? "Starting…" : "Start assignment"}
                </Button>
              )
            ) : null}

            {/* Existing edit flow remains */}
            {!editingAssignment ? (
              <Button onClick={beginEditAssignment} disabled={!hasActiveAssignment || loadingMaster}>
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
        </div>

        {loadingMaster && !masterForPerson ? (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">Loading roster master…</div>
        ) : masterForPerson ? (
          <div className="mt-3 space-y-2">
            {/* Office */}
            {editingAssignment ? (
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4 text-[var(--to-ink-muted)]">Office</div>
                <div className="col-span-8">
                  {officeError ? (
                    <div className="mb-2">
                      <Notice variant="danger" title="Could not load offices">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm">{officeError}</div>
                          {loadOffices ? (
                            <Button variant="ghost" onClick={loadOffices} disabled={officeLoading}>
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </Notice>
                    </div>
                  ) : null}

                  <Select
                    value={(assignmentDraft as any)?.office_id ?? ""}
                    onChange={(e) =>
                      setAssignmentDraft((a: any) => ({
                        ...(a ?? {}),
                        office_id: e.target.value || null,
                      }))
                    }
                    disabled={officeLoading}
                  >
                    <option value="">{officeLoading ? "Loading offices…" : "Select an office…"}</option>
                    {officeOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </Select>

                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                    Writes <code className="px-1">office_id</code> on assignment.
                  </div>
                </div>
              </div>
            ) : (
              <KVRow label="Office" value={currentOfficeLabel} />
            )}

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
                    <option value="">{positionTitlesLoading ? "Loading titles…" : "Select a title…"}</option>
                    {positionTitleOptions.map((t) => (
                      <option key={t.position_title} value={t.position_title}>
                        {t.position_title}
                      </option>
                    ))}
                  </Select>

                  <div className="mt-1 text-xs text-[var(--to-ink-muted)]">(Save will fail if invalid.)</div>
                </div>
              </div>
            ) : (
              <KVRow label="Position title" value={(masterForPerson as any)?.position_title ?? "—"} />
            )}

            {/* Tech ID */}
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

            {/* Start date */}
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

            {/* End date */}
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
                    value={String(Boolean((assignmentDraft as any)?.active ?? (assignmentDraft as any)?.assignment_active))}
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

            <KVRow label="Reports to" value={(masterForPerson as any)?.reports_to_full_name ?? "—"} />
          </div>
        ) : null}

        {editingAssignment && !assignmentValidation.ok ? (
          <div className="mt-3 text-sm text-[var(--to-status-danger)]">{assignmentValidation.msg}</div>
        ) : null}
      </Card>
    </div>
  );
}