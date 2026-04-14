// path: apps/web/src/shared/surfaces/risk-strip/TopRiskCard.tsx

"use client";

import type {
  MetricsRiskInsightKpiMovement,
  MetricsRiskInsights,
} from "@/shared/types/metrics/surfacePayload";

type MovementGridMode = "new" | "persistent" | "recovered";

function movementCount(
  kpi: MetricsRiskInsightKpiMovement,
  mode: MovementGridMode
) {
  if (mode === "new") return kpi.new_tech_ids.length;
  if (mode === "persistent") return kpi.persistent_tech_ids.length;
  return kpi.recovered_tech_ids.length;
}

function tone(mode: MovementGridMode) {
  if (mode === "new") return "text-rose-600";
  if (mode === "recovered") return "text-emerald-600";
  return "text-muted-foreground";
}

function prefix(mode: MovementGridMode) {
  if (mode === "new") return "↓";
  if (mode === "recovered") return "↑";
  return "—";
}

export default function TopRiskCard(props: {
  insights: MetricsRiskInsights;
  onCellClick: (
    kpi: MetricsRiskInsightKpiMovement,
    mode: MovementGridMode
  ) => void;
}) {
  const { insights, onCellClick } = props;

  const topPriority = insights.top_priority_kpi;
  const priorityKpis = (insights.priority_kpis ?? []).slice(0, 3);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Top Priority Risk
      </div>

      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-[92px_repeat(3,minmax(0,1fr))] items-center gap-x-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <div />
          {priorityKpis.map((kpi) => (
            <div key={kpi.kpi_key} className="truncate text-center">
              {kpi.label}
            </div>
          ))}
        </div>

        {(["new", "persistent", "recovered"] as MovementGridMode[]).map(
          (mode) => (
            <div
              key={mode}
              className="grid grid-cols-[92px_repeat(3,minmax(0,1fr))] items-center gap-x-2"
            >
              <div className="text-xs text-muted-foreground">
                {mode === "new"
                  ? "New"
                  : mode === "persistent"
                    ? "Persistent"
                    : "Recovered"}
              </div>

              {priorityKpis.map((kpi) => {
                const count = movementCount(kpi, mode);
                const clickable = count > 0;

                return (
                  <button
                    key={`${kpi.kpi_key}-${mode}`}
                    disabled={!clickable}
                    onClick={() => clickable && onCellClick(kpi, mode)}
                    className="flex h-7 items-center justify-center rounded-md border text-xs font-medium transition hover:bg-muted/50"
                  >
                    <span className={tone(mode)}>
                      {count > 0 ? `${prefix(mode)} ${count}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}

        <div className="pt-1">
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
            <span className="h-5 w-1.5 rounded-full bg-amber-500" />
            <div className="min-w-0">
              
              <div className="truncate text-[11px]">
                <span className="font-medium text-foreground">
                  {topPriority.label ?? "—"}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {topPriority.miss_count} techs impacted
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}