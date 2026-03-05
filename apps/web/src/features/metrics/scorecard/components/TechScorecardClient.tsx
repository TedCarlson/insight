"use client";

import { useMemo, useState } from "react";

import type { ScorecardResponse, ScorecardTile } from "../lib/scorecard.types";

import ScorecardIdentityCard from "./ScorecardIdentityCard";
import ScorecardOrgPills from "./ScorecardOrgPills";
import KpiTileGrid from "./KpiTileGrid";
import KpiDrawer from "./KpiDrawer";
import PersonJumpSelect from "./PersonJumpSelect";

export default function TechScorecardClient(props: { payload: ScorecardResponse }) {
  const { payload } = props;

  const [openKpiKey, setOpenKpiKey] = useState<string | null>(null);
  const openTile = useMemo(
    () => payload.tiles.find((t) => t.kpi_key === openKpiKey) ?? null,
    [payload.tiles, openKpiKey]
  );

  const onOpen = (tile: ScorecardTile) => setOpenKpiKey(tile.kpi_key);
  const onClose = () => setOpenKpiKey(null);

  return (
    <div className="space-y-4">
      <ScorecardIdentityCard header={payload.header} />

      <div className="rounded-2xl border p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2">Mirror view: jump to any person</div>
        <PersonJumpSelect />
      </div>

      <ScorecardOrgPills options={payload.org_selector} />
      <KpiTileGrid tiles={payload.tiles} onOpen={onOpen} />
      <KpiDrawer tile={openTile} onClose={onClose} />
    </div>
  );
}