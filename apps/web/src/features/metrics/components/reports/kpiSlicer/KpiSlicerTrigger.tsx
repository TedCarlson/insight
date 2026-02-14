"use client";

import type { ReactNode } from "react";
import { useKpiSlicer } from "./KpiSlicerProvider";

export function KpiSlicerTrigger({
  kpiKey,
  children,
}: {
  kpiKey: string;
  children: ReactNode;
}) {
  const { openForKpi } = useKpiSlicer();

  return (
    <button
      type="button"
      onClick={() => openForKpi(kpiKey)}
      className="inline-flex items-center justify-center hover:opacity-90"
      title="Open KPI slicer"
    >
      {children}
    </button>
  );
}