import type { ScorecardTile } from "../lib/scorecard.types";

export default function KpiStatsGrid(props: { tile: ScorecardTile }) {
  const t = props.tile;

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-medium">Quick stats</div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Current</span>
          <span className="tabular-nums">{t.value_display ?? "—"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">7d vs 30d</span>
          <span className="tabular-nums">{t.momentum.delta_display ?? "—"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Samples (7d)</span>
          <span className="tabular-nums">{t.context?.sample_short ?? "—"}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Samples (30d)</span>
          <span className="tabular-nums">{t.context?.sample_long ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}