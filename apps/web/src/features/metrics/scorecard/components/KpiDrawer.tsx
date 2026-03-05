import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { ScorecardTile } from "../lib/scorecard.types";
import BandChip from "./BandChip";
import MomentumGlyph from "./MomentumGlyph";
import KpiTrendChart from "./KpiTrendChart";
import KpiStatsGrid from "./KpiStatsGrid";

export default function KpiDrawer(props: { tile: ScorecardTile | null; onClose: () => void }) {
  const { tile } = props;

  const [rangeDays, setRangeDays] = useState<30 | 60 | 90>(30);

  if (!tile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 md:items-center">
      <Card className="w-full max-w-3xl rounded-2xl border p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{tile.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <BandChip label={tile.band.label} />
              <MomentumGlyph momentum={tile.momentum} />
            </div>
          </div>

          <button type="button" className="rounded-md border px-3 py-1 text-sm hover:bg-muted" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background p-1">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={[
                  "h-8 rounded-md px-3 text-sm font-medium",
                  rangeDays === d ? "bg-muted" : "hover:bg-muted/50",
                ].join(" ")}
                onClick={() => setRangeDays(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-3">
            <KpiTrendChart kpiKey={tile.kpi_key} rangeDays={rangeDays} />
          </div>
          <div className="md:col-span-2">
            <KpiStatsGrid tile={tile} />
          </div>
        </div>
      </Card>
    </div>
  );
}