"use client";

import type { WorkforceMetricCell } from "@/shared/kpis/engine/workforceTypes";

type Props = {
  metric?: WorkforceMetricCell | null;
  onClick?: () => void;
};

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
}: Props) {
  const value = metric?.value_display ?? "—";
  const rank = metric?.rank_display ?? null;
  const bandKey = metric?.band_key ?? "NO_DATA";
  const disabled = !metric || !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative flex min-h-[42px] min-w-[78px] flex-col items-center justify-center rounded-lg border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition",
        disabled ? "cursor-default" : "hover:bg-muted/20",
      ].join(" ")}
    >
      <span
        className={[
          "absolute left-0 top-0 h-[3px] w-full rounded-t-lg",
          signalBarClass(bandKey),
        ].join(" ")}
      />

      <div>{value}</div>

      {rank ? (
        <div className="mt-0.5 text-[9px] leading-none text-muted-foreground">
          {rank}
        </div>
      ) : null}
    </button>
  );
}