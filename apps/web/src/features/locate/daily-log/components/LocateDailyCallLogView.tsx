"use client";

import React from "react";
import { LocateDailyEntryTable } from "./LocateDailyEntryTable";
import { LocateDailyHistoryTable } from "./LocateDailyHistoryTable";
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

  historyFilter: string;
  setHistoryFilter: (v: string) => void;
  historyOnlySaved: boolean;
  setHistoryOnlySaved: (v: boolean) => void;
  historyOnlyFlagged: boolean;
  setHistoryOnlyFlagged: (v: boolean) => void;

  rows: GridRow[];
  setRows: (v: GridRow[]) => void;
  filteredRows: GridRow[];
  historyRows: DailyRowFromApi[];

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
    historyFilter,
    setHistoryFilter,
    historyOnlySaved,
    setHistoryOnlySaved,
    historyOnlyFlagged,
    setHistoryOnlyFlagged,
    filteredRows,
    historyRows,
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

      <LocateDailyHistoryTable
        logDate={logDate}
        frame={frame}
        gridStyle={gridStyle}
        historyRows={historyRows}
        stateByCode={stateByCode}
        historyFilter={historyFilter}
        setHistoryFilter={setHistoryFilter}
        historyOnlySaved={historyOnlySaved}
        setHistoryOnlySaved={setHistoryOnlySaved}
        historyOnlyFlagged={historyOnlyFlagged}
        setHistoryOnlyFlagged={setHistoryOnlyFlagged}
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