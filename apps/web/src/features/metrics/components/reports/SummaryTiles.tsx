// apps/web/src/features/metrics/components/reports/SummaryTiles.tsx
import { Card } from "@/components/ui/Card";

type Rollup = {
  headcount?: number | null;

  // actual P4PRollup keys (from rollup.ts)
  tnps_score?: number | null;
  ftr_rate?: number | null;
  tool_usage_rate?: number | null;
};

type TilesTrend = {
  metric_dates: string[]; // ascending
  headcount: number[];
  tnps: Array<number | null>;
  ftr: Array<number | null>;
  tool: Array<number | null>;
};

function fmt1(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  if (!Number.isFinite(v)) return "—";
  return Number(v).toFixed(1);
}

function fmt0(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  if (!Number.isFinite(v)) return "—";
  return String(Math.round(Number(v)));
}

function delta(
  current: number | null | undefined,
  prior: number | null | undefined
): number | null {
  const c = current ?? null;
  const p = prior ?? null;
  if (c === null || p === null) return null;
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  const d = Number(c) - Number(p);
  return Math.abs(d) < 0.0001 ? 0 : d;
}

function deltaDir(d: number | null): "UP" | "DOWN" | "FLAT" | null {
  if (d === null) return null;
  if (d > 0) return "UP";
  if (d < 0) return "DOWN";
  return "FLAT";
}

function DeltaPill({ d }: { d: number | null }) {
  const dir = deltaDir(d);
  if (!dir) return null;

  const glyph = dir === "UP" ? "↑" : dir === "DOWN" ? "↓" : "→";
  const cls =
    dir === "UP"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : dir === "DOWN"
        ? "border-red-300 bg-red-50 text-red-700"
        : "border-[var(--to-border)] bg-white text-[var(--to-ink-muted)]";

  const valueText =
    d === null ? "—" : Math.abs(d) < 0.0001 ? "0.0" : Math.abs(d).toFixed(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${cls}`}
    >
      <span className="text-[13px] leading-none">{glyph}</span>
      <span className="whitespace-nowrap">
        Δ prior:{" "}
        {dir === "FLAT"
          ? "0.0"
          : (dir === "UP" ? "+" : "-") + valueText}
      </span>
    </span>
  );
}

function Sparkline({ values }: { values: Array<number | null> }) {
  const w = 120;
  const h = 26;
  const pad = 2;

  const pts = values
    .map((v, i) => ({ v, i }))
    .filter((p) => p.v !== null && Number.isFinite(p.v as number)) as Array<{
    v: number;
    i: number;
  }>;

  if (values.length < 2 || pts.length < 2) {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="text-[var(--to-ink-muted)] opacity-70"
      >
        <line
          x1={pad}
          y1={h / 2}
          x2={w - pad}
          y2={h / 2}
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    );
  }

  let min = Math.min(...pts.map((p) => p.v));
  let max = Math.max(...pts.map((p) => p.v));
  if (Math.abs(max - min) < 0.0001) {
    min -= 1;
    max += 1;
  }

  const xStep = (w - pad * 2) / (values.length - 1);
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    const yy = h - pad - t * (h - pad * 2);
    return Math.max(pad, Math.min(h - pad, yy));
  };

  // Build a path that breaks on nulls
  let d = "";
  let started = false;

  values.forEach((v, idx) => {
    const x = pad + idx * xStep;
    if (v === null || !Number.isFinite(v)) {
      started = false;
      return;
    }
    const yy = y(v);
    if (!started) {
      d += `M ${x.toFixed(2)} ${yy.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${x.toFixed(2)} ${yy.toFixed(2)} `;
    }
  });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="text-[var(--to-ink-muted)] opacity-80"
    >
      <path
        d={d.trim()}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Tile({
  label,
  value,
  sub,
  deltaValue,
  spark,
}: {
  label: string;
  value: string;
  sub: string;
  deltaValue: number | null;
  spark?: Array<number | null>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[var(--to-ink-muted)]">{label}</div>
          <div className="text-3xl font-semibold leading-9">{value}</div>
          <div className="text-xs text-[var(--to-ink-muted)] mt-1">{sub}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {spark ? <Sparkline values={spark} /> : null}
          <DeltaPill d={deltaValue} />
        </div>
      </div>
    </Card>
  );
}

export function SummaryTiles({
  current,
  prior,
  trend,
}: {
  current: Rollup;
  prior: Rollup | null;
  trend?: TilesTrend;
}) {
  const headcountDelta = delta(current.headcount ?? null, prior?.headcount ?? null);

  const tnpsDelta = delta(current.tnps_score ?? null, prior?.tnps_score ?? null);
  const ftrDelta = delta(current.ftr_rate ?? null, prior?.ftr_rate ?? null);
  const toolDelta = delta(
    current.tool_usage_rate ?? null,
    prior?.tool_usage_rate ?? null
  );

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Tile
          label="Headcount"
          value={fmt0(current.headcount ?? null)}
          sub="Techs in current snapshot"
          deltaValue={headcountDelta}
          spark={trend ? trend.headcount.map((n) => n) : undefined}
        />

        <Tile
          label="tNPS"
          value={fmt1(current.tnps_score ?? null)}
          sub="Rollup"
          deltaValue={tnpsDelta}
          spark={trend ? trend.tnps : undefined}
        />

        <Tile
          label="FTR"
          value={fmt1(current.ftr_rate ?? null)}
          sub="Rollup"
          deltaValue={ftrDelta}
          spark={trend ? trend.ftr : undefined}
        />

        <Tile
          label="Tool Usage"
          value={fmt1(current.tool_usage_rate ?? null)}
          sub="Rollup"
          deltaValue={toolDelta}
          spark={trend ? trend.tool : undefined}
        />
      </div>

      <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
        Delta compares the current snapshot to the previous snapshot (most recent earlier metric date in this fiscal month, under the same scope).
      </div>
    </Card>
  );
}