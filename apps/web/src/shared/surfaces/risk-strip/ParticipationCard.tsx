// path: apps/web/src/shared/surfaces/risk-strip/ParticipationCard.tsx

"use client";

import type { MetricsRiskInsights } from "@/shared/types/metrics/surfacePayload";

type ParticipationOverlayMode = "meets_3" | "meets_2" | "meets_1" | "meets_0";

type Segment = {
  key: ParticipationOverlayMode;
  label: string;
  shortLabel: string;
  count: number;
  colorClass: string;
  textClass: string;
};

function percent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export default function ParticipationCard(props: {
  insights: MetricsRiskInsights;
  onSelect: (mode: ParticipationOverlayMode) => void;
}) {
  const { insights, onSelect } = props;

  const p = insights.participation;
  const total =
    p.meets_3.count + p.meets_2.count + p.meets_1.count + p.meets_0.count;

  const segments: Segment[] = [
    {
      key: "meets_3",
      label: "Meets 3/3",
      shortLabel: "3/3",
      count: p.meets_3.count,
      colorClass: "bg-emerald-500",
      textClass: "text-emerald-700",
    },
    {
      key: "meets_2",
      label: "Meets 2/3",
      shortLabel: "2/3",
      count: p.meets_2.count,
      colorClass: "bg-lime-500",
      textClass: "text-lime-700",
    },
    {
      key: "meets_1",
      label: "Meets 1/3",
      shortLabel: "1/3",
      count: p.meets_1.count,
      colorClass: "bg-amber-500",
      textClass: "text-amber-700",
    },
    {
      key: "meets_0",
      label: "Meets 0/3",
      shortLabel: "0/3",
      count: p.meets_0.count,
      colorClass: "bg-rose-500",
      textClass: "text-rose-700",
    },
  ];

  const topSegment =
    segments.slice().sort((a, b) => b.count - a.count)[0] ?? null;

  return (
    <div className="rounded-xl border bg-card p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Participation
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Eligible Techs</div>
            <div className="text-lg font-semibold leading-none">{total}</div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">Top Segment</div>
            <div className="text-sm font-medium leading-none">
              {topSegment?.label ?? "—"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex h-6 overflow-hidden rounded-full border bg-muted/60">
            {segments.map((segment) => {
              const width = total > 0 ? (segment.count / total) * 100 : 0;
              const pct = percent(segment.count, total);
              const showInlineLabel = width >= 18;

              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => onSelect(segment.key)}
                  className={[
                    "relative h-full transition hover:brightness-95",
                    segment.colorClass,
                  ].join(" ")}
                  style={{ width: `${Math.max(width, segment.count > 0 ? 3 : 0)}%` }}
                  aria-label={`${segment.label} ${segment.count} of ${total} (${pct}%)`}
                  title={`${segment.label} · ${segment.count} techs · ${pct}%`}
                >
                  {showInlineLabel ? (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white">
                      {segment.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {segments.map((segment) => {
              const pct = percent(segment.count, total);

              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => onSelect(segment.key)}
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] transition hover:bg-muted/40"
                  title={`${segment.label} · ${segment.count} techs · ${pct}%`}
                >
                  <span
                    className={["h-2 w-2 rounded-full", segment.colorClass].join(" ")}
                  />
                  <span className="text-muted-foreground">{segment.shortLabel}</span>
                  <span className="font-semibold">{segment.count}</span>
                  <span className={segment.textClass}>{pct}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}