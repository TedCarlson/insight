"use client";

import type { HistoryDetailRow } from "../lib/history.types";

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function SegmentDetailTable(props: {
  rows: HistoryDetailRow[];
}) {
  const { rows } = props;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--to-border)] bg-[var(--to-surface)]">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-[var(--to-surface-2)]">
          <tr>
            <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
              Shift Date
            </th>
            <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
              Weekday
            </th>
            <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
              Route
            </th>
            <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
              Baseline Day
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.shift_date}>
              <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                {row.shift_date}
              </td>
              <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                {row.weekday_label}
              </td>
              <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                {row.route_name ?? "Unassigned"}
              </td>
              <td className="border-b border-[var(--to-border)] px-3 py-2">
                <span
                  className={cls(
                    "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                    row.is_baseline_day
                      ? "bg-[rgba(34,197,94,0.12)] text-[rgb(22,101,52)]"
                      : "bg-[var(--to-surface-2)] text-[var(--to-ink-muted)]"
                  )}
                >
                  {row.is_baseline_day ? "Yes" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}