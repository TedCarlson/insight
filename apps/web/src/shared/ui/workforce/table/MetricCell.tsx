"use client";

import type { WorkforceMetricCell } from "@/shared/kpis/engine/workforceTypes";

function signalBarClass(bandKey: string | null | undefined) {
  if (bandKey === "EXCEEDS") return "bg-[var(--to-success)]";
  if (bandKey === "MEETS") return "bg-[var(--to-primary)]";
  if (bandKey === "NEEDS_IMPROVEMENT") return "bg-[var(--to-warning)]";
  if (bandKey === "MISSES") return "bg-[var(--to-danger)]";
  return "bg-transparent";
}

export default function MetricCell(props: {
  metric?: WorkforceMetricCell;
  onClick?: () => void;
}) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={props.onClick}
        className="relative flex h-8 min-w-[66px] items-center justify-center rounded-lg border bg-card px-2 text-[11px] font-medium text-foreground transition hover:bg-muted/20"
      >
        <span
          className={[
            "absolute left-0 top-0 h-[3px] w-full rounded-t-lg",
            signalBarClass(
              (
                props.metric as
                  | { band_key?: string | null | undefined }
                  | undefined
              )?.band_key
            ),
          ].join(" ")}
        />
        {(
          props.metric as
            | { value_display?: string | null | undefined }
            | undefined
        )?.value_display ?? "—"}
      </button>
    </div>
  );
}