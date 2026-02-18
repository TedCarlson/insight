// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/components/reports/SummaryTiles.tsx

import { Card } from "@/components/ui/Card";

type Rollup = {
  // what callers *intend* to pass
  headcount?: number | null;
  tnps_score?: number | null; // -100..100
  ftr_rate?: number | null; // 0..100
  tool_usage_rate?: number | null; // 0..100

  // what your spine/totals row *actually* exposes (common variants)
  tnps_rate_src?: number | string | null;
  ftr_pct_src?: number | string | null;
  tool_usage_src?: number | string | null;

  // if someone passes counts instead of rate (fallback)
  tu_result?: number | string | null;
  tu_eligible_jobs?: number | string | null;
};

type TilesTrend = {
  metric_dates: string[]; // ascending
  headcount: number[];
  tnps: Array<number | null>;
  ftr: Array<number | null>;
  tool: Array<number | null>;
};

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function fmt1(v: number | null | undefined) {
  const n = toNum(v);
  if (n == null) return "—";
  return n.toFixed(1);
}

function fmt0(v: number | null | undefined) {
  const n = toNum(v);
  if (n == null) return "—";
  return String(Math.round(n));
}

function delta(current: number | null | undefined, prior: number | null | undefined): number | null {
  const c = toNum(current);
  const p = toNum(prior);
  if (c == null || p == null) return null;
  const d = c - p;
  return Math.abs(d) < 0.0001 ? 0 : d;
}

function DeltaPill({ d }: { d: number | null }) {
  if (d === null) return null;

  const dir = d > 0 ? "UP" : d < 0 ? "DOWN" : "FLAT";
  const glyph = dir === "UP" ? "↑" : dir === "DOWN" ? "↓" : "→";

  const cls =
    dir === "UP"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : dir === "DOWN"
        ? "border-red-300 bg-red-50 text-red-700"
        : "border-[var(--to-border)] bg-white text-[var(--to-ink-muted)]";

  const abs = Math.abs(d);
  const valueText = abs < 0.0001 ? "0.0" : abs.toFixed(1);
  const sign = dir === "UP" ? "+" : dir === "DOWN" ? "-" : "";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${cls}`}>
      <span className="text-[13px] leading-none">{glyph}</span>
      <span className="whitespace-nowrap tabular-nums">
        Δ prior: {dir === "FLAT" ? "0.0" : `${sign}${valueText}`}
      </span>
    </span>
  );
}

function Sparkline({ values }: { values: Array<number | null> }) {
  const w = 110;
  const h = 24;
  const pad = 2;

  const pts = values
    .map((v, i) => ({ v, i }))
    .filter((p) => p.v !== null && Number.isFinite(p.v as number)) as Array<{ v: number; i: number }>;

  if (values.length < 2 || pts.length < 2) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-[var(--to-ink-muted)] opacity-60">
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="currentColor" strokeWidth="1" />
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-[var(--to-ink-muted)] opacity-75">
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
          <div className="text-2xl font-semibold leading-8 tabular-nums">{value}</div>
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

/**
 * Totals-first normalization:
 * Prefer already-derived “src/rate” fields from spine totals row.
 * Only if missing, fall back to the “rate” fields, then to counts for tool usage.
 */
function resolveTnps(r: Rollup): number | null {
  return toNum(r.tnps_rate_src ?? r.tnps_score);
}

function resolveFtr(r: Rollup): number | null {
  return toNum(r.ftr_pct_src ?? r.ftr_rate);
}

function resolveTool(r: Rollup): number | null {
  const direct = toNum(r.tool_usage_src ?? r.tool_usage_rate);
  if (direct != null) return direct;

  // last-resort fallback (still totals-based): 100 * tu_result / tu_eligible_jobs
  const num = toNum(r.tu_result);
  const den = toNum(r.tu_eligible_jobs);
  if (num == null || den == null || den <= 0) return null;
  return (100 * num) / den;
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
  const currTnps = resolveTnps(current);
  const priorTnps = prior ? resolveTnps(prior) : null;

  const currFtr = resolveFtr(current);
  const priorFtr = prior ? resolveFtr(prior) : null;

  const currTool = resolveTool(current);
  const priorTool = prior ? resolveTool(prior) : null;

  const headcountDelta = delta(current.headcount ?? null, prior?.headcount ?? null);
  const tnpsDelta = delta(currTnps, priorTnps);
  const ftrDelta = delta(currFtr, priorFtr);
  const toolDelta = delta(currTool, priorTool);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Tile
          label="Headcount"
          value={fmt0(current.headcount ?? null)}
          sub="Batch totals"
          deltaValue={headcountDelta}
          spark={trend ? trend.headcount.map((n) => n) : undefined}
        />

        <Tile
          label="tNPS"
          value={fmt1(currTnps)}
          sub="Batch totals"
          deltaValue={tnpsDelta}
          spark={trend ? trend.tnps : undefined}
        />

        <Tile
          label="FTR"
          value={fmt1(currFtr)}
          sub="Batch totals"
          deltaValue={ftrDelta}
          spark={trend ? trend.ftr : undefined}
        />

        <Tile
          label="Tool Usage"
          value={fmt1(currTool)}
          sub="Batch totals"
          deltaValue={toolDelta}
          spark={trend ? trend.tool : undefined}
        />
      </div>

      <div className="mt-3 text-xs text-[var(--to-ink-muted)]">
        Delta compares batch totals to the previous snapshot (most recent earlier metric date in this fiscal month, same scope).
      </div>
    </Card>
  );
}