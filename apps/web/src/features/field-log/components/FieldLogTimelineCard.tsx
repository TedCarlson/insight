"use client";

type TimelineEvent = {
  event_id: string;
  event_at: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_user_id: string | null;
  note: string | null;
  meta: Record<string, unknown>;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function niceEvent(eventType: string) {
  return eventType.replaceAll("_", " ");
}

function niceStatus(status: string) {
  return status.replaceAll("_", " ");
}

export function FieldLogTimelineCard(props: {
  timeline: TimelineEvent[];
  loading: boolean;
  error: string | null;
}) {
  const { timeline, loading, error } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Timeline</div>

      {loading ? (
        <div className="mt-3 text-sm text-muted-foreground">Loading timeline…</div>
      ) : error ? (
        <div className="mt-3 text-sm text-red-700">{error}</div>
      ) : timeline.length > 0 ? (
        <div className="mt-3 space-y-3">
          {timeline.map((event) => (
            <div key={event.event_id} className="rounded-xl border p-3 text-sm">
              <div className="font-medium">{niceEvent(event.event_type)}</div>
              <div className="mt-1 text-muted-foreground">{fmtDate(event.event_at)}</div>
              {event.from_status || event.to_status ? (
                <div className="mt-2 text-muted-foreground">
                  {event.from_status ? niceStatus(event.from_status) : "—"} →{" "}
                  {event.to_status ? niceStatus(event.to_status) : "—"}
                </div>
              ) : null}
              {event.note ? (
                <div className="mt-2 text-muted-foreground">{event.note}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-muted-foreground">
          No timeline events recorded.
        </div>
      )}
    </section>
  );
}