type Props = {
  rows: any[];
};

export default function ScoreSummaryTable({ rows }: Props) {
  if (!rows?.length) {
    return <div className="text-sm text-[var(--to-ink-muted)]">No score rows found.</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">Entity</th>
            <th className="py-2 pr-3">Score</th>
            <th className="py-2 pr-3">Rank</th>
            <th className="py-2 pr-3">Population</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.entity_id)} className="border-b last:border-b-0">
              <td className="py-2 pr-3 font-medium">{r.entity_id}</td>
              <td className="py-2 pr-3">{r.score_value}</td>
              <td className="py-2 pr-3">{r.overall_rank}</td>
              <td className="py-2 pr-3">{r.population_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}