"use client";

import type { BpWorkMix } from "../lib/bpView.types";

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function InlineDivider() {
  return <span className="text-muted-foreground/50">|</span>;
}

function InlineStat(props: {
  label: string;
  value: number;
  pct?: number | null;
}) {
  return (
    <>
      <span className="text-muted-foreground">{props.label}:</span>{" "}
      <span className="font-medium">{props.value}</span>
      {props.pct !== undefined ? (
        <>
          {" "}
          <span className="text-muted-foreground">/</span>{" "}
          <span className="text-muted-foreground">{formatPct(props.pct)}</span>
        </>
      ) : null}
    </>
  );
}

export default function BpWorkMixCard(props: {
  workMix: BpWorkMix;
}) {
  const { workMix } = props;

  return (
    <section className="rounded-2xl border bg-muted/[0.04] px-4 py-3 xl:h-full">
      <div className="flex flex-col gap-2 text-sm xl:justify-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="font-semibold">Work Mix</div>
          <InlineDivider />
          <div>
            <InlineStat label="Total Jobs" value={workMix.total} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div>
            <InlineStat
              label="Installs"
              value={workMix.installs}
              pct={workMix.install_pct}
            />
          </div>
          <InlineDivider />
          <div>
            <InlineStat label="TCs" value={workMix.tcs} pct={workMix.tc_pct} />
          </div>
          <InlineDivider />
          <div>
            <InlineStat label="SROs" value={workMix.sros} pct={workMix.sro_pct} />
          </div>
        </div>
      </div>
    </section>
  );
}