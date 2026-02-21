// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/components/reports/ReportsTabbedTable.tsx

"use client";

import React from "react";

import { Card } from "@/components/ui/Card";
import { ReportingTable, type PersonMeta } from "@/features/metrics/components/reports/ReportingTable";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

type TabKey = "STACK" | "OUTLIERS" | "ALL";

type PriorSnapshot = Record<string, number | null | undefined>;

type Props = {
  okRows: any[];
  nonOkRows: any[];

  personNameById: Map<string, string>;
  personMetaById: Map<string, PersonMeta>;

  preset: Record<string, any>;
  kpis: KpiDef[];

  latestMetricDate: string;
  priorMetricDate?: string | null;

  priorSnapshotByTechId?: Map<string, PriorSnapshot>;
};

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "h-9 px-3 rounded-xl text-sm font-medium",
        "border border-[var(--to-border)]",
        active ? "bg-[var(--to-surface)] shadow-sm" : "bg-transparent text-[var(--to-ink-muted)] hover:bg-[var(--to-surface)]/60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function ReportsTabbedTable({
  okRows,
  nonOkRows,
  personNameById,
  personMetaById,
  preset,
  kpis,
  latestMetricDate,
  priorMetricDate,
  priorSnapshotByTechId,
}: Props) {
  const [tab, setTab] = React.useState<TabKey>("STACK");

  const allRows = React.useMemo(() => [...okRows, ...nonOkRows], [okRows, nonOkRows]);

  const view = React.useMemo(() => {
    if (tab === "STACK") return { title: "Metrics (Stack Ranking)", rows: okRows, showStatus: false, slicerTitle: "Metrics slicer" };
    if (tab === "OUTLIERS") return { title: "Outliers (Attention Required)", rows: nonOkRows, showStatus: true, slicerTitle: "Outliers slicer" };
    return { title: "All (Full Set)", rows: allRows, showStatus: true, slicerTitle: "All slicer" };
  }, [tab, okRows, nonOkRows, allRows]);

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-sm font-medium">
          {view.title} • Tech count {view.rows.length}
        </div>

        <div className="text-xs text-[var(--to-ink-muted)]">
          As of <span className="font-mono tabular-nums">{String(latestMetricDate)}</span>
          {priorMetricDate ? (
            <>
              <span className="px-2">•</span>
              Prior <span className="font-mono tabular-nums">{String(priorMetricDate)}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto">
        <TabButton active={tab === "STACK"} onClick={() => setTab("STACK")} label="Stack Ranking" />
        <TabButton active={tab === "OUTLIERS"} onClick={() => setTab("OUTLIERS")} label="Outliers" />
        <TabButton active={tab === "ALL"} onClick={() => setTab("ALL")} label="All" />
      </div>

      <div className="mt-4">
        <ReportingTable
          rows={view.rows}
          showStatus={view.showStatus}
          personNameById={personNameById}
          personMetaById={personMetaById}
          preset={preset}
          kpis={kpis}
          slicerTitle={view.slicerTitle}
          priorSnapshotByTechId={priorSnapshotByTechId}
        />
      </div>
    </Card>
  );
}