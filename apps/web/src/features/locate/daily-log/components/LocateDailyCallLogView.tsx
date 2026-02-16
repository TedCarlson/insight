"use client";

import React from "react";
import Link from "next/link";
import { LocateDailyEntryTable } from "./LocateDailyEntryTable";
import { LocateDailyRecentSubmissionsCard } from "./LocateDailyRecentSubmissionsCard";
import { BaselineModal } from "./BaselineModal";
import type { DailyRowFromApi, Frame, GridRow, StateResource, TicketInputs } from "../types";

type Editing = {
  state_code: string;
  state_name: string;
  default_manpower: number;
  backlog_seed: number;
} | null;

type Props = {
  loading: boolean;
  submitting: boolean;
  savingBaseline: boolean;

  out: string;
  setOut: (v: string) => void;

  logDate: string;
  setLogDate: (v: string) => void;

  frame: Frame;
  setFrame: (v: Frame) => void;

  filter: string;
  setFilter: (v: string) => void;

  ticketsLabel: string;
  gridStyle: React.CSSProperties;

  rows: GridRow[];
  serverRows: Record<string, DailyRowFromApi>;
  stateByCode: Record<string, StateResource>;

  updateRow: (state_code: string, patch: Partial<TicketInputs>) => void;

  editing: Editing;
  setEditing: (v: Editing) => void;

  openBaselineModalFor: (state_code: string, state_name: string) => void;

  saveBaseline: (payload: {
    state_code: string;
    default_manpower: number;
    backlog_seed: number;
  }) => Promise<{ ok: boolean }>;

  onSubmit: () => Promise<void>;
  isDirtyAny: () => boolean;

  lastSubmittedRows: DailyRowFromApi[];
  onClearLastSubmitted: () => void;

  onSaveLastSubmittedRow: (payloadRow: {
    state_code: string;
    manpower_count: number;
    tickets_total: number;
    project_tickets: number;
    emergency_tickets: number;
    ojc?: number;
  }) => Promise<void>;
};

export function LocateDailyCallLogView(props: Props) {
  const {
    loading,
    submitting,
    savingBaseline,
    out,
    setOut,
    logDate,
    setLogDate,
    frame,
    setFrame,
    filter,
    setFilter,
    ticketsLabel,
    gridStyle,
    rows,
    serverRows,
    stateByCode,
    updateRow,
    editing,
    setEditing,
    openBaselineModalFor,
    saveBaseline,
    onSubmit,
    isDirtyAny,
    lastSubmittedRows,
    onClearLastSubmitted,
    onSaveLastSubmittedRow,
  } = props;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-1">
          <div className="text-lg font-semibold">Locate</div>
          <div className="text-sm text-[var(--to-ink-muted)]">
            Daily call log. Save AM received and PM closed; baselines drive utilization and projections.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/locate/daily-log/history" className="to-link text-sm">
            View history →
          </Link>
        </div>
      </div>

      {out ? (
        <div className="rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm">
          {out}
          <button className="ml-2 text-xs underline" onClick={() => setOut("")}>
            dismiss
          </button>
        </div>
      ) : null}

      <LocateDailyEntryTable
        loading={loading}
        submitting={submitting}
        logDate={logDate}
        setLogDate={setLogDate}
        frame={frame}
        setFrame={setFrame}
        filter={filter}
        setFilter={setFilter}
        ticketsLabel={ticketsLabel}
        gridStyle={gridStyle}
        rows={rows}
        serverRows={serverRows}
        stateByCode={stateByCode}
        updateRow={updateRow}
        openBaselineModalFor={openBaselineModalFor}
        projectedBacklogEnd={(state_code) => serverRows[state_code]?.backlog_end ?? 0}
        getBacklogStart={(state_code) =>
          serverRows[state_code]?.backlog_start ?? stateByCode[state_code]?.backlog_seed ?? 0
        }
        onSubmitBatch={() => void onSubmit()}
        out={out}
      />

      <LocateDailyRecentSubmissionsCard
        logDate={logDate}
        frame={frame}
        gridStyle={gridStyle}
        rows={lastSubmittedRows}
        onClear={onClearLastSubmitted}
        onSaveRow={onSaveLastSubmittedRow}
      />

      {editing ? (
        <BaselineModal
          editing={editing}
          saving={savingBaseline}
          onClose={() => setEditing(null)}
          // ✅ BaselineModal only edits the numeric fields — merge into the current editing object
          onChange={(next) =>
            setEditing({
              ...editing,
              ...next,
            })
          }
          onSave={() =>
            void saveBaseline({
              state_code: editing.state_code,
              default_manpower: editing.default_manpower,
              backlog_seed: editing.backlog_seed,
            })
          }
        />
      ) : null}
    </div>
  );
}