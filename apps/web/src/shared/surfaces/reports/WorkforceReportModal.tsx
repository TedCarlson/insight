// path: apps/web/src/shared/surfaces/reports/WorkforceReportModal.tsx

"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  supervisor_name: string | null;
  full_name: string | null;
  tech_id: string | null;
  position_title: string | null;
  seat_type: string | null;
};

export function WorkforceReportModal({
  open,
  onClose,
  regionLabel,
  reportMonthLabel,
}: any) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch("/api/workforce/reporting-validation");
      const json = await res.json().catch(() => null);

      if (cancelled) return;

      setRows(json?.rows ?? []);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();

    for (const row of rows) {
      if (!row.supervisor_name || row.supervisor_name === "Unassigned") continue;

      const key = row.supervisor_name;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }

    return Array.from(map.entries());
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex w-[95vw] max-w-6xl h-[85vh] flex-col rounded-2xl border bg-background shadow-xl">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Workforce Report</h2>
            <div className="text-sm text-muted-foreground">
              {regionLabel} • {reportMonthLabel}
            </div>
          </div>

          <button onClick={onClose} className="border px-3 py-1.5 text-sm">
            Close
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No workforce data found.
            </div>
          ) : (
            grouped.map(([supervisor, team]) => (
              <div key={supervisor} className="mb-6">

                <div className="mb-2 font-semibold">
                  {supervisor} ({team.length})
                </div>

                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col className="w-[25%]" />
                    <col className="w-[15%]" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="border px-2 py-1 text-left">Person</th>
                      <th className="border px-2 py-1 text-left">Tech ID</th>
                      <th className="border px-2 py-1 text-left">Role</th>
                      <th className="border px-2 py-1 text-left">Seat</th>
                    </tr>
                  </thead>

                  <tbody>
                    {team.map((t, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1 truncate">
                          {t.full_name ?? "—"}
                        </td>
                        <td className="border px-2 py-1">
                          {t.tech_id ?? "—"}
                        </td>
                        <td className="border px-2 py-1">
                          {t.position_title ?? "—"}
                        </td>
                        <td className="border px-2 py-1">
                          {t.seat_type ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}