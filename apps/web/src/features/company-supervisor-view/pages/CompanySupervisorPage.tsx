"use client";

import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

import BpViewRosterSurface from "@/features/bp-view/components/BpViewRosterSurface";

import type { CompanySupervisorPayload } from "../lib/companySupervisorView.types";

export default function CompanySupervisorPage(props: {
  payload: CompanySupervisorPayload;
}) {
  const { payload } = props;

  return (
    <PageShell>
      {/* HEADER */}
      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground">
          {payload.header.role_label}
        </div>

        <div className="text-lg font-semibold">
          {payload.header.scope_label}
        </div>

        <div className="text-sm text-muted-foreground">
          Headcount: {payload.header.headcount} • Range:{" "}
          {payload.header.range_label}
        </div>
      </Card>

      {/* WORK MIX */}
      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground">
          Work Mix
        </div>

        <div className="mt-2 flex gap-6 text-sm">
          <div>Jobs: {payload.work_mix.total}</div>
          <div>Installs: {payload.work_mix.installs}</div>
          <div>TCs: {payload.work_mix.tcs}</div>
          <div>SROs: {payload.work_mix.sros}</div>
        </div>
      </Card>

      {/* PARITY */}
      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground">
          Team Parity
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          {payload.parity.map((p) => (
            <div key={p.team_class} className="rounded-xl border p-3 text-sm">
              <div className="font-semibold">{p.team_class}</div>
              <div className="text-muted-foreground">
                Headcount: {p.headcount}
              </div>

              <div className="mt-1">
                Jobs: {p.work_mix.total}
              </div>

              <div className="text-xs text-muted-foreground">
                I: {p.work_mix.installs} • T: {p.work_mix.tcs} • S:{" "}
                {p.work_mix.sros}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ROSTER */}
      <BpViewRosterSurface
        columns={payload.roster_columns}
        rows={payload.roster_rows as any}
        onSelectRow={() => {}}
      />
    </PageShell>
  );
}