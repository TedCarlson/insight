// path: apps/web/src/shared/surfaces/risk-strip/RiskOverlays.tsx

"use client";

import { useState } from "react";

import type {
  MetricsParticipationOverlayRow,
  MetricsPriorityKpiOverlay,
  MetricsRiskInsightKpiMovement,
  MetricsRiskInsights,
  MetricsRiskMovementType,
  MetricsTopPriorityOverlayRow,
} from "@/shared/types/metrics/surfacePayload";

export function OverlayShell({
  children,
  onClose,
  maxWidthClass,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClass: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={[
          "w-full rounded-2xl border bg-background shadow-2xl",
          maxWidthClass,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function TrendBadge({
  direction,
}: {
  direction: "up" | "down" | "flat" | null;
}) {
  if (!direction) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  if (direction === "up") {
    return (
      <span className="text-[11px] font-medium text-emerald-600">↑ Up</span>
    );
  }

  if (direction === "down") {
    return <span className="text-[11px] font-medium text-rose-600">↓ Down</span>;
  }

  return <span className="text-[11px] font-medium text-amber-600">→ Flat</span>;
}

function formatMetricValue(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function bandClasses(bandKey: string | null | undefined) {
  if (bandKey === "EXCEEDS") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (bandKey === "MEETS") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (bandKey === "NEEDS_IMPROVEMENT" || bandKey === "MISSES") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-muted bg-muted/40 text-muted-foreground";
}

function compactBandLabel(bandKey: string | null | undefined) {
  if (!bandKey) return "No data";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs improvement";
  return bandKey
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function movementCountForMode(
  kpi: MetricsRiskInsightKpiMovement,
  mode: MetricsRiskMovementType
) {
  if (mode === "new") return kpi.new_tech_ids.length;
  if (mode === "persistent") return kpi.persistent_tech_ids.length;
  return kpi.recovered_tech_ids.length;
}

function movementRowsForMode(args: {
  overlay: MetricsPriorityKpiOverlay | null;
  mode: MetricsRiskMovementType;
}): MetricsTopPriorityOverlayRow[] {
  if (!args.overlay) return [];
  if (args.mode === "new") return args.overlay.new_rows;
  if (args.mode === "persistent") return args.overlay.persistent_rows;
  return args.overlay.recovered_rows;
}

function movementModeLabel(mode: MetricsRiskMovementType) {
  if (mode === "new") return "New";
  if (mode === "persistent") return "Persistent";
  return "Recovered";
}

function TopPriorityOverlayRowView({
  row,
}: {
  row: MetricsTopPriorityOverlayRow;
}) {
  const valueDisplay =
    typeof row.metric_value === "number" && Number.isFinite(row.metric_value)
      ? formatMetricValue(row.metric_value)
      : "No score";

  return (
    <div className="rounded-xl border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {row.full_name ?? row.tech_id}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{row.tech_id}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold">{valueDisplay}</div>
          <div className="mt-1">
            <TrendBadge direction={row.trend_direction} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayTabs(props: {
  items: Array<{ key: string; label: string }>;
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {props.items.map((item) => {
        const active = item.key === props.activeKey;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => props.onSelect(item.key)}
            className={[
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              active
                ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] text-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function TopPriorityRiskOverlay(props: {
  insights: MetricsRiskInsights;
  mode: "new" | "persistent" | "recovered";
  onClose: () => void;
}) {
  const overlay = props.insights.top_priority_kpi_overlay;

  const config =
    props.mode === "new"
      ? {
          title: "New to Risk",
          rows: overlay?.new_rows ?? [],
        }
      : props.mode === "persistent"
        ? {
            title: "Persistent Risk",
            rows: overlay?.persistent_rows ?? [],
          }
        : {
            title: "Recovered",
            rows: overlay?.recovered_rows ?? [],
          };

  return (
    <OverlayShell onClose={props.onClose} maxWidthClass="max-w-3xl">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Top Priority Risk
          </div>
          <div className="mt-1 text-lg font-semibold">{config.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {props.insights.top_priority_kpi.label ?? "—"} · {config.rows.length} techs
          </div>
        </div>

        <button
          type="button"
          onClick={props.onClose}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
        >
          Close
        </button>
      </div>

      <div className="max-h-[70vh] overflow-auto px-5 py-4">
        {!config.rows.length ? (
          <div className="text-sm text-muted-foreground">No rows available.</div>
        ) : (
          <div className="space-y-2">
            {config.rows.map((row) => (
              <TopPriorityOverlayRowView key={row.tech_id} row={row} />
            ))}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

function PriorityMovementOverlayInner(props: {
  insights: MetricsRiskInsights;
  kpi: MetricsRiskInsightKpiMovement;
  mode: MetricsRiskMovementType;
  onClose: () => void;
}) {
  const overlayOptions = props.insights.priority_kpi_overlays ?? [];
  const priorityOptions = props.insights.priority_kpis ?? [];

  const [activeKpiKey, setActiveKpiKey] = useState<string>(props.kpi.kpi_key);

  const activeOverlay =
    overlayOptions.find((item) => item.kpi_key === activeKpiKey) ?? null;
  const activeKpi =
    priorityOptions.find((item) => item.kpi_key === activeKpiKey) ?? props.kpi;

  const rows = movementRowsForMode({
    overlay: activeOverlay,
    mode: props.mode,
  });

  const tabItems = priorityOptions.map((item) => ({
    key: item.kpi_key,
    label: item.label,
  }));

  return (
    <OverlayShell onClose={props.onClose} maxWidthClass="max-w-3xl">
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Priority Movement
            </div>
            <div className="mt-1 text-lg font-semibold">
              {movementModeLabel(props.mode)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {activeKpi.label} · {movementCountForMode(activeKpi, props.mode)} techs
            </div>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
          >
            Close
          </button>
        </div>

        {tabItems.length > 1 ? (
          <OverlayTabs
            items={tabItems}
            activeKey={activeKpiKey}
            onSelect={setActiveKpiKey}
          />
        ) : null}
      </div>

      <div className="max-h-[70vh] overflow-auto px-5 py-4">
        {!rows.length ? (
          <div className="text-sm text-muted-foreground">No rows available.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <TopPriorityOverlayRowView key={row.tech_id} row={row} />
            ))}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

export function PriorityMovementOverlay(props: {
  insights: MetricsRiskInsights;
  kpi: MetricsRiskInsightKpiMovement;
  mode: MetricsRiskMovementType;
  onClose: () => void;
}) {
  return (
    <PriorityMovementOverlayInner
      key={`${props.mode}:${props.kpi.kpi_key}`}
      insights={props.insights}
      kpi={props.kpi}
      mode={props.mode}
      onClose={props.onClose}
    />
  );
}

export function ParticipationOverlay(props: {
  insights: MetricsRiskInsights;
  mode: "meets_3" | "meets_2" | "meets_1" | "meets_0";
  onClose: () => void;
}) {
  const overlay = props.insights.participation_overlay;

  const config =
    props.mode === "meets_3"
      ? {
          title: "Meets 3/3",
          rows: overlay?.meets_3_rows ?? [],
        }
      : props.mode === "meets_2"
        ? {
            title: "Meets 2/3",
            rows: overlay?.meets_2_rows ?? [],
          }
        : props.mode === "meets_1"
          ? {
              title: "Meets 1/3",
              rows: overlay?.meets_1_rows ?? [],
            }
          : {
              title: "Meets 0/3",
              rows: overlay?.meets_0_rows ?? [],
            };

  return (
    <OverlayShell onClose={props.onClose} maxWidthClass="max-w-5xl">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Participation
          </div>
          <div className="mt-1 text-lg font-semibold">{config.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {config.rows.length} techs
          </div>
        </div>

        <button
          type="button"
          onClick={props.onClose}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
        >
          Close
        </button>
      </div>

      <div className="max-h-[70vh] overflow-auto px-5 py-4">
        {!config.rows.length ? (
          <div className="text-sm text-muted-foreground">No rows available.</div>
        ) : (
          <div className="space-y-2">
            {config.rows.map((row) => (
              <ParticipationOverlayRowView key={row.tech_id} row={row} />
            ))}
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

function ParticipationOverlayRowView({
  row,
}: {
  row: MetricsParticipationOverlayRow;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {row.full_name ?? row.tech_id}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{row.tech_id}</div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {row.metrics.map((metric) => (
            <div
              key={metric.kpi_key}
              className="flex min-w-[108px] items-center justify-between gap-2 rounded-full border px-2.5 py-1"
            >
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </div>
                <div className="text-sm font-semibold">
                  {formatMetricValue(metric.value)}
                </div>
              </div>

              <span
                className={[
                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  bandClasses(metric.band_key),
                ].join(" ")}
              >
                {compactBandLabel(metric.band_key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}