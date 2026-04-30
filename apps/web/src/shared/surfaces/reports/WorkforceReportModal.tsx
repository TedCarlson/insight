// path: apps/web/src/shared/surfaces/reports/WorkforceReportModal.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Row = {
  supervisor_name: string | null;
  full_name: string | null;
  tech_id: string | null;
  position_title: string | null;
  seat_type: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  regionLabel: string;
  reportMonthLabel: string;
};

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(rows: Row[]) {
  const output = [
    ["Supervisor", "Person", "Tech ID", "Role", "Seat"],
    ...rows.map((row) => [
      row.supervisor_name ?? "Unassigned",
      row.full_name ?? "—",
      row.tech_id ?? "—",
      row.position_title ?? "—",
      row.seat_type ?? "—",
    ]),
  ];

  return output.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function WorkforceReportModal({
  open,
  onClose,
  regionLabel,
  reportMonthLabel,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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

      if (!map.has(row.supervisor_name)) map.set(row.supervisor_name, []);
      map.get(row.supervisor_name)!.push(row);
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (!open) return null;

  function downloadCsv() {
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `Workforce Report - ${regionLabel} - ${reportMonthLabel}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const html = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");

    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Workforce Report - ${regionLabel} - ${reportMonthLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            .subhead { font-size: 12px; color: #4b5563; margin-bottom: 20px; }
            h2 { font-size: 15px; margin: 22px 0 8px; page-break-after: avoid; }

            .group {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 18px;
            }

            table {
              border-collapse: collapse;
              width: 100%;
              table-layout: fixed;
              margin-bottom: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            th, td {
              border: 1px solid #d1d5db;
              padding: 6px 8px;
              font-size: 11px;
              text-align: left;
              vertical-align: top;
              overflow-wrap: anywhere;
            }

            th { background: #f3f4f6; }

            th:nth-child(1), td:nth-child(1) { width: 42%; }
            th:nth-child(2), td:nth-child(2) { width: 18%; }
            th:nth-child(3), td:nth-child(3) { width: 25%; }
            th:nth-child(4), td:nth-child(4) { width: 15%; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[85vh] w-[95vw] max-w-6xl flex-col rounded-2xl border bg-background shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Workforce Report</h2>
            <div className="text-sm text-muted-foreground">
              {regionLabel} • {reportMonthLabel}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={downloadCsv} className="rounded-lg border px-3 py-1.5 text-sm">
              CSV
            </button>
            <button onClick={printPdf} className="rounded-lg border px-3 py-1.5 text-sm">
              Print / PDF
            </button>
            <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">
              Close
            </button>
          </div>
        </div>

        <div ref={printRef} className="flex-1 overflow-y-auto px-5 py-4">
          <h1>{regionLabel} Workforce Report</h1>
          <div className="subhead">{reportMonthLabel}</div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No workforce data found.</div>
          ) : (
            grouped.map(([supervisor, team]) => (
              <div key={supervisor} className="mb-6 group">
                <h2>
                  {supervisor} ({team.length})
                </h2>

                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: "42%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "15%" }} />
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
                      <tr key={`${supervisor}-${t.tech_id ?? t.full_name ?? i}`}>
                        <td className="border px-2 py-1 truncate">{t.full_name ?? "—"}</td>
                        <td className="border px-2 py-1">{t.tech_id ?? "—"}</td>
                        <td className="border px-2 py-1">{t.position_title ?? "—"}</td>
                        <td className="border px-2 py-1">{t.seat_type ?? "—"}</td>
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