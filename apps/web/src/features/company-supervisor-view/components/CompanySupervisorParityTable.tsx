"use client";

import { useMemo, useState } from "react";

import type { CompanySupervisorRosterRow } from "../lib/companySupervisorView.types";

export type CompanySupervisorPrimarySegment = "ALL" | "ITG" | "BP";

function numOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function avg(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function formatMetricValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function bandPillClass(bandKey?: string | null) {
  if (bandKey === "EXCEEDS") {
    return "border-[var(--to-success)] bg-[color-mix(in_oklab,var(--to-success)_10%,white)]";
  }
  if (bandKey === "MEETS") {
    return "border-[var(--to-primary)] bg-[color-mix(in_oklab,var(--to-primary)_10%,white)]";
  }
  if (bandKey === "NEEDS_IMPROVEMENT") {
    return "border-[var(--to-warning)] bg-[color-mix(in_oklab,var(--to-warning)_10%,white)]";
  }
  if (bandKey === "MISSES") {
    return "border-[var(--to-danger)] bg-[color-mix(in_oklab,var(--to-danger)_10%,white)]";
  }
  return "border-[var(--to-border)] bg-muted/10";
}

function isSecondaryMetric(index: number) {
  return index >= 3;
}

function sectionDividerClass(index: number) {
  return index === 3 ? "border-l border-[var(--to-border)] pl-4" : "";
}

type ParityRow = {
  key: string;
  label: string;
  headcount: number;
  jobs: number;
  installs: number;
  tcs: number;
  sros: number;
  metrics: Map<string, { value: number | null; band: string | null }>;
};

function buildParityRow(args: {
  key: string;
  label: string;
  rows: CompanySupervisorRosterRow[];
  rosterColumns: Array<{ kpi_key: string; label: string }>;
}): ParityRow {
  const { key, label, rows, rosterColumns } = args;

  let jobs = 0;
  let installs = 0;
  let tcs = 0;
  let sros = 0;

  for (const row of rows) {
    jobs += row.work_mix.total;
    installs += row.work_mix.installs;
    tcs += row.work_mix.tcs;
    sros += row.work_mix.sros;
  }

  const metrics = new Map<
    string,
    { value: number | null; band: string | null }
  >();

  for (const col of rosterColumns) {
    const values = rows.map((row) => {
      const metric = row.metrics.find((m) => m.kpi_key === col.kpi_key);
      return numOrNull(metric?.value);
    });

    const value = avg(values);

    const bands: Record<string, number> = {};
    for (const row of rows) {
      const metric = row.metrics.find((m) => m.kpi_key === col.kpi_key);
      const band = metric?.band_key ?? null;
      if (!band) continue;
      bands[band] = (bands[band] ?? 0) + 1;
    }

    const band = Object.entries(bands).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    metrics.set(col.kpi_key, { value, band });
  }

  return {
    key,
    label,
    headcount: rows.length,
    jobs,
    installs,
    tcs,
    sros,
    metrics,
  };
}

function DesktopHeaderCell(props: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <div
      className={[
        "px-2 py-2 text-[11px] font-medium text-muted-foreground",
        props.align === "right"
          ? "text-right"
          : props.align === "center"
            ? "text-center"
            : "text-left",
        props.className ?? "",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}

function DesktopCell(props: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "px-2 py-2.5 text-sm",
        props.align === "right"
          ? "text-right"
          : props.align === "center"
            ? "text-center"
            : "text-left",
        props.strong ? "font-semibold" : "",
        props.className ?? "",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}

function DesktopMetricBadge(props: {
  value: number | null;
  band?: string | null;
  secondary?: boolean;
}) {
  return (
    <div
      className={[
        `inline-flex min-w-[58px] items-center justify-center rounded-md border px-2 py-1 text-sm font-medium ${bandPillClass(props.band)}`,
        props.secondary ? "opacity-95" : "",
      ].join(" ")}
    >
      {formatMetricValue(props.value)}
    </div>
  );
}

function DesktopWorkMixBadge(props: {
  value: number;
}) {
  return (
    <div className="inline-flex min-w-[58px] items-center justify-center rounded-md border border-[var(--to-border)] bg-muted/10 px-2 py-1 text-sm font-medium">
      {props.value}
    </div>
  );
}

export default function CompanySupervisorParityTable(props: {
  rows: CompanySupervisorRosterRow[];
  rosterColumns: Array<{ kpi_key: string; label: string }>;
  primarySegment: CompanySupervisorPrimarySegment;
  bpContractor: string;
}) {
  const { rows, rosterColumns, primarySegment, bpContractor } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [showMix, setShowMix] = useState(false);

  const parityRows = useMemo(() => {
    if (primarySegment === "ITG") {
      const itgRows = rows.filter((r) => r.team_class === "ITG");
      return itgRows.length
        ? [buildParityRow({ key: "ITG", label: "ITG", rows: itgRows, rosterColumns })]
        : [];
    }

    if (primarySegment === "BP") {
      const bpRows = rows.filter((r) => r.team_class === "BP");

      if (bpContractor !== "ALL") {
        const rowsFiltered = bpRows.filter((r) => r.contractor_name === bpContractor);
        return rowsFiltered.length
          ? [
              buildParityRow({
                key: bpContractor,
                label: bpContractor,
                rows: rowsFiltered,
                rosterColumns,
              }),
            ]
          : [];
      }

      return [
        buildParityRow({ key: "BP", label: "BP", rows: bpRows, rosterColumns }),
      ];
    }

    return [
      buildParityRow({ key: "ALL", label: "ALL", rows, rosterColumns }),
      buildParityRow({
        key: "ITG",
        label: "ITG",
        rows: rows.filter((r) => r.team_class === "ITG"),
        rosterColumns,
      }),
      buildParityRow({
        key: "BP",
        label: "BP",
        rows: rows.filter((r) => r.team_class === "BP"),
        rosterColumns,
      }),
    ].filter((row) => row.headcount > 0);
  }, [rows, rosterColumns, primarySegment, bpContractor]);

  const gridTemplate = `180px repeat(${rosterColumns.length}, minmax(84px, 1fr)) ${
    showMix ? "repeat(4, minmax(84px, 1fr)) " : ""
  }72px`;
  const minWidth = showMix ? "1380px" : "1040px";

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Team Parity
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Comparative view for the active workforce slice
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
        >
          <span>{isOpen ? "Hide parity" : "Show parity"}</span>
          <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 rounded-2xl border bg-muted/[0.04] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              KPI order aligned to team performance
            </div>

            <button
              type="button"
              onClick={() => setShowMix((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              <span>{showMix ? "Hide work mix" : "Show work mix"}</span>
              <span className={`transition-transform ${showMix ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>
          </div>

          <div className="overflow-auto rounded-2xl border">
            <div
              className="grid border-b bg-muted/10"
              style={{ gridTemplateColumns: gridTemplate, minWidth }}
            >
              <DesktopHeaderCell>Group</DesktopHeaderCell>

              {rosterColumns.map((col, index) => (
                <DesktopHeaderCell
                  key={col.kpi_key}
                  align="center"
                  className={sectionDividerClass(index)}
                >
                  {col.label}
                </DesktopHeaderCell>
              ))}

              {showMix ? (
                <>
                  <DesktopHeaderCell
                    align="center"
                    className="border-l border-[var(--to-border)] pl-4"
                  >
                    Installs
                  </DesktopHeaderCell>
                  <DesktopHeaderCell align="center">TCs</DesktopHeaderCell>
                  <DesktopHeaderCell align="center">SROs</DesktopHeaderCell>
                  <DesktopHeaderCell align="center">Jobs</DesktopHeaderCell>
                </>
              ) : null}

              <DesktopHeaderCell align="center">HC</DesktopHeaderCell>
            </div>

            {parityRows.map((row) => (
              <div
                key={row.key}
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: gridTemplate, minWidth }}
              >
                <DesktopCell strong>{row.label}</DesktopCell>

                {rosterColumns.map((col, index) => {
                  const metric = row.metrics.get(col.kpi_key);
                  return (
                    <DesktopCell
                      key={col.kpi_key}
                      align="center"
                      className={sectionDividerClass(index)}
                    >
                      <DesktopMetricBadge
                        value={metric?.value ?? null}
                        band={metric?.band ?? null}
                        secondary={isSecondaryMetric(index)}
                      />
                    </DesktopCell>
                  );
                })}

                {showMix ? (
                  <>
                    <DesktopCell
                      align="center"
                      className="border-l border-[var(--to-border)] pl-4"
                    >
                      <DesktopWorkMixBadge value={row.installs} />
                    </DesktopCell>
                    <DesktopCell align="center">
                      <DesktopWorkMixBadge value={row.tcs} />
                    </DesktopCell>
                    <DesktopCell align="center">
                      <DesktopWorkMixBadge value={row.sros} />
                    </DesktopCell>
                    <DesktopCell align="center">
                      <DesktopWorkMixBadge value={row.jobs} />
                    </DesktopCell>
                  </>
                ) : null}

                <DesktopCell align="center">
                  <DesktopWorkMixBadge value={row.headcount} />
                </DesktopCell>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}