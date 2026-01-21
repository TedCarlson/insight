//apps/web/src/features/planning/scheduleMirror.store.ts

"use client";

import * as React from "react";

export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAYS)[number];
export type DaysMap = Record<DayKey, boolean>;

export const DEFAULT_DAYS_ALL_ON: DaysMap = {
  sun: true,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: true,
};

function safeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type ScheduleMirrorState = {
  /** person_pc_org_id -> days */
  byMember: Record<string, DaysMap>;
  /** assignment_id -> schedule_id (per-scope/week) */
  scheduleIdByAssignment: Record<string, string>;
};

export type ScheduleMirrorApi = {
  // days
  getDays: (personPcOrgId: string) => DaysMap;
  setDays: (personPcOrgId: string, days: DaysMap) => void;
  toggleDay: (personPcOrgId: string, day: DayKey) => void;
  ensureMember: (personPcOrgId: string, initialDays?: DaysMap) => void;

  // schedule_id mapping
  getScheduleId: (assignmentId: string) => string | null;
  setScheduleId: (assignmentId: string, scheduleId: string) => void;
  /**
   * Returns the stable schedule_id for an assignment_id.
   * If missing, will adopt seedId (if provided) or mint a new uuid and store it.
   */
  ensureScheduleId: (assignmentId: string, seedId?: string | null) => string;
};

const ScheduleMirrorContext = React.createContext<ScheduleMirrorApi | null>(null);

export function useScheduleMirrorOptional() {
  return React.useContext(ScheduleMirrorContext);
}

export function useScheduleMirror() {
  const ctx = React.useContext(ScheduleMirrorContext);
  if (!ctx) throw new Error("useScheduleMirror must be used within <ScheduleMirrorProvider />");
  return ctx;
}

export function ScheduleMirrorProvider(props: {
  /** Initial seed; typically computed from scheduleSeeds + defaults */
  initialByMember: Record<string, DaysMap>;
  /** Initial seed; typically computed from scheduleSeeds (assignment_id -> schedule_id) */
  initialScheduleIdByAssignment?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ScheduleMirrorState>(() => ({
    byMember: props.initialByMember ?? {},
    scheduleIdByAssignment: props.initialScheduleIdByAssignment ?? {},
  }));

  // Keep membership keys up-to-date if caller changes seeds (eg, new week / org)
  // NOTE: we intentionally *merge* scheduleIdByAssignment to avoid losing minted ids
  // in cases where the server-provided seeds lag behind local writes.
  React.useEffect(() => {
    setState((prev) => ({
      byMember: props.initialByMember ?? {},
      scheduleIdByAssignment: {
        ...(prev.scheduleIdByAssignment ?? {}),
        ...(props.initialScheduleIdByAssignment ?? {}),
      },
    }));
  }, [props.initialByMember, props.initialScheduleIdByAssignment]);

  const api = React.useMemo<ScheduleMirrorApi>(() => {
    function getDays(personPcOrgId: string) {
      return state.byMember[personPcOrgId] ?? DEFAULT_DAYS_ALL_ON;
    }

    function setDays(personPcOrgId: string, days: DaysMap) {
      setState((prev) => ({
        ...prev,
        byMember: {
          ...prev.byMember,
          [personPcOrgId]: days,
        },
      }));
    }

    function toggleDay(personPcOrgId: string, day: DayKey) {
      setState((prev) => {
        const cur = prev.byMember[personPcOrgId] ?? DEFAULT_DAYS_ALL_ON;
        return {
          ...prev,
          byMember: {
            ...prev.byMember,
            [personPcOrgId]: { ...cur, [day]: !cur[day] },
          },
        };
      });
    }

    function ensureMember(personPcOrgId: string, initialDays?: DaysMap) {
      setState((prev) => {
        if (prev.byMember[personPcOrgId]) return prev;
        return {
          ...prev,
          byMember: {
            ...prev.byMember,
            [personPcOrgId]: initialDays ?? DEFAULT_DAYS_ALL_ON,
          },
        };
      });
    }

    function getScheduleId(assignmentId: string) {
      return state.scheduleIdByAssignment[assignmentId] ?? null;
    }

    function setScheduleId(assignmentId: string, scheduleId: string) {
      setState((prev) => ({
        ...prev,
        scheduleIdByAssignment: {
          ...prev.scheduleIdByAssignment,
          [assignmentId]: scheduleId,
        },
      }));
    }

    function ensureScheduleId(assignmentId: string, seedId?: string | null) {
      const existing = state.scheduleIdByAssignment[assignmentId] ?? null;
      if (existing) return existing;

      const minted = seedId ?? safeUuid();
      setState((prev) => {
        if (prev.scheduleIdByAssignment[assignmentId]) return prev;
        return {
          ...prev,
          scheduleIdByAssignment: {
            ...prev.scheduleIdByAssignment,
            [assignmentId]: minted,
          },
        };
      });

      return minted;
    }

    return { getDays, setDays, toggleDay, ensureMember, getScheduleId, setScheduleId, ensureScheduleId };
  }, [state.byMember, state.scheduleIdByAssignment]);

  // IMPORTANT: no JSX in .ts files; use createElement
  return React.createElement(ScheduleMirrorContext.Provider, { value: api }, props.children);
}
