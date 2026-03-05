import type { ScorecardTile } from "../lib/scorecard.types";
import KpiTile from "./KpiTile";

export default function KpiTileGrid(props: { tiles: ScorecardTile[]; onOpen: (tile: ScorecardTile) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {props.tiles.map((t) => (
        <KpiTile key={t.kpi_key} tile={t} onOpen={() => props.onOpen(t)} />
      ))}
    </div>
  );
}