type Props = {
  rows: any[];
};

export default function ScoreKpiBreakdownTable({ rows }: Props) {
  if (!rows?.length) {
    return <div className="text-sm text-[var(--to-ink-muted)]">No KPI rows found.</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">KPI</th>
            <th className="py-2 pr-3">Value</th>
            <th className="py-2 pr-3">Band</th>
            <th className="py-2 pr-3">Band Score</th>
            <th className="py-2 pr-3">Weight</th>
            <th className="py-2 pr-3">Weighted Points</th>
            <th className="py-2 pr-3">KPI Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.kpi_key)} className="border-b last:border-b-0">
              <td className="py-2 pr-3 font-medium">{r.kpi_key}</td>
              <td className="py-2 pr-3">{r.kpi_value ?? "-"}</td>
              <td className="py-2 pr-3">{r.band_key ?? "-"}</td>
              <td className="py-2 pr-3">{r.band_score ?? "-"}</td>
              <td className="py-2 pr-3">{r.weight_percent ?? "-"}</td>
              <td className="py-2 pr-3">{r.weighted_points ?? "-"}</td>
              <td className="py-2 pr-3">{r.kpi_rank ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}