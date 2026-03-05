import { Card } from "@/components/ui/Card";
import type { ScorecardTile } from "../lib/scorecard.types";
import BandChip from "./BandChip";
import MomentumGlyph from "./MomentumGlyph";

export default function KpiTile(props: { tile: ScorecardTile; onOpen: () => void }) {
  const { tile } = props;

  const borderStyle = tile.band.paint.border ? ({ borderColor: tile.band.paint.border } as const) : undefined;

  return (
    <button type="button" onClick={props.onOpen} className="text-left" aria-label={`Open ${tile.label}`}>
      <Card className="h-full rounded-2xl border p-4 shadow-sm transition hover:shadow-md" style={borderStyle}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs font-medium text-muted-foreground">{tile.label}</div>
          <div className="h-2 w-2 rounded-full border" style={borderStyle} />
        </div>

        <div className="mt-2 text-2xl font-semibold tabular-nums">{tile.value_display ?? "—"}</div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <BandChip label={tile.band.label} />
          <MomentumGlyph momentum={tile.momentum} />
        </div>
      </Card>
    </button>
  );
}