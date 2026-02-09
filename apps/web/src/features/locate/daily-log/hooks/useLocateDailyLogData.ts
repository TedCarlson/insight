"use client";

import { useCallback, useState } from "react";
import type { DailyRowFromApi, Frame, StateResource } from "../types";

type SubmitRow = {
  state_code: string;
  manpower_count: number;
  tickets_total: number;
  project_tickets: number;
  emergency_tickets: number;
};

export function useLocateDailyLogData() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [out, setOut] = useState<string>("");

  const [serverRows, setServerRows] = useState<Record<string, DailyRowFromApi>>({});
  const [stateByCode, setStateByCode] = useState<Record<string, StateResource>>({});
  const [statesList, setStatesList] = useState<StateResource[]>([]);

  // Tracks the most recently submitted state codes for the current logDate.
  // This powers the "Last submitted rows" card highlighting just what the user touched.
  const [lastSubmittedCodes, setLastSubmittedCodes] = useState<string[]>([]);

  const loadStatesAndDay = useCallback(
    async (date: string): Promise<{
      serverRows: Record<string, DailyRowFromApi>;
      statesList: StateResource[];
    } | null> => {
      setLoading(true);
      setOut("");

      // Switching days resets the "last submitted" preview.
      setLastSubmittedCodes([]);

      try {
        // 1) states
        const st = await fetch("/api/locate/state-resource", { cache: "no-store" });
        const stJson = await st.json().catch(() => null);

        if (!st.ok || !stJson?.ok) {
          setOut(`Failed to load states: ${stJson?.error ?? st.status}`);
          return null;
        }

        const states: StateResource[] = Array.isArray(stJson.states) ? (stJson.states as StateResource[]) : [];
        setStatesList(states);

        const sMap: Record<string, StateResource> = {};
        for (const x of states) {
          sMap[String(x.state_code).toUpperCase()] = x;
        }
        setStateByCode(sMap);

        // 2) day log rows
        const dl = await fetch(`/api/locate/daily-log?date=${encodeURIComponent(date)}`, { cache: "no-store" });
        const dlJson = await dl.json().catch(() => null);

        const map: Record<string, DailyRowFromApi> = {};
        if (dl.ok && dlJson?.ok) {
          for (const r of (dlJson.rows ?? []) as DailyRowFromApi[]) {
            map[String(r.state_code).toUpperCase()] = r;
          }
        }
        setServerRows(map);

        return { serverRows: map, statesList: states };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const submitDailyLog = useCallback(
    async (args: { logDate: string; frame: Frame; payloadRows: SubmitRow[] }) => {
      setOut("");

      if (!args.payloadRows.length) {
        setOut("Nothing to submit yet. Enter at least one state row.");
        return { ok: false as const };
      }

      setSubmitting(true);
      try {
        setLastSubmittedCodes(args.payloadRows.map((r) => String(r.state_code).toUpperCase()));

        const res = await fetch("/api/locate/daily-log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ log_date: args.logDate, frame: args.frame, rows: args.payloadRows }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setOut(`Submit failed: ${json?.error ?? res.status}`);
          return { ok: false as const };
        }

        setOut(`Submitted ${args.payloadRows.length} row(s).`);
        await loadStatesAndDay(args.logDate);
        return { ok: true as const };
      } finally {
        setSubmitting(false);
      }
    },
    [loadStatesAndDay]
  );

  const clearLastSubmitted = useCallback(() => setLastSubmittedCodes([]), []);

  const lastSubmittedRows = useCallback((): DailyRowFromApi[] => {
    if (!lastSubmittedCodes.length) return [];
    return lastSubmittedCodes
      .map((code) => serverRows[String(code).toUpperCase()])
      .filter(Boolean) as DailyRowFromApi[];
  }, [lastSubmittedCodes, serverRows]);

  const saveBaseline = useCallback(
    async (editing: { state_code: string; default_manpower: number; backlog_seed: number }, logDate: string) => {
      setOut("");
      setSavingBaseline(true);

      try {
        const res = await fetch("/api/locate/state-resource/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            state_code: editing.state_code,
            default_manpower: editing.default_manpower,
            backlog_seed: editing.backlog_seed,
          }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          setOut(`Baseline update failed: ${json?.error ?? res.status}`);
          return { ok: false as const };
        }

        await loadStatesAndDay(logDate);
        return { ok: true as const };
      } finally {
        setSavingBaseline(false);
      }
    },
    [loadStatesAndDay]
  );

  return {
    loading,
    submitting,
    savingBaseline,
    out,
    setOut,

    serverRows,
    stateByCode,
    statesList,

    lastSubmittedCodes,
    lastSubmittedRows,
    clearLastSubmitted,

    loadStatesAndDay,
    submitDailyLog,
    saveBaseline,
  };
}