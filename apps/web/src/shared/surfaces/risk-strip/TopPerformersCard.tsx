// path: apps/web/src/shared/surfaces/risk-strip/TopPerformersCard.tsx

"use client";

type Row = {
  name: string;
  value: number;
};

function podiumTone(rank: number) {
  if (rank === 0) {
    return {
      row: "border-amber-300 bg-transparent text-amber-800",
      badge: "bg-amber-500 text-white",
    };
  }
  if (rank === 1) {
    return {
      row: "border-zinc-300 bg-transparent text-zinc-700",
      badge: "bg-zinc-500 text-white",
    };
  }
  return {
    row: "border-amber-400/70 bg-transparent text-amber-900",
    badge: "bg-amber-700 text-white",
  };
}

function sortTopPerformers(rows: Row[]) {
  return [...rows]
    .filter(
      (r) =>
        typeof r.value === "number" &&
        Number.isFinite(r.value) &&
        r.value > 0 // 🚨 CRITICAL: removes zero + junk
    )
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value; // DESC
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
}

export default function TopPerformersCard(props: {
  rows: Row[];
  limit?: number;
}) {
  const rows = sortTopPerformers(props.rows).slice(0, props.limit ?? 5);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Leaderboard
      </div>

      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => {
          const tone = podiumTone(i);
          const isTop3 = i < 3;

          return (
            <div
              key={`${r.name}-${i}`}
              className={[
                "flex items-center justify-between rounded-md border px-2 py-1.5 text-sm",
                isTop3
                  ? tone.row
                  : "border-zinc-200 bg-transparent text-foreground/90",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-2">
                {isTop3 ? (
                  <span
                    className={[
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                      tone.badge,
                    ].join(" ")}
                  >
                    #{i + 1}
                  </span>
                ) : (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-zinc-200 px-1 text-[10px] font-medium text-muted-foreground">
                    #{i + 1}
                  </span>
                )}

                <span className="truncate">{r.name}</span>
              </div>

              <span
                className={[
                  "tabular-nums text-sm",
                  isTop3 ? "font-semibold" : "font-medium",
                ].join(" ")}
              >
                {r.value.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}