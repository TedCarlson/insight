"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ReportingTable } from "./ReportingTable";

type Props = {
  okRows: any[];
  nonOkRows: any[];
  personNameById: Map<string, string>;
  preset: Record<string, any>;
  kpis: any[];
};

export default function ReportsToFilterShell({
  okRows,
  nonOkRows,
  personNameById,
  preset,
  kpis,
}: Props) {
  const [selectedReportsTo, setSelectedReportsTo] =
    useState<string>("ALL");

  const reportsToOptions = useMemo(() => {
    const map = new Map<string, string>();

    [...okRows, ...nonOkRows].forEach((r) => {
      if (!r.reports_to_person_id) return;

      const id = String(r.reports_to_person_id);
      const name = personNameById.get(id) ?? "—";
      map.set(id, name);
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1])
    );
  }, [okRows, nonOkRows, personNameById]);

  const filteredOk = useMemo(() => {
    if (selectedReportsTo === "ALL") return okRows;
    return okRows.filter(
      (r) => String(r.reports_to_person_id) === selectedReportsTo
    );
  }, [okRows, selectedReportsTo]);

  const filteredNonOk = useMemo(() => {
    if (selectedReportsTo === "ALL") return nonOkRows;
    return nonOkRows.filter(
      (r) => String(r.reports_to_person_id) === selectedReportsTo
    );
  }, [nonOkRows, selectedReportsTo]);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-sm text-[var(--to-ink-muted)]">
              Reports To
            </div>

            <select
              value={selectedReportsTo}
              onChange={(e) =>
                setSelectedReportsTo(e.target.value)
              }
              className="border rounded px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All</option>
              {reportsToOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-medium mb-3">
          Metrics (Stack Ranking)
        </div>

        <ReportingTable
          rows={filteredOk}
          showStatus={false}
          personNameById={personNameById}
          preset={preset}
          kpis={kpis}
          slicerTitle="Metrics slicer"
        />
      </Card>

      {filteredNonOk.length > 0 && (
        <Card>
          <div className="text-sm font-medium mb-3">
            Outliers (Attention Required)
          </div>

          <ReportingTable
            rows={filteredNonOk}
            showStatus={true}
            personNameById={personNameById}
            preset={preset}
            kpis={kpis}
            slicerTitle="Outliers slicer"
          />
        </Card>
      )}
    </>
  );
}