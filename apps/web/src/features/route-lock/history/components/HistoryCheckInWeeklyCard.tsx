"use client";

import type { CheckInWeeklyRow } from "../lib/history.types";

function formatHours(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export default function HistoryCheckInWeeklyCard(props: {
  rows: CheckInWeeklyRow[];
  loading: boolean;
  error: string | null;
}) {
  const { rows, loading, error } = props;

  return (
    <section className="space-y-3 rounded-2xl border bg-[var(--to-surface)] p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Weekly Check-In Summary
        </h2>
        <p className="text-xs text-[var(--to-ink-muted)]">
          Sunday to Saturday grouped actuals.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--to-ink-muted)]">Loading check-in weekly summary…</p>
      ) : error ? (
        <p className="text-sm text-[var(--to-danger,#b91c1c)]">{error}</p>
      ) : rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--to-border)]">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Week Start
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Week End
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Tech ID
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Tech Name
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Affiliation
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-center font-semibold text-[var(--to-ink)]">
                  Days Worked
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Worked Dates
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-right font-semibold text-[var(--to-ink)]">
                  Jobs
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-right font-semibold text-[var(--to-ink)]">
                  Units
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-right font-semibold text-[var(--to-ink)]">
                  Hours
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={`${row.week_start}:${row.week_end}:${row.tech_id}`}>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {row.week_start}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {row.week_end}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {row.tech_id}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {row.full_name}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink-muted)]">
                    {row.affiliation ?? "—"}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-center text-[var(--to-ink)]">
                    {row.days_worked}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink-muted)]">
                    {row.worked_dates_label || "—"}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-right text-[var(--to-ink)]">
                    {row.actual_jobs}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-right text-[var(--to-ink)]">
                    {row.actual_units}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-right text-[var(--to-ink)]">
                    {formatHours(row.actual_hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--to-ink-muted)]">No check-in weeks found for this window.</p>
      )}
    </section>
  );
}