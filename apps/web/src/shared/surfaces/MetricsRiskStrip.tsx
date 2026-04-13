// path: apps/web/src/shared/surfaces/MetricsRiskStrip.tsx

"use client";

import { Card } from "@/components/ui/Card";

export type MetricsRiskStripItem = {
  key: string;
  title: string;
  value: string | number;
  note?: string | null;
};

type Props = {
  title?: string;
  items: MetricsRiskStripItem[];
};

function RiskTile({ item }: { item: MetricsRiskStripItem }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {item.title}
      </div>

      <div className="mt-1 text-xl font-semibold leading-none">
        {item.value}
      </div>

      <div className="mt-1 text-[10px] text-muted-foreground">
        {item.note ?? "—"}
      </div>
    </div>
  );
}

export default function MetricsRiskStrip({
  title = "Risk Strip",
  items,
}: Props) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <RiskTile key={item.key} item={item} />
        ))}
      </div>
    </Card>
  );
}