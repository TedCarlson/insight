"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DailyRowFromApi, Frame, StateResource } from "../types";

type LoadDayResult = {
  serverRows: Record<string, DailyRowFromApi>;
  statesList: StateResource[];
};

type SubmitPayload = {
  logDate: string;
  frame: Frame;
  payloadRows: Array<{
    state_code: string;
    manpower_count: number;
    ojc: number;
    tickets_total: number;
    project_tickets: number;
    emergency_tickets: number;
  }>;
};

function toMap(rows: DailyRowFromApi[]): Record<string, DailyRowFromApi> {
  const m: Record<string, DailyRowFromApi> = {};
  for (const r of rows ?? []) {
    const code = String((r as any).state_code ?? "").toUpperCase();
    if (!code) continue;
    m[code] = r;
  }
  return m;
}

type JsonErr = { ok: false; error: string; details?: any };
type JsonOkAny = { ok: true } & Record<string, any>;

async function getJson(url: string, init?: RequestInit): Promise<JsonOkAny | JsonErr> {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    if (data && typeof data === "object") return data as JsonErr;
    return { ok: false, error: `http_${res.status}` };
  }

  return data as JsonOkAny;
}

const FAIL_COOLDOWN_MS = 3000;
const DEBOUNCE_MS = 150;

export function useLocateDailyLogData() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingBaseline, setSavingBaseline] = useState(false);

  const [out, setOut] = useState("");

  const [serverRows, setServerRows] = useState<Record<string, DailyRowFromApi>>({});
  const [stateByCode, setStateByCode] = useState<Record<string, StateResource>>({});

  const statesList = useMemo(() => Object.values(stateByCode), [stateByCode]);

  // loop guards
  const inFlightKeyRef = useRef<string | null>(null);
  const lastAttemptRef = useRef<Record<string, number>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStateResources = useCallback(async (): Promise<StateResource[] | null> => {
    const j = await getJson("/api/locate/state-resource");
    if (!j.ok) {
      setOut(`State resources load failed: ${j.error}`);
      return null;
    }

    // ✅ Your route returns { states: [...] } (not rows)
    const list = (Array.isArray((j as any).states) ? (j as any).states : null) ??
      (Array.isArray((j as any).rows) ? (j as any).rows : null) ??
      [];

    const next: Record<string, StateResource> = {};
    for (const r of list as StateResource[]) {
      const code = String((r as any).state_code ?? "").toUpperCase();
      if (!code) continue;
      next[code] = r;
    }

    setStateByCode(next);
    return list as StateResource[];
  }, []);

  const loadDayRows = useCallback(async (logDate: string): Promise<Record<string, DailyRowFromApi> | null> => {
    const j = await getJson(`/api/locate/daily-log?date=${encodeURIComponent(logDate)}`);
    if (!j.ok) {
      setOut(`Daily log load failed: ${j.error}`);
      return null;
    }

    const rows = (Array.isArray((j as any).rows) ? (j as any).rows : []) as DailyRowFromApi[];
    const mapped = toMap(rows);
    setServerRows(mapped);
    return mapped;
  }, []);

  const loadStatesAndDay = useCallback(
    async (logDate: string): Promise<LoadDayResult | null> => {
      const key = `day:${logDate}`;

      const last = lastAttemptRef.current[key] ?? 0;
      const now = Date.now();
      if (now - last < FAIL_COOLDOWN_MS) return null;

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      return await new Promise<LoadDayResult | null>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          if (inFlightKeyRef.current === key) {
            resolve(null);
            return;
          }

          inFlightKeyRef.current = key;
          setLoading(true);

          try {
            const states = await loadStateResources();
            if (!states) {
              lastAttemptRef.current[key] = Date.now();
              resolve(null);
              return;
            }

            const day = await loadDayRows(logDate);
            if (!day) {
              lastAttemptRef.current[key] = Date.now();
              resolve(null);
              return;
            }

            resolve({ statesList: states, serverRows: day });
          } finally {
            inFlightKeyRef.current = null;
            setLoading(false);
          }
        }, DEBOUNCE_MS);
      });
    },
    [loadDayRows, loadStateResources]
  );

  const submitDailyLog = useCallback(
    async (args: SubmitPayload): Promise<{ ok: boolean }> => {
      setSubmitting(true);
      try {
        const j = await getJson("/api/locate/daily-log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            log_date: args.logDate,
            frame: args.frame,
            rows: args.payloadRows,
          }),
        });

        if (!j.ok) {
          setOut(`Submit failed: ${j.error}`);
          return { ok: false };
        }

        // allow immediate refresh
        lastAttemptRef.current[`day:${args.logDate}`] = 0;

        await loadDayRows(args.logDate);
        return { ok: true };
      } finally {
        setSubmitting(false);
      }
    },
    [loadDayRows]
  );

  const saveBaseline = useCallback(
    async (payload: { state_code: string; default_manpower: number; backlog_seed: number }): Promise<{ ok: boolean }> => {
      setSavingBaseline(true);
      try {
        const j = await getJson("/api/locate/state-resource", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!j.ok) {
          setOut(`Baseline save failed: ${j.error}`);
          return { ok: false };
        }

        await loadStateResources();
        return { ok: true };
      } finally {
        setSavingBaseline(false);
      }
    },
    [loadStateResources]
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

    loadStatesAndDay,
    submitDailyLog,
    saveBaseline,
  };
}