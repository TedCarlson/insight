"use client";

import React, { useEffect } from "react";
import { useLocateDailyLogData } from "../hooks/useLocateDailyLogData";
import { useLocateDailyLogState } from "../hooks/useLocateDailyLogState";
import { LocateDailyCallLogView } from "./LocateDailyCallLogView";
import type { GridRow, StateResource } from "../types";

export default function LocateDailyCallLogClient() {
  const data = useLocateDailyLogData();
  const state = useLocateDailyLogState({
    serverRows: data.serverRows,
    stateByCode: data.stateByCode,
  });

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

  async function onSubmitBatch() {
    data.setOut("");

    const errs = state.validate();
    if (errs.length) {
      data.setOut(errs.join("\n"));
      return;
    }

    const payloadRows = state.buildPayloadRows();
    await data.submitDailyLog({
      logDate: state.logDate,
      frame: state.frame,
      payloadRows,
    });
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
      historyFilter={state.historyFilter}
      setHistoryFilter={state.setHistoryFilter}
      historyOnlySaved={state.historyOnlySaved}
      setHistoryOnlySaved={state.setHistoryOnlySaved}
      historyOnlyFlagged={state.historyOnlyFlagged}
      setHistoryOnlyFlagged={state.setHistoryOnlyFlagged}
      rows={state.rows}
      setRows={state.setRows}
      filteredRows={state.filteredRows}
      historyRows={state.historyRows}
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