"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import KpiTrendChart from "@/features/metrics/scorecard/components/KpiTrendChart";
import type {
  BpRangeKey,
  BpViewRosterMetricCell,
  BpViewRosterRow,
} from "../lib/bpView.types";

type FtrPayload = {
  debug?: {
    requested_range?: BpRangeKey;
    distinct_fiscal_month_count?: number;
    distinct_fiscal_months_found?: string[];
    selected_month_count?: number;
    selected_final_rows?: Array<{
      fiscal_end_date: string;
      metric_date: string;
      batch_id: string;
      rows_in_month: number;
      total_ftr_contact_jobs: number | null;
      ftr_fail_jobs: number | null;
    }>;
    trend?: Array<{
      fiscal_end_date: string;
      metric_date: string;
      batch_id: string;
      total_ftr_contact_jobs: number | null;
      ftr_fail_jobs: number | null;
      kpi_value: number | null;
      is_month_final: boolean;
    }>;
  };
  summary?: {
    ftr_rate: number | null;
    total_contact_jobs: number;
    total_fail_jobs: number;
  };
  trend?: Array<{
    fiscal_end_date: string;
    metric_date: string;
    batch_id: string;
    total_ftr_contact_jobs: number | null;
    ftr_fail_jobs: number | null;
    kpi_value: number | null;
    is_month_final: boolean;
  }>;
} | null;

function bandAccentClass(bandKey: string) {
  if (bandKey === "EXCEEDS") return "bg-[var(--to-success)]";
  if (bandKey === "MEETS") return "bg-[var(--to-primary)]";
  if (bandKey === "NEEDS_IMPROVEMENT") return "bg-[var(--to-warning)]";
  if (bandKey === "MISSES") return "bg-[var(--to-danger)]";
  return "bg-[var(--to-border)]";
}

function bandCardClass(bandKey: string, active: boolean) {
  const ring = active ? "ring-2 ring-[var(--to-accent)]" : "";
  if (bandKey === "EXCEEDS") {
    return `border-[var(--to-success)] bg-[color-mix(in_oklab,var(--to-success)_10%,white)] ${ring}`;
  }
  if (bandKey === "MEETS") {
    return `border-[var(--to-primary)] bg-[color-mix(in_oklab,var(--to-primary)_10%,white)] ${ring}`;
  }
  if (bandKey === "NEEDS_IMPROVEMENT") {
    return `border-[var(--to-warning)] bg-[color-mix(in_oklab,var(--to-warning)_10%,white)] ${ring}`;
  }
  if (bandKey === "MISSES") {
    return `border-[var(--to-danger)] bg-[color-mix(in_oklab,var(--to-danger)_10%,white)] ${ring}`;
  }
  return `border-[var(--to-border)] bg-muted/10 ${ring}`;
}

function bandLabel(bandKey: string) {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function fmtPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function InfoPill(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-muted/10 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 text-sm font-semibold">{props.value}</div>
    </div>
  );
}

function MetricTile(props: {
  metric: BpViewRosterMetricCell;
  active: boolean;
  onClick: () => void;
}) {
  const { metric, active, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full overflow-hidden rounded-2xl border text-left transition active:scale-[0.99]",
        bandCardClass(metric.band_key, active),
      ].join(" ")}
    >
      <div className={`h-1.5 w-full ${bandAccentClass(metric.band_key)}`} />
      <div className="p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </div>
        <div className="mt-1 text-xl font-semibold leading-none">
          {metric.value_display ?? "—"}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {bandLabel(metric.band_key)}
        </div>
      </div>
    </button>
  );
}

function QuickStat(props: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/10 px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
      {props.note ? (
        <div className="mt-1 text-xs text-muted-foreground">{props.note}</div>
      ) : null}
    </div>
  );
}

export default function BpTechDrillDrawer(props: {
  open: boolean;
  row: BpViewRosterRow | null;
  range: BpRangeKey;
  onClose: () => void;
}) {
  const { open, row, range, onClose } = props;

  const [selectedKpiKey, setSelectedKpiKey] = useState<string | null>(null);
  const [ftrPayload, setFtrPayload] = useState<FtrPayload>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const selectedMetric = useMemo(() => {
    if (!row?.metrics?.length) return null;

    if (selectedKpiKey) {
      const found = row.metrics.find((m) => m.kpi_key === selectedKpiKey);
      if (found) return found;
    }

    return row.metrics[0] ?? null;
  }, [row, selectedKpiKey]);

  useEffect(() => {
    if (!open || !row || !selectedMetric) {
      setFtrPayload(null);
      setLoading(false);
      return;
    }

    if (selectedMetric.kpi_key !== "ftr_rate") {
      setFtrPayload(null);
      setLoading(false);
      return;
    }

    const personId = row.person_id;
    const techId = row.tech_id;
    const selectedRange = range;

    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const qs = new URLSearchParams();
        qs.set("person_id", personId);
        qs.set("tech_id", techId);
        qs.set("range", selectedRange);

        const res = await fetch(`/api/metrics/ftr?${qs.toString()}`, {
          method: "GET",
        });

        const json = await res.json();

        if (!cancelled) {
          setFtrPayload(res.ok ? json : null);
        }
      } catch {
        if (!cancelled) {
          setFtrPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [open, row, range, selectedMetric]);

  const focusedMetricValue = useMemo(() => {
    if (!selectedMetric) return "—";
    if (selectedMetric.kpi_key === "ftr_rate" && ftrPayload?.summary) {
      return fmtPct(ftrPayload.summary.ftr_rate);
    }
    return selectedMetric.value_display ?? "—";
  }, [selectedMetric, ftrPayload]);

  if (!open || !row) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${row.full_name} detail`}
    >
      <div className="flex h-full w-full justify-end">
        <Card
          className="flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-none border-l p-0 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <div className="text-xl font-semibold leading-tight">
                  {row.full_name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {row.context}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <InfoPill label="Range" value={range} />
                  <InfoPill label="Risk Count" value={String(row.below_target_count)} />
                  <InfoPill label="Focused KPI" value={selectedMetric?.label ?? "—"} />
                </div>
              </div>

              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="space-y-5">
              <section className="rounded-2xl border bg-card p-4">
                <div className="mb-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    KPI Surface
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Full metric payload for this technician in the selected BP range context
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {row.metrics.map((metric) => (
                    <MetricTile
                      key={metric.kpi_key}
                      metric={metric}
                      active={selectedMetric?.kpi_key === metric.kpi_key}
                      onClick={() => setSelectedKpiKey(metric.kpi_key)}
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border bg-card p-4">
                <div className="mb-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Trend Drill
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedMetric
                      ? `${selectedMetric.label} • ${focusedMetricValue}`
                      : "Select a KPI"}
                    {loading ? " • Loading…" : ""}
                  </div>
                </div>

                {selectedMetric ? (
                  <KpiTrendChart
                    kpiKey={selectedMetric.kpi_key}
                    fiscalWindow={range}
                    personId={row.person_id}
                  />
                ) : (
                  <div className="rounded-2xl border bg-muted/10 p-6 text-sm text-muted-foreground">
                    No KPI selected.
                  </div>
                )}
              </section>

              <section className="rounded-2xl border bg-card p-4">
                <div className="mb-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Inspection Summary
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Quick operating context for this technician
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <QuickStat label="Tech" value={row.tech_id} />
                  <QuickStat label="Metrics Loaded" value={String(row.metrics.length)} />
                  <QuickStat
                    label="Below Target"
                    value={String(row.below_target_count)}
                    note="Current KPI count needing attention"
                  />
                  <QuickStat
                    label="Selected KPI Band"
                    value={selectedMetric ? bandLabel(selectedMetric.band_key) : "—"}
                  />
                </div>

                {selectedMetric?.kpi_key === "ftr_rate" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <QuickStat
                      label="FTR Rate"
                      value={ftrPayload?.summary ? fmtPct(ftrPayload.summary.ftr_rate) : "—"}
                      note="Computed from selected fiscal range"
                    />
                    <QuickStat
                      label="Contact Jobs"
                      value={
                        ftrPayload?.summary
                          ? String(ftrPayload.summary.total_contact_jobs ?? 0)
                          : "—"
                      }
                    />
                    <QuickStat
                      label="Fail Jobs"
                      value={
                        ftrPayload?.summary
                          ? String(ftrPayload.summary.total_fail_jobs ?? 0)
                          : "—"
                      }
                    />
                    <QuickStat
                      label="Months Selected"
                      value={
                        ftrPayload?.debug?.selected_month_count != null
                          ? String(ftrPayload.debug.selected_month_count)
                          : "—"
                      }
                      note="Final month snapshots used in rollup"
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 border-t bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {row.full_name} • {selectedMetric?.label ?? "KPI"} • {range}
              </div>

              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}