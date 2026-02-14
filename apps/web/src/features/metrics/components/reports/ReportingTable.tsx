import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";

import { formatScore, fmtKpi } from "@/features/metrics/lib/reports/format";
import { BandChip } from "./BandChip";
import { StatusMini } from "./StatusMini";
import type { BandKey } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

import { KpiSlicerProvider } from "./kpiSlicer/KpiSlicerProvider";
import { KpiSlicerTrigger } from "./kpiSlicer/KpiSlicerTrigger";

function decorateRowsForSlicer(rows: any[], personNameById: Map<string, string>) {
  return rows.map((r) => {
    const pid = r.person_id ? String(r.person_id) : "";
    const rid = r.reports_to_person_id ? String(r.reports_to_person_id) : "";

    return {
      ...r,
      __full_name: pid ? personNameById.get(pid) ?? "—" : "—",
      __reports_to_name: rid ? personNameById.get(rid) ?? "—" : "—",
    };
  });
}

function Cell({
  children,
  align = "left",
  mono = false,
}: {
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

export function ReportingTable({
  rows,
  showStatus,
  personNameById,
  preset,
  kpis,
  slicerTitle,
}: {
  rows: any[];
  showStatus: boolean;
  personNameById: Map<string, string>;
  preset: Record<string, any>;
  kpis: KpiDef[];
  slicerTitle: string;
}) {
  const slicerRows = decorateRowsForSlicer(rows, personNameById);

  // Dynamic grid sizing:
  // - Tech•Name grows
  // - Reports To stays readable
  // - Rank/Score compact
  // - KPI columns fixed chip-friendly widths
  // - Volume fixed
  const gridStyle = {
    gridTemplateColumns: [
      "minmax(320px, 1.8fr)", // Tech • Name (flex)
      "minmax(220px, 1.2fr)", // Reports To (flex)
      "72px",                 // Rank
      "140px",                // Weighted Score
      ...kpis.map(() => "140px"), // KPI chips
      "170px",                // Volume
    ].join(" "),
  } as const;

  return (
    <KpiSlicerProvider title={slicerTitle} rows={slicerRows} kpis={kpis} preset={preset}>
      <DataTable zebra hover layout="content">
        <DataTableHeader gridStyle={gridStyle}>
          <Cell>Tech • Name</Cell>
          <Cell>Reports To</Cell>
          <Cell align="center">Rank</Cell>
          <Cell align="right" mono>
            Weighted Score
          </Cell>

          {kpis.map((k) => (
            <Cell key={k.key} align="center">
              <KpiSlicerTrigger kpiKey={k.key}>
                <span className="underline decoration-transparent hover:decoration-current">
                  {k.label}
                </span>
              </KpiSlicerTrigger>
            </Cell>
          ))}

          <Cell align="right">Volume</Cell>
        </DataTableHeader>

        <DataTableBody zebra>
          {rows.map((r) => {
            const pid = r.person_id ? String(r.person_id) : "";
            const rid = r.reports_to_person_id ? String(r.reports_to_person_id) : "";

            const fullName = pid ? personNameById.get(pid) ?? "—" : "—";
            const reportsToName = rid ? personNameById.get(rid) ?? "—" : "—";

            return (
              <DataTableRow key={`${r.tech_id}-${r.metric_date}`} gridStyle={gridStyle}>
                <Cell>
                  <div className="min-w-0">
                    <div className="min-w-0 truncate">
                      <span className="font-mono tabular-nums">{r.tech_id}</span>
                      <span className="mx-2 text-[var(--to-ink-muted)]">•</span>
                      <span className="truncate">{fullName}</span>
                    </div>

                    {showStatus && r.status_badge && <StatusMini status={r.status_badge} />}
                  </div>
                </Cell>

                <Cell>{reportsToName}</Cell>

                <Cell align="center" mono>
                  {r.rank_in_pc}
                </Cell>

                <Cell align="right" mono>
                  {formatScore(r.weighted_score)}
                </Cell>

                {kpis.map((k) => {
                  const bandKey = (r[k.bandField] ?? "NO_DATA") as BandKey;
                  const value = r[k.valueField];

                  return (
                    <Cell key={`${r.tech_id}-${k.key}`} align="center" mono>
                      <KpiSlicerTrigger kpiKey={k.key}>
                        <BandChip
                          bandKey={bandKey}
                          valueText={fmtKpi(value)}
                          preset={preset}
                          title={`${k.key} • ${bandKey}`}
                        />
                      </KpiSlicerTrigger>
                    </Cell>
                  );
                })}

                <Cell align="right" mono>
                  {r.ftr_contact_jobs ?? ""}{" "}
                  {r.job_volume_band ? `(${r.job_volume_band})` : ""}
                </Cell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </KpiSlicerProvider>
  );
}