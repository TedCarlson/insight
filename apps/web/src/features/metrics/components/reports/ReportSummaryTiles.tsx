"use client";

import { useMemo } from "react";

import type { BandKey, RubricRow } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";
import { delta, trendFromDelta, fmtDelta as fmtDeltaNum } from "@/features/metrics/lib/reports/rollup";

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
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function deltaDir(current: number | null, prior: number | null): "UP" | "DOWN" | "FLAT" | null {
  return trendFromDelta(delta(current, prior), 0.0001);
}

function DeltaArrow({ dir }: { dir: "UP" | "DOWN" | "FLAT" | null }) {
  if (!dir) return null;
  const glyph = dir === "UP" ? "↑" : dir === "DOWN" ? "↓" : "→";
  const color = dir === "UP" ? "text-emerald-600" : dir === "DOWN" ? "text-red-600" : "text-[var(--to-ink-muted)]";

  return (
    <span
      className={["ml-2 inline-flex items-center leading-none", "text-[16px] font-semibold", color].join(" ")}
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

  const full = h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isWhiteLike(bg: string) {
  const s = String(bg ?? "").trim().toLowerCase();
  return s === "#fff" || s === "#ffffff" || s === "white" || s === "rgb(255,255,255)" || s === "rgb(255, 255, 255)";
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

// ----- Formatting (NO % in numbers; % belongs in label) -----
function fmtTnps(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(2);
}

function fmtPct1NoSymbol(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(1);
}

function fmtDelta(v: number | null, digits = 1) {
  if (v === null) return "—";
  return fmtDeltaNum(v, digits);
}

// ----- Rollup math: match “totals” behavior using denominators -----
function weightedAvg(valueSum: number, denomSum: number): number | null {
  if (!Number.isFinite(valueSum) || !Number.isFinite(denomSum) || denomSum <= 0) return null;
  return valueSum / denomSum;
}

function rollupFromRows(rows: any[]) {
  // Keep tiles aligned with Stack Ranking: OK rows only.
  const ok = (rows ?? []).filter((r) => String(r?.status_badge ?? "") === "OK");

  const headcount = ok.length;

  let tnpsValueSum = 0;
  let tnpsDenomSum = 0;

  let ftrValueSum = 0;
  let ftrDenomSum = 0;

  let toolValueSum = 0;
  let toolDenomSum = 0;

  for (const r of ok) {
    const tnps = toNum(r.tnps_score);
    const tnpsSurveys = toNum(r.tnps_surveys);
    if (tnps != null && tnpsSurveys != null && tnpsSurveys > 0) {
      tnpsValueSum += tnps * tnpsSurveys;
      tnpsDenomSum += tnpsSurveys;
    }

    const ftr = toNum(r.ftr_rate);
    const ftrJobs = toNum(r.total_ftr_contact_jobs);
    if (ftr != null && ftrJobs != null && ftrJobs > 0) {
      ftrValueSum += ftr * ftrJobs;
      ftrDenomSum += ftrJobs;
    }

    const tool = toNum(r.tool_usage_rate);
    const toolEligible = toNum(r.tu_eligible_jobs);
    if (tool != null && toolEligible != null && toolEligible > 0) {
      toolValueSum += tool * toolEligible;
      toolDenomSum += toolEligible;
    }
  }

  return {
    headcount,
    tnps_score: weightedAvg(tnpsValueSum, tnpsDenomSum),
    ftr_rate: weightedAvg(ftrValueSum, ftrDenomSum),
    tool_usage_rate: weightedAvg(toolValueSum, toolDenomSum),
  };
}

export default function ReportSummaryTiles({ rows, priorRows, kpis, preset, rubricRows, rubricKeys }: Props) {
  const currentRows = useMemo(() => rows ?? [], [rows]);
  const priorRowsNorm = useMemo(() => priorRows ?? [], [priorRows]);

  // ✅ Compute rollups from the SAME flattened row shape as the table.
  const rollCur = useMemo(() => rollupFromRows(currentRows), [currentRows]);
  const rollPrev = useMemo(() => rollupFromRows(priorRowsNorm), [priorRowsNorm]);

  const headcount = rollCur.headcount;
  const headcountPrior = rollPrev.headcount;

  const tnpsDef = useMemo(() => kpis.find((k) => String(k.key).toLowerCase().includes("tnps")) ?? kpis[0], [kpis]);
  const ftrDef = useMemo(() => kpis.find((k) => String(k.key).toLowerCase().includes("ftr")) ?? kpis[1], [kpis]);
  const toolDef = useMemo(() => kpis.find((k) => String(k.key).toLowerCase().includes("tool")) ?? kpis[2], [kpis]);

  const tnpsCur = tnpsDef ? rollCur.tnps_score : null;
  const tnpsPrev = tnpsDef ? rollPrev.tnps_score : null;

  const ftrCur = ftrDef ? rollCur.ftr_rate : null;
  const ftrPrev = ftrDef ? rollPrev.ftr_rate : null;

  const toolCur = toolDef ? rollCur.tool_usage_rate : null;
  const toolPrev = toolDef ? rollPrev.tool_usage_rate : null;

  const headDir = deltaDir(headcount, headcountPrior);
  const tnpsDir = deltaDir(tnpsCur, tnpsPrev);
  const ftrDir = deltaDir(ftrCur, ftrPrev);
  const toolDir = deltaDir(toolCur, toolPrev);

  const headDelta = headcountPrior === 0 ? null : headcount - headcountPrior;
  const tnpsDelta = delta(tnpsCur, tnpsPrev);
  const ftrDelta = delta(ftrCur, ftrPrev);
  const toolDelta = delta(toolCur, toolPrev);

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
            <span className="tabular-nums text-[var(--to-ink)]">{tnpsDelta === null ? "—" : fmtDelta(tnpsDelta, 2)}</span>
          </div>
        </div>
      </div>

      {/* FTR */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm" style={tileSurfaceFromBand(preset, ftrBand)}>
        <div className="text-xs text-[var(--to-ink-muted)]">FTR%</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{fmtPct1NoSymbol(ftrCur)}</div>
          <DeltaArrow dir={ftrDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{fmtPct1NoSymbol(ftrPrev)}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">{ftrDelta === null ? "—" : fmtDelta(ftrDelta, 1)}</span>
          </div>
        </div>
      </div>

      {/* Tool Usage */}
      <div className="rounded-2xl border bg-[var(--to-surface)] p-4 shadow-sm" style={tileSurfaceFromBand(preset, toolBand)}>
        <div className="text-xs text-[var(--to-ink-muted)]">Tool Usage%</div>

        <div className="mt-2 flex items-center">
          <div className="text-2xl font-semibold tabular-nums">{fmtPct1NoSymbol(toolCur)}</div>
          <DeltaArrow dir={toolDir} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-[var(--to-ink-muted)]">
            Prior: <span className="tabular-nums">{fmtPct1NoSymbol(toolPrev)}</span>
          </div>

          <div className="font-mono text-[var(--to-ink-muted)]">
            Δ prior:{" "}
            <span className="tabular-nums text-[var(--to-ink)]">{toolDelta === null ? "—" : fmtDelta(toolDelta, 1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}