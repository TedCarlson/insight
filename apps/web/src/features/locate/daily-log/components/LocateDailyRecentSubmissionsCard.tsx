"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableBody, DataTableHeader, DataTableRow } from "@/components/ui/DataTable";
import type { DailyRowFromApi, Frame } from "../types";

type EditableRow = {
  manpower_count: number;
  tickets_received_am: number;
  tickets_closed_pm: number;
  project_tickets: number;
  emergency_tickets: number;
};

type Props = {
  logDate: string;
  frame: Frame;
  gridStyle: React.CSSProperties;
  rows: DailyRowFromApi[];
  onClear: () => void;
  onSaveRow: (payloadRow: {
    state_code: string;
    manpower_count: number;
    tickets_total: number;
    project_tickets: number;
    emergency_tickets: number;
  }) => Promise<void>;
};

export function LocateDailyRecentSubmissionsCard(props: Props) {
  const { logDate, frame, gridStyle, rows, onClear, onSaveRow } = props;

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableRow | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...rows].sort((a, b) => a.state_name.localeCompare(b.state_name)), [rows]);

  function startEdit(r: DailyRowFromApi) {
    setEditingCode(r.state_code);
    setDraft({
      manpower_count: Number(r.manpower_count ?? 0),
      tickets_received_am: Number(r.tickets_received_am ?? 0),
      tickets_closed_pm: Number(r.tickets_closed_pm ?? 0),
      project_tickets: Number(r.project_tickets ?? 0),
      emergency_tickets: Number(r.emergency_tickets ?? 0),
    });
  }

  function cancelEdit() {
    setEditingCode(null);
    setDraft(null);
  }

  async function saveEdit(state_code: string) {
    if (!draft) return;
    setSaving(true);
    try {
      await onSaveRow({
        state_code,
        manpower_count: Number(draft.manpower_count ?? 0),
        tickets_total: frame === "AM" ? Number(draft.tickets_received_am ?? 0) : Number(draft.tickets_closed_pm ?? 0),
        project_tickets: Number(draft.project_tickets ?? 0),
        emergency_tickets: Number(draft.emergency_tickets ?? 0),
      });
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="grid gap-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-1">
            <div className="text-sm font-medium">Last submitted rows</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              Only the rows you submitted most recently for {logDate}. Editable + saves back to DB.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClear} disabled={!rows.length || saving}>
              Clear
            </Button>
          </div>
        </div>

        <DataTable zebra hover layout="content" gridStyle={gridStyle}>
          <DataTableHeader gridStyle={gridStyle}>
            <div>State</div>
            <div style={{ gridColumn: "2 / span 2" }}>Edit</div>
            <div>Working</div>
            <div>Tickets received (AM)</div>
            <div>Tickets closed (PM)</div>
            <div>Project</div>
            <div>Emergency</div>
            <div style={{ gridColumn: "8 / -1" }} />
          </DataTableHeader>

          <DataTableBody zebra>
            {!sorted.length ? (
              <DataTableRow gridStyle={gridStyle}>
                <div className="text-xs text-[var(--to-ink-muted)]" style={{ gridColumn: "1 / -1" }}>
                  No recent submissions yet. Submit rows to populate this card.
                </div>
              </DataTableRow>
            ) : (
              sorted.map((r) => {
                const isEditing = editingCode === r.state_code;

                return (
                  <DataTableRow key={r.state_code} gridStyle={gridStyle}>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{r.state_code}</span>
                      <span className="text-xs text-[var(--to-ink-muted)]">{r.state_name}</span>
                    </div>

                    <div className="flex items-center gap-2" style={{ gridColumn: "2 / span 2" }}>
                      {!isEditing ? (
                        <Button variant="ghost" onClick={() => startEdit(r)} disabled={saving}>
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button variant="primary" onClick={() => saveEdit(r.state_code)} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                          </Button>
                          <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={draft?.manpower_count ?? 0}
                          onChange={(e) => setDraft((d) => ({ ...(d as EditableRow), manpower_count: Number(e.target.value || 0) }))}
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{Number(r.manpower_count ?? 0) || "—"}</span>
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={draft?.tickets_received_am ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({ ...(d as EditableRow), tickets_received_am: Number(e.target.value || 0) }))
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{Number(r.tickets_received_am ?? 0) || "—"}</span>
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={draft?.tickets_closed_pm ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({ ...(d as EditableRow), tickets_closed_pm: Number(e.target.value || 0) }))
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{Number(r.tickets_closed_pm ?? 0) || "—"}</span>
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={draft?.project_tickets ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({ ...(d as EditableRow), project_tickets: Number(e.target.value || 0) }))
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{Number(r.project_tickets ?? 0) || "—"}</span>
                      )}
                    </div>

                    <div>
                      {isEditing ? (
                        <input
                          inputMode="numeric"
                          className="to-input h-9 w-[130px] text-sm"
                          value={draft?.emergency_tickets ?? 0}
                          onChange={(e) =>
                            setDraft((d) => ({ ...(d as EditableRow), emergency_tickets: Number(e.target.value || 0) }))
                          }
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{Number(r.emergency_tickets ?? 0) || "—"}</span>
                      )}
                    </div>

                    <div style={{ gridColumn: "8 / -1" }} />
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </Card>
  );
}