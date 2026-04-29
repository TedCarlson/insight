"use client";

type TeamClass = "ITG" | "BP";
type ReportClass = "NSR" | "SMART";
type ReportRange = "FM" | "PREVIOUS" | "3FM" | "12FM";

type RollupKpi = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string;
  band_key: string | null;
};

type SupervisorRollupRow = {
  supervisor_person_id: string;
  supervisor_name: string;
  team_class: TeamClass;
  rollup_hc: number;
  composite_score: number | null;
  rank: number;
  kpis: RollupKpi[];
};

export type RollupReportPayload = {
  header: {
    generated_at: string;
    class_type: ReportClass;
    range: ReportRange;
    org_display: string | null;
  };
  segments: {
    itg_supervisors: SupervisorRollupRow[];
    bp_supervisors: SupervisorRollupRow[];
    all_supervisors: SupervisorRollupRow[];
  };
};

type Props = {
  open: boolean;
  loading?: boolean;
  payload: RollupReportPayload | null;
  error?: string | null;
  onClose: () => void;
};

function formatScore(value: number | null) {
  if (typeof value !== "number") return "—";
  return value.toFixed(2);
}

function shortKpiLabel(kpi: RollupKpi) {
  const map: Record<string, string> = {
    tnps_score: "tNPS",
    ftr_rate: "FTR",
    tool_usage_rate: "Tool",
  };
  return map[kpi.kpi_key] ?? kpi.label;
}

function bandTone(band: string | null) {
  if (band === "EXCEEDS") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (band === "MEETS") return "border-sky-300 bg-sky-50 text-sky-800";
  if (band === "NEEDS_IMPROVEMENT") return "border-amber-300 bg-amber-50 text-amber-800";
  if (band === "MISSES") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function RollupTable({
  title,
  rows,
}: {
  title: string;
  rows: SupervisorRollupRow[];
}) {
  const sampleKpis = rows[0]?.kpis ?? [];

  return (
    <section className="rounded-2xl border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th>Rank</th>
            <th>Supervisor</th>
            <th>HC</th>
            <th>Comp</th>
            {sampleKpis.map((kpi) => (
              <th key={kpi.kpi_key}>{shortKpiLabel(kpi)}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.supervisor_person_id} className="border-b">
              <td>#{row.rank}</td>
              <td>{row.supervisor_name}</td>
              <td>{row.rollup_hc}</td>
              <td>{formatScore(row.composite_score)}</td>

              {row.kpis.map((kpi) => (
                <td key={kpi.kpi_key}>
                  <span className={`px-2 py-1 rounded-full border text-xs ${bandTone(kpi.band_key)}`}>
                    {kpi.value_display}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default function RollupReportOverlay({
  open,
  loading,
  payload,
  error,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4">
      <div className="mx-auto max-w-6xl rounded-2xl bg-card p-4 shadow-xl">

        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {payload?.header.org_display ?? "Rollup Report"}
          </h2>

          <button onClick={onClose}>Close</button>
        </div>

        {loading && <p>Loading report...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {payload && (
          <div className="space-y-4">
            <RollupTable
              title="ITG Supervisors"
              rows={payload.segments.itg_supervisors}
            />
            <RollupTable
              title="BP Supervisors"
              rows={payload.segments.bp_supervisors}
            />
            <RollupTable
              title="All Supervisors"
              rows={payload.segments.all_supervisors}
            />
          </div>
        )}
      </div>
    </div>
  );
}