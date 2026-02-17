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

function pickOfficeLabel(officeOptions: OfficeOption[], officeId: unknown) {
  const id = String(officeId ?? "").trim();
  if (!id) return "—";
  const match = officeOptions.find((o) => String(o.id) === id);
  return match?.label ?? shortId(id);
}

export function AssignmentTab(props: {
  masterErr: string | null;
  assignmentErr: string | null;
  loadingMaster: boolean;

  masterForPerson: any | null;
  row: any;

  editingAssignment: boolean;
  savingAssignment: boolean;

  assignmentDraft: any | null;
  assignmentDirty: boolean;

  assignmentValidation?: { ok: boolean; msg: string };

  positionTitlesError: string | null;
  positionTitlesLoading: boolean;
  positionTitleOptions: PositionTitleRow[];
  loadPositionTitles: () => void;

  officeOptions?: OfficeOption[];
  officeLoading?: boolean;
  officeError?: string | null;
  loadOffices?: () => void;

  beginEditAssignment: () => void;
  cancelEditAssignment: () => void;
  saveAssignment: () => void;

  setAssignmentDraft: (updater: any) => void;

  canManage?: boolean;
  modifyMode?: "open" | "locked";
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
  } = props;

  const canEdit = canManage && modifyMode === "open";

  const base = masterForPerson ?? null;
  const draft = assignmentDraft ?? null;

  const officeDisplay = pickOfficeLabel(officeOptions, (base as any)?.office_id ?? (row as any)?.office_id ?? null);

  const positionDisplay = String((base as any)?.position_title ?? (row as any)?.position_title ?? "").trim() || "—";
  const techIdDisplay = String((base as any)?.tech_id ?? (row as any)?.tech_id ?? "").trim() || "—";
  const startDisplay = String((base as any)?.start_date ?? "").trim() || "—";
  const endDisplay = String((base as any)?.end_date ?? "").trim() || "—";
  const statusDisplay =
    Boolean((base as any)?.active ?? (base as any)?.assignment_active ?? true) ? "Active" : "Inactive";

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

            {!base && !loadingMaster ? (
              <div className="text-sm text-[var(--to-ink-muted)]">
                No active assignment found. Click Edit, fill fields, then Save to create one.
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!editingAssignment ? (
              <Button
                onClick={beginEditAssignment}
                disabled={loadingMaster || !canEdit}
                title={
                  !canEdit
                    ? !canManage
                      ? "Permission required (roster_manage)."
                      : "Roster is locked (read-only)."
                    : undefined
                }
              >
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
        </div>

        {loadingMaster && !base ? (
          <div className="mt-3 text-sm text-[var(--to-ink-muted)]">Loading roster master…</div>
        ) : (
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
                    value={String((draft as any)?.office_id ?? "")}
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
                </div>
              </div>
            ) : (
              <KVRow label="Office" value={officeDisplay} />
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
                    value={String((draft as any)?.position_title ?? "")}
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
                </div>
              </div>
            ) : (
              <KVRow label="Position title" value={positionDisplay} />
            )}

            {/* Tech ID */}
            {editingAssignment ? (
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4 text-[var(--to-ink-muted)]">Tech ID</div>
                <div className="col-span-8">
                  <TextInput
                    value={String((draft as any)?.tech_id ?? "")}
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
              <KVRow label="Tech ID" value={techIdDisplay} />
            )}

            {/* Start date */}
            {editingAssignment ? (
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4 text-[var(--to-ink-muted)]">Start date</div>
                <div className="col-span-8">
                  <input
                    className="to-input"
                    type="date"
                    value={String((draft as any)?.start_date ?? "")}
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
              <KVRow label="Start date" value={startDisplay} />
            )}

            {/* End date */}
            {editingAssignment ? (
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4 text-[var(--to-ink-muted)]">End date</div>
                <div className="col-span-8">
                  <input
                    className="to-input"
                    type="date"
                    value={String((draft as any)?.end_date ?? "")}
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
              <KVRow label="End date" value={endDisplay} />
            )}

            {/* Active */}
            {editingAssignment ? (
              <div className="grid grid-cols-12 gap-2 text-sm">
                <div className="col-span-4 text-[var(--to-ink-muted)]">Status</div>
                <div className="col-span-8">
                  <SegmentedControl
                    value={String(Boolean((draft as any)?.active ?? true))}
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
              <KVRow label="Status" value={statusDisplay} />
            )}

            <KVRow label="Reports to" value={String((base as any)?.reports_to_full_name ?? "").trim() || "—"} />
          </div>
        )}

        {editingAssignment && !assignmentValidation.ok ? (
          <div className="mt-3 text-sm text-[var(--to-status-danger)]">{assignmentValidation.msg}</div>
        ) : null}
      </Card>
    </div>
  );
}