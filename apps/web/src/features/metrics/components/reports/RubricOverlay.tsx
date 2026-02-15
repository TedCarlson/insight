// apps/web/src/features/metrics/components/reports/RubricOverlay.tsx
"use client";

import { useEffect, useMemo } from "react";

import type { KpiDef } from "@/features/metrics/lib/reports/kpis";
import type { RubricRow } from "@/features/metrics-reports/lib/score";
import type { BandKey } from "@/features/metrics-reports/lib/score";

import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";

import { filterRubricGroups } from "@/features/metrics/components/reports/rubricViewModel";

type Preset = Record<string, any>;

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  preset: Preset;
  rubricRows: RubricRow[];
  kpis: KpiDef[];
  classType: string;
};

function Cell({
  span,
  children,
  align = "left",
  mono = false,
}: {
  span: number;
  children: any;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <div
      className={[
        `col-span-${span}`,
        alignClass,
        mono ? "font-mono tabular-nums" : "",
        "min-w-0 truncate",
      ].join(" ")}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "").trim();
  if (!(h.length === 3 || h.length === 6)) return null;

  const full =
    h.length === 3
      ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
      : h;

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

function BandChip({
  bandKey,
  valueText,
  preset,
}: {
  bandKey: BandKey;
  valueText: string;
  preset: Preset;
}) {
  const style = preset?.[bandKey] ?? preset?.NO_DATA ?? null;

  if (!style) {
    return (
      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold">
        {valueText}
      </span>
    );
  }

  const bg = String(style.bg_color ?? "");
  const border = String(style.border_color ?? "");
  const text = String(style.text_color ?? "");

  let surface = bg;
  if (isWhiteLike(bg)) {
    const tinted = hexToRgba(border, 0.12);
    if (tinted) surface = tinted;
  } else {
    const softened = hexToRgba(bg, 0.92);
    if (softened) surface = softened;
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-md border px-2 py-[2px] text-[11px] font-semibold leading-none shadow-[0_1px_0_rgba(0,0,0,0.03)]"
      style={{
        backgroundColor: surface,
        color: text,
        borderColor: border,
      }}
    >
      {valueText}
    </span>
  );
}

function BandLegend({ preset }: { preset: Preset }) {
  const keys: BandKey[] = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <div className="text-xs font-medium text-[var(--to-ink-muted)]">{k}</div>
          <BandChip bandKey={k} valueText="Sample" preset={preset} />
        </div>
      ))}
    </div>
  );
}

export function RubricOverlay({
  open,
  onOpenChange,
  preset,
  rubricRows,
  kpis,
  classType,
}: Props) {
  // ESC to close + prevent background scroll
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  const kpiLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    (kpis ?? []).forEach((k) => m.set(String(k.key), String(k.label ?? k.key)));
    return m;
  }, [kpis]);

  const filteredRows = useMemo(() => {
    const rows = (rubricRows ?? []) as any[];
    return filterRubricGroups(rows);
  }, [rubricRows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close rubric"
        onClick={() => onOpenChange(false)}
      />

      {/* panel wrapper */}
      <div className="absolute inset-0 p-2 sm:p-4 flex items-start justify-center">
        <div
          className={[
            "rounded-2xl bg-white shadow-xl border overflow-hidden",
            // smaller + laptop friendly + mobile friendly
            "w-[calc(100vw-1rem)] sm:w-full",
            "max-w-3xl",
            "max-h-[85vh]",
            "flex flex-col",
          ].join(" ")}
        >
          {/* sticky header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-5">Rubric &amp; Band Styles</div>
                <div className="text-[11px] text-[var(--to-ink-muted)] leading-4 truncate">
                  Class: <span className="font-mono">{classType}</span> • KPI groups with any min/max/score
                </div>
              </div>

              <button
                type="button"
                className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
            </div>

            {/* compact meta row */}
            <div className="px-3 sm:px-4 pb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-[var(--to-ink-muted)]">
                Rows: <span className="font-mono text-[var(--to-ink)]">{filteredRows.length}</span>
              </div>
              <BandLegend preset={preset} />
            </div>
          </div>

          {/* scroll body */}
          <div className="flex-1 overflow-auto p-3 sm:p-4">
            <div className="rounded-xl border overflow-hidden">
              <DataTable zebra hover layout="fixed">
                <DataTableHeader>
                  <Cell span={4}>kpi</Cell>
                  <Cell span={2}>band</Cell>
                  <Cell span={2} align="right" mono>
                    min
                  </Cell>
                  <Cell span={2} align="right" mono>
                    max
                  </Cell>
                  <Cell span={2} align="right" mono>
                    score
                  </Cell>
                </DataTableHeader>

                <DataTableBody zebra>
                  {filteredRows.map((r: any, idx: number) => {
                    const k = String(r.kpi_key ?? "");
                    const label = kpiLabelByKey.get(k) ?? k;
                    const band = (r.band_key ?? "NO_DATA") as BandKey;

                    return (
                      <DataTableRow key={`${k}-${String(r.band_key)}-${idx}`}>
                        <Cell span={4}>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{label}</div>
                            <div className="text-[11px] text-[var(--to-ink-muted)] font-mono truncate">
                              {k}
                            </div>
                          </div>
                        </Cell>

                        <Cell span={2}>
                          <BandChip bandKey={band} valueText={String(r.band_key ?? "—")} preset={preset} />
                        </Cell>

                        <Cell span={2} align="right" mono>
                          {r.min_value ?? "—"}
                        </Cell>

                        <Cell span={2} align="right" mono>
                          {r.max_value ?? "—"}
                        </Cell>

                        <Cell span={2} align="right" mono>
                          {r.score_value ?? "—"}
                        </Cell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </div>
          </div>

          {/* sticky footer */}
          <div className="sticky bottom-0 z-10 bg-white border-t">
            <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--to-ink-muted)] truncate">
                Tip: scroll inside the panel • ESC closes
              </div>

              <button
                type="button"
                className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center"
                onClick={() => onOpenChange(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}