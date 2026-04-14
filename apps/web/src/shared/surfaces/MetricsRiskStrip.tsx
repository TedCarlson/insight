// path: apps/web/src/shared/surfaces/MetricsRiskStrip.tsx

"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import NeedsAttentionCard from "@/shared/surfaces/risk-strip/NeedsAttentionCard";
import ParticipationCard from "@/shared/surfaces/risk-strip/ParticipationCard";
import {
  ParticipationOverlay,
  PriorityMovementOverlay,
  TopPriorityRiskOverlay,
} from "@/shared/surfaces/risk-strip/RiskOverlays";
import TopPerformersCard from "@/shared/surfaces/risk-strip/TopPerformersCard";
import TopRiskCard from "@/shared/surfaces/risk-strip/TopRiskCard";
import type {
  MetricsRiskInsightKpiMovement,
  MetricsRiskInsights,
  MetricsRiskMovementType,
  MetricsRiskStripItem,
} from "@/shared/types/metrics/surfacePayload";

type Props = {
  title?: string;
  items: MetricsRiskStripItem[];
  insights?: MetricsRiskInsights | null;
};

type TopPriorityOverlayMode = "new" | "persistent" | "recovered";
type ParticipationOverlayMode = "meets_3" | "meets_2" | "meets_1" | "meets_0";

function LegacyTile({ item }: { item: MetricsRiskStripItem }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {item.title}
      </div>
      <div className="mt-1 text-lg font-semibold leading-none">{item.value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {item.note ?? "—"}
      </div>
    </div>
  );
}

export default function MetricsRiskStrip({
  title = "Focus",
  items,
  insights,
}: Props) {
  const [topPriorityOverlayMode, setTopPriorityOverlayMode] =
    useState<TopPriorityOverlayMode | null>(null);
  const [participationOverlayMode, setParticipationOverlayMode] =
    useState<ParticipationOverlayMode | null>(null);
  const [gridOverlay, setGridOverlay] = useState<{
    kpi: MetricsRiskInsightKpiMovement;
    mode: MetricsRiskMovementType;
  } | null>(null);

  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {insights ? (
          <>
            <TopRiskCard
              insights={insights}
              onCellClick={(kpi, mode) => {
                setGridOverlay({ kpi, mode });
              }}
            />

            <ParticipationCard
              insights={insights}
              onSelect={(mode) => {
                setParticipationOverlayMode(mode);
              }}
            />

            <TopPerformersCard
              rows={insights.top_performers.map((p) => ({
                name: p.full_name ?? p.tech_id,
                value: p.composite_score ?? 0,
              }))}
            />

            <NeedsAttentionCard
              rows={insights.bottom_performers.map((p) => ({
                name: p.full_name ?? p.tech_id,
                value: p.composite_score ?? 0,
              }))}
            />
          </>
        ) : (
          items.map((item) => <LegacyTile key={item.key} item={item} />)
        )}
      </div>

      {insights && topPriorityOverlayMode ? (
        <TopPriorityRiskOverlay
          insights={insights}
          mode={topPriorityOverlayMode}
          onClose={() => setTopPriorityOverlayMode(null)}
        />
      ) : null}

      {insights && gridOverlay ? (
        <PriorityMovementOverlay
          insights={insights}
          kpi={gridOverlay.kpi}
          mode={gridOverlay.mode}
          onClose={() => setGridOverlay(null)}
        />
      ) : null}

      {insights && participationOverlayMode ? (
        <ParticipationOverlay
          insights={insights}
          mode={participationOverlayMode}
          onClose={() => setParticipationOverlayMode(null)}
        />
      ) : null}
    </Card>
  );
}