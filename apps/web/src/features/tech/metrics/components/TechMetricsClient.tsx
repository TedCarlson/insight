"use client";

import { useState } from "react";

type RangeKey = "FM" | "3FM" | "12FM";

function RankCell(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-2 py-3 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 text-base font-semibold leading-none">
        {props.value}
      </div>
    </div>
  );
}

function MixStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 text-base font-semibold leading-none">
        {props.value}
      </div>
    </div>
  );
}

function MixRow(props: { label: string; count: string; pct: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/10 px-3 py-2">
      <div className="min-w-0 text-sm font-medium">{props.label}</div>
      <div className="ml-3 flex items-center gap-3 text-sm">
        <span className="font-semibold">{props.count}</span>
        <span className="text-muted-foreground">{props.pct}</span>
      </div>
    </div>
  );
}

function RangeChip(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded-xl border px-3 py-2 text-center text-xs font-medium transition active:scale-[0.98]",
        props.active
          ? "border-[var(--to-accent)] bg-[color-mix(in_oklab,var(--to-accent)_10%,white)] text-foreground"
          : "bg-muted/20 text-muted-foreground hover:bg-muted/30",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "mid" | "bad";
  onOpen: () => void;
}) {
  const toneMap = {
    good: "bg-green-500",
    mid: "bg-yellow-500",
    bad: "bg-red-500",
  };

  const band = toneMap[props.tone ?? "mid"];

  return (
    <button
      type="button"
      onClick={props.onOpen}
      className="w-full overflow-hidden rounded-2xl border bg-card text-left transition active:scale-[0.99]"
    >
      <div className={`h-1.5 w-full ${band}`} />
      <div className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {props.label}
        </div>
        <div className="mt-1 text-xl font-semibold leading-none">
          {props.value}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {props.sub}
        </div>
      </div>
    </button>
  );
}

function DrawerRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-muted/10 px-3 py-2">
      <div className="text-sm text-muted-foreground">{props.label}</div>
      <div className="text-sm font-semibold">{props.value}</div>
    </div>
  );
}

function MetricDrawer(props: {
  open: boolean;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer"
        onClick={props.onClose}
        className="fixed inset-0 z-40 bg-black/35"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border bg-card p-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Productivity
            </div>
            <div className="mt-1 text-2xl font-semibold leading-none">—</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Jobs per day
            </div>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border px-3 py-2 text-xs font-medium"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <DrawerRow label="Current FM" value="—" />
          <DrawerRow label="Last 3 FM" value="—" />
          <DrawerRow label="Last 12 FM" value="—" />
        </div>

        <div className="mt-4 rounded-2xl border bg-muted/10 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Supporting Stats
          </div>
          <div className="mt-3 space-y-2">
            <DrawerRow label="Jobs" value="—" />
            <DrawerRow label="Workdays" value="—" />
            <DrawerRow label="Average per Workday" value="—" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-muted/10 p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Chart
          </div>
          <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Trend chart placeholder
          </div>
        </div>
      </div>
    </>
  );
}

export default function TechMetricsClient(props: {
  initialRange: RangeKey;
  tiles: any[];
}) {
  const [range, setRange] = useState<RangeKey>(props.initialRange);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  return (
    <>
      <section className="rounded-2xl border bg-card p-3">
        <div className="grid grid-cols-3 gap-2">
          <RangeChip label="Current FM" active={range === "FM"} onClick={() => setRange("FM")} />
          <RangeChip label="Last 3 FM" active={range === "3FM"} onClick={() => setRange("3FM")} />
          <RangeChip label="Last 12 FM" active={range === "12FM"} onClick={() => setRange("12FM")} />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-4 gap-2">
          <RankCell label="Team" value="—" />
          <RankCell label="Region" value="—" />
          <RankCell label="Division" value="—" />
          <RankCell label="National" value="—" />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Work Mix
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-2">
          <MixStat label="Jobs" value="—" />
          <MixStat label="Jobs/Day" value="—" />
          <MixStat label="Workdays" value="—" />
        </div>

        <div className="mt-3 space-y-2">
          <MixRow label="Install" count="—" pct="—" />
          <MixRow label="Service" count="—" pct="—" />
          <MixRow label="Trouble" count="—" pct="—" />
        </div>
      </section>

      <section className="space-y-3">
        {props.tiles.map((t) => {
          const tone =
            t.band.band_key === "EXCEEDS"
              ? "good"
              : t.band.band_key === "MEETS"
                ? "mid"
                : t.band.band_key === "NEEDS_IMPROVEMENT"
                  ? "mid"
                  : t.band.band_key === "MISSES"
                    ? "bad"
                    : "mid";

          return (
            <MetricCard
              key={t.kpi_key}
              label={t.label}
              value={t.value_display ?? "—"}
              sub={t.band.label}
              tone={tone}
              onOpen={() => setOpenMetric(t.kpi_key)}
            />
          );
        })}
      </section>

      <MetricDrawer
        open={openMetric === "productivity"}
        onClose={() => setOpenMetric(null)}
      />
    </>
  );
}
