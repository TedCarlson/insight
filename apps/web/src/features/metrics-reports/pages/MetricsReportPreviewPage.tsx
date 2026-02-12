// apps/web/src/features/metrics-reports/pages/MetricsReportPreviewPage.tsx
"use client";

import * as React from "react";
import type { BandKey, RubricRow } from "@/features/metrics-reports/lib/score";
import { scoreKpi, rollupWeighted } from "@/features/metrics-reports/lib/score";

type ClassType = "P4P" | "SMART" | "TECH";

type InitialPayload = {
  kpiDefs: any[];
  classConfig: any[];
  rubricRows: any[];
};

type Props = {
  initial: InitialPayload;
};

const BAND_ORDER: BandKey[] = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"];

function toClassType(v: string): ClassType {
  const s = String(v ?? "").toUpperCase();
  if (s === "P4P" || s === "SMART" || s === "TECH") return s;
  return "SMART";
}

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function kpiLabel(def: any, kpiKey: string) {
  return def?.customer_label ?? def?.label ?? def?.kpi_key ?? kpiKey;
}

function normalizeRubricRow(classType: ClassType, r: any): RubricRow | null {
  const k = String(r?.kpi_key ?? "").trim();
  const b = String(r?.band_key ?? "").trim().toUpperCase() as BandKey;
  if (!k) return null;
  if (!BAND_ORDER.includes(b)) return null;

  return {
    class_type: classType,
    kpi_key: k,
    band_key: b,
    min_value: r?.min_value ?? null,
    max_value: r?.max_value ?? null,
    score_value: r?.score_value ?? null,
  };
}

export default function MetricsReportPreviewPage({ initial }: Props) {
  const [classType, setClassType] = React.useState<ClassType>("SMART");
  const [valuesByKpi, setValuesByKpi] = React.useState<Record<string, string>>({});

  const kpiDefsByKey = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of initial.kpiDefs ?? []) {
      const k = String(d?.kpi_key ?? "").trim();
      if (!k) continue;
      m[k] = d;
    }
    return m;
  }, [initial.kpiDefs]);

  const cfgByKpi = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of initial.classConfig ?? []) {
      const ct = String(r?.class_type ?? "").toUpperCase();
      const k = String(r?.kpi_key ?? "").trim();
      if (!k) continue;
      if (ct !== classType) continue;
      m[k] = r;
    }
    return m;
  }, [initial.classConfig, classType]);

  const rubricByKpi = React.useMemo(() => {
    const m: Record<string, RubricRow[]> = {};
    for (const r of initial.rubricRows ?? []) {
      const ct = String(r?.class_type ?? "").toUpperCase();
      if (ct !== classType) continue;

      const rr = normalizeRubricRow(classType, r);
      if (!rr) continue;

      m[rr.kpi_key] = m[rr.kpi_key] ?? [];
      m[rr.kpi_key].push(rr);
    }

    // stable order inside each KPI for consistent tooltips
    for (const k of Object.keys(m)) {
      m[k] = m[k].slice().sort((a, b) => BAND_ORDER.indexOf(a.band_key) - BAND_ORDER.indexOf(b.band_key));
    }

    return m;
  }, [initial.rubricRows, classType]);

  const enabledKpiKeys = React.useMemo(() => {
    return Object.keys(cfgByKpi)
      .filter((k) => !!cfgByKpi[k]?.enabled)
      .sort();
  }, [cfgByKpi]);

  const rows = React.useMemo(() => {
    return enabledKpiKeys.map((kpiKey) => {
      const def = kpiDefsByKey[kpiKey];
      const cfg = cfgByKpi[kpiKey] ?? {};
      const rubric = rubricByKpi[kpiKey] ?? [];

      const metricValue = numOrNull(valuesByKpi[kpiKey]);
      const scored = scoreKpi({ metricValue, rubricRowsForKpi: rubric });

      const tooltip = BAND_ORDER.map((b) => {
        const rr = rubric.find((x) => x.band_key === b);
        if (!rr) return `${b}: (no row)`;
        const min = rr.min_value == null ? "—" : rr.min_value;
        const max = rr.max_value == null ? "—" : rr.max_value;
        const sc = rr.score_value == null ? "—" : rr.score_value;
        return `${b}: min=${min} max=${max} score=${sc}`;
      }).join("\n");

      return {
        kpiKey,
        label: kpiLabel(def, kpiKey),
        weight_percent: cfg?.weight_percent ?? null,
        threshold: cfg?.threshold ?? null,
        metricValue,
        band_key: scored.band_key,
        score_value: scored.score_value,
        enabled: cfg?.enabled ?? null,
        tooltip,
      };
    });
  }, [enabledKpiKeys, kpiDefsByKey, cfgByKpi, rubricByKpi, valuesByKpi]);

  const totalWeighted = React.useMemo(() => {
    return rollupWeighted({
      scored: rows.map((r) => ({
        kpi_key: r.kpiKey,
        score_value: r.score_value,
        weight_percent: r.weight_percent,
        enabled: r.enabled,
      })),
    });
  }, [rows]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Class</label>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={classType}
            onChange={(e) => setClassType(toClassType(e.target.value))}
          >
            <option value="SMART">SMART</option>
            <option value="P4P">P4P</option>
            <option value="TECH">TECH</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Enter sample KPI values to validate band ranges + score outputs.
        </div>

        <div className="ml-auto text-sm">
          <span className="text-muted-foreground">Weighted total:</span>{" "}
          <span className="font-medium">{Number.isFinite(totalWeighted) ? totalWeighted.toFixed(3) : "0.000"}</span>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1.2fr_110px_110px_160px_110px_110px] gap-0 bg-muted/30 border-b">
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">KPI</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">Weight %</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">Threshold</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">Value (you type)</div>
          <div className="p-2 border-r text-xs font-medium text-muted-foreground">Band</div>
          <div className="p-2 text-xs font-medium text-muted-foreground">Score</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">
            No enabled KPIs found for {classType}. Enable some in Metrics Admin.
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.kpiKey}
              className="grid grid-cols-[1.2fr_110px_110px_160px_110px_110px] gap-0 border-b last:border-b-0"
            >
              <div className="p-2 border-r">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.kpiKey}</div>
              </div>

              <div className="p-2 border-r text-sm">{r.weight_percent ?? ""}</div>
              <div className="p-2 border-r text-sm">{r.threshold ?? ""}</div>

              <div className="p-2 border-r">
                <input
                  className="w-full rounded-md border px-2 py-1 text-sm"
                  inputMode="decimal"
                  value={valuesByKpi[r.kpiKey] ?? ""}
                  onChange={(e) =>
                    setValuesByKpi((s) => ({
                      ...s,
                      [r.kpiKey]: e.target.value,
                    }))
                  }
                  placeholder="e.g. 94.5"
                />
              </div>

              <div className="p-2 border-r text-sm" title={r.tooltip}>
                {r.band_key}
              </div>

              <div className="p-2 text-sm" title={`Weighted rollup uses weight_percent.\nCurrent weighted total: ${totalWeighted.toFixed(3)}`}>
                {r.score_value}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}