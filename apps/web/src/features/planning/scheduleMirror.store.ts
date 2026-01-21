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

export type ScheduleMirrorState = {
  /** person_pc_org_id -> days */
  byMember: Record<string, DaysMap>;
};

export type ScheduleMirrorApi = {
  getDays: (personPcOrgId: string) => DaysMap;
  setDays: (personPcOrgId: string, days: DaysMap) => void;
  toggleDay: (personPcOrgId: string, day: DayKey) => void;
  ensureMember: (personPcOrgId: string, initialDays?: DaysMap) => void;
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
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ScheduleMirrorState>(() => ({
    byMember: props.initialByMember ?? {},
  }));

  // Keep membership keys up-to-date if caller changes seeds (eg, new week / org)
  React.useEffect(() => {
    setState({ byMember: props.initialByMember ?? {} });
  }, [props.initialByMember]);

  const api = React.useMemo<ScheduleMirrorApi>(() => {
    function getDays(personPcOrgId: string) {
      return state.byMember[personPcOrgId] ?? DEFAULT_DAYS_ALL_ON;
    }

    function setDays(personPcOrgId: string, days: DaysMap) {
      setState((prev) => ({
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
          byMember: {
            ...prev.byMember,
            [personPcOrgId]: initialDays ?? DEFAULT_DAYS_ALL_ON,
          },
        };
      });
    }

    return { getDays, setDays, toggleDay, ensureMember };
  }, [state.byMember]);

  // IMPORTANT: no JSX in .ts files; use createElement
  return React.createElement(ScheduleMirrorContext.Provider, { value: api }, props.children);
}
