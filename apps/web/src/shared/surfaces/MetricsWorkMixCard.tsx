// path: apps/web/src/shared/surfaces/MetricsWorkMixCard.tsx

"use client";

import { Card } from "@/components/ui/Card";

export type MetricsWorkMixSummary = {
  total: number;
  installs: number;
  tcs: number;
  sros: number;
  install_pct: number | null;
  tc_pct: number | null;
  sro_pct: number | null;
};

type Props = {
  title?: string;
  work_mix: MetricsWorkMixSummary;
};

function fmtPct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function MixTile(props: {
  label: string;
  value: number;
  pct: number | null;
}) {
  const { label, value, pct } = props;

  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="text-xl font-semibold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground">{fmtPct(pct)}</div>
      </div>
    </div>
  );
}

export default function MetricsWorkMixCard({
  title = "Work Mix",
  work_mix,
}: Props) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <MixTile label="Total Jobs" value={work_mix.total} pct={100} />
        <MixTile
          label="Installs"
          value={work_mix.installs}
          pct={work_mix.install_pct}
        />
        <MixTile label="TCs" value={work_mix.tcs} pct={work_mix.tc_pct} />
        <MixTile label="SROs" value={work_mix.sros} pct={work_mix.sro_pct} />
      </div>
    </Card>
  );
}