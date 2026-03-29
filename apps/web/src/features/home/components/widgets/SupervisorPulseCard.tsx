"use client";

import { Card } from "@/components/ui/Card";

/**
 * Types
 */
export type SupervisorPulseMetric = {
  kpi_key: string;
  value: number | null;
  band_key?: string | null;
};

export type SupervisorPulseRow = {
  label: string;
  metrics: SupervisorPulseMetric[];
  hc: number;
};

export type SupervisorPulseCardProps = {
  rows: SupervisorPulseRow[];
  rosterColumns: Array<{ kpi_key: string; label: string }>;
};

/**
 * Helpers
 */
function formatMetricValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function bandPillClass(bandKey?: string | null) {
  if (bandKey === "EXCEEDS") {
    return "border-[var(--to-success)] bg-[color-mix(in_oklab,var(--to-success)_10%,white)]";
  }
  if (bandKey === "MEETS") {
    return "border-[var(--to-primary)] bg-[color-mix(in_oklab,var(--to-primary)_10%,white)]";
  }
  if (bandKey === "NEEDS_IMPROVEMENT") {
    return "border-[var(--to-warning)] bg-[color-mix(in_oklab,var(--to-warning)_10%,white)]";
  }
  if (bandKey === "MISSES") {
    return "border-[var(--to-danger)] bg-[color-mix(in_oklab,var(--to-danger)_10%,white)]";
  }
  return "border-[var(--to-border)] bg-muted/10";
}

function MetricBadge(props: {
  value: number | null;
  band?: string | null;
}) {
  return (
    <div
      className={`inline-flex min-w-[54px] items-center justify-center rounded-md border px-2 py-1 text-sm font-medium ${bandPillClass(
        props.band
      )}`}
    >
      {formatMetricValue(props.value)}
    </div>
  );
}

function CountBadge(props: { value: number }) {
  return (
    <div className="inline-flex min-w-[54px] items-center justify-center rounded-md border border-[var(--to-border)] bg-muted/10 px-2 py-1 text-sm font-medium">
      {props.value}
    </div>
  );
}

/**
 * Component
 */
export function SupervisorPulseCard(props: SupervisorPulseCardProps) {
  const { rows, rosterColumns } = props;

  const gridTemplate = `180px repeat(${rosterColumns.length}, minmax(72px, auto)) 72px`;

  return (
    <Card className="p-4">
      {/* Header */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Supervisor Pulse
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Current FM rollup across your leadership scope.
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-auto rounded-xl border">
        {/* Header Row */}
        <div
          className="grid border-b bg-muted/10"
          style={{ gridTemplateColumns: gridTemplate, minWidth: "720px" }}
        >
          <div className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
            Group
          </div>

          {rosterColumns.map((col) => (
            <div
              key={col.kpi_key}
              className="px-2 py-2 text-center text-[11px] font-medium text-muted-foreground"
            >
              {col.label}
            </div>
          ))}

          <div className="px-2 py-2 text-center text-[11px] font-medium text-muted-foreground">
            HC
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, rowIndex) => {
          const isSupervisorRow = rowIndex === 1;

          return (
            <div
              key={row.label}
              className={`grid border-b last:border-b-0 ${
                isSupervisorRow ? "bg-muted/[0.04]" : ""
              }`}
              style={{ gridTemplateColumns: gridTemplate, minWidth: "720px" }}
            >
              {/* Label */}
              <div
                className={`px-3 py-2.5 text-sm ${
                  isSupervisorRow ? "font-semibold" : "font-medium"
                }`}
              >
                {row.label}
              </div>

              {/* Metrics */}
              {rosterColumns.map((col) => {
                const metric =
                  row.metrics.find((m) => m.kpi_key === col.kpi_key) ?? null;

                return (
                  <div
                    key={col.kpi_key}
                    className="flex items-center justify-center px-2 py-2.5"
                  >
                    <MetricBadge
                      value={metric?.value ?? null}
                      band={metric?.band_key ?? null}
                    />
                  </div>
                );
              })}

              {/* HC */}
              <div className="flex items-center justify-center px-2 py-2.5">
                <CountBadge value={row.hc} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}