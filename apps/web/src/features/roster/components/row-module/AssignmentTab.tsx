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

export function AssignmentTab(props: {
  // errors/loading
  masterErr: string | null;
  assignmentErr: string | null;
  loadingMaster: boolean;

  // master + selection
  masterForPerson: any | null;
  row: any;

  // edit state
  editingAssignment: boolean;
  savingAssignment: boolean;

  assignmentDraft: any | null;

  // validation
  assignmentDirty: boolean;
  assignmentValidation: { ok: boolean; msg: string };

  // position titles
  positionTitlesError: string | null;
  positionTitlesLoading: boolean;
  positionTitleOptions: PositionTitleRow[];
  loadPositionTitles: () => void;

  // actions
  beginEditAssignment: () => void;
  cancelEditAssignment: () => void;
  saveAssignment: () => void;

  // setters
  setAssignmentDraft: (updater: any) => void;
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
    assignmentValidation,
    positionTitlesError,
    positionTitlesLoading,
    positionTitleOptions,
    loadPositionTitles,
    beginEditAssignment,
    cancelEditAssignment,
    saveAssignment,
    setAssignmentDraft,
  } = props;

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
              Assignment is the source of truth for position + dates. Edit inline to confirm hydration and write.
            </div>
            {!masterForPerson && !loadingMaster ? (
              <div className="text-sm text-[var(--to-ink-muted)]">No active assignment found (end date is set).</div>
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
              <Button onClick={saveAssignment} disabled={savingAssignment || !assignmentDirty || !assignmentValidation.ok}>
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
                    <option value="">{positionTitlesLoading ? "Loading titles…" : "Select a title…"}</option>
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
                value={Boolean((masterForPerson as any)?.active ?? (masterForPerson as any)?.assignment_active) ? "Active" : "Inactive"}
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
  );
}