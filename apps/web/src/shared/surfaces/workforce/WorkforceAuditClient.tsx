// path: apps/web/src/shared/surfaces/workforce/WorkforceAuditClient.tsx

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Row = {
  person_id: string;
  full_name: string;
  seat_type: string;
  position: string;
  affiliation_label: string;
  reports_to_name: string | null;
};

export function WorkforceAuditClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workforce/audit")
      .then((r) => r.json())
      .then((json) => {
        setRows(json.rows ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold mb-3">Workforce Audit</div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-xs">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Seat</th>
                <th className="px-3 py-2 text-left">Position</th>
                <th className="px-3 py-2 text-left">Affiliation</th>
                <th className="px-3 py-2 text-left">Reports To</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.person_id} className="border-b">
                  <td className="px-3 py-2">{r.full_name}</td>
                  <td className="px-3 py-2">{r.seat_type}</td>
                  <td className="px-3 py-2">{r.position}</td>
                  <td className="px-3 py-2">{r.affiliation_label}</td>
                  <td className="px-3 py-2">
                    {r.reports_to_name ?? "⚠️ Missing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}