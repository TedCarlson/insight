"use client";

import { useEffect, useMemo, useState } from "react";

type TrendPoint = {
  metric_date: string;
  value: number | null;
  sample: number | null;
};

type TrendResponse = {
  kpi_key: string;
  range_days: number;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
  series: TrendPoint[];
  overlays?: {
    short_window_days: number;
    long_window_days: number;
    short_avg: number | null;
    long_avg: number | null;
    delta: number | null;
    state: string;
  };
};

const WIDTH = 560;
const HEIGHT = 160;

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function buildPolyline(series: TrendPoint[]) {
  const values = series.map((p) => p.value).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const pts: string[] = [];
  const n = series.length;

  for (let i = 0; i < n; i++) {
    const v = series[i].value;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;

    const x = (i / (n - 1)) * WIDTH;
    const yNorm = (v - min) / span;
    const y = (1 - clamp01(yNorm)) * HEIGHT;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return pts.length >= 2 ? pts.join(" ") : null;
}

export default function KpiTrendChart(props: { kpiKey: string; rangeDays: 30 | 60 | 90 }) {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/metrics/trend?kpi_key=${encodeURIComponent(props.kpiKey)}&range_days=${props.rangeDays}`,
          { method: "GET" }
        );
        const json = (await res.json()) as TrendResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [props.kpiKey, props.rangeDays]);

  const polyline = useMemo(() => buildPolyline(data?.series ?? []), [data]);

  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Trend</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {props.kpiKey} • last {props.rangeDays} days
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{loading ? "Loading…" : ""}</div>
      </div>

      <div className="mt-4 rounded-xl border bg-background p-3">
        {polyline ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-40 w-full">
            <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">No trend data</div>
        )}
      </div>
    </div>
  );
}