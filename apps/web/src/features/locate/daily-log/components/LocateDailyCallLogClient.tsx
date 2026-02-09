"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocateDailyLogData } from "../hooks/useLocateDailyLogData";
import { useLocateDailyLogState } from "../hooks/useLocateDailyLogState";
import { LocateDailyCallLogView } from "./LocateDailyCallLogView";
import type { DailyRowFromApi, GridRow, StateResource } from "../types";

type SubmitRow = {
  state_code: string;
  manpower_count: number;
  tickets_total: number;
  project_tickets: number;
  emergency_tickets: number;
};

export default function LocateDailyCallLogClient() {
  const data = useLocateDailyLogData();
  const state = useLocateDailyLogState({
    serverRows: data.serverRows,
    stateByCode: data.stateByCode,
  });

  // "Last submitted rows" (client-side preview)
  const [lastSubmittedRows, setLastSubmittedRows] = useState<DailyRowFromApi[]>([]);

  const lastSubmittedByCode = useMemo(() => {
    const m: Record<string, DailyRowFromApi> = {};
    for (const r of lastSubmittedRows) m[String(r.state_code).toUpperCase()] = r;
    return m;
  }, [lastSubmittedRows]);

  // Draft key scoped to date + frame
  const draftKey = useMemo(() => {
    return `locate:daily-log:draft:${state.logDate}:${state.frame}`;
  }, [state.logDate, state.frame]);

  // LocalStorage helpers (stable)
  const clearDraft = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  }, []);

  const saveDraft = useCallback((key: string, rows: GridRow[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      // noop
    }
  }, []);

  const loadDraft = useCallback((key: string): GridRow[] | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GridRow[]) : null;
    } catch {
      return null;
    }
  }, []);

  // Refs to avoid dependency churn for unload persistence
  const rowsRef = useRef<GridRow[]>([]);
  const dirtyRef = useRef<boolean>(false);
  const draftKeyRef = useRef<string>(draftKey);

  // Pin ONLY what we need from state (prevents eslint from insisting on `state`)
  const logDate = state.logDate;
  const frame = state.frame;

  const makeInputs = state.makeInputs;
  const setRows = state.setRows;
  const resetDirty = state.resetDirty;
  const setDirtyFromRows = state.setDirtyFromRows;

  const isDirtyAny = state.isDirtyAny; // stable via useCallback in hook

  // Keep refs updated
  useEffect(() => {
    rowsRef.current = state.rows;
  }, [state.rows]);

  useEffect(() => {
    dirtyRef.current = isDirtyAny();
  }, [isDirtyAny, state.rows]); // rows change is what affects dirtiness

  useEffect(() => {
    draftKeyRef.current = draftKey;
  }, [draftKey]);

  // Load function from data (should be stable from hook)
  const loadStatesAndDay = data.loadStatesAndDay;

  /**
   * Main load effect:
   * - build blank grid (no server-row prefill)
   * - then load draft ONLY if it exists for that date/frame
   */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await loadStatesAndDay(logDate);
      if (!result || cancelled) return;

      const { statesList } = result;

      const blankGrid: GridRow[] = statesList.map((x: StateResource) => {
        const code = String(x.state_code).toUpperCase();
        const inputs = makeInputs(Number(x.default_manpower ?? 0));

        // Default: blank/null (only cache if user dirties)
        inputs.manpower_count = "";
        inputs.tickets_received_am = "";
        inputs.tickets_closed_pm = "";
        inputs.project_tickets = "";
        inputs.emergency_tickets = "";

        return {
          state_name: x.state_name,
          state_code: code,
          inputs,
        };
      });

      setRows(blankGrid);
      resetDirty();

      const draft = loadDraft(draftKey);
      if (draft && draft.length) {
        setRows(draft);
        setDirtyFromRows(draft);
      } else {
        clearDraft(draftKey);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    loadStatesAndDay,
    logDate,
    frame, // included because key changes with frame; keeps behavior explicit
    draftKey,
    makeInputs,
    setRows,
    resetDirty,
    setDirtyFromRows,
    loadDraft,
    clearDraft,
  ]);

  /**
   * Persist on unmount / route change
   */
  useEffect(() => {
    return () => {
      const key = draftKeyRef.current;
      if (dirtyRef.current) saveDraft(key, rowsRef.current);
      else clearDraft(key);
    };
  }, [saveDraft, clearDraft]);

  /**
   * Persist on refresh/close
   */
  useEffect(() => {
    function onBeforeUnload() {
      const key = draftKeyRef.current;
      if (dirtyRef.current) saveDraft(key, rowsRef.current);
      else clearDraft(key);
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveDraft, clearDraft]);

  function toPreviewRow(payload: SubmitRow): DailyRowFromApi {
    const code = String(payload.state_code).toUpperCase();
    const stateRes = data.stateByCode[code];

    const manpower = Number(payload.manpower_count ?? 0);
    const total = Number(payload.tickets_total ?? 0);
    const proj = Number(payload.project_tickets ?? 0);
    const emer = Number(payload.emergency_tickets ?? 0);

    const existing = data.serverRows[code];
    const backlogStart = Number(existing?.backlog_start ?? 0);

    return {
      log_date: logDate,
      state_code: code,
      state_name: String(stateRes?.state_name ?? code),

      manpower_count: manpower,
      tickets_received_am: frame === "AM" ? total : Number(existing?.tickets_received_am ?? 0),
      tickets_closed_pm: frame === "PM" ? total : Number(existing?.tickets_closed_pm ?? 0),
      project_tickets: proj,
      emergency_tickets: emer,

      backlog_start: backlogStart,
      backlog_end: 0,

      avg_received_per_tech: 0,
      avg_closed_per_tech: 0,

      updated_at: new Date().toISOString(),
    };
  }

  async function onSubmitBatch() {
    data.setOut("");

    const errs = state.validate();
    if (errs.length) {
      data.setOut(errs.join("\n"));
      return;
    }

    const payloadRows = state.buildPayloadRows() as SubmitRow[];

    const r = await data.submitDailyLog({
      logDate,
      frame,
      payloadRows,
    });

    if (!r.ok) return;

    // Snapshot
    setLastSubmittedRows(payloadRows.map(toPreviewRow));

    // Submit success: clear draft + clear entry back to blank/null
    clearDraft(draftKey);
    resetDirty();

    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        inputs: {
          ...row.inputs,
          manpower_count: "",
          tickets_received_am: "",
          tickets_closed_pm: "",
          project_tickets: "",
          emergency_tickets: "",
        },
      }))
    );
  }

  async function onSaveBaseline() {
    if (!state.editing) return;

    const r = await data.saveBaseline(
      {
        state_code: state.editing.state_code,
        default_manpower: state.editing.default_manpower,
        backlog_seed: state.editing.backlog_seed,
      },
      logDate
    );

    if (r.ok) state.setEditing(null);
  }

  async function onSaveLastSubmittedRow(payloadRow: {
    state_code: string;
    manpower_count: number;
    tickets_total: number;
    project_tickets: number;
    emergency_tickets: number;
  }) {
    data.setOut("");

    const r = await data.submitDailyLog({
      logDate,
      frame,
      payloadRows: [payloadRow],
    });

    if (!r.ok) return;

    const updated = toPreviewRow(payloadRow as SubmitRow);
    const next = { ...lastSubmittedByCode, [String(payloadRow.state_code).toUpperCase()]: updated };
    setLastSubmittedRows(Object.values(next));
  }

  return (
    <LocateDailyCallLogView
      loading={data.loading}
      submitting={data.submitting}
      savingBaseline={data.savingBaseline}
      out={data.out}
      serverRows={data.serverRows}
      stateByCode={data.stateByCode}
      logDate={logDate}
      setLogDate={state.setLogDate}
      frame={frame}
      setFrame={state.setFrame}
      filter={state.filter}
      setFilter={state.setFilter}
      rows={state.rows}
      setRows={setRows}
      filteredRows={state.filteredRows}
      lastSubmittedRows={lastSubmittedRows}
      onClearLastSubmitted={() => setLastSubmittedRows([])}
      onSaveLastSubmittedRow={onSaveLastSubmittedRow}
      editing={state.editing}
      setEditing={state.setEditing}
      ticketsLabel={state.ticketsLabel}
      gridStyle={state.gridStyle}
      updateRow={state.updateRow}
      openBaselineModalFor={state.openBaselineModalFor}
      projectedBacklogEnd={state.projectedBacklogEnd}
      getBacklogStart={state.getBacklogStart}
      onSubmitBatch={onSubmitBatch}
      onSaveBaseline={onSaveBaseline}
    />
  );
}