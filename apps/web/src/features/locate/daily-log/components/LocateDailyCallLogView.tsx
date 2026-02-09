"use client";

import React from "react";
import Link from "next/link";
import { LocateDailyEntryTable } from "./LocateDailyEntryTable";
import { LocateDailyRecentSubmissionsCard } from "./LocateDailyRecentSubmissionsCard";
import { BaselineModal } from "./BaselineModal";
import type { DailyRowFromApi, Frame, GridRow, StateResource, TicketInputs } from "../types";

type Editing = null | {
  state_code: string;
  state_name: string;
  default_manpower: number;
  backlog_seed: number;
};

type Props = {
  // data
  loading: boolean;
  submitting: boolean;
  savingBaseline: boolean;
  out: string;
  serverRows: Record<string, DailyRowFromApi>;
  stateByCode: Record<string, StateResource>;

  // state
  logDate: string;
  setLogDate: (v: string) => void;
  frame: Frame;
  setFrame: (v: Frame) => void;
  filter: string;
  setFilter: (v: string) => void;

  rows: GridRow[];
  setRows: (v: GridRow[]) => void;
  filteredRows: GridRow[];

  // recent submissions (client-side preview)
  lastSubmittedRows: DailyRowFromApi[];
  onClearLastSubmitted: () => void;
  onSaveLastSubmittedRow: (payloadRow: {
    state_code: string;
    manpower_count: number;
    tickets_total: number;
    project_tickets: number;
    emergency_tickets: number;
  }) => Promise<void>;

  editing: Editing;
  setEditing: (v: Editing) => void;

  ticketsLabel: string;
  gridStyle: React.CSSProperties;

  // actions
  updateRow: (state_code: string, patch: Partial<TicketInputs>) => void;
  openBaselineModalFor: (state_code: string, state_name: string) => void;
  projectedBacklogEnd: (state_code: string, inputs: TicketInputs) => number;
  getBacklogStart: (state_code: string) => number;

  onSubmitBatch: () => void;
  onSaveBaseline: () => void;
};

export function LocateDailyCallLogView(props: Props) {
  const {
    loading,
    submitting,
    savingBaseline,
    out,
    serverRows,
    stateByCode,
    logDate,
    setLogDate,
    frame,
    setFrame,
    filter,
    setFilter,
    filteredRows,
    lastSubmittedRows,
    onClearLastSubmitted,
    onSaveLastSubmittedRow,
    editing,
    setEditing,
    ticketsLabel,
    gridStyle,
    updateRow,
    openBaselineModalFor,
    projectedBacklogEnd,
    getBacklogStart,
    onSubmitBatch,
    onSaveBaseline,
  } = props;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-end">
        <Link
          href="/locate/daily-log/history"
          className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          View history
        </Link>
      </div>

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
        rows={filteredRows}
        serverRows={serverRows}
        stateByCode={stateByCode}
        updateRow={updateRow}
        openBaselineModalFor={openBaselineModalFor}
        projectedBacklogEnd={projectedBacklogEnd}
        getBacklogStart={getBacklogStart}
        onSubmitBatch={onSubmitBatch}
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

      {editing && (
        <BaselineModal
          editing={editing}
          saving={savingBaseline}
          onClose={() => setEditing(null)}
          onChange={(next: { default_manpower: number; backlog_seed: number }) =>
            setEditing({ ...editing, ...next })
          }
          onSave={onSaveBaseline}
        />
      )}
    </div>
  );
}