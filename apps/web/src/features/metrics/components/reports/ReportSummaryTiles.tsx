"use client";

import { useMemo } from "react";

import type { BandKey, RubricRow } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

type Preset = Record<string, any>;

type Props = {
  rows: any[];
  priorRows?: any[];
  kpis: KpiDef[];
  preset: Preset;

  // rubric is time-invariant; page should always pass it
  rubricRows: RubricRow[];
  rubricKeys: { tnpsKey: string; ftrKey: string; toolKey: string };
};

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function deltaDir(current: any, prior: any): "UP" | "DOWN" | "FLAT" | null {
  const c = toNum(current);
  const p = toNum(prior);
  if (c === null || p === null) return null;

  const eps = 0.0001;
  if (Math.abs(c - p) <= eps) return "FLAT";
  return c > p ? "UP" : "DOWN";
}

function DeltaArrow({ dir }: { dir: "UP" | "DOWN" | "FLAT" | null }) {
  if (!dir) return null;
  const glyph = dir === "UP" ? "↑" : dir === "DOWN" ? "↓" : "→";
  const color =
    dir === "UP"
      ? "text-emerald-600"
      : dir === "DOWN"
        ? "text-red-600"
        : "text-[var(--to-ink-muted)]";

  return (
    <span
      className={[
        "ml-2 inline-flex items-center leading-none",
        "text-[16px] font-semibold",
        color,
      ].join(" ")}
      aria-hidden="true"
      title={dir === "UP" ? "Up vs prior" : dir === "DOWN" ? "Down vs prior" : "No change vs prior"}
    >
      {glyph}
    </span>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = String(hex ?? "").replace("#", "").trim();
  if (!(h.length === 3 || h.length === 6)) return null;

  const full =
    h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isWhiteLike(bg: string) {
  const s = String(bg ?? "").trim().toLowerCase();
  return (
    s === "#fff" ||
    s === "#ffffff" ||
    s === "white" ||
    s === "rgb(255,255,255)" ||
    s === "rgb(255, 255, 255)"
  );
}

function bandForValue(rubricRows: RubricRow[], kpiKey: string, v: number | null): BandKey {
  if (v === null) return "NO_DATA";

  const group = (rubricRows ?? []).filter((r) => String(r.kpi_key) === String(kpiKey));
  if (group.length === 0) return "NO_DATA";

  for (const rr of group) {
    const minOk = rr.min_value == null ? true : v >= rr.min_value;
    const maxOk = rr.max_value == null ? true : v <= rr.max_value;
    if (minOk && maxOk) return rr.band_key as BandKey;
  }

  return "NO_DATA";
}

function tileSurfaceFromBand(preset: Preset, bandKey: BandKey) {
  const style = preset?.[bandKey] ?? preset?.NO_DATA ?? null;

  const bg = String(style?.bg_color ?? "");
  const border = String(style?.border_color ?? "var(--to-border)");

  const borderTint = hexToRgba(border, 0.32) ?? "rgba(0,0,0,0.10)";
  const glowTint = hexToRgba(isWhiteLike(bg) ? border : bg, 0.14) ?? "rgba(0,0,0,0.06)";
  const washTint = hexToRgba(isWhiteLike(bg) ? border : bg, 0.08) ?? "rgba(0,0,0,0.04)";

  return {
    borderColor: border,
    backgroundImage: `radial-gradient(820px 300px at 15% 20%, ${glowTint} 0%, rgba(0,0,0,0) 62%), radial-gradient(820px 300px at 95% 10%, ${washTint} 0%, rgba(0,0,0,0) 55%)`,
    boxShadow: `inset 0 0 0 1px ${borderTint}`,
  } as const;
}

function fmtTnps(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(2);
}

function fmtPct1(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtDelta(v: number | null, isPct: boolean) {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const abs = Math.abs(v);
  return `${sign}${abs.toFixed(1)}${isPct ? "" : ""}`;
}

export default function ReportSummaryTiles({
  rows,
  priorRows,
  kpis,
  preset,
  rubricRows,
  rubricKeys,
}: Props) {
  const current = rows ?? [];
  const prior = priorRows ?? [];

  const headcount = current.length;
  const headcountPrior = prior.length;

  const tnpsDef = useMemo(
    () => kpis.find((k) => String(k.key).toLowerCase().includes("tnps")) ?? kpis[0],
    [kpis]
  );
  const ftrDef = useMemo(
    () => kpis.find((k) => String(k.key).toLowerCase().includes("ftr")) ?? kpis[1],
    [kpis]
  );
  const toolDef = useMemo(
    () => kpis.find((k) => String(k.key).toLowerCase().includes("tool")) ?? kpis[2],
    [kpis]
  );

  const avg = (arr: any[], field: string): number | null => {
    if (!arr || arr.length === 0) return null;
    let sum = 0;
    let n = 0;
    for (const r of arr) {
      const v = toNum(r?.[field]);
      if (v === null) continue;
      sum += v;
      n += 1;
    }
    return n === 0 ? null : sum / n;
  };

  const tnpsCur = tnpsDef ? avg(current, tnpsDef.valueField) : null;
  const tnpsPrev = tnpsDef ? avg(prior, tnpsDef.valueField) : null;

  const ftrCur = ftrDef ? avg(current, ftrDef.valueField) : null;
  const ftrPrev = ftrDef ? avg(prior, ftrDef.valueField) : null;

  const toolCur = toolDef ? avg(current, toolDef.valueField) : null;
  const toolPrev = toolDef ? avg(prior, toolDef.valueField) : null;

  const headDir = deltaDir(headcount, headcountPrior);
  const tnpsDir = deltaDir(tnpsCur, tnpsPrev);
  const ftrDir = deltaDir(ftrCur, ftrPrev);
  const toolDir = deltaDir(toolCur, toolPrev);

  const headDelta = headcountPrior === 0 ? null : headcount - headcountPrior;
  const tnpsDelta = tnpsCur === null || tnpsPrev === null ? null : tnpsCur - tnpsPrev;
  const ftrDelta = ftrCur === null || ftrPrev === null ? null : ftrCur - ftrPrev;
  const toolDelta = toolCur === null || toolPrev === null ? null : toolCur - toolPrev;

  const tnpsBand = bandForValue(rubricRows, rubricKeys.tnpsKey, tnpsCur);
  const ftrBand = bandForValue(rubricRows, rubricKeys.ftrKey, ftrCur);
  const toolBand = bandForValue(rubricRows, rubricKeys.toolKey, toolCur);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {/* Headcount */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm">
        <div className="text-xs text-[var(--to-ink-muted)]">Headcount</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{headcount}</div>
          <DeltaArrow dir={headDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{headcountPrior}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">
              {headDelta === null ? "—" : headDelta > 0 ? `+${headDelta}` : `${headDelta}`}
            </span>
          </div>
        </div>
      </div>

      {/* tNPS */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm" style={tileSurfaceFromBand(preset, tnpsBand)}>
        <div className="text-xs text-[var(--to-ink-muted)]">tNPS</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{fmtTnps(tnpsCur)}</div>
          <DeltaArrow dir={tnpsDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{fmtTnps(tnpsPrev)}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">
              {tnpsDelta === null ? "—" : fmtDelta(tnpsDelta, false)}
            </span>
          </div>
        </div>
      </div>

      {/* FTR */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm" style={tileSurfaceFromBand(preset, ftrBand)}>
        <div className="text-xs text-[var(--to-ink-muted)]">FTR%</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{fmtPct1(ftrCur)}</div>
          <DeltaArrow dir={ftrDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{fmtPct1(ftrPrev)}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">
              {ftrDelta === null ? "—" : fmtDelta(ftrDelta, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Tool Usage */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm" style={tileSurfaceFromBand(preset, toolBand)}>
        <div className="text-xs text-[var(--to-ink-muted)]">Tool Usage</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{fmtPct1(toolCur)}</div>
          <DeltaArrow dir={toolDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{fmtPct1(toolPrev)}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">
              {toolDelta === null ? "—" : fmtDelta(toolDelta, true)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}