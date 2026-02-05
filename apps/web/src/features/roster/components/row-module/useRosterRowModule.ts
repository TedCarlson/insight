// apps/web/src/features/roster/components/row-module/useRosterRowModule.ts
"use client";

import { useMemo } from "react";
import type { TabKey } from "../rosterRowModule.helpers";

export function useRosterRowModule(args: {
  tab: TabKey;

  // load fns (still owned by module for now)
  loadPerson: () => Promise<any> | any;
  loadMaster: () => Promise<any> | any;
  loadDrilldown: () => Promise<any> | any;

  // loading flags
  loadingPerson: boolean;
  loadingMaster: boolean;
  loadingDrill: boolean;
}) {
  const { tab, loadPerson, loadMaster, loadDrilldown, loadingPerson, loadingMaster, loadingDrill } = args;

  const refreshCurrent = async () => {
    if (tab === "person") return loadPerson();
    if (tab === "assignment") return loadMaster();
    if (tab === "leadership") return loadDrilldown();
    if (tab === "org") {
      await loadMaster();
      return loadDrilldown();
    }
  };

  const refreshing = useMemo(() => {
    return (
      (tab === "person" && loadingPerson) ||
      (tab === "assignment" && loadingMaster) ||
      (tab === "leadership" && loadingDrill) ||
      (tab === "org" && (loadingMaster || loadingDrill))
    );
  }, [tab, loadingPerson, loadingMaster, loadingDrill]);

  return { refreshCurrent, refreshing };
}