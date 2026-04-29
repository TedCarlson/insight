// path: apps/web/src/shared/surfaces/workforce/WorkforceSupervisorAuditClient.tsx

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Row = {
  reports_to_name: string;
  metrics_hc: number;
  field: number;
  travel: number;
  drop_bury: number;
  leadership: number;
  support: number;
  total_chain: number;
  drift: number;
};

export function WorkforceSupervisorAuditClient() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/workforce/audit-supervisors")
      .then((r) => r.json())
      .then((j) => setRows(j.rows ?? []));
  }, []);

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-3">
        Workforce Audit (Supervisor View)
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Supervisor</th>
              <th className="px-3 py-2 text-right">Metrics HC</th>
              <th className="px-3 py-2 text-right">Field</th>
              <th className="px-3 py-2 text-right">Travel</th>
              <th className="px-3 py-2 text-right">Drop</th>
              <th className="px-3 py-2 text-right">Lead</th>
              <th className="px-3 py-2 text-right">Support</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.reports_to_name} className="border-b">
                <td className="px-3 py-2">{r.reports_to_name}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {r.metrics_hc}
                </td>
                <td className="px-3 py-2 text-right">{r.field}</td>
                <td className="px-3 py-2 text-right">{r.travel}</td>
                <td className="px-3 py-2 text-right">{r.drop_bury}</td>
                <td className="px-3 py-2 text-right">{r.leadership}</td>
                <td className="px-3 py-2 text-right">{r.support}</td>
                <td className="px-3 py-2 text-right">{r.total_chain}</td>
                <td
                  className={[
                    "px-3 py-2 text-right font-semibold",
                    r.drift > 0 ? "text-amber-600" : "",
                  ].join(" ")}
                >
                  {r.drift}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}