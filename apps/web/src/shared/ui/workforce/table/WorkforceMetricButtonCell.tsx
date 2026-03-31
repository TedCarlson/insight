import type { WorkforceMetricButtonCellProps } from "./workforceTable.types";

function signalBarClass(bandKey: string | null | undefined) {
  if (bandKey === "EXCEEDS") return "bg-[var(--to-success)]";
  if (bandKey === "MEETS") return "bg-[var(--to-primary)]";
  if (bandKey === "NEEDS_IMPROVEMENT") return "bg-[var(--to-warning)]";
  if (bandKey === "MISSES") return "bg-[var(--to-danger)]";
  return "bg-transparent";
}

export default function WorkforceMetricButtonCell({
  metric,
  onClick,
}: WorkforceMetricButtonCellProps) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="relative flex h-8 min-w-[66px] items-center justify-center rounded-lg border bg-card px-2 text-[11px] font-medium text-foreground transition hover:bg-muted/20"
      >
        <span
          className={[
            "absolute left-0 top-0 h-[3px] w-full rounded-t-lg",
            signalBarClass(metric?.band_key),
          ].join(" ")}
        />
        {metric?.value_display ?? "—"}
      </button>
    </div>
  );
}