"use client";

import { Fragment } from "react";
import SegmentDetailTable from "./SegmentDetailTable";
import type { HistorySegment } from "../lib/history.types";

export default function HistorySegmentSummaryCard(props: {
  segments: HistorySegment[];
  expandedSegments: Record<string, boolean>;
  onToggleSegment: (segmentId: string) => void;
}) {
  const { segments, expandedSegments, onToggleSegment } = props;

  return (
    <section className="space-y-3 rounded-2xl border bg-[var(--to-surface)] p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Segment Summary
        </h2>
      </div>

      {segments.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--to-border)]">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  From
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  To
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Route
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Baseline Days
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Day Set
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Span Days
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody>
              {segments.map((segment) => {
                const isOpen = !!expandedSegments[segment.segment_id];

                return (
                  <Fragment key={segment.segment_id}>
                    <tr>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                        {segment.from_date}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                        {segment.to_date}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                        {segment.route_name ?? "Unassigned"}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                        {segment.baseline_days_count}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink-muted)]">
                        {segment.baseline_day_set_label || "—"}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                        {segment.span_days}
                      </td>
                      <td className="border-b border-[var(--to-border)] px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onToggleSegment(segment.segment_id)}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--to-border)] bg-[var(--to-surface-2)] px-3 text-sm text-[var(--to-ink)]"
                        >
                          {isOpen ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="border-b border-[var(--to-border)] bg-[var(--to-surface-2)] p-3"
                        >
                          <SegmentDetailTable rows={segment.detail_rows} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--to-ink-muted)]">No baseline segments found for this window.</p>
      )}
    </section>
  );
}