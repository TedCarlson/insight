"use client";

import type { HistoryEvent } from "../lib/history.types";

function eventLabel(eventType: string) {
  if (eventType === "INITIAL_ASSIGNMENT") return "Initial Assignment";
  if (eventType === "ROUTE_CHANGE") return "Route Change";
  if (eventType === "BASELINE_DAYS_CHANGE") return "Baseline Days Change";
  return eventType;
}

function eventFromValue(event: HistoryEvent) {
  if (event.event_type === "BASELINE_DAYS_CHANGE") {
    const count = event.from_value == null ? "—" : String(event.from_value);
    const set = event.from_day_set ? ` (${event.from_day_set})` : "";
    return `${count}${set}`;
  }
  return event.from_value == null || event.from_value === "" ? "—" : String(event.from_value);
}

function eventToValue(event: HistoryEvent) {
  if (event.event_type === "BASELINE_DAYS_CHANGE") {
    const count = event.to_value == null ? "—" : String(event.to_value);
    const set = event.to_day_set ? ` (${event.to_day_set})` : "";
    return `${count}${set}`;
  }
  return event.to_value == null || event.to_value === "" ? "—" : String(event.to_value);
}

export default function HistoryChangeLogCard(props: { events: HistoryEvent[] }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-[var(--to-surface)] p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
          Change Log
        </h2>
      </div>

      {props.events.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--to-border)]">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Effective Date
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  Event
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  From
                </th>
                <th className="border-b border-[var(--to-border)] px-3 py-2 text-left font-semibold text-[var(--to-ink)]">
                  To
                </th>
              </tr>
            </thead>
            <tbody>
              {props.events.map((event, index) => (
                <tr key={`${event.effective_date}:${event.event_type}:${index}`}>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {event.effective_date}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {eventLabel(event.event_type)}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink-muted)]">
                    {eventFromValue(event)}
                  </td>
                  <td className="border-b border-[var(--to-border)] px-3 py-2 text-[var(--to-ink)]">
                    {eventToValue(event)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--to-ink-muted)]">No change events found for this window.</p>
      )}
    </section>
  );
}