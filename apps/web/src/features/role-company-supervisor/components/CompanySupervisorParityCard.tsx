"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type {
  ParityGroupType,
  ParityRow,
} from "@/shared/kpis/engine/buildParityRows";

type Props = {
  rows: ParityRow[];
  detailRows?: ParityRow[];
};

type ParityMode = "summary" | "detail";

function signalBarClass(bandKey: string | null | undefined) {
  if (bandKey === "EXCEEDS") return "bg-[var(--to-success)]";
  if (bandKey === "MEETS") return "bg-[var(--to-primary)]";
  if (bandKey === "NEEDS_IMPROVEMENT") return "bg-[var(--to-warning)]";
  if (bandKey === "MISSES") return "bg-[var(--to-danger)]";
  return "bg-transparent";
}

function displayHeaderLabel(label: string) {
  if (label === "Tool Usage %") return "Tool Usage %";
  if (label === "Pure Pass %") return "Pure Pass %";
  if (label === "48hr Contact") return "48hr Contact";
  return label;
}

function displayGroupType(groupType: ParityGroupType) {
  if (groupType === "COMPANY") return "Company";
  return "Contractor Group";
}

function MetricCell(props: {
  value: string | null | undefined;
  bandKey: string | null | undefined;
  rankDisplay?: string | null | undefined;
}) {
  return (
    <div className="flex justify-center">
      <div className="relative flex min-h-[42px] min-w-[78px] flex-col items-center justify-center rounded-lg border bg-card px-2 py-1 text-[11px] font-medium text-foreground">
        <span
          className={[
            "absolute left-0 top-0 h-[3px] w-full rounded-t-lg",
            signalBarClass(props.bandKey),
          ].join(" ")}
        />
        <div>{props.value ?? "—"}</div>
        <div className="mt-0.5 text-[9px] leading-none text-muted-foreground">
          {props.rankDisplay ?? "—"}
        </div>
      </div>
    </div>
  );
}

function RankPill(props: { value?: string | null }) {
  return (
    <div className="inline-flex min-w-[38px] items-center justify-center rounded-full border bg-muted/20 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {props.value ?? "—"}
    </div>
  );
}

function ModeButton(props: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
        props.active
          ? "border-[var(--to-primary)] bg-[color-mix(in_oklab,var(--to-primary)_10%,white)] text-[var(--to-primary)]"
          : "bg-background text-muted-foreground hover:bg-muted/30",
        props.disabled ? "cursor-not-allowed opacity-50 hover:bg-background" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

export default function CompanySupervisorParityCard({
  rows,
  detailRows,
}: Props) {
  const [mode, setMode] = useState<ParityMode>("summary");

  const hasDetailRows = Array.isArray(detailRows) && detailRows.length > 0;

  const activeRows = useMemo(() => {
    if (mode === "detail" && hasDetailRows) {
      return detailRows!;
    }
    return rows;
  }, [mode, hasDetailRows, detailRows, rows]);

  const allColumns = activeRows[0]?.metrics ?? [];

  return (
    <Card className="p-4">
      <div className="mb-4 rounded-xl border bg-[color-mix(in_oklab,var(--to-primary)_6%,white)] px-4 py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--to-primary)]">
            Parity
          </div>

          <div className="flex items-center gap-2">
            <ModeButton
              label="Summary"
              active={mode === "summary"}
              onClick={() => setMode("summary")}
            />
            <ModeButton
              label="Detail"
              active={mode === "detail"}
              disabled={!hasDetailRows}
              onClick={() => {
                if (hasDetailRows) setMode("detail");
              }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b bg-[color-mix(in_oklab,var(--to-primary)_4%,white)]">
              <th className="w-[240px] px-4 py-3 text-left text-[11px] font-medium text-[var(--to-primary)]">
                Group
              </th>

              {allColumns.map((metric, index) => (
                <th
                  key={metric.kpi_key}
                  className={[
                    "px-2 py-3 text-center text-[10px] font-medium text-[color-mix(in_oklab,var(--to-primary)_72%,black)]",
                    index === 0 ? "border-l border-[var(--to-border)]" : "",
                    index === 3 ? "border-l border-[var(--to-border)]" : "",
                  ].join(" ")}
                >
                  {displayHeaderLabel(metric.label)}
                </th>
              ))}

              <th className="w-[64px] border-l border-[var(--to-border)] px-3 py-3 text-center text-[11px] font-medium text-[var(--to-primary)]">
                HC
              </th>
            </tr>
          </thead>

          <tbody>
            {activeRows.map((row, rowIndex) => (
              <tr
                key={`${mode}-${row.group_type}-${row.label}`}
                className={[
                  "border-b last:border-b-0",
                  rowIndex > 0 && rowIndex % 4 === 0
                    ? "border-t-2 border-t-[var(--to-border)]"
                    : "",
                ].join(" ")}
              >
                <td className="w-[240px] px-4 py-3 align-middle">
                  <div className="flex items-center gap-3">
                    <RankPill value={row.rank_display} />

                    <div>
                      <div className="text-sm font-semibold leading-tight">
                        {row.label}
                      </div>
                      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                        {displayGroupType(row.group_type)}
                      </div>
                    </div>
                  </div>
                </td>

                {allColumns.map((column, index) => {
                  const metric = row.metrics.find(
                    (m) => m.kpi_key === column.kpi_key
                  );

                  return (
                    <td
                      key={`${mode}-${row.group_type}-${row.label}-${column.kpi_key}`}
                      className={[
                        "px-1 py-2 align-middle",
                        index === 0 ? "border-l border-[var(--to-border)]" : "",
                        index === 3 ? "border-l border-[var(--to-border)]" : "",
                      ].join(" ")}
                    >
                      <MetricCell
                        value={metric?.value_display}
                        bandKey={metric?.band_key}
                        rankDisplay={metric?.rank_display}
                      />
                    </td>
                  );
                })}

                <td className="border-l border-[var(--to-border)] px-3 py-3 text-center text-sm font-medium align-middle">
                  {row.hc}
                </td>
              </tr>
            ))}

            {!activeRows.length ? (
              <tr>
                <td
                  colSpan={allColumns.length + 2}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No parity rows available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}