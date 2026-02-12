"use client";

import React from "react";
import RubricEditor from "./RubricEditor";
import { RubricRow } from "@/features/metrics-admin/lib/rubric";

type Props = {
  classType: string;
  kpiDefs: any[];
  classConfig: any[];
  rubricRows?: RubricRow[];
  mso_id?: string | null;
};

export default function MetricsRubricSection({
  classType,
  kpiDefs,
  classConfig,
  rubricRows = [],
  mso_id,
}: Props) {
  async function saveRubric(
    kpiKey: string,
    rows: RubricRow[]
  ) {
    await fetch("/api/admin/metrics-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert_rubric_rows",
        classType,
        kpi_key: kpiKey,
        mso_id: mso_id ?? null,
        rows,
      }),
    });
  }

  return (
    <section className="border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">{classType}</h2>

      <div className="space-y-6">
        {kpiDefs.map((kpi) => {
          const existing = rubricRows.filter(
            (r) =>
              r.class_type === classType &&
              r.kpi_key === kpi.kpi_key &&
              (r.mso_id ?? null) === (mso_id ?? null)
          );

          return (
            <div key={kpi.kpi_key} className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {kpi.customer_label || kpi.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {kpi.kpi_key}
                  </div>
                </div>
              </div>

              <RubricEditor
                classType={classType}
                kpiKey={kpi.kpi_key}
                mso_id={mso_id}
                existingRows={existing}
                onSave={(rows) => saveRubric(kpi.kpi_key, rows)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}