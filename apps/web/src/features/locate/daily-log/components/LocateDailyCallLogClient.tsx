"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocateDailyLogData } from "../hooks/useLocateDailyLogData";
import { useLocateDailyLogState } from "../hooks/useLocateDailyLogState";
import { LocateDailyCallLogView } from "./LocateDailyCallLogView";
import type { DailyRowFromApi, GridRow } from "../types";

type SubmitRow = {
  state_code: string;
  manpower_count: number;
  tickets_total: number;
  project_tickets: number;
  emergency_tickets: number;
  ojc: number;
};

type LastSubmittedMap = Record<string, DailyRowFromApi>;

function keyForDraft(logDate: string, frame: string) {
  return `locate_daily_log_draft:${logDate}:${frame}`;
}

export const LocateDailyCallLogClient = () => {
  const data = useLocateDailyLogData();

  const {
    loading,
    submitting,
    savingBaseline,
    out,
    setOut,
    serverRows,
    stateByCode,
    loadStatesAndDay,
    submitDailyLog,
    saveBaseline,
  } = data;

  const state = useLocateDailyLogState({
    serverRows,
    stateByCode,
  });

  const { logDate, frame, makeInputs, setRows, resetDirty, setDirtyFromRows } = state;

  const draftKey = useMemo(() => keyForDraft(logDate, frame), [logDate, frame]);

  const [lastSubmittedByCode, setLastSubmittedByCode] = useState<LastSubmittedMap>({});
  const lastSubmittedRows = useMemo(() => Object.values(lastSubmittedByCode), [lastSubmittedByCode]);

  const clearDraft = useCallback((key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, []);

  const saveDraftLocal = useCallback((key: string, rows: GridRow[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      /* noop */
    }
  }, []);

  const loadDraftLocal = useCallback((key: string): GridRow[] | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as GridRow[]) : null;
    } catch {
      return null;
    }
  }, []);

  // ✅ Memoized so callbacks can depend on it (React Compiler + exhaustive-deps)
  const toPreviewRow = useCallback(
    (payload: SubmitRow): DailyRowFromApi => {
      const code = String(payload.state_code).toUpperCase();
      const stateRes = stateByCode[code];

      const manpower = Number(payload.manpower_count ?? 0);
      const total = Number(payload.tickets_total ?? 0);
      const proj = Number(payload.project_tickets ?? 0);
      const emer = Number(payload.emergency_tickets ?? 0);
      const ojc = Number(payload.ojc ?? 0);

      const existing = serverRows[code];
      const backlogStart = Number(existing?.backlog_start ?? 0);

      const ticketsReceivedAM = frame === "AM" ? total : Number(existing?.tickets_received_am ?? 0);
      const ticketsClosedPM = frame === "PM" ? total : Number(existing?.tickets_closed_pm ?? 0);

      const backlogEnd =
        frame === "AM"
          ? backlogStart + ticketsReceivedAM + proj
          : backlogStart + ticketsReceivedAM + proj - ticketsClosedPM;

      const avgReceived = manpower > 0 ? ticketsReceivedAM / manpower : 0;
      const avgClosed = manpower > 0 ? ticketsClosedPM / manpower : 0;

      return {
        log_date: logDate,
        state_code: code,
        state_name: stateRes?.state_name ?? code,

        manpower_count: manpower,
        tickets_received_am: ticketsReceivedAM,
        tickets_closed_pm: ticketsClosedPM,
        project_tickets: proj,
        emergency_tickets: emer,
        ojc,

        backlog_start: backlogStart,
        backlog_end: backlogEnd,

        avg_received_per_tech: avgReceived,
        avg_closed_per_tech: avgClosed,
        updated_at: new Date().toISOString(),
      };
    },
    [frame, logDate, serverRows, stateByCode]
  );

  // ✅ Load day + states ONCE per date change (kills the repeat GET spam)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const r = await loadStatesAndDay(logDate);
      if (!r || cancelled) return;

      const nextRows: GridRow[] = r.statesList
        .filter((s) => s.is_active !== false)
        .map((s) => {
          const code = String(s.state_code).toUpperCase();
          const existing = r.serverRows[code];

          return {
            state_code: code,
            state_name: s.state_name,
            inputs: existing
              ? {
                  manpower_count: Number(existing.manpower_count ?? 0) || "",
                  tickets_received_am: Number(existing.tickets_received_am ?? 0) || "",
                  tickets_closed_pm: Number(existing.tickets_closed_pm ?? 0) || "",
                  project_tickets: Number(existing.project_tickets ?? 0) || "",
                  emergency_tickets: Number(existing.emergency_tickets ?? 0) || "",
                  ojc: Number((existing as any).ojc ?? 0) || "",
                }
              : makeInputs(s.default_manpower ?? 0),
          };
        });

      setRows(nextRows);
      resetDirty();

      const draft = loadDraftLocal(draftKey);
      if (draft && draft.length) {
        const seed = makeInputs(0);
        const hydrated = draft.map((row) => ({
          ...row,
          inputs: { ...seed, ...(row as any).inputs }, // ensures ojc exists for older drafts
        }));
        setRows(hydrated);
        setDirtyFromRows(hydrated);
      } else {
        clearDraft(draftKey);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    logDate,
    draftKey,
    loadStatesAndDay,
    makeInputs,
    setRows,
    resetDirty,
    setDirtyFromRows,
    loadDraftLocal,
    clearDraft,
  ]);

  // Draft persistence (safe: only depends on primitive draftKey and state.rows)
  useEffect(() => {
    saveDraftLocal(draftKey, state.rows);
  }, [draftKey, saveDraftLocal, state.rows]);

  const onSubmit = useCallback(async () => {
    setOut("");

    const errs = state.validate();
    if (errs.length) {
      setOut(errs[0]);
      return;
    }

    const payloadRows = state.buildPayloadRows() as SubmitRow[];
    const r = await submitDailyLog({ logDate, frame, payloadRows });
    if (!r.ok) return;

    setLastSubmittedByCode((prev) => {
      const next = { ...prev };
      for (const p of payloadRows) {
        const row = toPreviewRow(p);
        next[String(row.state_code).toUpperCase()] = row;
      }
      return next;
    });

    clearDraft(draftKey);

    setRows((prev) =>
      prev.map((rr) => {
        const code = String(rr.state_code).toUpperCase();
        const wasSubmitted = payloadRows.some((p) => String(p.state_code).toUpperCase() === code);
        if (!wasSubmitted) return rr;
        return { ...rr, inputs: makeInputs(stateByCode[code]?.default_manpower ?? 0) };
      })
    );

    resetDirty();
  }, [
    setOut,
    state,
    submitDailyLog,
    logDate,
    frame,
    toPreviewRow,
    clearDraft,
    draftKey,
    setRows,
    makeInputs,
    resetDirty,
    stateByCode,
  ]);

  const onClearLastSubmitted = useCallback(() => {
    setLastSubmittedByCode({});
  }, []);

  const onSaveLastSubmittedRow = useCallback(
    async (payloadRow: {
      state_code: string;
      manpower_count: number;
      tickets_total: number;
      project_tickets: number;
      emergency_tickets: number;
      ojc?: number;
    }) => {
      setOut("");

      const normalized: SubmitRow = {
        state_code: payloadRow.state_code,
        manpower_count: Number(payloadRow.manpower_count ?? 0),
        tickets_total: Number(payloadRow.tickets_total ?? 0),
        project_tickets: Number(payloadRow.project_tickets ?? 0),
        emergency_tickets: Number(payloadRow.emergency_tickets ?? 0),
        ojc: Number(payloadRow.ojc ?? 0),
      };

      const r = await submitDailyLog({
        logDate,
        frame,
        payloadRows: [normalized],
      });

      if (!r.ok) return;

      const updated = toPreviewRow(normalized);
      setLastSubmittedByCode((prev) => ({
        ...prev,
        [String(updated.state_code).toUpperCase()]: updated,
      }));
    },
    [setOut, submitDailyLog, logDate, frame, toPreviewRow]
  );

  return (
    <LocateDailyCallLogView
      loading={loading}
      submitting={submitting}
      savingBaseline={savingBaseline}
      out={out}
      setOut={setOut}
      logDate={state.logDate}
      setLogDate={state.setLogDate}
      frame={state.frame}
      setFrame={state.setFrame}
      filter={state.filter}
      setFilter={state.setFilter}
      ticketsLabel={state.ticketsLabel}
      gridStyle={state.gridStyle}
      rows={state.filteredRows}
      serverRows={serverRows}
      stateByCode={stateByCode}
      updateRow={state.updateRow}
      editing={state.editing}
      setEditing={state.setEditing}
      openBaselineModalFor={state.openBaselineModalFor}
      saveBaseline={saveBaseline}
      onSubmit={onSubmit}
      isDirtyAny={state.isDirtyAny}
      lastSubmittedRows={lastSubmittedRows}
      onClearLastSubmitted={onClearLastSubmitted}
      onSaveLastSubmittedRow={onSaveLastSubmittedRow}
    />
  );
};

export default LocateDailyCallLogClient;