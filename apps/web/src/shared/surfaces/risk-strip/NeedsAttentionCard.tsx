// path: apps/web/src/shared/surfaces/risk-strip/NeedsAttentionCard.tsx

"use client";

type Row = {
  name: string;
  value: number;
};

function urgencyTone(index: number) {
  if (index === 0) {
    return "border-rose-300 text-rose-800";
  }
  if (index === 1) {
    return "border-rose-300 text-rose-800";
  }
  if (index === 2) {
    return "border-rose-200 text-rose-700";
  }
  if (index === 3) {
    return "border-rose-200 text-rose-700";
  }
  return "border-rose-200 text-foreground/85";
}

function sortNeedsAttention(rows: Row[]) {
  return [...rows].sort((a, b) => {
    const aValue =
      typeof a.value === "number" && Number.isFinite(a.value) ? a.value : Infinity;
    const bValue =
      typeof b.value === "number" && Number.isFinite(b.value) ? b.value : Infinity;

    if (aValue !== bValue) return aValue - bValue;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
}

export default function NeedsAttentionCard(props: {
  rows: Row[];
  limit?: number;
}) {
  const rows = sortNeedsAttention(props.rows).slice(0, props.limit ?? 5);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Coaching Queue
      </div>

      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className={[
              "flex items-center justify-between rounded-md border px-2 py-1.5 text-sm",
              urgencyTone(i),
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-200 px-1 text-[10px] font-medium text-muted-foreground">
                #{i + 1}
              </span>

              <span className="truncate">{r.name}</span>
            </div>

            <span className="tabular-nums text-sm font-medium">
              {r.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}