// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/scorecard/components/KpiDrawer.tsx

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { ScorecardTile } from "../lib/scorecard.types";
import BandChip from "./BandChip";
import MomentumGlyph from "./MomentumGlyph";
import KpiTrendChart from "./KpiTrendChart";

type WindowKey = "FM" | "3FM" | "12FM";

const WINDOW_META: Record<WindowKey, { label: string }> = {
  FM: { label: "This FM" },
  "3FM": { label: "3 FM" },
  "12FM": { label: "12 FM" },
};

export default function KpiDrawer(props: { tile: ScorecardTile | null; onClose: () => void }) {
  const { tile } = props;

  const [windowKey, setWindowKey] = useState<WindowKey>("FM");

  if (!tile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 md:items-center">
      <Card className="w-full max-w-5xl rounded-2xl border p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{tile.label}</div>
            <div className="mt-1 flex items-center gap-2">
              <BandChip label={tile.band.label} />
              <MomentumGlyph momentum={tile.momentum} />
            </div>
          </div>

          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Window
          </div>

          <div className="mt-2 inline-flex rounded-full border bg-background p-1">
            {(Object.keys(WINDOW_META) as WindowKey[]).map((key) => {
              const active = key === windowKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    "rounded-full px-3 py-1.5 text-sm font-medium transition",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                  ].join(" ")}
                  onClick={() => setWindowKey(key)}
                >
                  {WINDOW_META[key].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <KpiTrendChart
            kpiKey={tile.kpi_key}
            fiscalWindow={windowKey}
            paint={tile.band.paint}
          />
        </div>
      </Card>
    </div>
  );
}