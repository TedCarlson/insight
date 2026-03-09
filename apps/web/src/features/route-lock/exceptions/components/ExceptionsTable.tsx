"use client";

import { useState } from "react";
import type { ExceptionRow } from "../hooks/useExceptions";

function statusLabel(row: ExceptionRow) {
  if (row.status) return row.status;
  return row.approved ? "APPROVED" : "PENDING";
}

export default function ExceptionsTable(props: {
  rows: ExceptionRow[];
  onApprove: (row: ExceptionRow, decisionNotes?: string) => Promise<void>;
  onDeny: (row: ExceptionRow, decisionNotes?: string) => Promise<void>;
}) {
  const { rows, onApprove, onDeny } = props;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(row: ExceptionRow) {
    setBusyId(row.schedule_exception_day_id);
    setError(null);

    try {
      await onApprove(row);
    } catch (err: any) {
      setError(String(err?.message ?? "Failed to approve exception"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeny(row: ExceptionRow) {
    setBusyId(row.schedule_exception_day_id);
    setError(null);

    try {
      const decisionNotes = window.prompt("Optional denial note:", row.decision_notes ?? "") ?? "";
      await onDeny(row, decisionNotes);
    } catch (err: any) {
      setError(String(err?.message ?? "Failed to deny exception"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-sm text-[var(--to-danger,#b91c1c)]">{error}</div> : null}

      <table className="w-full text-sm">
        <thead className="text-left text-[var(--to-ink-muted)]">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Tech</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Force Off</th>
            <th className="px-3 py-2">Override Route</th>
            <th className="px-3 py-2">Hours</th>
            <th className="px-3 py-2">Units</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const busy = busyId === r.schedule_exception_day_id;
            const status = statusLabel(r);

            return (
              <tr
                key={r.schedule_exception_day_id}
                className="border-t border-[var(--to-border)]"
              >
                <td className="px-3 py-2">{r.shift_date}</td>
                <td className="px-3 py-2">{r.tech_id}</td>
                <td className="px-3 py-2">{r.exception_type}</td>
                <td className="px-3 py-2">{r.force_off ? "Yes" : "-"}</td>
                <td className="px-3 py-2">{r.override_route_id ?? "-"}</td>
                <td className="px-3 py-2">{r.override_hours ?? "-"}</td>
                <td className="px-3 py-2">{r.override_units ?? "-"}</td>
                <td className="px-3 py-2">{status}</td>
                <td className="px-3 py-2">
                  {status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(r)}
                        className="rounded-lg border px-3 py-1 text-xs hover:bg-[var(--to-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? "Working..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDeny(r)}
                        className="rounded-lg border px-3 py-1 text-xs hover:bg-[var(--to-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy ? "Working..." : "Deny"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[var(--to-ink-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}