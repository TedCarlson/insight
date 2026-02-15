// apps/web/src/features/metrics/components/reports/ReportingTable.tsx
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/DataTable";

import { formatScore } from "@/features/metrics/lib/reports/format";
import { BandChip } from "./BandChip";
import { StatusMini } from "./StatusMini";
import type { BandKey } from "@/features/metrics-reports/lib/score";
import type { KpiDef } from "@/features/metrics/lib/reports/kpis";

import { KpiSlicerProvider } from "./kpiSlicer/KpiSlicerProvider";
import { KpiSlicerTrigger } from "./kpiSlicer/KpiSlicerTrigger";

type PriorSnapshot = Record<string, number | null | undefined>;

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
        "text-[14px] font-semibold",
        color,
      ].join(" ")}
      aria-hidden="true"
      title={dir === "UP" ? "Up vs prior" : dir === "DOWN" ? "Down vs prior" : "No change vs prior"}
    >
      {glyph}
    </span>
  );
}

/**
 * Match customer reporting precision:
 * - tNPS => 2 decimals
 * - FTR / Tool Usage => 1 decimal + "%"
 * Fallback:
 * - numbers default to 1 decimal (no %)
 */
function fmtCustomerKpi(k: KpiDef, value: any): string {
  const n = toNum(value);
  if (n === null) return "—";

  const key = String(k.key ?? "").toUpperCase();
  const label = String(k.label ?? "").toUpperCase();

  const isTNPS = key.includes("TNPS") || label.includes("TNPS") || key === "NPS" || label === "NPS";
  const isFTR = key.includes("FTR") || label.includes("FTR");
  const isTOOL = key.includes("TOOL") || label.includes("TOOL");

  if (isTNPS) return n.toFixed(2);
  if (isFTR || isTOOL) return `${n.toFixed(1)}%`;

  return n.toFixed(1);
}

export function ReportingTable({
  rows,
  showStatus,
  personNameById,
  preset,
  kpis,
  slicerTitle,
  priorSnapshotByTechId,
}: {
  rows: any[];
  showStatus: boolean;
  personNameById: Map<string, string>;
  preset: Record<string, any>;
  kpis: KpiDef[];
  slicerTitle: string;
  priorSnapshotByTechId?: Map<string, PriorSnapshot>;
}) {
  const slicerRows = decorateRowsForSlicer(rows, personNameById);

  /**
   * Professional grid behavior:
   * - Tech/Reports are capped so they DON'T expand into empty space.
   * - KPI columns absorb leftover width (so extra space feels intentional).
   * - Rank/Score/Volume stay compact and consistent.
   */
  const gridStyle = {
    gridTemplateColumns: [
      "minmax(260px, 340px)", // Tech • Name (capped)
      "minmax(190px, 260px)", // Reports To (capped)
      "64px",                 // Rank (tight)
      "110px",                // Weighted Score (tight)
      ...kpis.map(() => "minmax(120px, 1fr)"), // KPI columns take remaining space
      "140px",                // Volume (tight)
    ].join(" "),
  } as const;

  return (
    <KpiSlicerProvider title={slicerTitle} rows={slicerRows} kpis={kpis} preset={preset}>
      <DataTable zebra hover layout="fixed">
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
          {rows.map((r, idx) => {
            const pid = r.person_id ? String(r.person_id) : "";
            const rid = r.reports_to_person_id ? String(r.reports_to_person_id) : "";

            const fullName = pid ? personNameById.get(pid) ?? "—" : "—";
            const reportsToName = rid ? personNameById.get(rid) ?? "—" : "—";

            const techKey = String(r.tech_id ?? "");
            const prior = priorSnapshotByTechId?.get(techKey);

            // ✅ Prevent duplicate key collisions if backend duplicates exist
            const rowKey = `${String(r.tech_id ?? "NO_TECH")}-${String(r.metric_date ?? "NO_DATE")}-${idx}`;

            return (
              <DataTableRow key={rowKey} gridStyle={gridStyle}>
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
                  <span className="text-[13px]">{formatScore(r.weighted_score)}</span>
                </Cell>

                {kpis.map((k) => {
                  const bandKey = (r[k.bandField] ?? "NO_DATA") as BandKey;
                  const value = r[k.valueField];
                  const dir = deltaDir(value, prior?.[k.valueField]);

                  return (
                    <Cell key={`${rowKey}-${k.key}`} align="center" mono>
                      <KpiSlicerTrigger kpiKey={k.key}>
                        <span className="inline-flex items-center">
                          <BandChip
                            bandKey={bandKey}
                            valueText={fmtCustomerKpi(k, value)}
                            preset={preset}
                            title={`${k.key} • ${bandKey}`}
                          />
                          <DeltaArrow dir={dir} />
                        </span>
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