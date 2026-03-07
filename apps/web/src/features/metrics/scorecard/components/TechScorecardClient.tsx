"use client";

import Link from "next/link";
import { useState } from "react";
import type { ScorecardResponse, ScorecardTile } from "../lib/scorecard.types";
import ScorecardIdentityCard from "./ScorecardIdentityCard";
import PersonJumpSelect from "./PersonJumpSelect";
import ScorecardOrgPills from "./ScorecardOrgPills";
import KpiTileGrid from "./KpiTileGrid";
import KpiDrawer from "./KpiDrawer";

export default function TechScorecardClient(props: {
  payload: ScorecardResponse;
}) {
  const { payload } = props;
  const [openTile, setOpenTile] = useState<ScorecardTile | null>(null);

  function onOpen(tile: ScorecardTile) {
    setOpenTile(tile);
  }

  function onClose() {
    setOpenTile(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3">
            <Link
              href="/metrics/reports"
              className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Back to Metrics
            </Link>
          </div>

          <PersonJumpSelect />
        </div>
      </div>

      <ScorecardIdentityCard header={payload.header} />

      <ScorecardOrgPills
        personId={payload.header.person_id}
        options={payload.org_selector}
      />

      <KpiTileGrid tiles={payload.tiles} onOpen={onOpen} />
      <KpiDrawer tile={openTile} onClose={onClose} />
    </div>
  );
}