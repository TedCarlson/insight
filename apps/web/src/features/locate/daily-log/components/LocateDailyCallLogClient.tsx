"use client";

import React, { useEffect, useMemo, useState } from "react";
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

  // Pin only what the effect needs (so eslint doesn't demand `data`/`state`)
  const load = data.loadStatesAndDay;
  const logDate = state.logDate;
  const frame = state.frame;
  const makeInputs = state.makeInputs;
  const setRows = state.setRows;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await load(logDate);
      if (!result || cancelled) return;

      const { statesList, serverRows } = result;

      const grid: GridRow[] = statesList.map((x: StateResource) => {
        const code = String(x.state_code).toUpperCase();
        const existing = serverRows[code];

        const inputs = makeInputs(Number(x.default_manpower ?? 0));

        if (existing) {
          const savedManpower = Number(existing.manpower_count ?? 0);
          inputs.manpower_count = savedManpower > 0 ? savedManpower : "";

          if (frame === "AM") {
            const v = Number(existing.tickets_received_am ?? 0);
            inputs.tickets_received_am = v > 0 ? v : "";
          }

          if (frame === "PM") {
            const v = Number(existing.tickets_closed_pm ?? 0);
            inputs.tickets_closed_pm = v > 0 ? v : "";
          }

          const proj = Number(existing.project_tickets ?? 0);
          inputs.project_tickets = proj > 0 ? proj : "";

          const emer = Number(existing.emergency_tickets ?? 0);
          inputs.emergency_tickets = emer > 0 ? emer : "";
        }

        return {
          state_name: x.state_name,
          state_code: code,
          inputs,
        };
      });

      setRows(grid);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [load, logDate, frame, makeInputs, setRows]);

  function toPreviewRow(payload: SubmitRow): DailyRowFromApi {
    const code = String(payload.state_code).toUpperCase();
    const stateRes = data.stateByCode[code];

    const manpower = Number(payload.manpower_count ?? 0);
    const total = Number(payload.tickets_total ?? 0);
    const proj = Number(payload.project_tickets ?? 0);
    const emer = Number(payload.emergency_tickets ?? 0);

    // Use current server row as the safest "backlog start" anchor when available
    const existing = data.serverRows[code];
    const backlogStart = Number(existing?.backlog_start ?? 0);

    return {
      log_date: state.logDate,
      state_code: code,
      state_name: String(stateRes?.state_name ?? code),

      manpower_count: manpower,
      tickets_received_am: state.frame === "AM" ? total : Number(existing?.tickets_received_am ?? 0),
      tickets_closed_pm: state.frame === "PM" ? total : Number(existing?.tickets_closed_pm ?? 0),
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
      logDate: state.logDate,
      frame: state.frame,
      payloadRows,
    });

    if (r.ok) {
      // Create client-side "last submitted rows" snapshot
      const snapshot = payloadRows.map(toPreviewRow);
      setLastSubmittedRows(snapshot);
    }
  }

  async function onSaveBaseline() {
    if (!state.editing) return;

    const r = await data.saveBaseline(
      {
        state_code: state.editing.state_code,
        default_manpower: state.editing.default_manpower,
        backlog_seed: state.editing.backlog_seed,
      },
      state.logDate
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
      logDate: state.logDate,
      frame: state.frame,
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
      logDate={state.logDate}
      setLogDate={state.setLogDate}
      frame={state.frame}
      setFrame={state.setFrame}
      filter={state.filter}
      setFilter={state.setFilter}
      rows={state.rows}
      setRows={state.setRows}
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